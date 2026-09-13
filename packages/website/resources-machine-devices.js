import { createProjectBuildMachine, createProjectEditorMachine, createProjectOutputMachine } from "./project-machines.js";
import { urlMatchesAllowedPatterns } from "../hub/src/url-pattern.js";
import { decodeProjectArchive, encodeProjectArchive, projectArchiveFilename } from "../hub/src/project-archive.js";
import { ProjectOutputStorage } from "./project-output-storage.js";
import { boundedStorageReply, storageResponse } from "./storage-service.js";
import { DRAFT_KEY, PENDING_KEY_PREFIX, PROJECT_RESOURCE_PREFIX as projectResourcePrefix } from "./project-session.js";

const encoder = new TextEncoder();
const allowedMethods = new Set(["GET", "POST", "DELETE"]);
const responseHeaders = new Set(["content-type", "content-length", "etag", "last-modified"]);
const projectSessionFormat = "resources-project-session-v1";

function sessionReferences(text) {
  const ids = new Set();
  JSON.parse(text, (_key, value) => {
    if (typeof value === "string" && value.startsWith(projectResourcePrefix)) {
      ids.add(value.slice(projectResourcePrefix.length));
    }
    return value;
  });
  return ids;
}

export class ResourcesProjectResourceDevice {
  constructor() {
    this.resources = new Map();
  }
  compactSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.files)) return snapshot;
    return { ...snapshot, files: snapshot.files.map((file) => {
      const image = /\.(?:gif|jpe?g|png|svg|webp)$/i.test(String(file?.path || ""));
      if (typeof file?.content !== "string" || (!image && file.content.length <= 64 * 1024) ||
          file.content.startsWith(projectResourcePrefix)) return file;
      // Persisted histories can retain these handles, including splice ranges
      // within them. A new page must never assign that handle different bytes.
      const id = crypto.randomUUID();
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
  read(content) {
    return this.hydrateFiles([{ path: "selected file", content }])[0].content;
  }
  readChunk(content, offset = 0) {
    try {
      if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid resource offset");
      const value = this.read(content);
      if (offset > value.length) throw new Error("Resource offset exceeds file length");
      // Even JSON's worst-case escaping stays below the service text bound.
      // Count lines only for the first chunk, not on every page of a file.
      let lines;
      if (offset === 0) {
        lines = 1;
        for (let at = value.indexOf("\n"); at !== -1; at = value.indexOf("\n", at + 1)) lines++;
      }
      return { content: value.slice(offset, offset + 64 * 1024), length: value.length, lines, error: null };
    } catch (error) {
      return { error: error.message || String(error) };
    }
  }
  compilationFiles(files, entry = "index.html") {
    return this.hydrateFiles(files).map(file => {
      const image = /\.(?:gif|jpe?g|png|svg|webp)$/i.test(file.path);
      const binary = /^data:[^,]*;base64,/i.test(file.content);
      // An SVG entry is source markup, not an opaque image dependency.
      // It must pass through the compiler and the host's SVG checks.
      if (!binary && (file.path === entry || `./${file.path}` === entry)) return file;
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
  packSession(text) {
    const ids = sessionReferences(text);
    if (!ids.size) return text;
    const resources = [...ids].map(id => {
      if (!this.resources.has(id)) throw new Error("Project recovery resource is unavailable");
      return [id, this.resources.get(id)];
    });
    // One atomic Storage write contains the unchanged guest value plus its
    // resource bytes. No orphan side keys, and no large bytes enter the guest.
    return JSON.stringify({ format: projectSessionFormat, value: text, resources });
  }
  unpackSession(text) {
    let saved;
    try { saved = JSON.parse(text); } catch { return text; }
    if (saved?.format !== projectSessionFormat) {
      // Plain, resource-free snapshots remain readable. Expired old numeric
      // handles must fail rather than accidentally resolve through this page.
      for (const id of sessionReferences(text)) {
        if (!this.resources.has(id)) throw new Error("Project recovery resource is unavailable");
      }
      return text;
    }
    if (typeof saved.value !== "string" || !Array.isArray(saved.resources)) {
      throw new Error("Project recovery resource data is invalid");
    }
    const entries = new Map();
    for (const entry of saved.resources) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" ||
          !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(entry[0]) ||
          typeof entry[1] !== "string" || entries.has(entry[0]) ||
          this.resources.has(entry[0]) && this.resources.get(entry[0]) !== entry[1]) {
        throw new Error("Project recovery resource data is invalid");
      }
      entries.set(entry[0], entry[1]);
    }
    const ids = sessionReferences(saved.value);
    if (ids.size !== entries.size || [...ids].some(id => !entries.has(id))) {
      throw new Error("Project recovery resource data is incomplete");
    }
    // Validate the whole record before modifying the live table.
    for (const [id, value] of entries) this.resources.set(id, value);
    return saved.value;
  }
}

export class ResourcesStorageDevice {
  constructor(window, projectResources = null) {
    this.window = window;
    this.projectResources = projectResources;
    this.listeners = new Map();
    window.addEventListener("storage", (event) => {
      const kind = event.storageArea === window.localStorage ? "local" : "session";
      for (const listener of this.listeners.get(kind) || []) listener();
    });
  }
  area(kind) { return kind === "local" ? this.window.localStorage : this.window.sessionStorage; }
  projectSession(kind, key) {
    return this.projectResources && kind === "session" &&
      (key === DRAFT_KEY || key.startsWith(PENDING_KEY_PREFIX));
  }
  has(kind, key) { return this.area(kind).getItem(key) !== null; }
  request(payload) { return storageResponse(this, payload); }
  readRecovery(key) {
    try { return boundedStorageReply({ value: this.get("session", key), error: null }); }
    catch (error) { return { value: null, error: error.message || String(error) }; }
  }
  writeRecovery(key, value) {
    try { this.set("session", key, value); return { error: null }; }
    catch (error) {
      return { error: error.name === "QuotaExceededError" ? "Browser session storage is full" : error.message || String(error) };
    }
  }
  get(kind, key) {
    const value = this.area(kind).getItem(key);
    return value !== null && this.projectSession(kind, key)
      ? this.projectResources.unpackSession(value) : value;
  }
  set(kind, key, value) {
    this.area(kind).setItem(key, this.projectSession(kind, key)
      ? this.projectResources.packSession(value) : value);
  }
  delete(kind, key) { this.area(kind).removeItem(key); }
  listen(kind, _key, listener) {
    if (!this.listeners.has(kind)) this.listeners.set(kind, new Set());
    const listeners = this.listeners.get(kind);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size && this.listeners.get(kind) === listeners) this.listeners.delete(kind);
    };
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
    if (body && encoder.encode(body).byteLength > 2 * 1024 * 1024) throw new Error("Frontend fetch body is too large");
    const projectApi = /^\/(?:api|-)\/projects\//.test(url.pathname);
    if (body && projectApi && /application\/json/i.test(headers.get("content-type") || "")) {
      body = this.projectResources.hydrateText(body);
      // The small guest request can refer to a full portable project. Match
      // the server's project-form budget after resolving those resource bytes.
      if (encoder.encode(body).byteLength > 70 * 1024 * 1024) throw new Error("Project fetch body is too large");
    }
    const response = await this.window.fetch(url, {
      method, headers, body, credentials: "same-origin", redirect: "error", cache: "no-store",
    });
    let text = await response.text();
    if (text && projectApi && /application\/json/i.test(response.headers.get("content-type") || "")) {
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
    const snapshot = await decodeProjectArchive(await file.arrayBuffer());
    return this.projectResources.compactSnapshot(snapshot);
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
    const files = this.projectResources.compilationFiles(payload.files, payload.config?.entry);
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
    this.deferInitialOutput = false;
    this.outputIds = new Set();
    this.outputErrors = new Map();
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
  async mount({ deferOutput = false } = {}) {
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
    this.deferInitialOutput = deferOutput === true;
    if (this.deferInitialOutput) {
      root.querySelector("[data-project-editor]").dataset.outputMachineState = "waiting";
    } else {
      await this.mountInitialOutput(root);
      // Paint useful output before CodeMirror evaluates on the same thread.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    this.editor = await createProjectEditorMachine({
      root,
      allowNavigate: "self",
      // The guest supplies the existing resource handle, not megabytes of
      // image text. The Machine Host still validates the resolved data URL.
      resolveImage: (source) => this.projectResources.read(source),
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
    for (const message of this.outputErrors.values()) this.receiveOutput(message);
    this.outputErrors.clear();
    return { machineId: this.editor.machineId };
  }
  receiveOutput(message) {
    if (!this.outputIds.has(message.id)) return;
    if (this.editor) this.editor.receive(message);
    else this.outputErrors.set(message.id, message);
  }
  getInitialSnapshot() {
    if (!this.initialSnapshot) throw new Error("Initial project snapshot is unavailable");
    return { snapshot: this.initialSnapshot, outputId: this.initialOutputId,
      deferOutput: this.deferInitialOutput };
  }
  prepareSubmission() {
    const field = this.document.querySelector("[data-project-editor] [data-project-snapshot]");
    if (!field) throw new Error("Project snapshot field is unavailable");
    // Native form submission is another persistence boundary. Materialize
    // there, without copying every unopened resource into the editor guest.
    field.value = this.projectResources.hydrateText(field.value);
    return null;
  }
  async mountInitialOutput(root) {
    // The workspace also contains the details form; output state belongs on
    // the editor section, where subsequent guest updates and loaders read it.
    root = root.querySelector("[data-project-editor]");
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
      root.dataset.outputMachineStage = "load";
      // Compilation is already complete. Start with that application rather
      // than creating an empty guest and replacing it in a second round trip.
      const outputId = await this.outputDevice.mount({
        rootKey: "1", iframe: project.config?.output?.iframe !== false,
        tree: compiled.tree, document: compiled.document,
        stylesheets: compiled.stylesheets, scripts: compiled.scripts,
        files: project.files, allowedFetchOrigins: options.allowedFetchOrigins || [],
        allowedLinkPatterns: options.allowedLinkPatterns || [],
        environment: project.config?.environment || {},
      });
      this.outputIds.add(outputId);
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
    this.outputErrors.clear();
    this.editor?.destroy();
    this.editor = null;
    this.initialSnapshot = null;
    this.initialOutputId = null;
    this.deferInitialOutput = false;
  }
}

// The controller owns these surfaces; the guest receives only the document
// inside one frame. Replacement never grants two guests the same live DOM.
class ProjectFrameOutput {
  constructor(mount, connect, storageScope) {
    this.mount = mount;
    this.connect = connect;
    this.storageScope = storageScope;
    this.active = this.preparing = null;
    this.disposed = false;
  }
  async load(project) {
    if (this.disposed) throw new Error("Project output was destroyed");
    this.remove(this.preparing);
    const doc = this.mount.ownerDocument, frame = doc.createElement("iframe");
    frame.className = "project-editor__output-frame";
    frame.title = "Project output";
    frame.sandbox = "allow-scripts allow-same-origin allow-forms";
    frame.allow = "fullscreen";
    const url = new URL("/-/resources-site/project-output-frame.html", doc.location.href);
    url.hash = this.active?.frame.contentWindow.location.hash || "";
    frame.src = url.href;
    frame.inert = true;
    frame.style.cssText = "display:block;position:absolute;inset:0;width:100%;height:100%;border:0;visibility:hidden;pointer-events:none";
    this.mount.style.position = "relative";
    const pending = { frame, abort: new AbortController(), output: null };
    this.preparing = pending;
    try {
      await new Promise((resolve, reject) => {
        const finish = error => {
          frame.removeEventListener("load", ready);
          frame.removeEventListener("error", failed);
          pending.abort.signal.removeEventListener("abort", cancelled);
          error ? reject(error) : resolve();
        };
        const ready = () => finish();
        const failed = () => finish(new Error("Project output frame failed to load"));
        const cancelled = () => finish(new Error("Project output was replaced or destroyed"));
        frame.addEventListener("load", ready);
        frame.addEventListener("error", failed);
        pending.abort.signal.addEventListener("abort", cancelled, { once: true });
        this.mount.append(frame);
      });
      pending.output = await this.connect(frame, { ...project,
        storageScope: this.storageScope, module: this.module }, pending.abort.signal);
      if (this.preparing !== pending) throw new Error("Project output was replaced or destroyed");
      this.module = pending.output.module;
      const previous = this.active;
      const hadFocus = previous && doc.activeElement === previous.frame;
      this.active = pending;
      this.preparing = null;
      frame.style.cssText = "display:block;width:100%;height:100%;border:0";
      frame.inert = false;
      if (hadFocus) frame.focus();
      this.remove(previous);
      return null;
    } catch (error) {
      if (this.preparing === pending) this.preparing = null;
      this.remove(pending);
      throw error;
    }
  }
  remove(entry) {
    if (!entry) return;
    entry.abort.abort();
    entry.output?.destroy();
    entry.frame.remove();
  }
  require() {
    if (!this.active) throw new Error("Project output is unavailable");
    return this.active.output;
  }
  inspect() { return this.require().inspect(); }
  setContent(tree, document) { return this.require().setContent(tree, document); }
  run(scripts) { return this.require().run(scripts); }
  destroy() {
    this.disposed = true;
    this.remove(this.preparing);
    this.remove(this.active);
    this.preparing = this.active = this.module = null;
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
        return output.setContent(payload.tree, payload.document);
      },
    });
  }
  async mount(payload) {
    if (typeof payload.rootKey !== "string" || !/^[1-9][0-9]{0,9}$/.test(payload.rootKey))
      throw new Error("Project output mount identity is invalid");
    const mount = [...this.document.querySelectorAll("[data-project-output-mount]")]
      .find((element) => element.dataset.projectOutputMount === payload.rootKey);
    if (!mount) throw new Error("Project output mount is unavailable");
    if (payload.tree !== undefined) this.validateTree(payload.tree);
    const project = {
      tree: payload.tree, document: payload.document,
      stylesheets: Array.isArray(payload.stylesheets) ? payload.stylesheets : [],
      scripts: Array.isArray(payload.scripts) ? payload.scripts : [],
      files: this.projectResources.hydrateFiles(payload.files),
      allowedFetchOrigins: Array.isArray(payload.allowedFetchOrigins) ? payload.allowedFetchOrigins : [],
      allowedLinkPatterns: Array.isArray(payload.allowedLinkPatterns) ? payload.allowedLinkPatterns : [],
      environment: payload.environment || {},
    };
    const id = this.nextId++;
    const storageScope = mount.closest("[data-project-id]")?.dataset.projectId ||
      this.document.location.pathname;
    let output;
    if (payload.iframe !== false) {
      output = new ProjectFrameOutput(mount, (frame, project, signal) =>
        this.connectFrame(frame, project, id, signal), storageScope);
      try { await output.load(project); }
      catch (error) { output.destroy(); throw error; }
    }
    else {
      const storage = new ProjectOutputStorage(this.document.defaultView, storageScope);
      try {
        output = await createProjectOutputMachine({
          root: mount, project,
          options: { services: { storage } },
          onError: (error) => this.deliver({ type: "output-error", id, message: error?.message || String(error) }),
        });
      } catch (error) { storage.destroy(); throw error; }
      const destroy = output.destroy;
      output = { ...output, destroy() { storage.destroy(); destroy(); } };
    }
    this.outputs.set(id, output);
    return id;
  }
  connectFrame(frame, payload, outputId, signal) {
    const protocol = "resources-project-output-machine-v1";
    const channel = new MessageChannel();
    const pending = new Map();
    let nextRequest = 1;
    let disposed = false;
    return new Promise((resolve, reject) => {
      const fail = (message) => {
        if (disposed) return;
        // Startup may fail before mount registers this output for disposal.
        disposed = true;
        const error = new Error(message);
        for (const operation of pending.values()) operation.reject(error);
        pending.clear();
        channel.port1.close();
        frame.remove();
        signal?.removeEventListener("abort", cancel);
        reject(error);
      };
      const cancel = () => fail("Project output was replaced or destroyed");
      if (signal?.aborted) return cancel();
      signal?.addEventListener("abort", cancel, { once: true });
      channel.port1.onmessage = ({ data }) => {
        if (data?.protocol !== protocol) return;
        if (data.type === "error") {
          this.deliver({ type: "output-error", id: outputId, message: String(data.error) });
          return;
        }
        if (data.type === "failed") return fail(data.error || "Project output frame failed");
        if (data.type === "ready") {
          signal?.removeEventListener("abort", cancel);
          return resolve(Object.freeze({
            module: data.module,
            destroy() {
              if (disposed) return;
              disposed = true;
              channel.port1.postMessage({ protocol, type: "request", id: nextRequest++, name: "destroy" });
              for (const operation of pending.values()) operation.reject(new Error("Project output was destroyed"));
              pending.clear();
              channel.port1.close();
              frame.remove();
            },
            inspect: () => request("inspect", {}),
            setContent: (tree, document) => request("setContent", { tree, document }),
            run: (scripts) => request("run", { scripts }),
          }));
        }
        if (data.type !== "response") return;
        const operation = pending.get(data.id);
        if (!operation) return;
        pending.delete(data.id);
        if (data.error) operation.reject(new Error(data.error));
        else operation.resolve(data.value);
      };
      channel.port1.start();
      const request = (name, operationPayload) => new Promise((requestResolve, requestReject) => {
        if (disposed) return requestReject(new Error("Project output was destroyed"));
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
      document: project.document,
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
      if (node[5] !== undefined && (!Array.isArray(node[5]) || node[5].length > 128 * 1024 ||
          node[5].some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255))) {
        throw new Error(`Project inline style bytes are invalid at ${path}`);
      }
      node[4].forEach((child, index) => validate(child, `${path}.${index}`));
    };
    tree.forEach((node, index) => validate(node, String(index)));
  }
  destroy() {
    for (const output of this.outputs.values()) output.destroy();
    this.outputs.clear();
  }
}
