import WasmWebMachine from "./machine.js";
import { urlMatchesAllowedPatterns } from "../hub/src/url-pattern.js";
import { ProjectOutputStorage } from "./project-output-storage.js";
import { ProjectOutput } from "./project-output-session.js";

const protocol = "resources-project-output-machine-v1";
const encoder = new TextEncoder(), decoder = new TextDecoder();
let output, storage, ownerPort;
let destroyed = false;

function reportError(error) {
  ownerPort?.postMessage({ protocol, type: "error", error: error?.message || String(error) });
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

async function start(payload, port) {
  const module = await WebAssembly.compileStreaming(fetch("./project-quickjs-runtime.wasm"));
  if (destroyed) return;
  storage = new ProjectOutputStorage(window, payload.storageScope);
  output = new ProjectOutput(WasmWebMachine, module, document.getElementById("project-output-a"), project => ({
    environment: { ...payload.environment, ...project.environment },
    files: project.files || [],
    frameInterval: () => document.activeElement?.closest(".cm-editor") ? 1_000 : 50,
    fetchResource: projectFetch(project.files || [], project.allowedFetchOrigins || []),
    resolveImage: imageResolver(project.files || []),
    allowNavigate: url => urlMatchesAllowedPatterns(url, project.allowedLinkPatterns || []),
    services: {
      route: {
        get: () => location.hash.slice(1) || "/", search: () => "",
        listen(listener) {
          addEventListener("hashchange", listener);
          return () => removeEventListener("hashchange", listener);
        },
      },
      storage,
    },
  }), reportError);
  try { await output.load(payload); }
  catch (error) { output.destroy(); storage.destroy(); throw error; }
  if (!destroyed) port.postMessage({ protocol, type: "ready" });
}

async function operation(name, payload) {
  if (name === "destroy") {
    destroyed = true;
    output?.destroy();
    storage?.destroy();
    return null;
  }
  if (!output || destroyed) throw new Error("Project output is unavailable");
  if (name === "setContent") return output.setContent(payload.tree);
  if (name === "load") return output.load(payload.project);
  if (name === "run") { await output.run(payload.scripts); return null; }
  if (name === "inspect") return { ...output.inspect(), realm: "iframe" };
  throw new Error(`Unknown project output operation: ${name}`);
}

addEventListener("message", event => {
  if (ownerPort || event.source !== parent || event.origin !== location.origin ||
      event.data?.protocol !== protocol || event.data.type !== "connect" || !event.ports[0]) return;
  const port = ownerPort = event.ports[0];
  port.onmessage = async ({ data }) => {
    if (data?.protocol !== protocol || data.type !== "request") return;
    try { port.postMessage({ protocol, type: "response", id: data.id,
      value: await operation(data.name, data.payload || {}) }); }
    catch (error) { port.postMessage({ protocol, type: "response", id: data.id,
      error: error?.message || String(error) }); }
  };
  port.start();
  start(event.data.payload, port).catch(error => port.postMessage({
    protocol, type: "failed", error: error?.message || String(error),
  }));
});
