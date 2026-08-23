let listeners = null;
let nextRequest = 1;
const pending = new Map();
const outputListeners = new Map();

function callGuest(name, payload = {}) {
  try {
    const result = globalThis[name](JSON.stringify(payload));
    return result == null ? null : JSON.parse(result);
  } catch (error) {
    throw new Error(`${name}: ${error?.message || String(error)}`);
  }
}

function callHost(name, payload = {}) {
  return JSON.parse(globalThis.__wwcServiceCall(name, JSON.stringify(payload)));
}

function requestHost(name, payload = {}) {
  const id = nextRequest++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    globalThis.__wwcPostMessage(JSON.stringify({ protocol: "resources-editor-v1", id, name, payload }));
  });
}

const previousEditorReceive = globalThis.__resourcesEditorReceive;
globalThis.__resourcesEditorReceive = (json) => {
  const message = JSON.parse(json);
  if (message.type === "output-error") {
    outputListeners.get(message.id)?.(new Error(message.message));
    return "null";
  }
  const operation = pending.get(message.id);
  if (!operation) return previousEditorReceive ? previousEditorReceive(json) : "null";
  pending.delete(message.id);
  if (message.error) operation.reject(new Error(message.error));
  else operation.resolve(message.value);
  return "null";
};

globalThis.__resourcesEditorLocalReceive = (message) => {
  if (message.type === "change") listeners?.onChange?.(message.content,
    { syntaxErrors: message.syntaxErrors === true });
  else if (message.type === "ready") listeners?.onReady?.(message);
  else if (message.type === "limit") listeners?.onLimit?.(message);
};

class EditorResponse {
  constructor(value) {
    this.status = value.status;
    this.ok = value.status >= 200 && value.status < 300;
    this.url = value.url;
    this.body = value.body;
  }
  text() { return Promise.resolve(this.body); }
  json() { return Promise.resolve(JSON.parse(this.body)); }
}

globalThis.fetch = (input, init = {}) => requestHost("fetch", {
  url: String(input), method: String(init.method || "GET").toUpperCase(),
  headers: init.headers || {}, body: init.body == null ? null : String(init.body),
}).then((value) => new EditorResponse(value));

export function buildProject(files, config) { return requestHost("build.run", { files, config }); }
export function downloadProjectArchive(snapshot, name) { return callHost("archive.download", { snapshot, name }); }
export function importProjectArchive() { return requestHost("archive.import"); }
export function replaceFrontendPath(path) { return callHost("route.replace", { path }); }
export function frontendTheme() { return callHost("appearance.theme"); }

export async function mountResourcesProjectEditor(options) {
  listeners = options;
  return Object.freeze({
    setContent(content, language = "plain", settings = {}) {
      callGuest("__resourcesProjectSelectFile", { path: settings.path || "" });
      return callGuest("__codeEditorSetContent", { content, language, ...settings });
    },
    setSnapshot(snapshot) { return callGuest("__resourcesProjectSetSnapshot", { snapshot }); },
    command(payload) { return callGuest("__codeEditorCommand", payload); },
    inspect() { return callGuest("__codeEditorInspect"); },
    focus() { return callGuest("__codeEditorFocus"); },
    destroy() { listeners = null; },
    history: Object.freeze({
      initialize(value) { return callGuest("__resourcesProjectHistoryInitialize", value); },
      setCurrent(snapshot) { return callGuest("__resourcesProjectHistorySetCurrent", { snapshot }); },
      checkpoint(snapshot, settings = {}) { return callGuest("__resourcesProjectHistoryCheckpoint", {
        snapshot, now: settings.now || Date.now(), destructive: settings.destructive === true,
        checkpointIntervalMs: settings.checkpointIntervalMs,
      }); },
      inspect() { return callGuest("__resourcesProjectHistoryInspect"); },
    }),
    projectStatus: Object.freeze({
      begin(generation) { return callGuest("__resourcesProjectStatusBegin", { generation }); },
      report(generation, event) { return callGuest("__resourcesProjectStatusReport", { generation, event }); },
      inspect() { return callGuest("__resourcesProjectStatusInspect"); },
    }),
    projectOutput: Object.freeze({ request(generation) {
      return callGuest("__resourcesProjectRequestOutput", { generation });
    } }),
    setTheme(theme) { return callGuest("__codeEditorSetTheme", { theme }); },
  });
}

export async function mountResourcesProjectPreview(options) {
  callGuest("__resourcesProjectRequestOutput", { generation: Number(options.rootKey) });
  const id = await requestHost("output.mount", {
    rootKey: options.rootKey, scripts: options.scripts,
    violations: options.violations?.map((error) => error.message) || [], tags: options.tags,
    files: options.files, allowedFetchOrigins: options.allowedFetchOrigins,
    allowedLinkPatterns: options.allowedLinkPatterns, environment: options.environment,
  });
  outputListeners.set(id, options.onViolation);
  return Object.freeze({
    inspect() { return callHost("output.inspect", { id }); },
    setContent(tree) { return callHost("output.setContent", { id, tree }); },
    load(project) { return requestHost("output.load", { id, project }); },
    run(scripts) { return requestHost("output.run", { id, scripts }); },
    destroy() { callHost("output.destroy", { id }); outputListeners.delete(id); },
  });
}
