import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import quickjsVariant from "@jitl/quickjs-singlefile-browser-release-sync";
import { DomUse } from "@macchiato-dev/dom-use";
import { StyleUse } from "@macchiato-dev/style-use";

const DEFAULT_STORAGE_LIMIT = 10000;

const app = document.getElementById("app");
let dragDataTransfer = null;

function extractStyle(source) {
  return source.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || "";
}

async function loadText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.text();
}

async function loadJson(path) {
  return JSON.parse(await loadText(path));
}

class LocalStorageBackend {
  constructor(config = {}) {
    this.mode = config.mode || "disabled";
    this.allowedKeys = config.keys ? new Set(config.keys) : null;
    this.limit = config.limit ?? DEFAULT_STORAGE_LIMIT;
  }

  assertEnabled(key, value = "") {
    if (this.mode !== "passthrough") throw new Error("localStorage is not enabled");
    if (this.allowedKeys && !this.allowedKeys.has(String(key))) {
      throw new Error(`localStorage key not allowed: ${key}`);
    }
    if (String(value).length > this.limit) {
      throw new Error(`localStorage value exceeds limit ${this.limit}`);
    }
  }

  getItem(key) {
    this.assertEnabled(key);
    return window.localStorage.getItem(String(key));
  }

  setItem(key, value) {
    this.assertEnabled(key, value);
    window.localStorage.setItem(String(key), String(value));
  }
}

class DomUseCapability {
  constructor(domSchema, styleUse, storage) {
    this.domUse = new DomUse(domSchema, styleUse);
    this.document = this.domUse.createDocument();
    this.storage = storage;
    this.nodes = new Map();
    this.appRootId = null;
    this.nextId = 1;
  }

  resetDom() {
    this.nodes = new Map();
    this.appRootId = null;
    this.nextId = 1;
    this.document = this.domUse.createDocument();
    return {};
  }

  register(node) {
    const id = String(this.nextId++);
    this.nodes.set(id, node);
    return id;
  }

  node(id) {
    const node = this.nodes.get(String(id));
    if (!node) throw new Error(`DOM node not found: ${id}`);
    return node;
  }

  createElement(tagName) {
    const node = this.document.createElement(tagName);
    return { id: this.register(node) };
  }

  createTextNode(text) {
    const node = this.document.createTextNode(text);
    return { id: this.register(node) };
  }

  appendChild(parentId, childId) {
    this.node(parentId).appendChild(this.node(childId));
    return {};
  }

  removeChild(parentId, childId) {
    this.node(parentId).removeChild(this.node(childId));
    return {};
  }

  insertBefore(parentId, childId, referenceId) {
    this.node(parentId).insertBefore(this.node(childId), referenceId ? this.node(referenceId) : null);
    return {};
  }

  setTextContent(id, value) {
    this.node(id).textContent = value;
    return {};
  }

  setInnerHTML(id, html) {
    if (html === "") this.node(id).replaceChildren();
    else this.domUse.setInnerHTML(this.node(id), html);
    return {};
  }

  setAttribute(id, name, value) {
    this.node(id).setAttribute(name, value);
    return {};
  }

  removeAttribute(id, name) {
    this.node(id).removeAttribute(name);
    return {};
  }

  setStyle(id, property, value) {
    this.node(id).style[property] = value;
    return {};
  }

  addEventListener(id, event) {
    this.node(id).setAttribute("data-node-id", String(id));
    const node = this.node(id);
    const existing = new Set((node.getAttribute("data-events") || "").split(/\s+/).filter(Boolean));
    existing.add(String(event));
    node.setAttribute("data-events", Array.from(existing).join(" "));
    return {};
  }

  setAppRoot(id) {
    this.appRootId = String(id);
    return {};
  }

  serializeApp() {
    if (!this.appRootId) return { html: "" };
    return { html: this.domUse.getInnerHTML(this.node(this.appRootId)) };
  }

  nodeTag(id) {
    return { tagName: this.node(id).tagName };
  }

  storageGet(key) {
    return { value: this.storage.getItem(key) };
  }

  storageSet(key, value) {
    this.storage.setItem(key, value);
    return {};
  }

  dispatch(message) {
    switch (message.op) {
      case "resetDom": return this.resetDom();
      case "createElement": return this.createElement(message.tagName);
      case "createTextNode": return this.createTextNode(message.text);
      case "appendChild": return this.appendChild(message.parentId, message.childId);
      case "removeChild": return this.removeChild(message.parentId, message.childId);
      case "insertBefore": return this.insertBefore(message.parentId, message.childId, message.referenceId);
      case "setTextContent": return this.setTextContent(message.id, message.value);
      case "setInnerHTML": return this.setInnerHTML(message.id, message.html);
      case "setAttribute": return this.setAttribute(message.id, message.name, message.value);
      case "removeAttribute": return this.removeAttribute(message.id, message.name);
      case "setStyle": return this.setStyle(message.id, message.property, message.value);
      case "addEventListener": return this.addEventListener(message.id, message.event);
      case "setAppRoot": return this.setAppRoot(message.id);
      case "serializeApp": return this.serializeApp();
      case "nodeTag": return this.nodeTag(message.id);
      case "storageGet": return this.storageGet(message.key);
      case "storageSet": return this.storageSet(message.key, message.value);
      default: throw new Error(`Unsupported host operation: ${message.op}`);
    }
  }
}

function installHostCapability(context, capability) {
  const hostFunction = context.newFunction("__macchiatoHost", (messageHandle) => {
    try {
      const message = JSON.parse(context.getString(messageHandle));
      return context.newString(JSON.stringify(capability.dispatch(message)));
    } catch (err) {
      return context.newString(JSON.stringify({ __error: err.message }));
    }
  });
  context.setProp(context.global, "__macchiatoHost", hostFunction);
  hostFunction.dispose();
}

