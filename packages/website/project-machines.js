import WasmWebMachine from "../../dev/wasm-web-machine/dist/module/wasm-web-machine.js";
import { editorLanguages } from "../project-editor/src/languages.js";
import { ProjectOutput } from "./project-output-session.js";
import { QuickJSRuntime } from "../../dev/wasm-web-runtimes/quickjs/context-runtime.js";
import { urlMatchesAllowedPatterns } from "../hub/src/url-pattern.js";
const encoder = new TextEncoder(), decoder = new TextDecoder(), runtimeModules = new Map();
const editorBytecodeNames = new Set(editorLanguages.map(item => `language-${item.package}.bin`));
const editorBytecodes = new Map();
function editorBytecode(name) {
  if (!editorBytecodeNames.has(name)) throw new Error("Editor bytecode resource is not granted");
  if (!editorBytecodes.has(name)) editorBytecodes.set(name,
    fetch(`/-/resources-site/project-editor-${name}`, { credentials: "same-origin" }).then(async response => {
      if (!response.ok) throw new Error(`Editor bytecode response ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 1_000_000) throw new Error("Editor bytecode exceeds its size limit");
      return bytes;
    }).catch(error => { editorBytecodes.delete(name); throw error; }));
  return editorBytecodes.get(name);
}
let nextMachine = 1;
async function moduleFor(url) {
  if (!runtimeModules.has(url)) runtimeModules.set(url, fetch(url, { credentials: "same-origin" }).then((response) => {
    if (!response.ok) throw new Error(`Project runtime response ${response.status}`);
    return WebAssembly.compileStreaming(response);
  }).catch(error => {
    // Share downloads/compilation, but let the next user action recover from
    // a transient network or compilation failure without reloading the page.
    runtimeModules.delete(url);
    throw error;
  }));
  return runtimeModules.get(url);
}
function taggedMessage(tag, value) {
  const bytes = encoder.encode(value), message = new Uint8Array(bytes.length + 1);
  message[0] = tag; message.set(bytes, 1); return message;
}
function callMessage(name, payload) {
  const fn = encoder.encode(name), argument = encoder.encode(JSON.stringify(payload)), message = new Uint8Array(2 + fn.length + argument.length);
  message[0] = 2; message.set(fn, 1); message.set(argument, fn.length + 2); return message;
}
export function createConstrainedFetch(allowedOrigins = [], maxBytes = 1_048_576) {
  const origins = new Set(allowedOrigins.map((value) => new URL(value).origin));
  return async (value, { signal } = {}) => {
    const url = new URL(value);
    if (url.protocol !== "https:" || !origins.has(url.origin)) throw new Error(`Fetch blocked for ${url.origin}`);
    const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", signal }), bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error(`Fetch response exceeds ${maxBytes} bytes`);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    const mime = response.headers.get("content-type")?.split(";", 1)[0] || "application/octet-stream";
    return { status: response.status, body: decoder.decode(bytes), resourceUrl: `data:${mime};base64,${btoa(binary)}` };
  }; }
export function createProjectFetch(files = [], allowedOrigins = [], maxBytes = 1_048_576) {
  const projectFiles = new Map(files.map((file) => [file.path, file]));
  const remoteFetch = createConstrainedFetch(allowedOrigins, maxBytes);
  return async (value, options) => {
    if (/^https:\/\//.test(value)) return remoteFetch(value, options);
    if (typeof value !== "string" || value.includes("?") || value.includes("#"))
      throw new Error("Project file fetch requires a relative file path");
    const path = value.replace(/^\.\//, "");
    if (!path || path.startsWith("/") || path.split("/").includes(".."))
      throw new Error("Project file fetch path is invalid");
    const file = projectFiles.get(path);
    if (!file) throw new Error(`Project file not found: ${path}`);
    const extension = path.split(".").at(-1).toLowerCase();
    const mime = { css: "text/css", gif: "image/gif", html: "text/html", jpeg: "image/jpeg",
      jpg: "image/jpeg", js: "text/javascript", json: "application/json", png: "image/png",
      svg: "image/svg+xml", txt: "text/plain" }[extension] || "application/octet-stream";
    const data = /^data:([^;,]+);base64,(.*)$/s.exec(file.content);
    let bytes;
    if (data) bytes = Uint8Array.from(atob(data[2]), (character) => character.charCodeAt(0));
    else bytes = encoder.encode(file.content);
    if (bytes.byteLength > maxBytes) throw new Error(`Project file exceeds ${maxBytes} bytes: ${path}`);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return { status: 200, body: data ? "" : file.content, resourceUrl: `data:${mime};base64,${btoa(binary)}` };
  };
}
export function createProjectImageResolver(files = []) {
  const images = new Map();
  for (const file of files) {
    if (/^data:image\/(?:gif|jpeg|png|webp);base64,/i.test(file.content)) images.set(file.path, file.content);
    else if (file.path.toLowerCase().endsWith(".svg")) {
      const bytes = encoder.encode(file.content);
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      images.set(file.path, `data:image/svg+xml;base64,${btoa(binary)}`);
    }
  }
  return (value) => images.get(String(value).replace(/^\.\//, "")) || value;
}
export async function createProjectOutputMachine({ root, scripts = [], project, options = {}, onError }) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  const output = new ProjectOutput(WasmWebMachine, module, root, project => {
    const files = project.files || options.files || [];
    return { ...options, files,
      environment: { ...options.environment, ...project.environment },
      fetchResource: options.fetchResource ?? createProjectFetch(files, project.allowedFetchOrigins || []),
      resolveImage: options.resolveImage ?? createProjectImageResolver(files),
      allowNavigate: options.allowNavigate ?? (url => urlMatchesAllowedPatterns(url, project.allowedLinkPatterns || [])),
    };
  }, onError);
  try { await output.load(project ?? { scripts, files: options.files }); }
  catch (error) { output.destroy(); throw error; }
  const machineId = `wasm-web-machine-${nextMachine++}`;
  return Object.freeze({
    setContent: output.setContent, run: output.run, load: output.load, destroy: output.destroy,
    inspect: () => ({ ...output.inspect(), machine: { machineId } }),
  });
}
export async function createProjectBuildMachine() {
  const module = await moduleFor("/-/resources-site/project-builder-quickjs-runtime.wasm");
  let response, machineError;
  const machine = new WasmWebMachine(module, null, { onMessage(text) {
    if (text.startsWith("__wwcResponse:")) response = text.slice(14);
    else if (text.startsWith("__wwcError:")) machineError = text.slice(11);
  } });
  await machine.onmsg(0);
  return Object.freeze({
    compile(source) {
      response = undefined;
      machineError = undefined;
      machine.onmsg(callMessage("__resourcesBuildProject", { source }));
      if (machineError) throw new Error(machineError);
      if (response === undefined) throw new Error("Project build machine did not respond");
      return JSON.parse(response);
    },
    compileFiles(files, config) {
      response = machineError = undefined;
      machine.onmsg(callMessage("__resourcesCompileFiles", { files, config }));
      if (machineError) throw new Error(machineError);
      if (response === undefined) throw new Error("Project build machine did not respond");
      const result = JSON.parse(response);
      if (!result?.ok) throw new Error(result?.error || result?.stack || "Project compilation failed");
      return result.value;
    },
    build(files, config) {
      response = undefined;
      machineError = undefined;
      machine.onmsg(callMessage("__resourcesBuildFiles", { files, config }));
      if (machineError) throw new Error(machineError);
      if (response === undefined) throw new Error("Project build machine did not respond");
      return JSON.parse(response);
    },
    destroy() { machine.destroy(); },
  });
}
export async function createProjectAppMachine(root) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  const runtime = new QuickJSRuntime(module);
  let requested = false, machineError = null;
  const machine = new WasmWebMachine(runtime.createSession(), root, { onMessage(text) {
    requested ||= text === "mount-project-editor";
    if (text.startsWith("__wwcError:")) machineError ||= text.slice(11);
  } });
  const machineId = `wasm-web-machine-${nextMachine++}`;
  await machine.onmsg(0); await machine.onmsg(taggedMessage(1, "__wwcPostMessage('mount-project-editor')"));
  if (!requested) throw new Error(machineError || "Project app did not request its editor");
  return Object.freeze({ machineId, destroy() { machine.destroy(); runtime.destroy(); } });
}
export function loadProjectEditorModule() {
  return moduleFor("/-/resources-site/project-editor-quickjs-runtime.wasm");
}
export async function createProjectEditorMachine({ root, onChange, onReady,
  onLimit, onError, onRequest, services, limits, resolveImage, allowNavigate = false,
  module: suppliedModule }) {
  const module = suppliedModule || await loadProjectEditorModule();
  const sections = WebAssembly.Module.customSections(module, "wasm-web-machine");
  const machineId = `wasm-web-machine-${nextMachine++}`;
  let response, machineError, starting = true, machineStage = "startup";
  let installedName, disposed = false;
  const installedPrograms = new Map();
  function installBytecode({ name }) {
    if (!installedPrograms.has(name)) installedPrograms.set(name, editorBytecode(name).then(bytes => {
      if (disposed) throw new Error("Editor was closed during bytecode loading");
      const label = encoder.encode(name + "\0");
      const packet = new Uint8Array(1 + label.length + bytes.length);
      packet[0] = 3; packet.set(label, 1); packet.set(bytes, 1 + label.length);
      installedName = undefined;
      machine.onmsg(packet);
      if (installedName !== name) throw new Error("Editor bytecode installation did not acknowledge");
      return null;
    }).catch(error => { installedPrograms.delete(name); throw error; }));
    return installedPrograms.get(name);
  }
  const machine = new WasmWebMachine(module, root, {
    allowNavigate,
    resolveImage,
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : undefined,
    services,
    onMessage(text) {
    if (text.startsWith("__wwcBytecode:")) { installedName = text.slice(14); return; }
    if (text.startsWith("__wwcError:")) {
      machineError = `${machineStage}: ${text.slice(11)}`;
      if (!starting) queueMicrotask(() => onError?.(new Error(machineError)));
      return;
    }
    if (text.startsWith("__wwcResponse:")) { response = text.slice(14); return; }
    const message = JSON.parse(text);
    if (message.type === "editor-bytecode-started" && root.dataset) root.dataset.editorBytecodeState = "started";
    if (message.type === "editor-application-ready" && root.dataset) root.dataset.editorApplicationState = "ready";
      if (message.protocol === "resources-editor-v1") {
        Promise.resolve().then(() => message.name === "bytecode.load"
          ? installBytecode(message.payload || {}) : onRequest(message.name, message.payload || {})).then(
        (value) => !disposed && machine.onmsg(callMessage("__resourcesEditorReceive", { id: message.id, value })),
        (error) => !disposed && machine.onmsg(callMessage("__resourcesEditorReceive", {
          id: message.id, error: error?.message || String(error),
        })),
      );
      return;
    }
    queueMicrotask(() => { if (message.type === "change") onChange(message.content, { syntaxErrors: message.syntaxErrors === true });
      else if (message.type === "ready") onReady?.(message);
      else if (message.type === "limit") onLimit?.(message);
      else if (message.type === "language-error") onError?.(new Error(`Language ${message.language}: ${message.message}`));
    });
    },
  });
  await machine.onmsg(0); if (machineError) throw new Error(machineError);
  starting = false; machineStage = "idle";
  function call(name, payload) {
    if (!/^__[A-Za-z0-9_]+$/.test(name)) throw new TypeError("Guest function name is invalid");
    response = machineError = undefined; machineStage = `call ${name}`;
    machine.onmsg(callMessage("__resourcesEditorCall", { name, value: payload }));
    if (machineError) throw new Error(machineError); if (response === undefined) throw new Error(`Guest function ${name} did not respond`);
    machineStage = "idle";
    return JSON.parse(response);
  }
  if (limits !== false) call("__codeEditorConfigureLimits", limits || { maxLines: 5_000, maxCharacters: 1_000_000 });
  return Object.freeze({ machineId, setContent(content, language = "plain", options = {}) {
      return call("__codeEditorSetContent", { content, language, ...options });
    },
    command: (payload) => call("__codeEditorCommand", payload), callGuest: call,
    receive(message) {
      if (!disposed) machine.onmsg(callMessage("__resourcesEditorReceive", message));
    },
    inspect: () => ({ ...call("__codeEditorInspect", {}), machine: { machineId } }),
    focus() { root.querySelector(".cm-content")?.focus(); }, destroy() {
      disposed = true; machine.destroy();
      // A Document grant owns its content, not the browser's Document itself.
      if (root.nodeType === 9) root.body?.replaceChildren();
      else root.replaceChildren();
    } });
}
