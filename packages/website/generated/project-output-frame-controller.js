// packages/website/project-output-frame-controller.js
import WasmWebMachine from "./machine.js";

// packages/hub/src/url-pattern.js
var HOST_LABEL = /^(?:\*|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/i;
function wildcardSource(value, { dotAware = false } = {}) {
  return value.split("*").map((part) => part.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")).join(dotAware ? "[^.]+" : ".*");
}
function compileAllowedUrlPattern(input) {
  const source = String(input || "").trim();
  if (!source) throw new Error("URL pattern cannot be empty");
  if (source.startsWith("`") || source.endsWith("`")) {
    if (!(source.length > 2 && source.startsWith("`") && source.endsWith("`"))) throw new Error("Exact URLs need matching backquotes");
    const exact = source.slice(1, -1);
    const parsed = new URL(exact);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Exact URLs must use HTTP or HTTPS");
    return (value) => String(value) === exact;
  }
  if (source.startsWith("/")) {
    const lastSlash = source.lastIndexOf("/");
    if (lastSlash === 0) throw new Error("Regular expressions need a closing slash");
    const expression2 = new RegExp(source.slice(1, lastSlash), source.slice(lastSlash + 1));
    return (value) => {
      expression2.lastIndex = 0;
      return expression2.test(String(value));
    };
  }
  const slash = source.indexOf("/");
  const hostname = (slash < 0 ? source : source.slice(0, slash)).toLowerCase();
  const path = slash < 0 ? "/*" : source.slice(slash);
  if (!hostname.includes(".") || hostname.split(".").some((label) => !HOST_LABEL.test(label))) throw new Error("Use a hostname such as *.wikipedia.org");
  if (!path.startsWith("/")) throw new Error("A hostname path must start with /");
  const hostnamePattern = wildcardSource(hostname, { dotAware: true });
  const pathPattern = wildcardSource(path);
  const expression = new RegExp(`^${hostnamePattern}$`, "i");
  const pathname = new RegExp(`^${pathPattern}$`);
  return (value) => {
    try {
      const url = new URL(String(value));
      return (url.protocol === "https:" || url.protocol === "http:") && expression.test(url.hostname) && pathname.test(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      return false;
    }
  };
}
function urlMatchesAllowedPatterns(url, patterns) {
  const value = String(url || "");
  if (value.length <= 2048 && /^#[^\u0000-\u001f\u007f]*$/.test(value)) return true;
  return (patterns || []).some((pattern) => compileAllowedUrlPattern(pattern)(url));
}

// packages/website/project-output-storage.js
var encoder = new TextEncoder();
var limits = { local: 8192, session: 128 * 1024 };
var ProjectOutputStorage = class {
  constructor(window2, scope) {
    if (typeof scope !== "string" || !scope || scope.length > 2048) {
      throw new TypeError("Project storage requires a bounded controller identity");
    }
    this.window = window2;
    this.prefix = `resources-output:${encodeURIComponent(scope)}:`;
    this.listeners = /* @__PURE__ */ new Set();
    this.changed = (event) => {
      for (const entry of this.listeners) {
        if (event.storageArea === this.area(entry.kind) && (event.key === null || event.key === this.key(entry.key))) entry.listener();
      }
    };
    window2.addEventListener("storage", this.changed);
  }
  area(kind) {
    if (!Object.hasOwn(limits, kind)) throw new TypeError("Unknown project storage area");
    return kind === "local" ? this.window.localStorage : this.window.sessionStorage;
  }
  key(key) {
    if (typeof key !== "string" || key.length > 1024) throw new TypeError("Project storage key is too long");
    return this.prefix + key;
  }
  get(kind, key) {
    return this.area(kind).getItem(this.key(key));
  }
  set(kind, key, value) {
    const area = this.area(kind), target = this.key(key);
    if (typeof value !== "string") throw new TypeError("Project storage values must be strings");
    let size = encoder.encode(key).length + encoder.encode(value).length;
    for (let index = 0; index < area.length && size <= limits[kind]; index++) {
      const existing = area.key(index);
      if (existing?.startsWith(this.prefix) && existing !== target) {
        size += encoder.encode(existing.slice(this.prefix.length)).length;
        size += encoder.encode(area.getItem(existing) || "").length;
      }
    }
    if (size > limits[kind]) throw new RangeError(`Project ${kind} storage quota exceeded`);
    area.setItem(target, value);
  }
  delete(kind, key) {
    this.area(kind).removeItem(this.key(key));
  }
  listen(kind, key, listener) {
    this.area(kind);
    this.key(key);
    this.listeners.add({ kind, key, listener });
  }
  destroy() {
    this.window.removeEventListener("storage", this.changed);
    this.listeners.clear();
  }
};

// packages/website/project-output-frame-controller.js
var protocol = "resources-project-output-machine-v1";
var encoder2 = new TextEncoder();
var decoder = new TextDecoder();
var machine = null;
var response;
var reportedError;
var programs = 0;
var fetchResourceImpl = null;
var imageResolverImpl = (value) => value;
var navigationPatterns = [];
var routeListeners = /* @__PURE__ */ new Set();
var moduleFiles = /* @__PURE__ */ new Map();
var moduleRequests = /* @__PURE__ */ new Map();
var nextModuleRequest = 1;
var storage;
function taggedMessage(tag, value) {
  const bytes = encoder2.encode(value);
  const message = new Uint8Array(bytes.length + 1);
  message[0] = tag;
  message.set(bytes, 1);
  return message;
}
function callMessage(name, payload) {
  const fn = encoder2.encode(name);
  const argument = encoder2.encode(JSON.stringify(payload));
  const message = new Uint8Array(2 + fn.length + argument.length);
  message[0] = 2;
  message.set(fn, 1);
  message.set(argument, fn.length + 2);
  return message;
}
function projectFetch(files, allowedOrigins, maxBytes = 1048576) {
  const projectFiles = new Map(files.map((file) => [file.path, file]));
  const origins = new Set(allowedOrigins.map((value) => new URL(value).origin));
  return async (value) => {
    if (/^https:\/\//.test(value)) {
      const url = new URL(value);
      if (!origins.has(url.origin)) throw new Error(`Fetch blocked for ${url.origin}`);
      const reply = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" });
      const bytes2 = new Uint8Array(await reply.arrayBuffer());
      if (bytes2.byteLength > maxBytes) throw new Error(`Fetch response exceeds ${maxBytes} bytes`);
      return resourceResult(bytes2, reply.headers.get("content-type")?.split(";", 1)[0]);
    }
    if (typeof value !== "string" || value.includes("?") || value.includes("#"))
      throw new Error("Project file fetch requires a relative file path");
    const path = value.replace(/^\.\//, "");
    if (!path || path.startsWith("/") || path.split("/").includes(".."))
      throw new Error("Project file fetch path is invalid");
    const file = projectFiles.get(path);
    if (!file) throw new Error(`Project file not found: ${path}`);
    const data = /^data:([^;,]+);base64,(.*)$/s.exec(file.content);
    const bytes = data ? Uint8Array.from(atob(data[2]), (character) => character.charCodeAt(0)) : encoder2.encode(file.content);
    if (bytes.byteLength > maxBytes) throw new Error(`Project file exceeds ${maxBytes} bytes: ${path}`);
    return resourceResult(bytes, data?.[1] || mimeFor(path), data ? "" : file.content);
  };
}
function mimeFor(path) {
  return {
    css: "text/css",
    gif: "image/gif",
    html: "text/html",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    js: "text/javascript",
    json: "application/json",
    png: "image/png",
    svg: "image/svg+xml",
    txt: "text/plain"
  }[path.split(".").at(-1).toLowerCase()] || "application/octet-stream";
}
function resourceResult(bytes, mime = "application/octet-stream", body) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return { status: 200, body: body ?? decoder.decode(bytes), resourceUrl: `data:${mime};base64,${btoa(binary)}` };
}
function imageResolver(files) {
  const images = /* @__PURE__ */ new Map();
  for (const file of files) {
    if (/^data:image\/(?:gif|jpeg|png|webp);base64,/i.test(file.content)) images.set(file.path, file.content);
    else if (file.path.toLowerCase().endsWith(".svg"))
      images.set(file.path, resourceResult(encoder2.encode(file.content), "image/svg+xml").resourceUrl);
  }
  return (value) => images.get(String(value).replace(/^\.\//, "")) || value;
}
async function evaluate(script, index) {
  reportedError = null;
  if (script.module) {
    const id = nextModuleRequest++;
    let resolve, reject;
    const complete = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    moduleRequests.set(id, { resolve, reject });
    try {
      call("__resourcesOutputRunModule", { id, source: script.source, code: script.code });
    } catch (error) {
      moduleRequests.delete(id);
      reject(error);
    }
    return complete;
  }
  await machine.onmsg(taggedMessage(1, script.code));
  if (reportedError) throw new Error(`${script.source || `script ${index + 1}`}: ${reportedError.message}`);
}
function call(name, payload) {
  response = void 0;
  reportedError = null;
  machine.onmsg(callMessage(name, payload));
  if (reportedError) throw new Error(`${name}: ${reportedError.message}`);
  if (response === void 0) throw new Error(`Guest function ${name} did not respond`);
  return JSON.parse(response);
}
async function start(payload, port) {
  const runtime = await WebAssembly.compileStreaming(fetch("./project-quickjs-runtime.wasm"));
  fetchResourceImpl = projectFetch(payload.files || [], payload.allowedFetchOrigins || []);
  imageResolverImpl = imageResolver(payload.files || []);
  navigationPatterns = payload.allowedLinkPatterns || [];
  moduleFiles = new Map((payload.files || []).map((file) => [file.path, file.content]));
  storage = new ProjectOutputStorage(window, payload.storageScope);
  machine = new WasmWebMachine(runtime, document.getElementById("project-output-a"), {
    environment: payload.environment || {},
    frameInterval: () => document.activeElement?.closest(".cm-editor") ? 1e3 : 50,
    fetchResource: (value) => fetchResourceImpl(value),
    resolveImage: (value) => imageResolverImpl(value),
    allowNavigate: (url) => urlMatchesAllowedPatterns(url, navigationPatterns),
    services: {
      call(name, path) {
        if (name !== "module.source") throw new Error(`Project service is unavailable: ${name}`);
        return JSON.stringify(moduleFiles.get(path) ?? null);
      },
      route: {
        get: () => location.hash.slice(1) || "/",
        search: () => "",
        listen(listener) {
          routeListeners.add(listener);
          addEventListener("hashchange", listener);
        }
      },
      storage
    },
    onMessage(text) {
      if (text.startsWith("__wwcModule:")) {
        const result = JSON.parse(text.slice(12));
        const pending = moduleRequests.get(result.id);
        if (pending) {
          moduleRequests.delete(result.id);
          if (result.error) pending.reject(new Error(result.error));
          else pending.resolve();
        }
      } else if (text.startsWith("__wwcResponse:")) response = text.slice(14);
      else if (text.startsWith("__wwcError:")) reportedError ||= new Error(text.slice(11));
      else {
        try {
          const request = JSON.parse(text);
          if (request.type === "fetch" && Number.isSafeInteger(request.id)) void fetchResourceImpl(request.url).then((result) => machine.onmsg(callMessage("__resourcesFetchResolve", { id: request.id, ...result }))).catch((error) => machine.onmsg(callMessage("__resourcesFetchResolve", { id: request.id, error: error.message })));
        } catch {
        }
      }
    }
  });
  await machine.onmsg(0);
  for (let index = 0; index < payload.scripts.length; index++) await evaluate(payload.scripts[index], index);
  programs = payload.scripts.length;
  port.postMessage({ protocol, type: "ready" });
}
async function operation(name, payload) {
  if (name === "setContent") {
    const value = call("__resourcesOutputSetContent", payload.tree);
    machine.onmsg(0);
    return value;
  }
  if (name === "load") {
    fetchResourceImpl = projectFetch(payload.project.files || [], payload.project.allowedFetchOrigins || []);
    imageResolverImpl = imageResolver(payload.project.files || []);
    navigationPatterns = payload.project.allowedLinkPatterns || [];
    moduleFiles = new Map((payload.project.files || []).map((file) => [file.path, file.content]));
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
  if (name === "destroy") {
    storage?.destroy();
    storage = null;
    for (const listener of routeListeners) removeEventListener("hashchange", listener);
    routeListeners.clear();
    for (const pending of moduleRequests.values()) pending.reject(new Error("Project output was destroyed"));
    moduleRequests.clear();
    moduleFiles.clear();
    machine?.destroy();
    machine = null;
    return null;
  }
  throw new Error(`Unknown project output operation: ${name}`);
}
addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.data?.protocol !== protocol || event.data.type !== "connect" || !event.ports[0]) return;
  const port = event.ports[0];
  port.onmessage = async ({ data }) => {
    if (data?.protocol !== protocol || data.type !== "request") return;
    try {
      port.postMessage({ protocol, type: "response", id: data.id, value: await operation(data.name, data.payload || {}) });
    } catch (error) {
      port.postMessage({ protocol, type: "response", id: data.id, error: error?.message || String(error) });
    }
  };
  port.start();
  start(event.data.payload, port).catch((error) => port.postMessage({ protocol, type: "failed", error: error?.message || String(error) }));
});
