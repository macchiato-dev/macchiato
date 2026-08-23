// packages/website/frontend/controller.ts
import WasmWebMachine2 from "./machine.js";

// packages/website/project-machines.js
import WasmWebMachine from "./machine.js";
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var runtimeModules = /* @__PURE__ */ new Map();
var nextMachine = 1;
async function moduleFor(url) {
  if (!runtimeModules.has(url)) runtimeModules.set(url, fetch(url, { credentials: "same-origin" }).then((response) => {
    if (!response.ok) throw new Error(`Project runtime response ${response.status}`);
    return WebAssembly.compileStreaming(response);
  }));
  return runtimeModules.get(url);
}
function taggedMessage(tag, value) {
  const bytes = encoder.encode(value), message = new Uint8Array(bytes.length + 1);
  message[0] = tag;
  message.set(bytes, 1);
  return message;
}
function callMessage(name, payload) {
  const fn = encoder.encode(name), argument = encoder.encode(JSON.stringify(payload)), message = new Uint8Array(2 + fn.length + argument.length);
  message[0] = 2;
  message.set(fn, 1);
  message.set(argument, fn.length + 2);
  return message;
}
function createConstrainedFetch(allowedOrigins = [], maxBytes = 1048576) {
  const origins = new Set(allowedOrigins.map((value) => new URL(value).origin));
  return async (value) => {
    const url = new URL(value);
    if (url.protocol !== "https:" || !origins.has(url.origin)) throw new Error(`Fetch blocked for ${url.origin}`);
    const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" }), bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error(`Fetch response exceeds ${maxBytes} bytes`);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    const mime = response.headers.get("content-type")?.split(";", 1)[0] || "application/octet-stream";
    return { status: response.status, body: decoder.decode(bytes), resourceUrl: `data:${mime};base64,${btoa(binary)}` };
  };
}
function createProjectFetch(files = [], allowedOrigins = [], maxBytes = 1048576) {
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
    const mime = {
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
    }[extension] || "application/octet-stream";
    const data = /^data:([^;,]+);base64,(.*)$/s.exec(file.content);
    let bytes;
    if (data) bytes = Uint8Array.from(atob(data[2]), (character) => character.charCodeAt(0));
    else bytes = encoder.encode(file.content);
    if (bytes.byteLength > maxBytes) throw new Error(`Project file exceeds ${maxBytes} bytes: ${path}`);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    return { status: 200, body: data ? "" : file.content, resourceUrl: `data:${mime};base64,${btoa(binary)}` };
  };
}
function createProjectImageResolver(files = []) {
  const images = /* @__PURE__ */ new Map();
  for (const file of files) {
    if (/^data:image\/(?:gif|jpeg|png|webp);base64,/i.test(file.content)) images.set(file.path, file.content);
    else if (file.path.toLowerCase().endsWith(".svg")) {
      const bytes = encoder.encode(file.content);
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32768)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      images.set(file.path, `data:image/svg+xml;base64,${btoa(binary)}`);
    }
  }
  return (value) => images.get(String(value).replace(/^\.\//, "")) || value;
}
async function createProjectOutputMachine({ root, scripts, options = {}, onError }) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  let reportedError = null, response, starting = true, destroyed = false, machine;
  async function answerFetch(request) {
    try {
      if (typeof options.fetchResource !== "function") throw new Error("Project network access is disabled");
      const result = await options.fetchResource(request.url), reply = { id: request.id, ...result };
      if (!destroyed) machine.onmsg(callMessage("__resourcesFetchResolve", reply));
    } catch (error) {
      if (!destroyed) machine.onmsg(callMessage("__resourcesFetchResolve", { id: request.id, error: error.message }));
    }
  }
  machine = new WasmWebMachine(module, root, { ...options, onMessage(text) {
    if (text.startsWith("__wwcResponse:")) {
      response = text.slice(14);
      return;
    }
    if (text.startsWith("__wwcError:") && !reportedError) {
      reportedError = new Error(text.slice(11));
      if (!starting) queueMicrotask(() => onError?.(reportedError));
      return;
    }
    try {
      const request = JSON.parse(text);
      if (request.type === "fetch" && Number.isSafeInteger(request.id) && typeof request.url === "string")
        return void answerFetch(request);
    } catch {
    }
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
  } catch (error) {
    machine.destroy();
    throw error;
  }
  let programs = scripts.length;
  starting = false;
  function call(name, payload) {
    response = void 0;
    reportedError = null;
    machine.onmsg(callMessage(name, payload));
    if (reportedError) throw reportedError;
    if (response === void 0) throw new Error(`Guest function ${name} did not respond`);
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
        stylesheets: project.stylesheets || []
      });
      machine.onmsg(0);
      const nextScripts = project.scripts || [];
      for (let index = 0; index < nextScripts.length; index++) await evaluate(nextScripts[index], index);
      programs += nextScripts.length;
      return result;
    },
    destroy() {
      destroyed = true;
      machine.destroy();
    },
    inspect() {
      return { runtime: "quickjs", programs, machine: { machineId } };
    }
  });
}
async function createProjectEditorMachine({ root, onChange, onReady, onLimit, limits }) {
  const module = await moduleFor("/-/resources-site/project-editor-quickjs-runtime.wasm");
  const machineId = `wasm-web-machine-${nextMachine++}`;
  let response, machineError, outputRequest = 0;
  const machine = new WasmWebMachine(module, root, { onMessage(text) {
    if (text.startsWith("__wwcError:")) {
      machineError = text.slice(11);
      return;
    }
    if (text.startsWith("__wwcResponse:")) {
      response = text.slice(14);
      return;
    }
    const message = JSON.parse(text);
    if (message.type === "mount-project-output") outputRequest = message.generation;
    queueMicrotask(() => {
      if (message.type === "change") onChange(message.content, { syntaxErrors: message.syntaxErrors === true });
      else if (message.type === "ready") onReady?.(message);
      else if (message.type === "limit") onLimit?.(message);
    });
  } });
  await machine.onmsg(0);
  if (machineError) throw new Error(machineError);
  function call(name, payload) {
    if (!/^__[A-Za-z0-9_]+$/.test(name)) throw new TypeError("Guest function name is invalid");
    response = machineError = void 0;
    machine.onmsg(callMessage(name, payload));
    if (machineError) throw new Error(machineError);
    if (response === void 0) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(response);
  }
  call("__codeEditorConfigureLimits", limits || { maxLines: 5e3, maxCharacters: 1e6 });
  return Object.freeze({
    setContent: (content, language = "plain", options = {}) => call("__codeEditorSetContent", { content, language, ...options }),
    command: (payload) => call("__codeEditorCommand", payload),
    callGuest: call,
    requestOutput(generation) {
      outputRequest = 0;
      const result = call("__resourcesProjectRequestOutput", { generation });
      if (!result.requested || outputRequest !== generation) throw new Error("Project editor did not request its output machine");
      return result;
    },
    inspect: () => ({ ...call("__codeEditorInspect", {}), machine: { machineId } }),
    focus() {
      root.querySelector(".cm-content")?.focus();
    },
    destroy() {
      machine.destroy();
      root.replaceChildren();
    }
  });
}

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

