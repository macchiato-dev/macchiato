import WasmWebMachine from "../../dev/wasm-web-machine/dist/module/wasm-web-machine.js";
import { PROJECT_EDITOR_LANGUAGES } from "./generated/project-editor-languages.js";
const encoder = new TextEncoder(), decoder = new TextDecoder(), runtimeModules = new Map();
let nextMachine = 1;
async function moduleFor(url) {
  if (!runtimeModules.has(url)) runtimeModules.set(url, fetch(url, { credentials: "same-origin" }).then((response) => {
    if (!response.ok) throw new Error(`Project runtime response ${response.status}`);
    return WebAssembly.compileStreaming(response);
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
  return async (value) => {
    const url = new URL(value);
    if (url.protocol !== "https:" || !origins.has(url.origin)) throw new Error(`Fetch blocked for ${url.origin}`);
    const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" }), bytes = new Uint8Array(await response.arrayBuffer());
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
  return async (value) => {
    if (/^https:\/\//.test(value)) return remoteFetch(value);
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
export async function createProjectOutputMachine({ root, scripts, options = {}, onError }) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  let reportedError = null, response, starting = true, destroyed = false, machine;
  async function answerFetch(request) {
    try {
      if (typeof options.fetchResource !== "function") throw new Error("Project network access is disabled");
      const result = await options.fetchResource(request.url), reply = { id: request.id, ...result };
      if (!destroyed) machine.onmsg(callMessage("__resourcesFetchResolve", reply));
    } catch (error) { if (!destroyed) machine.onmsg(callMessage("__resourcesFetchResolve", { id: request.id, error: error.message })); }
  }
  machine = new WasmWebMachine(module, root, { ...options, onMessage(text) {
    if (text.startsWith("__wwcResponse:")) { response = text.slice(14); return; }
    if (text.startsWith("__wwcError:") && !reportedError) {
      reportedError = new Error(text.slice(11));
      if (!starting) queueMicrotask(() => onError?.(reportedError));
      return;
    }
    try {
      const request = JSON.parse(text);
      if (request.type === "fetch" && Number.isSafeInteger(request.id) && typeof request.url === "string")
        return void answerFetch(request);
    } catch {}
    options.onMessage?.(text);
  } });
  const machineId = `wasm-web-machine-${nextMachine++}`;
  await machine.onmsg(0);
  async function evaluate(script, index) {
    reportedError = null;
    await machine.onmsg(taggedMessage(1, script.code));
    if (!reportedError) return;
    const source = typeof script?.source === "string" && script.source ? script.source : `script ${index + 1}`;
    throw new Error(`${source}: ${reportedError.message}`);
  }
  try {
    for (let index = 0; index < scripts.length; index++) await evaluate(scripts[index], index);
  } catch (error) { machine.destroy(); throw error; }
  let programs = scripts.length;
  starting = false;
  function call(name, payload) {
    response = undefined;
    reportedError = null;
    try { machine.onmsg(callMessage(name, payload)); }
    catch (error) { throw new Error(`${name}: ${error?.message || String(error)}`); }
    if (reportedError) throw new Error(`${name}: ${reportedError.message}`);
    if (response === undefined) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(response);
  }
  return Object.freeze({
    setContent(tree) {
      const result = call("__resourcesOutputSetContent", tree);
      machine.onmsg(0);
      return result;
    },
    async run(nextScripts) {
      for (let index = 0; index < nextScripts.length; index++) await evaluate(nextScripts[index], index);
      programs += nextScripts.length;
    },
    async load(project) {
      const result = call("__resourcesOutputLoad", {
        tree: project.tree || [],
        stylesheets: project.stylesheets || [],
      });
      machine.onmsg(0);
      const nextScripts = project.scripts || [];
      for (let index = 0; index < nextScripts.length; index++) await evaluate(nextScripts[index], index);
      programs += nextScripts.length;
      return result;
    },
    destroy() { destroyed = true; machine.destroy(); },
    inspect() { return { runtime: "quickjs", programs, machine: { machineId } }; },
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
  let requested = false, machineError = null;
  const machine = new WasmWebMachine(module, root, { onMessage(text) {
    requested ||= text === "mount-project-editor";
    if (text.startsWith("__wwcError:")) machineError ||= text.slice(11);
  } });
  const machineId = `wasm-web-machine-${nextMachine++}`;
  await machine.onmsg(0); await machine.onmsg(taggedMessage(1, "__wwcPostMessage('mount-project-editor')"));
  if (!requested) throw new Error(machineError || "Project app did not request its editor");
  return Object.freeze({ machineId, destroy() { machine.destroy(); } });
}
export async function createProjectEditorMachine({ root, onChange, onReady,
  onLimit, onError, onRequest, services, limits }) {
  const module = await moduleFor("/-/resources-site/project-editor-quickjs-runtime.wasm");
  const sections = WebAssembly.Module.customSections(module, "wasm-web-machine");
  const machineId = `wasm-web-machine-${nextMachine++}`;
  let response, machineError, starting = true, machineStage = "startup";
  const machine = new WasmWebMachine(module, root, {
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : undefined,
    services,
    onMessage(text) {
    if (text.startsWith("__wwcError:")) {
      machineError = `${machineStage}: ${text.slice(11)}`;
      if (!starting) queueMicrotask(() => onError?.(new Error(machineError)));
      return;
    }
    if (text.startsWith("__wwcResponse:")) { response = text.slice(14); return; }
    const message = JSON.parse(text);
    if (message.type === "editor-bytecode-started") root.dataset.editorBytecodeState = "started";
    if (message.type === "editor-application-ready") root.dataset.editorApplicationState = "ready";
      if (message.protocol === "resources-editor-v1") {
        Promise.resolve().then(() => onRequest(message.name, message.payload || {})).then(
        (value) => machine.onmsg(callMessage("__resourcesEditorReceive", { id: message.id, value })),
        (error) => machine.onmsg(callMessage("__resourcesEditorReceive", {
          id: message.id, error: error?.message || String(error),
        })),
      );
      return;
    }
    queueMicrotask(() => { if (message.type === "change") onChange(message.content, { syntaxErrors: message.syntaxErrors === true });
      else if (message.type === "ready") onReady?.(message);
      else if (message.type === "limit") onLimit?.(message);
    });
    },
  });
  await machine.onmsg(0); if (machineError) throw new Error(machineError);
  starting = false; machineStage = "idle";
  const loadedLanguages = new Set();
  function ensureLanguage(name) {
    const requested = name === "markdown"
      ? ["javascript", "html", "css", "json", "vue", "svelte", "markdown"] : [name];
    for (const language of requested) {
      if (loadedLanguages.has(language) || !PROJECT_EDITOR_LANGUAGES[language]) continue;
      machineError = undefined;
      machineStage = `language ${language}`;
      machine.onmsg(taggedMessage(1, PROJECT_EDITOR_LANGUAGES[language]));
      if (machineError) throw new Error(machineError);
      machineStage = "idle";
      loadedLanguages.add(language);
      if (language === "javascript") loadedLanguages.add("typescript");
    }
  }
  function call(name, payload) {
    if (!/^__[A-Za-z0-9_]+$/.test(name)) throw new TypeError("Guest function name is invalid");
    response = machineError = undefined; machineStage = `call ${name}`;
    machine.onmsg(callMessage(name, payload));
    if (machineError) throw new Error(machineError); if (response === undefined) throw new Error(`Guest function ${name} did not respond`);
    machineStage = "idle";
    return JSON.parse(response);
  }
  if (limits !== false) call("__codeEditorConfigureLimits", limits || { maxLines: 5_000, maxCharacters: 1_000_000 });
  return Object.freeze({ machineId, setContent(content, language = "plain", options = {}) {
      ensureLanguage(language);
      return call("__codeEditorSetContent", { content, language, ...options });
    },
    command: (payload) => call("__codeEditorCommand", payload), callGuest: call,
    inspect: () => ({ ...call("__codeEditorInspect", {}),
      machine: { machineId, languages: [...loadedLanguages] } }),
    focus() { root.querySelector(".cm-content")?.focus(); }, destroy() { machine.destroy(); root.replaceChildren(); } });
}
