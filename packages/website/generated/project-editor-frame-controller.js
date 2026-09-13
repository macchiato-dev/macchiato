// packages/website/project-machines.js
import WasmWebMachine from "./machine.js";

// packages/project-editor/src/languages.js
var editorLanguages = [
  { name: "javascript", title: "JavaScript", extensions: ["js", "mjs", "cjs"], aliases: ["js"], package: "javascript" },
  { name: "jsx", title: "JSX", extensions: ["jsx"], aliases: [], package: "javascript" },
  { name: "typescript", title: "TypeScript", extensions: ["ts", "mts", "cts"], aliases: ["ts"], package: "javascript" },
  { name: "tsx", title: "TSX", extensions: ["tsx"], aliases: [], package: "javascript" },
  { name: "html", title: "HTML", extensions: ["html", "htm", "svg"], aliases: [], package: "html" },
  { name: "css", title: "CSS", extensions: ["css"], aliases: [], package: "css" },
  { name: "json", title: "JSON", extensions: ["json"], aliases: [], package: "json" },
  { name: "vue", title: "Vue", extensions: ["vue"], aliases: [], package: "vue" },
  { name: "svelte", title: "Svelte", extensions: ["svelte"], aliases: [], package: "svelte" },
  { name: "markdown", title: "Markdown", extensions: ["md", "markdown"], aliases: ["md"], package: "markdown" },
  { name: "python", title: "Python", extensions: ["py", "pyw", "pyi"], aliases: ["py"], package: "python" },
  { name: "rust", title: "Rust", extensions: ["rs"], aliases: ["rs"], package: "rust" },
  { name: "sql", title: "SQL", extensions: ["sql"], aliases: [], package: "sql" },
  { name: "yaml", title: "YAML", extensions: ["yaml", "yml"], aliases: ["yml"], package: "yaml" },
  { name: "cpp", title: "C/C++", extensions: ["c", "h", "cc", "cpp", "cxx", "hpp", "hxx"], aliases: ["c", "c++"], package: "cpp" }
];

// packages/website/storage-service.js
var replyLimit = 2 * 1024 * 1024;
var smallValueLimit = (replyLimit - JSON.stringify({ value: "", error: null }).length) / 6;

// packages/website/project-output-session.js
var encoder = new TextEncoder();