// packages/website/resources-machine-devices.js
var encoder2 = new TextEncoder();
var allowedMethods = /* @__PURE__ */ new Set(["GET", "POST", "DELETE"]);
var responseHeaders = /* @__PURE__ */ new Set(["content-type", "content-length", "etag", "last-modified"]);
var ResourcesStorageDevice = class {
  constructor(window2) {
    this.window = window2;
    this.listeners = /* @__PURE__ */ new Map();
    window2.addEventListener("storage", (event) => {
      const kind = event.storageArea === window2.localStorage ? "local" : "session";
      for (const listener of this.listeners.get(kind) || []) listener();
    });
  }
  area(kind) {
    return kind === "local" ? this.window.localStorage : this.window.sessionStorage;
  }
  get(kind, key) {
    return this.area(kind).getItem(key);
  }
  set(kind, key, value) {
    this.area(kind).setItem(key, value);
  }
  delete(kind, key) {
    this.area(kind).removeItem(key);
  }
  listen(kind, _key, listener) {
    if (!this.listeners.has(kind)) this.listeners.set(kind, /* @__PURE__ */ new Set());
    this.listeners.get(kind).add(listener);
  }
};
var ResourcesFetchDevice = class {
  constructor(window2) {
    this.window = window2;
  }
  async request(payload) {
    const url = new URL(payload.url, this.window.location.href);
    if (url.origin !== this.window.location.origin) throw new Error("Frontend fetch is restricted to this origin");
    const method = String(payload.method || "GET").toUpperCase();
    if (!allowedMethods.has(method)) throw new Error(`Frontend fetch method ${method} is not allowed`);
    const headers = new Headers(payload.headers || {});
    if ([...headers].length > 32) throw new Error("Frontend fetch has too many headers");
    const body = payload.body == null ? void 0 : String(payload.body);
    if (body && encoder2.encode(body).byteLength > 2 * 1024 * 1024) throw new Error("Frontend fetch body is too large");
    const response = await this.window.fetch(url, {
      method,
      headers,
      body,
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store"
    });
    const text = await response.text();
    if (encoder2.encode(text).byteLength > 2 * 1024 * 1024) throw new Error("Frontend fetch response is too large");
    return {
      status: response.status,
      url: response.url,
      headers: [...response.headers].filter(([name]) => responseHeaders.has(name.toLowerCase())),
      body: text
    };
  }
};
var ResourcesEditorDevice = class {
  constructor(document2, deliver) {
    this.document = document2;
    this.deliver = deliver;
    this.editor = null;
  }
  async mount() {
    this.editor?.destroy();
    const root = this.document.querySelector("[data-project-editor-mount]");
    if (!root) throw new Error("Project editor mount is unavailable");
    this.editor = await createProjectEditorMachine({
      root,
      onChange: (content, details) => this.deliver({
        type: "editor-change",
        content,
        syntaxErrors: details.syntaxErrors
      }),
      onReady: (value) => this.deliver({ type: "editor-ready", value }),
      onLimit: (value) => this.deliver({ type: "editor-limit", value })
    });
    return this.editor.inspect();
  }
  call(name, payload) {
    if (!this.editor) throw new Error(`Project editor is not mounted: ${name}`);
    if (name === "editor.setContent") return this.editor.setContent(payload.content, payload.language, payload);
    if (name === "editor.command") return this.editor.command(payload);
    if (name === "editor.inspect") return this.editor.inspect();
    if (name === "editor.focus") return this.editor.focus();
    if (name === "editor.history.initialize") return this.editor.callGuest("__resourcesProjectHistoryInitialize", payload);
    if (name === "editor.history.setCurrent") return this.editor.callGuest("__resourcesProjectHistorySetCurrent", payload);
    if (name === "editor.history.checkpoint") return this.editor.callGuest("__resourcesProjectHistoryCheckpoint", payload);
    if (name === "editor.history.inspect") return this.editor.callGuest("__resourcesProjectHistoryInspect", {});
    if (name === "editor.status.begin") return this.editor.callGuest("__resourcesProjectStatusBegin", payload);
    if (name === "editor.status.report") return this.editor.callGuest("__resourcesProjectStatusReport", payload);
    if (name === "editor.status.inspect") return this.editor.callGuest("__resourcesProjectStatusInspect", {});
    if (name === "editor.output.request") return this.editor.requestOutput(payload.generation);
    if (name === "editor.theme") return this.editor.callGuest("__codeEditorSetTheme", payload);
    if (name === "editor.destroy") {
      this.destroy();
      return null;
    }
    throw new Error(`Unknown editor operation: ${name}`);
  }
  destroy() {
    this.editor?.destroy();
    this.editor = null;
  }
};
var ResourcesOutputDevice = class {
  constructor(document2, deliver) {
    this.document = document2;
    this.deliver = deliver;
    this.outputs = /* @__PURE__ */ new Map();
    this.nextId = 1;
  }
  async mount(payload) {
    if (typeof payload.rootKey !== "string" || !/^[1-9][0-9]{0,9}$/.test(payload.rootKey))
      throw new Error("Project output mount identity is invalid");
    const root = [...this.document.querySelectorAll("[data-project-output-mount]")].find((element) => element.dataset.projectOutputMount === payload.rootKey);
    if (!root) throw new Error("Project output mount is unavailable");
    const id = this.nextId++;
    const files = Array.isArray(payload.files) ? payload.files : [];
    const output = await createProjectOutputMachine({
      root,
      scripts: Array.isArray(payload.scripts) ? payload.scripts : [],
      options: {
        frameInterval: () => this.document.activeElement?.closest(".cm-editor") ? 1e3 : 50,
        fetchResource: createProjectFetch(
          files,
          Array.isArray(payload.allowedFetchOrigins) ? payload.allowedFetchOrigins : []
        ),
        resolveImage: createProjectImageResolver(files),
        allowNavigate: (url) => urlMatchesAllowedPatterns(
          url,
          Array.isArray(payload.allowedLinkPatterns) ? payload.allowedLinkPatterns : []
        ),
        environment: payload.environment || {},
        services: {
          route: { get: () => location.hash.slice(1) || "/", search: () => "", listen() {
          } },
          storage: { get: () => null, set() {
          }, delete() {
          }, listen() {
          } }
        }
      },
      onError: (error) => this.deliver({
        type: "output-error",
        id,
        message: error?.message || String(error)
      })
    });
    this.outputs.set(id, output);
    return id;
  }
  async run(payload) {
    const output = this.require(payload.id);
    await output.run(Array.isArray(payload.scripts) ? payload.scripts : []);
    return null;
  }
  async load(payload) {
    const output = this.require(payload.id);
    const project = payload.project || {};
    this.validateTree(project.tree);
    await output.load({
      tree: project.tree,
      stylesheets: Array.isArray(project.stylesheets) ? project.stylesheets : [],
      scripts: Array.isArray(project.scripts) ? project.scripts : []
    });
    return null;
  }
  call(name, payload) {
    const output = this.require(payload.id);
    if (name === "output.inspect") return output.inspect();
    if (name === "output.setContent") {
      this.validateTree(payload.tree);
      return output.setContent(payload.tree);
    }
    if (name === "output.destroy") {
      output.destroy();
      this.outputs.delete(payload.id);
      return null;
    }
    throw new Error(`Unknown output operation: ${name}`);
  }
  require(id) {
    const output = this.outputs.get(id);
    if (!output) throw new Error("Project output machine is unavailable");
    return output;
  }
  validateTree(tree) {
    if (!Array.isArray(tree)) throw new Error("Project output tree is invalid");
    let count = 0;
    const validate = (node, path) => {
      if (!Array.isArray(node) || node[0] !== 0 && node[0] !== 1)
        throw new Error(`Project output node is invalid at ${path}`);
      if (++count > 5e4) throw new Error("Project output has too many nodes");
      if (node[0] === 0) return;
      if (typeof node[1] !== "string" || !node[1])
        throw new Error(`Project output element name is missing at ${path}`);
      if (!Array.isArray(node[4])) throw new Error(`Project output children are invalid at ${path}`);
      node[4].forEach((child, index) => validate(child, `${path}.${index}`));
    };
    tree.forEach((node, index) => validate(node, String(index)));
  }
  destroy() {
    for (const output of this.outputs.values()) output.destroy();
    this.outputs.clear();
  }
};

