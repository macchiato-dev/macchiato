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
    const entry = { kind, key, listener };
    this.listeners.add(entry);
    return () => this.listeners.delete(entry);
  }
  destroy() {
    this.window.removeEventListener("storage", this.changed);
    this.listeners.clear();
  }
};

// dev/wasm-web-runtimes/quickjs/context-runtime.js
var QuickJSRuntime = class {
  #instance;
  #active;
  #sessions = /* @__PURE__ */ new Set();
  #nextId = 1;
  #destroyed = false;
  constructor(module) {
    this.#instance = new WebAssembly.Instance(module, { host: {
      now: () => this.#active.session.imports.host.now(),
      msg: (offset, length) => {
        const call = this.#active;
        if (call.control) {
          if (length < 12) throw new Error("QuickJS session control buffer is too small");
          new Uint8Array(this.#instance.exports.memory.buffer, offset, 12).set(call.control);
          call.control = null;
          return 12;
        }
        if (call.error && length !== 0) return 4294967295;
        try {
          return call.session.imports.host.msg(offset, length);
        } catch (error) {
          call.error ||= error;
          return 4294967295;
        }
      }
    } });
  }
  createSession() {
    if (this.#destroyed) throw new Error("QuickJS runtime is disposed");
    if (this.#nextId > 4294967295) throw new RangeError("QuickJS session IDs exhausted");
    const session = { id: this.#nextId++, imports: null, disposed: false, disposing: false, depth: 0 };
    return Object.freeze({
      instantiate: (imports) => {
        if (this.#destroyed) throw new Error("QuickJS runtime is disposed");
        if (session.imports || session.disposed) throw new Error("QuickJS session was already attached");
        session.imports = imports;
        this.#sessions.add(session);
        return {
          exports: {
            memory: this.#instance.exports.memory,
            onmsg: (length) => this.#call(session, length, 0)
          },
          destroy: () => this.#dispose(session)
        };
      }
    });
  }
  #call(session, length, action) {
    if (session.disposed || session.disposing && action !== 1) throw new Error("QuickJS session is disposed");
    const control = new Uint8Array(12), words = new DataView(control.buffer);
    words.setUint32(0, session.id, true);
    words.setUint32(4, length, true);
    words.setUint32(8, action, true);
    const previous = this.#active;
    this.#active = { session, control };
    session.depth++;
    try {
      this.#instance.exports.onmsg(12);
      if (this.#active.error) throw this.#active.error;
      if (this.#active.control) throw new Error("QuickJS build does not support sessions");
    } finally {
      session.depth--;
      this.#active = previous;
    }
  }
  #dispose(session) {
    if (session.disposed) return;
    if (session.depth) throw new Error("Cannot dispose a running QuickJS session");
    session.disposing = true;
    try {
      this.#call(session, 0, 1);
    } finally {
      session.disposed = true;
      session.imports = null;
      this.#sessions.delete(session);
    }
  }
  destroy() {
    if (this.#destroyed) return;
    for (const session of this.#sessions) {
      if (session.depth) throw new Error("Cannot dispose a running QuickJS runtime");
    }
    this.#destroyed = true;
    let failure;
    for (const session of this.#sessions) {
      try {
        this.#dispose(session);
      } catch (error) {
        failure ||= error;
      }
    }
    this.#instance = void 0;
    if (failure) throw failure;
  }
};

// packages/website/project-output-session.js
var encoder2 = new TextEncoder();
function message(name, payload) {
  const fn = encoder2.encode(name), argument = encoder2.encode(JSON.stringify(payload));
  const bytes = new Uint8Array(2 + fn.length + argument.length);
  bytes[0] = 2;
  bytes.set(fn, 1);
  bytes.set(argument, fn.length + 2);
  return bytes;
}
var OutputSession = class {
  constructor(Machine, runtime, root, options, onError) {
    this.pending = /* @__PURE__ */ new Map();
    this.nextRequest = 1;
    this.disposed = false;
    this.starting = true;
    this.onError = onError;
    this.options = options;
    this.abort = new AbortController();
    const files = new Map((options.files || []).map((file) => [file.path, file.content]));
    this.machine = new Machine(runtime.createSession(), root, {
      ...options,
      onError: (error) => this.report(error),
      services: { ...options.services, call(name, path) {
        if (name === "module.source") return JSON.stringify(files.get(path) ?? null);
        if (typeof options.services?.call === "function") return options.services.call(name, path);
        throw new Error(`Project service is unavailable: ${name}`);
      } },
      onMessage: (text) => {
        if (text.startsWith("__wwcModule:")) {
          const result = JSON.parse(text.slice(12)), pending = this.pending.get(result.id);
          if (!pending) return;
          this.pending.delete(result.id);
          if (result.error) pending.reject(new Error(result.error));
          else pending.resolve();
        } else if (text.startsWith("__wwcResponse:")) this.response = text.slice(14);
        else if (text.startsWith("__wwcError:")) this.report(new Error(text.slice(11)));
        else {
          let request;
          try {
            request = JSON.parse(text);
          } catch {
          }
          if (request?.type === "fetch" && Number.isSafeInteger(request.id) && typeof request.url === "string") {
            void this.answerFetch(request).catch((error) => {
              this.report(error);
              queueMicrotask(() => {
                throw error;
              });
            });
          } else options.onMessage?.(text);
        }
      }
    });
  }
  report(error) {
    if (this.disposed) return;
    this.error ||= error;
    if (this.starting) {
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
    } else queueMicrotask(() => {
      if (!this.disposed) this.onError?.(error);
    });
  }
  async answerFetch(request) {
    let reply;
    try {
      if (!this.options.fetchResource) throw new Error("Project network access is disabled");
      reply = { id: request.id, ...await this.options.fetchResource(request.url, { signal: this.abort.signal }) };
    } catch (error) {
      reply = { id: request.id, error: error.message || String(error) };
    }
    if (!this.disposed) this.machine.onmsg(message("__resourcesFetchResolve", reply));
  }
  call(name, payload) {
    if (this.disposed) throw new Error("Project output was replaced or destroyed");
    this.response = void 0;
    this.error = null;
    this.machine.onmsg(message(name, payload));
    if (this.error) throw this.error;
    if (this.response === void 0) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(this.response);
  }
  async run(scripts) {
    for (const [index, script] of scripts.entries()) {
      if (this.disposed) throw new Error("Project output was replaced or destroyed");
      this.error = null;
      if (script.module) {
        const id = this.nextRequest++;
        await new Promise((resolve, reject) => {
          this.pending.set(id, { resolve, reject });
          try {
            this.call("__resourcesOutputRunModule", { id, source: script.source, code: script.code });
          } catch (error) {
            this.pending.delete(id);
            reject(error);
          }
        });
      } else {
        const source = encoder2.encode(script.code), bytes = new Uint8Array(source.length + 1);
        bytes[0] = 1;
        bytes.set(source, 1);
        await this.machine.onmsg(bytes);
        if (this.error) throw new Error(`${script.source || `script ${index + 1}`}: ${this.error.message}`);
      }
    }
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    for (const request of this.pending.values()) request.reject(new Error("Project output was replaced or destroyed"));
    this.pending.clear();
    this.machine.destroy();
  }
};
var ProjectOutput = class {
  constructor(Machine, module, root, optionsFor, onError) {
    this.Machine = Machine;
    this.runtime = new QuickJSRuntime(module);
    this.root = root;
    this.optionsFor = optionsFor;
    this.onError = onError;
    this.programs = 0;
    this.destroyed = false;
    this.active = null;
    this.preparing = null;
  }
  load = async (project) => {
    if (this.destroyed) throw new Error("Project output was destroyed");
    this.remove(this.preparing);
    const wrapper = this.root.ownerDocument.createElement("div");
    const surface = this.root.ownerDocument.createElement("div");
    surface.className = "project-output-root";
    surface.tabIndex = -1;
    wrapper.append(surface);
    wrapper.inert = true;
    wrapper.style.cssText = "position:absolute;left:0;top:0;width:100%;opacity:0;visibility:hidden;pointer-events:none";
    this.root.style.position = "relative";
    this.root.append(wrapper);
    const pending = { wrapper, session: null };
    this.preparing = pending;
    try {
      const session = pending.session = new OutputSession(
        this.Machine,
        this.runtime,
        surface,
        this.optionsFor(project),
        this.onError
      );
      await session.machine.onmsg(0);
      if (this.preparing !== pending) throw new Error("Project output was replaced or destroyed");
      const result = session.call("__resourcesOutputLoad", {
        tree: project.tree || [],
        stylesheets: project.stylesheets || []
      });
      await session.machine.onmsg(0);
      await session.run(project.scripts || []);
      if (session.error) throw session.error;
      if (this.preparing !== pending) throw new Error("Project output was replaced or destroyed");
      const previous = this.active;
      this.active = pending;
      this.preparing = null;
      wrapper.removeAttribute("style");
      wrapper.inert = false;
      session.starting = false;
      this.programs += (project.scripts || []).length;
      this.remove(previous);
      if (!previous) for (const node of [...this.root.childNodes]) {
        if (node !== wrapper) node.remove();
      }
      return result;
    } catch (error) {
      if (this.preparing === pending) this.preparing = null;
      this.remove(pending);
      throw error;
    }
  };
  remove(entry) {
    if (!entry) return;
    try {
      entry.session?.destroy();
    } finally {
      entry.wrapper.remove();
    }
  }
  setContent = (tree) => {
    const session = this.active?.session;
    if (!session) throw new Error("Project output is unavailable");
    const result = session.call("__resourcesOutputSetContent", tree);
    session.machine.onmsg(0);
    return result;
  };
  run = async (scripts) => {
    if (!this.active) throw new Error("Project output is unavailable");
    await this.active.session.run(scripts);
    this.programs += scripts.length;
  };
  inspect = () => ({ runtime: "quickjs", programs: this.programs });
  focus = () => this.active?.session.call("__resourcesOutputFocus", null);
  destroy = () => {
    if (this.destroyed) return;
    this.destroyed = true;
    this.remove(this.preparing);
    this.remove(this.active);
    this.preparing = this.active = null;
    this.runtime.destroy();
  };
};

// packages/website/project-output-frame-controller.js
var protocol = "resources-project-output-machine-v1";
var encoder3 = new TextEncoder();
var decoder = new TextDecoder();
var output;
var storage;
var ownerPort;
var destroyed = false;
addEventListener("focus", () => output?.focus());
function reportError(error) {
  ownerPort?.postMessage({ protocol, type: "error", error: error?.message || String(error) });
}
function projectFetch(files, allowedOrigins, maxBytes = 1048576) {
  const projectFiles = new Map(files.map((file) => [file.path, file]));
  const origins = new Set(allowedOrigins.map((value) => new URL(value).origin));
  return async (value, { signal } = {}) => {
    if (/^https:\/\//.test(value)) {
      const url = new URL(value);
      if (!origins.has(url.origin)) throw new Error(`Fetch blocked for ${url.origin}`);
      const reply = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", signal });
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
    const bytes = data ? Uint8Array.from(atob(data[2]), (character) => character.charCodeAt(0)) : encoder3.encode(file.content);
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
      images.set(file.path, resourceResult(encoder3.encode(file.content), "image/svg+xml").resourceUrl);
  }
  return (value) => images.get(String(value).replace(/^\.\//, "")) || value;
}
async function start(payload, port) {
  const module = await WebAssembly.compileStreaming(fetch("./project-quickjs-runtime.wasm"));
  if (destroyed) return;
  storage = new ProjectOutputStorage(window, payload.storageScope);
  output = new ProjectOutput(WasmWebMachine, module, document.getElementById("project-output-a"), (project) => ({
    environment: { ...payload.environment, ...project.environment },
    files: project.files || [],
    frameInterval: () => document.activeElement?.closest(".cm-editor") ? 1e3 : 50,
    fetchResource: projectFetch(project.files || [], project.allowedFetchOrigins || []),
    resolveImage: imageResolver(project.files || []),
    allowNavigate: (url) => urlMatchesAllowedPatterns(url, project.allowedLinkPatterns || []),
    services: {
      route: {
        get: () => location.hash.slice(1) || "/",
        search: () => "",
        listen(listener) {
          addEventListener("hashchange", listener);
          return () => removeEventListener("hashchange", listener);
        }
      },
      storage
    }
  }), reportError);
  try {
    await output.load(payload);
  } catch (error) {
    output.destroy();
    storage.destroy();
    throw error;
  }
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
  if (name === "run") {
    await output.run(payload.scripts);
    return null;
  }
  if (name === "inspect") return { ...output.inspect(), realm: "iframe" };
  throw new Error(`Unknown project output operation: ${name}`);
}
addEventListener("message", (event) => {
  if (ownerPort || event.source !== parent || event.origin !== location.origin || event.data?.protocol !== protocol || event.data.type !== "connect" || !event.ports[0]) return;
  const port = ownerPort = event.ports[0];
  port.onmessage = async ({ data }) => {
    if (data?.protocol !== protocol || data.type !== "request") return;
    try {
      port.postMessage({
        protocol,
        type: "response",
        id: data.id,
        value: await operation(data.name, data.payload || {})
      });
    } catch (error) {
      port.postMessage({
        protocol,
        type: "response",
        id: data.id,
        error: error?.message || String(error)
      });
    }
  };
  port.start();
  start(event.data.payload, port).catch((error) => port.postMessage({
    protocol,
    type: "failed",
    error: error?.message || String(error)
  }));
});
