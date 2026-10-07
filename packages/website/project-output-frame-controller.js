import WasmWebMachine from "./machine.js";
import { urlMatchesAllowedPatterns } from "../hub/src/url-pattern.js";
import { ProjectOutputStorage } from "./project-output-storage.js";
import { ProjectOutput } from "./project-output-session.js";
import { createProjectFetch, resourceResult } from "./project-fetch.js";

const protocol = "resources-project-output-machine-v1";
const encoder = new TextEncoder();
let output, storage, ownerPort;
let destroyed = false;

// Forward frame activation to the current guest, not a hidden replacement.
addEventListener("focus", () => output?.focus());

function reportError(error) {
  ownerPort?.postMessage({ protocol, type: "error", error: error?.message || String(error) });
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
  // A replacement frame gets the already compiled, trusted runtime through
  // its private controller channel; application code remains project data.
  const module = payload.module instanceof WebAssembly.Module ? payload.module
    : await WebAssembly.compileStreaming(fetch("./project-quickjs-runtime.wasm"));
  if (destroyed) return;
  storage = new ProjectOutputStorage(window, payload.storageScope);
  output = new ProjectOutput(WasmWebMachine, module, document, project => ({
    environment: { ...payload.environment, ...project.environment },
    files: project.files || [],
    frameInterval: () => document.activeElement?.closest(".cm-editor") ? 1_000 : 50,
    fetchResource: createProjectFetch(project.files || [], project.allowedFetchOrigins || []),
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
  if (!destroyed) port.postMessage({ protocol, type: "ready", module });
}

async function operation(name, payload) {
  if (name === "destroy") {
    destroyed = true;
    output?.destroy();
    storage?.destroy();
    return null;
  }
  if (!output || destroyed) throw new Error("Project output is unavailable");
  if (name === "setContent") return output.setContent(payload.tree, payload.document);
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