// packages/website/frontend/controller.ts
var encoder3 = new TextEncoder();
var nextMachine2 = 1;
function callMessage2(name, payload) {
  const fn = encoder3.encode(name);
  const argument = encoder3.encode(JSON.stringify(payload));
  const message = new Uint8Array(2 + fn.length + argument.length);
  message[0] = 2;
  message.set(fn, 1);
  message.set(argument, fn.length + 2);
  return message;
}
async function loadModule(url) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Machine response ${response.status}: ${url}`);
  return WebAssembly.compileStreaming(response);
}
async function startResourcesMachineController() {
  const module = await loadModule("/-/resources-site/resources-frontend-microquickjs.wasm");
  const sections = WebAssembly.Module.customSections(module, "wasm-web-machine");
  let machine;
  async function deliver(message) {
    await machine.onmsg(callMessage2("__resourcesFrontendReceive", message));
  }
  const fetchDevice = new ResourcesFetchDevice(window);
  const editorDevice = new ResourcesEditorDevice(document, deliver);
  const outputDevice = new ResourcesOutputDevice(document, deliver);
  const storageDevice = new ResourcesStorageDevice(window);
  async function receive(text) {
    if (text.startsWith("__wwcError:")) {
      document.documentElement.dataset.resourcesFrontendMachineState = "failed";
      console.error("Resources frontend machine:", text.slice(11));
      return;
    }
    let request;
    try {
      request = JSON.parse(text);
    } catch {
      return;
    }
    if (request.protocol !== "resources-frontend-v1" || !Number.isSafeInteger(request.id)) return;
    try {
      let value;
      if (request.name === "fetch") value = await fetchDevice.request(request.payload || {});
      else if (request.name === "editor.mount") value = await editorDevice.mount();
      else if (request.name === "output.mount") value = await outputDevice.mount(request.payload || {});
      else if (request.name === "output.run") value = await outputDevice.run(request.payload || {});
      else if (request.name === "output.load") value = await outputDevice.load(request.payload || {});
      else throw new Error(`Unknown asynchronous service: ${request.name}`);
      await deliver({ id: request.id, value });
    } catch (error) {
      console.error("Resources controller service:", request.name, error);
      await deliver({ id: request.id, error: error?.message || String(error) });
    }
  }
  machine = new WasmWebMachine2(module, document, {
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : void 0,
    services: {
      call(name, payloadText) {
        console.debug("Resources controller call:", name);
        const payload = payloadText ? JSON.parse(payloadText) : {};
        let value;
        if (name.startsWith("editor.")) value = editorDevice.call(name, payload);
        else if (name.startsWith("output.")) value = outputDevice.call(name, payload);
        else throw new Error(`Unknown synchronous frontend service: ${name}`);
        if (name === "editor.inspect") console.debug("Resources editor inspection:", JSON.stringify(value));
        return JSON.stringify(value === void 0 ? null : value);
      },
      route: { get: () => location.pathname, search: () => location.search, listen() {
      } },
      storage: storageDevice
    },
    onMessage: receive
  });
  const machineId = `resources-frontend-${nextMachine2++}`;
  document.documentElement.dataset.resourcesFrontendMachine = "microquickjs";
  document.documentElement.dataset.resourcesFrontendMachineId = machineId;
  document.documentElement.dataset.resourcesFrontendMachineState = "starting";
  await machine.onmsg(0);
  document.documentElement.dataset.resourcesFrontendMachineState = "ready";
  return Object.freeze({ machineId, destroy() {
    editorDevice.destroy();
    outputDevice.destroy();
    machine.destroy();
  } });
}
startResourcesMachineController().catch((error) => {
  document.documentElement.dataset.resourcesFrontendMachineState = "failed";
  console.error("Resources Machine Controller:", error);
});
export {
  startResourcesMachineController
};
