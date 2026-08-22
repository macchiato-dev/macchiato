import WasmWebMachine from "../../dev/wasm-web-machine/dist/module/wasm-web-machine.js";
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
  if (options.environment?.language) await machine.onmsg(taggedMessage(1,
    `globalThis.navigator=Object.assign(globalThis.navigator||{},{language:${JSON.stringify(options.environment.language)}});`));
  for (const script of scripts) { await machine.onmsg(taggedMessage(1, script.code));
    if (reportedError) { machine.destroy(); throw reportedError; }
  }
  let programs = scripts.length;
  starting = false;
  function call(name, payload) {
    response = undefined;
    machine.onmsg(callMessage(name, payload));
    if (response === undefined) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(response);
  }
  return Object.freeze({
    setContent(tree) { return call("__resourcesOutputSetContent", tree); },
    async run(nextScripts) {
      reportedError = null;
      for (const script of nextScripts) await machine.onmsg(taggedMessage(1, script.code));
      if (reportedError) throw reportedError;
      programs += nextScripts.length;
    },
    destroy() { destroyed = true; machine.destroy(); },
    inspect() { return { runtime: "quickjs", programs, machine: { machineId } }; },
  });
}
export async function createProjectAppMachine(root) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  let requested = false;
  const machine = new WasmWebMachine(module, root, { onMessage(text) { requested ||= text === "mount-project-editor"; } });
  const machineId = `wasm-web-machine-${nextMachine++}`;
  await machine.onmsg(0); await machine.onmsg(taggedMessage(1, "__wwcPostMessage('mount-project-editor')"));
  if (!requested) throw new Error("Project app did not request its editor");
  return Object.freeze({ machineId, destroy() { machine.destroy(); } });
}
export async function createProjectEditorMachine({ root, onChange, onReady, onLimit, limits }) {
  const module = await moduleFor("/-/resources-site/project-editor-quickjs-runtime.wasm");
  const machineId = `wasm-web-machine-${nextMachine++}`;
  let response, machineError, outputRequest = 0;
  const machine = new WasmWebMachine(module, root, { onMessage(text) {
    if (text.startsWith("__wwcError:")) { machineError = text.slice(11); return; }
    if (text.startsWith("__wwcResponse:")) { response = text.slice(14); return; }
    const message = JSON.parse(text);
    if (message.type === "mount-project-output") outputRequest = message.generation;
    queueMicrotask(() => { if (message.type === "change") onChange(message.content, { syntaxErrors: message.syntaxErrors === true });
      else if (message.type === "ready") onReady?.(message);
      else if (message.type === "limit") onLimit?.(message);
    });
  } });
  await machine.onmsg(0); if (machineError) throw new Error(machineError);
  function call(name, payload) {
    if (!/^__[A-Za-z0-9_]+$/.test(name)) throw new TypeError("Guest function name is invalid");
    response = machineError = undefined; machine.onmsg(callMessage(name, payload));
    if (machineError) throw new Error(machineError); if (response === undefined) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(response);
  }
  call("__codeEditorConfigureLimits", limits || { maxLines: 5_000, maxCharacters: 1_000_000 });
  return Object.freeze({ setContent: (content, language = "plain", options = {}) => call("__codeEditorSetContent", { content, language, ...options }),
    command: (payload) => call("__codeEditorCommand", payload), callGuest: call,
    requestOutput(generation) {
      outputRequest = 0; const result = call("__resourcesProjectRequestOutput", { generation });
      if (!result.requested || outputRequest !== generation) throw new Error("Project editor did not request its output machine");
      return result; },
    inspect: () => ({ ...call("__codeEditorInspect", {}), machine: { machineId } }),
    focus() { root.querySelector(".cm-content")?.focus(); }, destroy() { machine.destroy(); root.replaceChildren(); } });
}
