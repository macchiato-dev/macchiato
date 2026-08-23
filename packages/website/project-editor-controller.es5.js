(function () {
  "use strict";

  var root = document.querySelector("[data-project-editor]");
  if (!root) return;
  var mount = root.querySelector("[data-project-editor-mount]");
  var snapshotField = root.querySelector("[data-project-snapshot]");
  if (!mount || !snapshotField) throw new Error("Project editor surface is incomplete");
  root.setAttribute("data-output-owner", "editor");

  var editor = document.createElement("div");
  editor.id = "editor";
  mount.replaceChildren(editor);
  globalThis.__CODE_EDITOR_DEFER_START__ = true;
  load("editor.bin");
  var projectUiLoaded = false;
  function loadProjectUi() {
    if (projectUiLoaded) return;
    projectUiLoaded = true;
    if (activeSnapshot) snapshotField.value = JSON.stringify(activeSnapshot);
    load("project.bin");
  }

  var requests = {};
  var nextRequest = -1;
  var activeSnapshot = null;
  var activeFile = null;
  var activePath = "";
  var outputId = null;
  var outputGeneration = 0;
  var refreshTimer = 0;
  var syntaxTimer = 0;
  var errorTimer = 0;
  function request(name, payload) {
    var id = nextRequest--;
    return new Promise(function (resolve, reject) {
      requests[id] = { resolve: resolve, reject: reject };
      globalThis.__wwcPostMessage(JSON.stringify({
        protocol: "resources-editor-v1",
        id: id,
        name: name,
        payload: payload || {}
      }));
    });
  }
  function requestStage(name, payload) {
    return request(name, payload).then(function (value) { return value; }, function (error) {
      throw new Error(name + ": " + (error && error.message || String(error)));
    });
  }
  var receiveEditorApplicationResponse = globalThis.__resourcesEditorReceive;
  globalThis.__resourcesEditorReceive = function (json) {
    var message = JSON.parse(json);
    var operation = requests[message.id];
    if (!operation) return receiveEditorApplicationResponse ?
      receiveEditorApplicationResponse(json) : "null";
    delete requests[message.id];
    setTimeout(function () {
      if (message.error) operation.reject(new Error(message.error));
      else operation.resolve(message.value);
    }, 0);
    return "null";
  };

  function languageFor(path) {
    if (/\.html?$/.test(path)) return "html";
    if (/\.css$/.test(path)) return "css";
    if (/\.(js|mjs|cjs)$/.test(path)) return "javascript";
    if (/\.json$/.test(path)) return "json";
    if (/\.md$/.test(path)) return "markdown";
    return "plain";
  }
  function editableFile(files) {
    var preferred = ["index.html", "main.js", "style.css", "README.md"];
    var byPath = {};
    var index;
    for (index = 0; index < files.length; index++) byPath[files[index].path] = files[index];
    for (index = 0; index < preferred.length; index++) {
      if (byPath[preferred[index]]) return byPath[preferred[index]];
    }
    for (index = 0; index < files.length; index++) {
      if (typeof files[index].content === "string") return files[index];
    }
    return { path: "index.html", content: "" };
  }
  function start(workspace) {
    var files = workspace.snapshot && workspace.snapshot.files || [];
    var selected = editableFile(files);
    activeSnapshot = workspace.snapshot || { files: files, config: {} };
    activeFile = selected;
    activePath = selected.path;
    globalThis.__codeEditorConfigureLimits(JSON.stringify({
      maxLines: 5000,
      maxCharacters: 1000000
    }));
    globalThis.__codeEditorSetContent(JSON.stringify({
      content: selected.content,
      language: languageFor(selected.path),
      readOnly: root.getAttribute("data-read-only") === "true"
    }));
    var current = root.querySelector("[data-project-file-current]");
    if (current) current.textContent = selected.path;
    root.setAttribute("data-editor-machine-state", "ready");
    if (files.length) startOutput(activeSnapshot);
    else loadProjectUi();
  }

  function startOutput(snapshot) {
    var preview = root.querySelector("[data-project-preview]");
    var files = snapshot.files || [];
    var config = snapshot.config || {};
    var generation = ++outputGeneration;
    if (errorTimer) clearTimeout(errorTimer);
    if (!preview) return;
    if (!outputId) {
      var surface = document.createElement("div");
      surface.className = "project-editor__preview-surface";
      var output = document.createElement("div");
      output.setAttribute("data-project-output-mount", "1");
      surface.appendChild(output);
      preview.replaceChildren(surface);
    }
    root.setAttribute("data-output-machine-state", "starting");
    var sourceSnapshot = { files: files, config: config };
    root.setAttribute("data-output-machine-stage", "build");
    var built = config.build ? requestStage("build.run", sourceSnapshot) :
      new Promise(function (resolve) { resolve(sourceSnapshot); });
    built.then(function (project) {
      root.setAttribute("data-output-machine-stage", "compile");
      return requestStage("build.compile", { files: project.files, config: project.config }).then(function (compiled) {
        if (generation !== outputGeneration) return null;
        var reset = outputId ? requestStage("output.destroy", { id: outputId }).then(function () {
          outputId = null;
        }) : new Promise(function (resolve) { resolve(); });
        var mounted = reset.then(function () { return requestStage("output.mount", {
            rootKey: "1", scripts: [], violations: [], tags: [],
            files: project.files,
            allowedFetchOrigins: project.config.containerOptions &&
              project.config.containerOptions.allowedFetchOrigins || [],
            allowedLinkPatterns: project.config.containerOptions &&
              project.config.containerOptions.allowedLinkPatterns || [],
            environment: config.environment || {}
          }); });
        return mounted.then(function (id) {
          root.setAttribute("data-output-machine-stage", "load");
          outputId = id;
          if (generation !== outputGeneration) return null;
          return requestStage("output.load", { id: id, project: compiled });
        });
      });
    }).then(function () {
      if (generation !== outputGeneration) return;
      root.removeAttribute("data-output-machine-error");
      root.setAttribute("data-output-machine-stage", "ready");
      root.setAttribute("data-output-machine-state", "ready");
      loadProjectUi();
    }, function (error) {
      if (generation !== outputGeneration) return;
      var message = error && error.message || String(error);
      errorTimer = setTimeout(function () {
        if (generation !== outputGeneration) return;
        root.setAttribute("data-output-machine-state", "failed");
        root.setAttribute("data-output-machine-error", message);
        globalThis.__wwcReportError(message);
      }, 5000);
      loadProjectUi();
    });
  }

  var receiveEditorApplication = globalThis.__resourcesEditorLocalReceive;
  globalThis.__resourcesEditorLocalReceive = function (message) {
    if (receiveEditorApplication) receiveEditorApplication(message);
    if (!message || message.type !== "change" || !activeSnapshot) return;
    var content = String(message.content || "");
    if (activePath === "config") {
      if (message.syntaxErrors !== true) {
        try { activeSnapshot.config = JSON.parse(content); }
        catch (error) { message.syntaxErrors = true; }
      }
    } else {
      activeFile = activeSnapshot.files.filter(function (file) { return file.path === activePath; })[0] || null;
      if (!activeFile) return;
      activeFile.content = content;
    }
    if (refreshTimer) clearTimeout(refreshTimer);
    if (syntaxTimer) clearTimeout(syntaxTimer);
    if (errorTimer) clearTimeout(errorTimer);
    if (message.syntaxErrors === true) {
      syntaxTimer = setTimeout(function () {
        root.setAttribute("data-output-machine-state", "blocked");
        root.setAttribute("data-output-machine-error", "Output is waiting for valid syntax.");
      }, 5000);
      return;
    }
    root.removeAttribute("data-output-machine-error");
    refreshTimer = setTimeout(function () { startOutput(activeSnapshot); }, 500);
  };

  globalThis.__resourcesProjectSelectFile = function (json) {
    var path = String(JSON.parse(json).path || "");
    activePath = path;
    activeFile = path === "config" ? null :
      activeSnapshot && activeSnapshot.files.filter(function (file) { return file.path === path; })[0] || null;
    return JSON.stringify({ selected: activePath });
  };

  globalThis.__resourcesProjectSetSnapshot = function (json) {
    var request = JSON.parse(json);
    if (!request.snapshot || !Array.isArray(request.snapshot.files)) {
      throw new TypeError("Project snapshot is invalid");
    }
    activeSnapshot = request.snapshot;
    activeFile = activePath === "config" ? null :
      activeSnapshot.files.filter(function (file) { return file.path === activePath; })[0] || null;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { startOutput(activeSnapshot); }, 500);
    return JSON.stringify({ accepted: true });
  };

  try {
    root.setAttribute("data-output-machine-stage", "snapshot");
    var initialSnapshot = JSON.parse(globalThis.__wwcServiceCall(
      "editor.workspace.initial", "{}"));
    root.setAttribute("data-output-machine-stage", "editor");
    start({ snapshot: initialSnapshot });
  } catch (error) {
    root.setAttribute("data-editor-machine-state", "failed");
    root.setAttribute("data-editor-machine-error", error && error.message || String(error));
    globalThis.__wwcReportError(error && error.message || String(error));
  }
})();
