import WasmWebMachine from "./machine.js";

const protocol = "resources-project-output-machine-v1";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let machine = null;
let response;
let reportedError;
let programs = 0;
let fetchResourceImpl = null;
let imageResolverImpl = (value) => value;
let navigationPatterns = [];

function taggedMessage(tag, value) {
  const bytes = encoder.encode(value);
  const message = new Uint8Array(bytes.length + 1);
  message[0] = tag;
  message.set(bytes, 1);
  return message;
}

function callMessage(name, payload) {
  const fn = encoder.encode(name);
  const argument = encoder.encode(JSON.stringify(payload));
  const message = new Uint8Array(2 + fn.length + argument.length);
  message[0] = 2;
  message.set(fn, 1);
  message.set(argument, fn.length + 2);
  return message;
}

function projectFetch(files, allowedOrigins, maxBytes = 1_048_576) {
  const projectFiles = new Map(files.map((file) => [file.path, file]));
  const origins = new Set(allowedOrigins.map((value) => new URL(value).origin));
  return async (value) => {
    if (/^https:\/\//.test(value)) {
      const url = new URL(value);
      if (!origins.has(url.origin)) throw new Error(`Fetch blocked for ${url.origin}`);
      const reply = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" });
      const bytes = new Uint8Array(await reply.arrayBuffer());
      if (bytes.byteLength > maxBytes) throw new Error(`Fetch response exceeds ${maxBytes} bytes`);
      return resourceResult(bytes, reply.headers.get("content-type")?.split(";", 1)[0]);
    }
    if (typeof value !== "string" || value.includes("?") || value.includes("#"))
      throw new Error("Project file fetch requires a relative file path");
    const path = value.replace(/^\.\//, "");
    if (!path || path.startsWith("/") || path.split("/").includes(".."))
      throw new Error("Project file fetch path is invalid");
    const file = projectFiles.get(path);
    if (!file) throw new Error(`Project file not found: ${path}`);
    const data = /^data:([^;,]+);base64,(.*)$/s.exec(file.content);
    const bytes = data ? Uint8Array.from(atob(data[2]), (character) => character.charCodeAt(0)) : encoder.encode(file.content);
    if (bytes.byteLength > maxBytes) throw new Error(`Project file exceeds ${maxBytes} bytes: ${path}`);
    return resourceResult(bytes, data?.[1] || mimeFor(path), data ? "" : file.content);
  };
}

function mimeFor(path) {
  return { css: "text/css", gif: "image/gif", html: "text/html", jpeg: "image/jpeg", jpg: "image/jpeg",
    js: "text/javascript", json: "application/json", png: "image/png", svg: "image/svg+xml",
    txt: "text/plain" }[path.split(".").at(-1).toLowerCase()] || "application/octet-stream";
}

function resourceResult(bytes, mime = "application/octet-stream", body) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return { status: 200, body: body ?? decoder.decode(bytes), resourceUrl: `data:${mime};base64,${btoa(binary)}` };
}