function evalGlobal(context, code, filename) {
  const result = context.evalCode(code, filename);
  if (result.error) {
    const error = context.dump(result.error);
    result.error.dispose();
    throw new Error(String(error));
  }
  result.value.dispose();
}

function evalModule(context, code, filename) {
  const result = context.evalCode(code, filename, { type: "module" });
  if (result.error) {
    const error = context.dump(result.error);
    result.error.dispose();
    throw new Error(String(error));
  }
  result.value.dispose();
}

function sourceValue(target) {
  if (target.matches(".add-btn")) return app.querySelector(".new-todo")?.value || "";
  return target.value || "";
}

function controlState() {
  return Array.from(app.querySelectorAll("input[data-node-id], textarea[data-node-id], select[data-node-id]"), (node) => ({
    nodeId: node.getAttribute("data-node-id"),
    value: node.value || "",
    checked: Boolean(node.checked),
  }));
}

function eventTargetFor(target, type) {
  for (let node = target; node && node !== app; node = node.parentElement) {
    if (!node.hasAttribute("data-node-id")) continue;
    const events = (node.getAttribute("data-events") || "").split(/\s+/).filter(Boolean);
    if (events.includes(type)) return node;
  }
  return null;
}

function render(html) {
  app.innerHTML = html;
  app.removeAttribute("data-status");
  document.getElementById("macchiato-loading-style")?.remove();
}

function dispatch(context, event, options = {}) {
  if (!event.nodeId) return;
  const result = context.evalCode(`__macchiatoDispatch(${JSON.stringify(JSON.stringify(event))})`);
  if (result.error) {
    const error = context.dump(result.error);
    result.error.dispose();
    throw new Error(String(error));
  }
  const html = String(context.dump(result.value));
  result.value.dispose();
  if (html.startsWith("__MACCHIATO_ERROR__")) {
    throw new Error(html.slice("__MACCHIATO_ERROR__".length));
  }
  const payload = JSON.parse(html);
  if (payload.dataTransfer) dragDataTransfer = payload.dataTransfer;
  if (options.render !== false) render(payload.html);
}

function dispatchDomEvent(context, event, type, extraPayload = {}, options = {}) {
  const node = eventTargetFor(event.target, type);
  if (!node) return;
  dispatch(context, {
    nodeId: node.getAttribute("data-node-id"),
    type,
    payload: {
      value: sourceValue(event.target),
      checked: Boolean(event.target.checked),
      controls: controlState(),
      ...extraPayload,
    },
  }, options);
}

async function main() {
  const [sourceHtml, guestRuntime, domSchema, cssSchema] = await Promise.all([
    loadText("/source.html"),
    loadText("/guest.js"),
    loadJson("/dom.schema.json"),
    loadJson("/css.schema.json"),
  ]);
  const css = extractStyle(sourceHtml);
  const styleUse = new StyleUse(cssSchema);
  styleUse.validateStylesheet(css);
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const storage = new LocalStorageBackend({
    mode: "passthrough",
    keys: ["guest-todos"],
    limit: DEFAULT_STORAGE_LIMIT,
  });
  const capability = new DomUseCapability(domSchema, styleUse, storage);
  const QuickJS = await newQuickJSWASMModuleFromVariant(quickjsVariant);
  const runtime = QuickJS.newRuntime();
  const context = runtime.newContext();
  installHostCapability(context, capability);

  evalGlobal(context, guestRuntime, "dom-use-todos-runtime.js");
  const boot = context.evalCode(`__macchiatoBoot(${JSON.stringify(sourceHtml)})`);
  if (boot.error) {
    const error = context.dump(boot.error);
    boot.error.dispose();
    throw new Error(String(error));
  }
  const scripts = JSON.parse(String(context.dump(boot.value)));
  boot.value.dispose();
  if (scripts.error) throw new Error(scripts.error);
  scripts.forEach((script, index) => evalModule(context, script.code, `todo-inline-${index}.js`));
  render(capability.serializeApp().html);

  app.addEventListener("click", (event) => {
    dispatchDomEvent(context, event, "click");
  });
  app.addEventListener("change", (event) => {
    dispatchDomEvent(context, event, "change");
  });
  app.addEventListener("dblclick", (event) => {
    dispatchDomEvent(context, event, "dblclick");
  });
  app.addEventListener("blur", (event) => {
    dispatchDomEvent(context, event, "blur");
  }, true);
  app.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== "Escape") return;
    dispatchDomEvent(context, event, "keydown", { key: event.key });
  });
  app.addEventListener("dragstart", (event) => {
    dragDataTransfer = { data: {}, effectAllowed: "move" };
    dispatchDomEvent(context, event, "dragstart", { dataTransfer: dragDataTransfer }, { render: false });
  });
  app.addEventListener("dragover", (event) => {
    const node = eventTargetFor(event.target, "dragover");
    if (!node) return;
    event.preventDefault();
    dispatchDomEvent(context, event, "dragover", { dataTransfer: dragDataTransfer }, { render: false });
  });
  app.addEventListener("drop", (event) => {
    const node = eventTargetFor(event.target, "drop");
    if (!node) return;
    event.preventDefault();
    dispatchDomEvent(context, event, "drop", { dataTransfer: dragDataTransfer });
    dragDataTransfer = null;
  });
}

main().catch((err) => {
  app.setAttribute("data-status", "error");
  app.textContent = `Sandbox error: ${err.message}`;
});
