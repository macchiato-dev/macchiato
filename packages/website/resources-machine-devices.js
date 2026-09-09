import { createProjectBuildMachine, createProjectEditorMachine, createProjectOutputMachine } from "./project-machines.js";
import { urlMatchesAllowedPatterns } from "../hub/src/url-pattern.js";
import { decodeProjectArchive, encodeProjectArchive, projectArchiveFilename } from "../hub/src/project-archive.js";
import { ProjectOutputStorage } from "./project-output-storage.js";

const encoder = new TextEncoder();
const allowedMethods = new Set(["GET", "POST", "DELETE"]);
const responseHeaders = new Set(["content-type", "content-length", "etag", "last-modified"]);
const projectResourcePrefix = "\u0000resources-project-resource:";

export class ResourcesProjectResourceDevice {
  constructor() {
    this.nextId = 1;
    this.resources = new Map();
  }
  compactSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.files)) return snapshot;
    return { ...snapshot, files: snapshot.files.map((file) => {
      const image = /\.(?:gif|jpe?g|png|svg|webp)$/i.test(String(file?.path || ""));
      if (typeof file?.content !== "string" || (!image && file.content.length <= 64 * 1024) ||
          file.content.startsWith(projectResourcePrefix)) return file;
      const id = String(this.nextId++);
      this.resources.set(id, file.content);
      return { ...file, content: `${projectResourcePrefix}${id}` };
    }) };
  }
  hydrateSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.files)) return snapshot;
    return { ...snapshot, files: this.hydrateFiles(snapshot.files) };
  }
  hydrateFiles(files) {
    return (Array.isArray(files) ? files : []).map((file) => {
      const content = String(file?.content || "");
      if (!content.startsWith(projectResourcePrefix)) return file;
      const value = this.resources.get(content.slice(projectResourcePrefix.length));
      if (value === undefined) throw new Error(`Project resource is unavailable: ${file.path}`);
      return { ...file, content: value };
    });
  }
  compilationFiles(files) {
    return this.hydrateFiles(files).map(file => {
      const image = /\.(?:gif|jpe?g|png|svg|webp)$/i.test(file.path);
      const binary = /^data:[^,]*;base64,/i.test(file.content);
      return image || binary ? { ...file, content: "" } : file;
    });
  }
  compactText(text) {
    const value = JSON.parse(text);
    if (value?.snapshot) value.snapshot = this.compactSnapshot(value.snapshot);
    else if (Array.isArray(value?.files)) return JSON.stringify(this.compactSnapshot(value));
    return JSON.stringify(value);
  }
  hydrateText(text) {
    const value = JSON.parse(text);
    if (value?.snapshot) value.snapshot = this.hydrateSnapshot(value.snapshot);
    else if (Array.isArray(value?.files)) return JSON.stringify(this.hydrateSnapshot(value));
    return JSON.stringify(value);
  }
}

export class ResourcesStorageDevice {
  constructor(window) {
    this.window = window;
    this.listeners = new Map();
    window.addEventListener("storage", (event) => {
      const kind = event.storageArea === window.localStorage ? "local" : "session";
      for (const listener of this.listeners.get(kind) || []) listener();
    });
  }
  area(kind) { return kind === "local" ? this.window.localStorage : this.window.sessionStorage; }
  get(kind, key) { return this.area(kind).getItem(key); }
  set(kind, key, value) { this.area(kind).setItem(key, value); }
  delete(kind, key) { this.area(kind).removeItem(key); }
  listen(kind, _key, listener) {
    if (!this.listeners.has(kind)) this.listeners.set(kind, new Set());
    this.listeners.get(kind).add(listener);
  }
}

