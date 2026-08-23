const pending = new Map();
let nextRequest = 1;
let editorListeners = null;
const outputListeners = new Map();

function call(name, payload = {}) {
  return JSON.parse(globalThis.__wwcServiceCall(name, JSON.stringify(payload)));
}

export function requestFrontendService(name, payload = {}) {
  const id = nextRequest++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    globalThis.__wwcPostMessage(JSON.stringify({ protocol: "resources-frontend-v1", id, name, payload }));
  });
}

export function downloadProjectArchive(snapshot, name) {
  call("archive.download", { snapshot, name });
}

export function importProjectArchive() {
  return requestFrontendService("archive.import");
}

export function replaceFrontendPath(path) {
  call("route.replace", { path });
}

export function buildProject(files, config) {
  return requestFrontendService("build.run", { files, config });
}

export async function createProjectBuildMachine() {
  return Object.freeze({
    build(files, config) { return buildProject(files, config); },
    destroy() {},
  });
}

globalThis.__resourcesFrontendReceive = (json) => {
  const message = JSON.parse(json);
  if (message.type === "editor-change") {
    editorListeners?.onChange?.(message.content, { syntaxErrors: message.syntaxErrors === true });
    return "null";
  }
  if (message.type === "editor-ready") {
    editorListeners?.onReady?.(message.value);
    return "null";
  }
  if (message.type === "editor-limit") {
    editorListeners?.onLimit?.(message.value);
    return "null";
  }
  if (message.type === "editor-error") {
    editorListeners?.onViolation?.(new Error(message.message));
    return "null";
  }
  if (message.type === "output-error") {
    outputListeners.get(message.id)?.(new Error(message.message));
    return "null";
  }
  const operation = pending.get(message.id);
  if (!operation) return "null";
  pending.delete(message.id);
  if (message.error) operation.reject(new Error(message.error));
  else operation.resolve(message.value);
  return "null";
};

export async function mountResourcesProjectEditor(options) {
  editorListeners = options;
  await requestFrontendService("editor.mount");
  return Object.freeze({
    setContent(content, language = "plain", settings = {}) {
      return call("editor.setContent", { content, language, ...settings });
    },
    command(payload) { return call("editor.command", payload); },
    setSnapshot(snapshot) { return call("editor.snapshot", { snapshot }); },
    inspect() { return call("editor.inspect"); },
    focus() { call("editor.focus"); },
    destroy() { call("editor.destroy"); editorListeners = null; },
    history: Object.freeze({
      initialize(value) { return call("editor.history.initialize", value); },
      setCurrent(snapshot) { return call("editor.history.setCurrent", { snapshot }); },
      checkpoint(snapshot, settings = {}) {
        return call("editor.history.checkpoint", { snapshot, now: settings.now || Date.now(),
          destructive: settings.destructive === true,
          checkpointIntervalMs: settings.checkpointIntervalMs });
      },
      inspect() { return call("editor.history.inspect"); },
    }),
    projectStatus: Object.freeze({
      begin(generation) { return call("editor.status.begin", { generation }); },
      report(generation, event) { return call("editor.status.report", { generation, event }); },
      inspect() { return call("editor.status.inspect"); },
    }),
    projectOutput: Object.freeze({
      request(generation) { return call("editor.output.request", { generation }); },
    }),
    setTheme(theme) { return call("editor.theme", { theme }); },
  });
}

export async function mountResourcesProjectPreview(options) {
  const id = await requestFrontendService("editor.output.mount", {
    rootKey: options.rootKey,
    scripts: options.scripts,
    violations: options.violations?.map((error) => error.message) || [],
    tags: options.tags,
    files: options.files,
    allowedFetchOrigins: options.allowedFetchOrigins,
    allowedLinkPatterns: options.allowedLinkPatterns,
    environment: options.environment,
  });
  outputListeners.set(id, options.onViolation);
  return Object.freeze({
    inspect() { return call("output.inspect", { id }); },
    setContent(tree) { return call("output.setContent", { id, tree }); },
    load(project) { return requestFrontendService("output.load", { id, project }); },
    run(scripts) { return requestFrontendService("output.run", { id, scripts }); },
    destroy() { call("output.destroy", { id }); outputListeners.delete(id); },
  });
}

class FrontendHeaders {
  constructor(entries = []) { this.entries = new Map(entries.map(([name, value]) => [name.toLowerCase(), value])); }
  get(name) { return this.entries.get(String(name).toLowerCase()) || null; }
}

class FrontendResponse {
  constructor(value) {
    this.status = value.status;
    this.ok = value.status >= 200 && value.status < 300;
    this.url = value.url;
    this.headers = new FrontendHeaders(value.headers);
    this.bodyText = value.body;
  }
  text() { return Promise.resolve(this.bodyText); }
  json() { return Promise.resolve(JSON.parse(this.bodyText)); }
}

// The guest gets browser-shaped convenience, but the authority remains the
// typed msg/onmsg request handled by the bootstrap coordinator.
globalThis.fetch = async function frontendFetch(input, init = {}) {
  const response = await requestFrontendService("fetch", {
    url: String(input), method: String(init.method || "GET").toUpperCase(),
    headers: init.headers || {}, body: init.body == null ? null : String(init.body),
  });
  return new FrontendResponse(response);
};
