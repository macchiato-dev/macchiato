(function () {
  "use strict";

  // MicroQuickJS's named-call packet dispatches a function but does not send
  // its return value. Keep the application reply protocol in this bootstrap,
  // rather than teaching the interpreter about project-editor commands.
  globalThis.__resourcesEditorCall = function (json) {
    var request = JSON.parse(json);
    var value = globalThis[request.name](JSON.stringify(request.value));
    globalThis.__wwcPostMessage("__wwcResponse:" + (value == null ? "null" : value));
  };

  var root = document.querySelector("[data-project-editor]");
  if (!root) {
    if (document.getElementById("editor")) load("surface.bin");
    return;
  }
  var mount = root.querySelector("[data-project-editor-mount]");
  var snapshotField = root.querySelector("[data-project-snapshot]");
  if (!mount || !snapshotField) throw new Error("Project editor surface is incomplete");
  root.setAttribute("data-output-owner", "editor");

  var initialWorkspace = JSON.parse(globalThis.__wwcServiceCall(
    "editor.workspace.initial", "{}"));
  if (initialWorkspace.editorSurface) {
    // These are synchronous application commands, not forwarded DOM objects.
    // Each machine keeps its own document and interpreter event dispatch.
    globalThis.__browserUseNotify = globalThis.__wwcPostMessage;
    ["ConfigureLimits", "SetContent", "SetTheme", "Command", "Inspect", "Focus",
      "Select", "GetSelection", "SelectLine", "Serialize", "Restore"].forEach(function (method) {
      globalThis["__codeEditor" + method] = function (json) {
        var reply = JSON.parse(globalThis.__wwcServiceCall("editor.surface.call",
          JSON.stringify({ method: method, value: json ? JSON.parse(json) : {} })));
        if (reply.error) throw new Error(reply.error);
        return JSON.stringify(reply.value);
      };
    });
    globalThis.__resourcesEditorSurfaceReceive = function (json) {
      if (globalThis.__codeEditorNotify) globalThis.__codeEditorNotify(JSON.parse(json));
      return "null";
    };
  } else {
    var editor = document.createElement("div");
    editor.id = "editor";
    mount.replaceChildren(editor);
    globalThis.__CODE_EDITOR_DEFER_START__ = true;
    load("editor.bin");
    globalThis.__codeEditorLoadLanguage = globalThis.__codeEditorCreateLanguageLoader(function (name) {
      return request("bytecode.load", { name: name }).then(function () { load(name); });
    });
  }
  var initialSnapshot = initialWorkspace.snapshot;
  globalThis.__resourcesProjectWorkspace = function () {
    if (!initialWorkspace.metadata) return null;
    return { snapshot: initialSnapshot, versionCount: initialWorkspace.metadata.versionCount,
      updatedAt: initialWorkspace.metadata.updatedAt,
      hasUnpublishedChanges: initialWorkspace.metadata.hasUnpublishedChanges };
  };
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
  var outputId = initialWorkspace.outputId || null;
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
    if (message.type === "output-error") {
      if (message.id !== outputId) return "null";
      root.setAttribute("data-output-machine-state", "failed");
      root.setAttribute("data-output-machine-error", message.message);
      if (globalThis.__resourcesEditorLocalReceive) globalThis.__resourcesEditorLocalReceive(message);
      return "null";
    }
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

  function start(workspace) {
    var files = workspace.snapshot && workspace.snapshot.files || [];
    activeSnapshot = workspace.snapshot || { files: files, config: {} };
    globalThis.__codeEditorConfigureLimits(JSON.stringify({
      maxLines: 5000,
      maxCharacters: 1000000
    }));
    // The project UI selects the entry and recovers session edits before the
    // first CodeMirror render. Rendering this server snapshot first would
    // briefly expose stale contents and create a needless editor transaction.
    if (files.length && !outputId && !initialWorkspace.deferOutput) startOutput(activeSnapshot);
    else loadProjectUi();
  }

  function startOutput(snapshot) {
    var successfulOutput = null;
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
    // Only initial startup covers the pane. Replacements prepare alongside
    // the current output, which must remain visible and interactive.
    root.setAttribute("data-output-machine-state", outputId ? "updating" : "starting");
    var sourceSnapshot = { files: files, config: config };
    root.setAttribute("data-output-machine-stage", "build");
    var built = config.build ? requestStage("build.run", sourceSnapshot) :
      new Promise(function (resolve) { resolve(sourceSnapshot); });
    built.then(function (project) {
      root.setAttribute("data-output-machine-stage", "compile");
      return requestStage("build.compile", { files: project.files, config: project.config }).then(function (compiled) {
        if (generation !== outputGeneration) return null;
        successfulOutput = { snapshot: sourceSnapshot,
          output: { format: "resources-project-output-v1", project: project, compiled: compiled } };
        var mounted = outputId ? new Promise(function (resolve) { resolve(outputId); }) :
          requestStage("output.mount", {
            rootKey: "1", scripts: [], violations: [], tags: [],
            iframe: !(config.output && config.output.iframe === false),
            files: project.files,
            allowedFetchOrigins: project.config.containerOptions &&
              project.config.containerOptions.allowedFetchOrigins || [],
            allowedLinkPatterns: project.config.containerOptions &&
              project.config.containerOptions.allowedLinkPatterns || [],
            environment: config.environment || {}
          });
        return mounted.then(function (id) {
          root.setAttribute("data-output-machine-stage", "load");
          outputId = id;
          if (generation !== outputGeneration) return null;
          return requestStage("output.load", { id: id, project: {
            tree: compiled.tree,
            document: compiled.document,
            stylesheets: compiled.stylesheets,
            scripts: compiled.scripts,
            files: project.files,
            allowedFetchOrigins: project.config.containerOptions &&
              project.config.containerOptions.allowedFetchOrigins || [],
            allowedLinkPatterns: project.config.containerOptions &&
              project.config.containerOptions.allowedLinkPatterns || [],
            environment: config.environment || {}
          } });
        });
      });
    }).then(function () {
      if (generation !== outputGeneration) return;
      initialWorkspace.successfulOutput = successfulOutput;
      root.removeAttribute("data-output-machine-error");
      root.setAttribute("data-output-machine-stage", "ready");
      root.setAttribute("data-output-machine-state", "ready");
      if (globalThis.__resourcesEditorLocalReceive) {
        globalThis.__resourcesEditorLocalReceive({ type: "output-ready" });
      }
      loadProjectUi();
    }, function (error) {
      if (generation !== outputGeneration) return;
      var message = error && error.message || String(error);
      errorTimer = setTimeout(function () {
        if (generation !== outputGeneration) return;
        root.setAttribute("data-output-machine-state", "failed");
        root.setAttribute("data-output-machine-error", message);
        // Invalid project input is an output error, not an interpreter fault.
        // Keep the editor usable and let its UI place/dismiss the status rail.
        if (globalThis.__resourcesEditorLocalReceive) {
          globalThis.__resourcesEditorLocalReceive({ type: "output-error", message: message });
        }
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
    // Updating data is not a render request. The project UI owns the debounce;
    // scheduling here too rebuilt each edit twice and ignored its delay.
    if (refreshTimer) clearTimeout(refreshTimer);
    return JSON.stringify({ accepted: true });
  };
  globalThis.__resourcesProjectSuccessfulOutput = function () {
    return JSON.stringify(initialWorkspace.successfulOutput || null);
  };
  globalThis.__resourcesProjectRenderSnapshot = function () {
    if (refreshTimer) clearTimeout(refreshTimer);
    if (syntaxTimer) clearTimeout(syntaxTimer);
    if (errorTimer) clearTimeout(errorTimer);
    if (activeSnapshot) startOutput(activeSnapshot);
    return JSON.stringify({ accepted: !!activeSnapshot });
  };

  try {
    if (!outputId) root.setAttribute("data-output-machine-stage", "editor");
    start({ snapshot: initialSnapshot });
    // The project UI is installed at startup. Language code remains on demand;
    // this trusted editor intentionally leaves its bytecode gate open.
    loadProjectUi();
  } catch (error) {
    root.setAttribute("data-editor-machine-state", "failed");
    root.setAttribute("data-editor-machine-error", error && error.message || String(error));
    globalThis.__wwcReportError(error && error.message || String(error));
  }
})();