// packages/website/project-machines.js
var encoder2 = new TextEncoder();
var decoder = new TextDecoder();
var runtimeModules = /* @__PURE__ */ new Map();
var editorBytecodeNames = new Set(editorLanguages.map((item) => `language-${item.package}.bin`));
var editorBytecodes = /* @__PURE__ */ new Map();
function editorBytecode(name) {
  if (!editorBytecodeNames.has(name)) throw new Error("Editor bytecode resource is not granted");
  if (!editorBytecodes.has(name)) editorBytecodes.set(
    name,
    fetch(`/-/resources-site/project-editor-${name}`, { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) throw new Error(`Editor bytecode response ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 1e6) throw new Error("Editor bytecode exceeds its size limit");
      return bytes;
    }).catch((error) => {
      editorBytecodes.delete(name);
      throw error;
    })
  );
  return editorBytecodes.get(name);
}
var nextMachine = 1;
async function moduleFor(url) {
  if (!runtimeModules.has(url)) runtimeModules.set(url, fetch(url, { credentials: "same-origin" }).then((response) => {
    if (!response.ok) throw new Error(`Project runtime response ${response.status}`);
    return WebAssembly.compileStreaming(response);
  }).catch((error) => {
    runtimeModules.delete(url);
    throw error;
  }));
  return runtimeModules.get(url);
}
function callMessage(name, payload) {
  const fn = encoder2.encode(name), argument = encoder2.encode(JSON.stringify(payload)), message = new Uint8Array(2 + fn.length + argument.length);
  message[0] = 2;
  message.set(fn, 1);
  message.set(argument, fn.length + 2);
  return message;
}
function loadProjectEditorModule() {
  return moduleFor("/-/resources-site/project-editor-quickjs-runtime.wasm");
}
async function createProjectEditorMachine({
  root,
  onChange,
  onReady,
  onLimit,
  onError,
  onRequest,
  services,
  limits,
  resolveImage,
  allowNavigate = false,
  module: suppliedModule
}) {
  const module = suppliedModule || await loadProjectEditorModule();
  const sections = WebAssembly.Module.customSections(module, "wasm-web-machine");
  const machineId = `wasm-web-machine-${nextMachine++}`;
  let response, machineError, starting = true, machineStage = "startup";
  let installedName, disposed = false;
  const installedPrograms = /* @__PURE__ */ new Map();
  function installBytecode({ name }) {
    if (!installedPrograms.has(name)) installedPrograms.set(name, editorBytecode(name).then((bytes) => {
      if (disposed) throw new Error("Editor was closed during bytecode loading");
      const label = encoder2.encode(name + "\0");
      const packet = new Uint8Array(1 + label.length + bytes.length);
      packet[0] = 3;
      packet.set(label, 1);
      packet.set(bytes, 1 + label.length);
      installedName = void 0;
      machine.onmsg(packet);
      if (installedName !== name) throw new Error("Editor bytecode installation did not acknowledge");
      return null;
    }).catch((error) => {
      installedPrograms.delete(name);
      throw error;
    }));
    return installedPrograms.get(name);
  }
  const machine = new WasmWebMachine(module, root, {
    allowNavigate,
    resolveImage,
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : void 0,
    services,
    onMessage(text) {
      if (text.startsWith("__wwcBytecode:")) {
        installedName = text.slice(14);
        return;
      }
      if (text.startsWith("__wwcError:")) {
        machineError = `${machineStage}: ${text.slice(11)}`;
        const error = new Error(machineError);
        if (!starting) queueMicrotask(() => {
          if (!disposed) onError?.(error);
        });
        return;
      }
      if (text.startsWith("__wwcResponse:")) {
        response = text.slice(14);
        return;
      }
      const message = JSON.parse(text);
      if (message.type === "editor-bytecode-started" && root.dataset) root.dataset.editorBytecodeState = "started";
      if (message.type === "editor-application-ready" && root.dataset) root.dataset.editorApplicationState = "ready";
      if (message.protocol === "resources-editor-v1") {
        Promise.resolve().then(() => message.name === "bytecode.load" ? installBytecode(message.payload || {}) : onRequest(message.name, message.payload || {})).then(
          (value) => !disposed && machine.onmsg(callMessage("__resourcesEditorReceive", { id: message.id, value })),
          (error) => !disposed && machine.onmsg(callMessage("__resourcesEditorReceive", {
            id: message.id,
            error: error?.message || String(error)
          }))
        );
        return;
      }
      queueMicrotask(() => {
        if (disposed) return;
        if (message.type === "change") onChange(message.content, { syntaxErrors: message.syntaxErrors === true });
        else if (message.type === "ready") onReady?.(message);
        else if (message.type === "limit") onLimit?.(message);
        else if (message.type === "language-error") onError?.(new Error(`Language ${message.language}: ${message.message}`));
      });
    }
  });
  try {
    await machine.onmsg(0);
    if (machineError) throw new Error(machineError);
    starting = false;
    machineStage = "idle";
    if (limits !== false) call("__codeEditorConfigureLimits", limits || { maxLines: 5e3, maxCharacters: 1e6 });
  } catch (error) {
    disposed = true;
    machine.destroy();
    throw error;
  }
  function call(name, payload) {
    if (disposed) throw new Error("Editor is closed");
    if (!/^__[A-Za-z0-9_]+$/.test(name)) throw new TypeError("Guest function name is invalid");
    response = machineError = void 0;
    machineStage = `call ${name}`;
    machine.onmsg(callMessage("__resourcesEditorCall", { name, value: payload }));
    if (machineError) throw new Error(machineError);
    if (response === void 0) throw new Error(`Guest function ${name} did not respond`);
    machineStage = "idle";
    return JSON.parse(response);
  }
  return Object.freeze({
    machineId,
    setContent(content, language = "plain", options = {}) {
      return call("__codeEditorSetContent", { content, language, ...options });
    },
    command: (payload) => call("__codeEditorCommand", payload),
    callGuest: call,
    receive(message) {
      if (!disposed) machine.onmsg(callMessage("__resourcesEditorReceive", message));
    },
    inspect: () => ({ ...call("__codeEditorInspect", {}), machine: { machineId } }),
    focus() {
      if (!disposed) root.querySelector(".cm-content")?.focus();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      machine.destroy();
      if (root.nodeType === 9) root.body?.replaceChildren();
      else root.replaceChildren();
    }
  });
}

// packages/website/project-editor-frame-controller.js
var started = false;
window.__resourcesCreateEditor = (options) => {
  if (started) throw new Error("Editor frame already has an owner");
  started = true;
  const module = structuredClone(options.module);
  return createProjectEditorMachine({ ...options, module, root: document, limits: false });
};