export class ResourcesFetchDevice {
  constructor(window, projectResources) {
    this.window = window;
    this.projectResources = projectResources;
  }
  async request(payload) {
    const url = new URL(payload.url, this.window.location.href);
    if (url.origin !== this.window.location.origin) throw new Error("Frontend fetch is restricted to this origin");
    const method = String(payload.method || "GET").toUpperCase();
    if (!allowedMethods.has(method)) throw new Error(`Frontend fetch method ${method} is not allowed`);
    const headers = new Headers(payload.headers || {});
    if ([...headers].length > 32) throw new Error("Frontend fetch has too many headers");
    let body = payload.body == null ? undefined : String(payload.body);
    if (body && /\/\-\/projects\//.test(url.pathname) && /application\/json/i.test(headers.get("content-type") || "")) {
      body = this.projectResources.hydrateText(body);
    }
    if (body && encoder.encode(body).byteLength > 2 * 1024 * 1024) throw new Error("Frontend fetch body is too large");
    const response = await this.window.fetch(url, {
      method, headers, body, credentials: "same-origin", redirect: "error", cache: "no-store",
    });
    let text = await response.text();
    if (text && /\/\-\/projects\//.test(url.pathname) && /application\/json/i.test(response.headers.get("content-type") || "")) {
      text = this.projectResources.compactText(text);
    }
    if (encoder.encode(text).byteLength > 2 * 1024 * 1024) throw new Error("Frontend fetch response is too large");
    return {
      status: response.status,
      url: response.url,
      headers: [...response.headers].filter(([name]) => responseHeaders.has(name.toLowerCase())),
      body: text,
    };
  }
}

export class ResourcesArchiveDevice {
  constructor(document, projectResources) {
    this.document = document;
    this.projectResources = projectResources;
  }
  async import() {
    const input = this.document.querySelector("[data-project-archive-file]");
    const file = input?.files?.[0];
    if (!file) throw new Error("Choose a project ZIP to import");
    if (file.size > 50 * 1024 * 1024) throw new Error("Archive exceeds 50 MB");
    return this.projectResources.compactSnapshot(decodeProjectArchive(await file.arrayBuffer()));
  }
  download(payload) {
    const bytes = encodeProjectArchive(this.projectResources.hydrateSnapshot(payload.snapshot));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
    const link = this.document.createElement("a");
    link.href = url;
    link.download = projectArchiveFilename(payload.name);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return null;
  }
}

export class ResourcesBuildDevice {
  constructor(projectResources) { this.projectResources = projectResources; }
  async compile(payload) {
    const machine = await createProjectBuildMachine();
    // Compilation reads source files, while image/binary resource contents are
    // resolved later by the output device. Keeping those bytes out of this
    // QuickJS request avoids copying large assets through an unrelated VM.
    // Large JS/CSS/HTML is opaque in the editor too, but it is still source.
    // Replacing every opaque reference with "" silently erased those scripts.
    const files = this.projectResources.compilationFiles(payload.files);
    try { return machine.compileFiles(files, payload.config); }
    finally { machine.destroy(); }
  }
  async run(payload) {
    const machine = await createProjectBuildMachine();
    try {
      return this.projectResources.compactSnapshot(
        machine.build(this.projectResources.hydrateFiles(payload.files), payload.config));
    }
    finally { machine.destroy(); }
  }
}

