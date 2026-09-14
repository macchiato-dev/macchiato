import { PROJECT_RESOURCE_PREFIX } from "./project-session.js";

let listeners = null;
let nextRequest = 1;
const pending = new Map();

function callGuest(name, payload = {}) {
  try {
    const result = globalThis[name](JSON.stringify(payload));
    return result == null ? null : JSON.parse(result);
  } catch (error) {
    throw new Error(`${name}: ${error?.message || String(error)}`);
  }
}

function callHost(name, payload = {}) {
  const text = JSON.stringify(payload);
  // Fail inside the guest before the host's bounded-text check can unwind it.
  if (text.length > 2 * 1024 * 1024) throw new Error("Editor service request exceeds its text limit");
  return JSON.parse(globalThis.__wwcServiceCall(name, text));
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
  // Output IDs and request IDs are separate namespaces. An output error is
  // owned by the bootstrap even when its ID matches a pending UI request.
  if (message.type === "output-error") return previousEditorReceive ? previousEditorReceive(json) : "null";
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
  else if (message.type === "language-error") listeners?.onLanguageError?.(message);
  else if (message.type === "output-error") listeners?.onOutputError?.(new Error(message.message));
  else if (message.type === "output-ready") listeners?.onOutputReady?.();
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
export function navigationType() { return callHost("navigation.type"); }

export function readProjectRecovery(key) {
  const result = callHost("session.recovery", { key });
  // Host exceptions unwind Wasm; report recoverable storage failures as data
  // and throw here, where the application's try/catch can actually catch it.
  if (result.error) throw new Error(result.error);
  return result.value;
}

export function writeProjectRecovery(key, value) {
  const result = callHost("session.writeRecovery", { key, value });
  if (result.error) throw new Error(result.error);
}

export async function mountResourcesProjectEditor(options) {
  listeners = options;
  let lastContent, lastValue, firstChunk;
  function chunk(content, offset = 0) {
    if (content !== lastContent) {
      lastContent = content;
      lastValue = firstChunk = undefined;
    }
    if (offset === 0 && firstChunk) return firstChunk;
    const result = content.startsWith(PROJECT_RESOURCE_PREFIX)
      ? callHost("resource.read", { content, offset })
      : { content: content.slice(offset, offset + 64 * 1024), length: content.length,
        lines: offset === 0 ? content.split("\n").length : undefined };
    if (result.error) throw new Error(result.error);
    if (offset === 0) firstChunk = result;
    return result;
  }
  return Object.freeze({
    contentInfo(content) { return chunk(content); },
    readContent(content, offset) {
      if (!content.startsWith(PROJECT_RESOURCE_PREFIX)) {
        return offset === undefined ? content : content.slice(offset, offset + 64 * 1024);
      }
      if (offset !== undefined) return chunk(content, offset).content;
      if (content === lastContent && lastValue !== undefined) return lastValue;
      const first = chunk(content), parts = [first.content];
      let at = first.content.length;
      while (at < first.length) {
        const part = chunk(content, at).content;
        if (!part.length) throw new Error("Project resource ended before its declared length");
        parts.push(part);
        at += part.length;
      }
      return lastValue = parts.join("");
    },
    prepareSubmit() { return callHost("project.prepareSubmit"); },
    setContent(content, language = "plain", settings = {}) {
      callGuest("__resourcesProjectSelectFile", { path: settings.path || "" });
      return callGuest("__codeEditorSetContent", { content, language, ...settings });
    },
    setSnapshot(snapshot) { return callGuest("__resourcesProjectSetSnapshot", { snapshot }); },
    renderSnapshot() { return callGuest("__resourcesProjectRenderSnapshot"); },
    successfulOutput() { return callGuest("__resourcesProjectSuccessfulOutput"); },
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