function imageResolver(files) {
  const images = new Map();
  for (const file of files) {
    if (/^data:image\/(?:gif|jpeg|png|webp);base64,/i.test(file.content)) images.set(file.path, file.content);
    else if (file.path.toLowerCase().endsWith(".svg"))
      images.set(file.path, resourceResult(encoder.encode(file.content), "image/svg+xml").resourceUrl);
  }
  return (value) => images.get(String(value).replace(/^\.\//, "")) || value;
}

function allowsNavigation(value, patterns) {
  if (String(value).length <= 2048 && /^#[^\u0000-\u001f\u007f]*$/.test(String(value))) return true;
  return patterns.some((pattern) => {
    if (pattern.startsWith("`") && pattern.endsWith("`")) return value === pattern.slice(1, -1);
    const slash = pattern.indexOf("/");
    if (slash < 0) return false;
    try {
      const url = new URL(value);
      const host = pattern.slice(0, slash).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^.]+");
      const path = pattern.slice(slash).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
      return /^https?:$/.test(url.protocol) && new RegExp(`^${host}$`, "i").test(url.hostname) &&
        new RegExp(`^${path}$`).test(`${url.pathname}${url.search}${url.hash}`);
    } catch { return false; }
  });
}

async function evaluate(script, index) {
  reportedError = null;
  await machine.onmsg(taggedMessage(1, script.code));
  if (reportedError) throw new Error(`${script.source || `script ${index + 1}`}: ${reportedError.message}`);
}

function call(name, payload) {
  response = undefined;
  reportedError = null;
  machine.onmsg(callMessage(name, payload));
  if (reportedError) throw new Error(`${name}: ${reportedError.message}`);
  if (response === undefined) throw new Error(`Guest function ${name} did not respond`);
  return JSON.parse(response);
}

async function start(payload, port) {
  const runtime = await WebAssembly.compileStreaming(fetch("./project-quickjs-runtime.wasm"));
  fetchResourceImpl = projectFetch(payload.files || [], payload.allowedFetchOrigins || []);
  imageResolverImpl = imageResolver(payload.files || []);
  navigationPatterns = payload.allowedLinkPatterns || [];
  machine = new WasmWebMachine(runtime, document.getElementById("project-output-a"), {
    environment: payload.environment || {},
    frameInterval: () => document.activeElement?.closest(".cm-editor") ? 1_000 : 50,
    fetchResource: (value) => fetchResourceImpl(value),
    resolveImage: (value) => imageResolverImpl(value),
    allowNavigate: (url) => allowsNavigation(url, navigationPatterns),
    services: {
      route: { get: () => location.hash.slice(1) || "/", search: () => "", listen() {} },
      storage: { get: () => null, set() {}, delete() {}, listen() {} },
    },
    onMessage(text) {
      if (text.startsWith("__wwcResponse:")) response = text.slice(14);
      else if (text.startsWith("__wwcError:")) reportedError ||= new Error(text.slice(11));
      else {
        try {
          const request = JSON.parse(text);
          if (request.type === "fetch" && Number.isSafeInteger(request.id)) void fetchResourceImpl(request.url)
            .then((result) => machine.onmsg(callMessage("__resourcesFetchResolve", { id: request.id, ...result })))
            .catch((error) => machine.onmsg(callMessage("__resourcesFetchResolve", { id: request.id, error: error.message })));
        } catch {}
      }
    },
  });
  await machine.onmsg(0);
  for (let index = 0; index < payload.scripts.length; index++) await evaluate(payload.scripts[index], index);
  programs = payload.scripts.length;
  port.postMessage({ protocol, type: "ready" });
}

async function operation(name, payload) {
  if (name === "setContent") { const value = call("__resourcesOutputSetContent", payload.tree); machine.onmsg(0); return value; }
  if (name === "load") {
    fetchResourceImpl = projectFetch(payload.project.files || [], payload.project.allowedFetchOrigins || []);
    imageResolverImpl = imageResolver(payload.project.files || []);
    navigationPatterns = payload.project.allowedLinkPatterns || [];
    const value = call("__resourcesOutputLoad", { tree: payload.project.tree || [], stylesheets: payload.project.stylesheets || [] });
    machine.onmsg(0);
    for (let index = 0; index < (payload.project.scripts || []).length; index++) await evaluate(payload.project.scripts[index], index);
    programs += (payload.project.scripts || []).length;
    return value;
  }
  if (name === "run") {
    for (let index = 0; index < payload.scripts.length; index++) await evaluate(payload.scripts[index], index);
    programs += payload.scripts.length;
    return null;
  }
  if (name === "inspect") return { runtime: "quickjs", programs, realm: "iframe" };
  if (name === "destroy") { machine?.destroy(); machine = null; return null; }
  throw new Error(`Unknown project output operation: ${name}`);
}

addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.data?.protocol !== protocol || event.data.type !== "connect" || !event.ports[0]) return;
  const port = event.ports[0];
  port.onmessage = async ({ data }) => {
    if (data?.protocol !== protocol || data.type !== "request") return;
    try { port.postMessage({ protocol, type: "response", id: data.id, value: await operation(data.name, data.payload || {}) }); }
    catch (error) { port.postMessage({ protocol, type: "response", id: data.id, error: error?.message || String(error) }); }
  };
  port.start();
  start(event.data.payload, port).catch((error) => port.postMessage({ protocol, type: "failed", error: error?.message || String(error) }));
});