export class ResourcesEditorDevice {
  constructor(document, deliver, outputDevice, buildDevice, storageDevice,
    projectResources, request, call) {
    this.document = document;
    this.deliver = deliver;
    this.outputDevice = outputDevice;
    this.buildDevice = buildDevice;
    this.storageDevice = storageDevice;
    this.projectResources = projectResources;
    this.request = request;
    this.hostCall = call;
    this.editor = null;
    this.initialSnapshot = null;
    this.initialOutputId = null;
    this.outputIds = new Set();
    this.operations = Object.freeze({
      "editor.command": (payload) => this.editor.command(payload),
      "editor.destroy": () => this.destroy(),
      "editor.focus": () => this.editor.focus(),
      "editor.history.checkpoint": (payload) => this.editor.callGuest("__resourcesProjectHistoryCheckpoint", payload),
      "editor.history.initialize": (payload) => this.editor.callGuest("__resourcesProjectHistoryInitialize", payload),
      "editor.history.inspect": () => this.editor.callGuest("__resourcesProjectHistoryInspect", {}),
      "editor.history.setCurrent": (payload) => this.editor.callGuest("__resourcesProjectHistorySetCurrent", payload),
      "editor.inspect": () => this.editor.inspect(),
      "editor.setContent": (payload) => {
        this.editor.callGuest("__resourcesProjectSelectFile", { path: payload.path || "" });
        return this.editor.setContent(payload.content, payload.language, payload);
      },
      "editor.snapshot": (payload) => this.editor.callGuest("__resourcesProjectSetSnapshot", payload),
      "editor.status.begin": (payload) => this.editor.callGuest("__resourcesProjectStatusBegin", payload),
      "editor.status.inspect": () => this.editor.callGuest("__resourcesProjectStatusInspect", {}),
      "editor.status.report": (payload) => this.editor.callGuest("__resourcesProjectStatusReport", payload),
      "editor.theme": (payload) => this.editor.callGuest("__codeEditorSetTheme", payload),
    });
  }
  async mount() {
    if (this.editor) return { machineId: this.editor.machineId };
    const root = this.document.querySelector("[data-project-editor]")?.closest(".project-workspace");
    if (!root) throw new Error("Project editor mount is unavailable");
    const snapshotField = root.querySelector("[data-project-snapshot]");
    if (!snapshotField) throw new Error("Project snapshot field is unavailable");
    const snapshotUrl = root.querySelector("[data-project-snapshot-url]")?.dataset.projectSnapshotUrl;
    if (snapshotUrl) {
      const response = await this.request("fetch", {
        url: snapshotUrl, method: "GET", headers: { Accept: "application/json" },
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Project workspace response: ${response.status}`);
      }
      const workspace = JSON.parse(response.body);
      if (!workspace?.snapshot || !Array.isArray(workspace.snapshot.files)) {
        throw new Error("Project workspace snapshot is invalid");
      }
      snapshotField.value = JSON.stringify(workspace.snapshot);
    }
    this.initialSnapshot = this.projectResources.compactSnapshot(JSON.parse(snapshotField.value));
    // The snapshot may contain large embedded resources. Keep that opaque
    // payload out of the DOM tree mirrored into the editor guest; the guest
    // requests it explicitly after its browser facade has started.
    snapshotField.value = "";
    snapshotField.textContent = "";
    await this.mountInitialOutput(root);
    // Let the browser paint the useful output before CodeMirror evaluates its
    // comparatively large bytecode program on this same thread.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    this.editor = await createProjectEditorMachine({
      root,
      limits: false,
      onChange: (content, details) => this.deliver({ type: "editor-change", content,
        syntaxErrors: details.syntaxErrors }),
      onReady: (value) => this.deliver({ type: "editor-ready", value }),
      onLimit: (value) => this.deliver({ type: "editor-limit", value }),
      onError: (error) => {
        root.setAttribute("data-editor-machine-error", error?.message || String(error));
        this.deliver({ type: "editor-error", message: error?.message || String(error) });
      },
      onRequest: (name, payload) => this.request(name, payload),
      services: {
        call: (name, payloadText) => JSON.stringify(this.hostCall(name,
          payloadText ? JSON.parse(payloadText) : {})),
        route: {
          get: () => this.document.defaultView.location.pathname,
          search: () => this.document.defaultView.location.search,
          listen() {},
        },
        storage: this.storageDevice,
      },
    });
    return { machineId: this.editor.machineId };
  }
  getInitialSnapshot() {
    if (!this.initialSnapshot) throw new Error("Initial project snapshot is unavailable");
    return { snapshot: this.initialSnapshot, outputId: this.initialOutputId };
  }
  async mountInitialOutput(root) {
    const snapshot = this.initialSnapshot;
    const preview = root.querySelector("[data-project-preview]");
    if (!preview || !snapshot?.files?.length) return;
    const surface = this.document.createElement("div");
    surface.className = "project-editor__preview-surface";
    const mount = this.document.createElement("div");
    mount.dataset.projectOutputMount = "1";
    surface.appendChild(mount);
    preview.replaceChildren(surface);
    root.dataset.outputMachineState = "starting";
    try {
      root.dataset.outputMachineStage = "build";
      const source = { files: snapshot.files, config: snapshot.config || {} };
      const project = source.config.build ? await this.buildDevice.run(source) : source;
      root.dataset.outputMachineStage = "compile";
      const compiled = await this.buildDevice.compile(project);
      const options = project.config?.containerOptions || {};
      const outputId = await this.outputDevice.mount({
        rootKey: "1", scripts: [], iframe: project.config?.output?.iframe !== false,
        files: project.files, allowedFetchOrigins: options.allowedFetchOrigins || [],
        allowedLinkPatterns: options.allowedLinkPatterns || [],
        environment: project.config?.environment || {},
      });
      this.outputIds.add(outputId);
      root.dataset.outputMachineStage = "load";
      await this.outputDevice.load({ id: outputId, project: {
        tree: compiled.tree, stylesheets: compiled.stylesheets,
        scripts: compiled.scripts, files: project.files,
        allowedFetchOrigins: options.allowedFetchOrigins || [],
        allowedLinkPatterns: options.allowedLinkPatterns || [],
        environment: project.config?.environment || {},
      } });
      this.initialOutputId = outputId;
      root.dataset.outputMachineStage = "ready";
      root.dataset.outputMachineState = "ready";
    } catch (error) {
      root.dataset.outputMachineState = "failed";
      root.dataset.outputMachineError = error?.message || String(error);
      this.deliver({ type: "output-error", id: 0,
        message: error?.message || String(error) });
    }
  }
  async mountOutput(payload) {
    if (!this.editor) throw new Error("Project editor is not mounted");
    const id = await this.outputDevice.mount(payload);
    this.outputIds.add(id);
    return id;
  }
  call(name, payload) {
    if (!this.editor) throw new Error(`Project editor is not mounted: ${name}`);
    const operation = this.operations[name];
    if (operation) return operation(payload);
    throw new Error(`Unknown editor operation: ${name}`);
  }
  destroy() {
    for (const id of this.outputIds) this.outputDevice.destroyOutput(id);
    this.outputIds.clear();
    this.editor?.destroy();
    this.editor = null;
    this.initialSnapshot = null;
    this.initialOutputId = null;
  }
}

export class ResourcesOutputDevice {
  constructor(document, deliver, projectResources) {
    this.document = document;
    this.deliver = deliver;
    this.projectResources = projectResources;
    this.outputs = new Map();
    this.nextId = 1;
    this.operations = Object.freeze({
      "output.destroy": (output, payload) => {
        output.destroy();
        this.outputs.delete(payload.id);
        return null;
      },
      "output.inspect": (output) => output.inspect(),
      "output.setContent": (output, payload) => {
        this.validateTree(payload.tree);
        return output.setContent(payload.tree);
      },
    });
  }
  async mount(payload) {
    if (typeof payload.rootKey !== "string" || !/^[1-9][0-9]{0,9}$/.test(payload.rootKey))
      throw new Error("Project output mount identity is invalid");
    const mount = [...this.document.querySelectorAll("[data-project-output-mount]")]
      .find((element) => element.dataset.projectOutputMount === payload.rootKey);
    if (!mount) throw new Error("Project output mount is unavailable");
    let frame = null;
    if (payload.iframe !== false) {
      frame = this.document.createElement("iframe");
      frame.className = "project-editor__output-frame";
      frame.title = "Project output";
      // Native dialog forms need allow-forms. The machine prevents every
      // network submission; no project JavaScript runs in the browser realm.
      frame.sandbox = "allow-scripts allow-same-origin allow-forms";
      frame.allow = "fullscreen";
      frame.allowFullscreen = true;
      frame.src = "/-/resources-site/project-output-frame.html";
      frame.style.cssText = "display:block;width:100%;height:100%;border:0";
      await new Promise((resolve, reject) => {
        frame.addEventListener("load", resolve, { once: true });
        frame.addEventListener("error", () => reject(new Error("Project output frame failed to load")), { once: true });
        mount.replaceChildren(frame);
      });
    }
    const id = this.nextId++;
    const files = this.projectResources.hydrateFiles(payload.files);
    const storageScope = mount.closest("[data-project-id]")?.dataset.projectId ||
      this.document.location.pathname;
    let output;
    if (frame) output = await this.connectFrame(frame, {
      storageScope,
      files,
      scripts: Array.isArray(payload.scripts) ? payload.scripts : [],
      allowedFetchOrigins: Array.isArray(payload.allowedFetchOrigins) ? payload.allowedFetchOrigins : [],
      allowedLinkPatterns: Array.isArray(payload.allowedLinkPatterns) ? payload.allowedLinkPatterns : [],
      environment: payload.environment || {},
    }, id);
    else {
      const storage = new ProjectOutputStorage(this.document.defaultView, storageScope);
      try {
        output = await createProjectOutputMachine({
          root: mount,
          scripts: Array.isArray(payload.scripts) ? payload.scripts : [],
          options: { environment: payload.environment || {}, files, services: { storage } },
          onError: (error) => this.deliver({ type: "output-error", id, message: error?.message || String(error) }),
        });
      } catch (error) { storage.destroy(); throw error; }
      const destroy = output.destroy;
      output = { ...output, destroy() { storage.destroy(); destroy(); } };
    }
    this.outputs.set(id, output);
    return id;
  }
  connectFrame(frame, payload, outputId) {
    const protocol = "resources-project-output-machine-v1";
    const channel = new MessageChannel();
    const pending = new Map();
    let nextRequest = 1;
    return new Promise((resolve, reject) => {
      const fail = (message) => {
        reject(new Error(message));
        this.deliver({ type: "output-error", id: outputId, message });
      };
      channel.port1.onmessage = ({ data }) => {
        if (data?.protocol !== protocol) return;
        if (data.type === "failed") return fail(data.error || "Project output frame failed");
        if (data.type === "ready") return resolve(Object.freeze({
          destroy() { request("destroy", {}).catch(() => {}); channel.port1.close(); frame.remove(); },
          inspect: () => request("inspect", {}),
          setContent: (tree) => request("setContent", { tree }),
          run: (scripts) => request("run", { scripts }),
          load: (project) => request("load", { project }),
        }));
        if (data.type !== "response") return;
        const operation = pending.get(data.id);
        if (!operation) return;
        pending.delete(data.id);
        if (data.error) operation.reject(new Error(data.error));
        else operation.resolve(data.value);
      };
      channel.port1.start();
      const request = (name, operationPayload) => new Promise((requestResolve, requestReject) => {
        const id = nextRequest++;
        pending.set(id, { resolve: requestResolve, reject: requestReject });
        channel.port1.postMessage({ protocol, type: "request", id, name, payload: operationPayload });
      });
      frame.contentWindow.postMessage({ protocol, type: "connect", payload }, location.origin, [channel.port2]);
    });
  }
  async run(payload) {
    const output = this.require(payload.id);
    await output.run(Array.isArray(payload.scripts) ? payload.scripts : []);
    return null;
  }
  async load(payload) {
    const output = this.require(payload.id);
    const project = payload.project || {};
    this.validateTree(project.tree);
    await output.load({
      tree: project.tree,
      stylesheets: Array.isArray(project.stylesheets) ? project.stylesheets : [],
      scripts: Array.isArray(project.scripts) ? project.scripts : [],
      files: this.projectResources.hydrateFiles(project.files),
      allowedFetchOrigins: Array.isArray(project.allowedFetchOrigins) ? project.allowedFetchOrigins : [],
      allowedLinkPatterns: Array.isArray(project.allowedLinkPatterns) ? project.allowedLinkPatterns : [],
      environment: project.environment || {},
    });
    return null;
  }
  call(name, payload) {
    const output = this.require(payload.id);
    const operation = this.operations[name];
    if (operation) return operation(output, payload);
    throw new Error(`Unknown output operation: ${name}`);
  }
  require(id) {
    const output = this.outputs.get(id);
    if (!output) throw new Error("Project output machine is unavailable");
    return output;
  }
  destroyOutput(id) {
    const output = this.outputs.get(id);
    if (!output) return;
    output.destroy();
    this.outputs.delete(id);
  }
  validateTree(tree) {
    if (!Array.isArray(tree)) throw new Error("Project output tree is invalid");
    let count = 0;
    const validate = (node, path) => {
      if (!Array.isArray(node) || (node[0] !== 0 && node[0] !== 1))
        throw new Error(`Project output node is invalid at ${path}`);
      if (++count > 50_000) throw new Error("Project output has too many nodes");
      if (node[0] === 0) return;
      if (typeof node[1] !== "string" || !node[1])
        throw new Error(`Project output element name is missing at ${path}`);
      if (!Array.isArray(node[4])) throw new Error(`Project output children are invalid at ${path}`);
      node[4].forEach((child, index) => validate(child, `${path}.${index}`));
    };
    tree.forEach((node, index) => validate(node, String(index)));
  }
  destroy() {
    for (const output of this.outputs.values()) output.destroy();
    this.outputs.clear();
  }
}
