import { DomUse } from "@macchiato-dev/dom-use";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
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
    this.nodeIds = new WeakMap();
    this.pendingPrune = new Set();
    this.eventDepth = 0;
    this.appRootId = null;
    this.nextId = 1;
  }

  resetDom() {
    this.nodes = new Map();
    this.nodeIds = new WeakMap();
    this.pendingPrune = new Set();
    this.eventDepth = 0;
    this.appRootId = null;
    this.nextId = 1;
    this.document = this.domUse.createDocument();
    return {};
  }

  register(node) {
    const id = String(this.nextId++);
    this.nodes.set(id, node);
    this.nodeIds.set(node, id);
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
    const node = this.node(id);
    this.pruneChildren(node);
    node.textContent = value;
    return {};
  }

  setInnerHTML(id, html) {
    const node = this.node(id);
    this.pruneChildren(node);
    if (html === "") node.replaceChildren();
    else this.domUse.setInnerHTML(node, html);
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
    const node = this.node(id);
    node.addEventListener(event);
    node.setAttribute("data-node-id", String(id));
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

  eventTarget(nodeIds, event) {
    const candidates = (nodeIds || []).map((id) => this.nodes.get(String(id))).filter(Boolean);
    const node = this.domUse.eventTarget(candidates, event);
    if (!node) return { id: null };
    return { id: this.nodeIds.get(node) || null };
  }

  eventPayload(event, payload) {
    return { payload: this.domUse.sanitizeEventPayload(event, payload) };
  }

  beginEvent() {
    this.eventDepth += 1;
    return {};
  }

  endEvent() {
    this.eventDepth = Math.max(0, this.eventDepth - 1);
    if (this.eventDepth === 0) this.flushPrunedNodes();
    return {};
  }

  pruneChildren(node) {
    for (const child of [...(node.children || [])]) this.pruneTree(child);
  }

  pruneTree(node) {
    if (this.eventDepth > 0) {
      this.pendingPrune.add(node);
      return;
    }
    for (const child of [...(node.children || [])]) this.pruneTree(child);
    const id = this.nodeIds.get(node);
    if (id) {
      this.nodes.delete(id);
      this.nodeIds.delete(node);
      if (node.ownerDocument?.createdNodes > 0) node.ownerDocument.createdNodes -= 1;
    }
  }

  flushPrunedNodes() {
    const pending = Array.from(this.pendingPrune);
    this.pendingPrune.clear();
    for (const node of pending) this.pruneTree(node);
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
      case "eventTarget": return this.eventTarget(message.nodeIds, message.event);
      case "eventPayload": return this.eventPayload(message.event, message.payload);
      case "beginEvent": return this.beginEvent();
      case "endEvent": return this.endEvent();
      case "storageGet": return this.storageGet(message.key);
      case "storageSet": return this.storageSet(message.key, message.value);
      default: throw new Error(`Unsupported host operation: ${message.op}`);
    }
  }
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

function eventPathNodeIds(target) {
  const nodeIds = [];
  for (let node = target; node && node !== app; node = node.parentElement) {
    if (node.hasAttribute("data-node-id")) nodeIds.push(node.getAttribute("data-node-id"));
  }
  return nodeIds;
}

function eventTargetFor(capability, target, type) {
  const { id } = capability.dispatch({ op: "eventTarget", nodeIds: eventPathNodeIds(target), event: type });
  return id;
}

function eventPayload(capability, type, payload) {
  return capability.dispatch({ op: "eventPayload", event: type, payload }).payload;
}

function render(html) {
  app.innerHTML = html;
  app.removeAttribute("data-status");
  document.getElementById("macchiato-loading-style")?.remove();
}

function dispatch(sandbox, event, options = {}) {
  if (!event.nodeId) return;
  const payload = sandbox.callJsonFunction("__macchiatoDispatch", event);
  if (payload.dataTransfer) dragDataTransfer = payload.dataTransfer;
  if (options.render !== false) render(payload.html);
}

function dispatchDomEvent(capability, sandbox, event, type, extraPayload = {}, options = {}) {
  const nodeId = eventTargetFor(capability, event.target, type);
  if (!nodeId) return;
  dispatch(sandbox, {
    nodeId,
    type,
    payload: eventPayload(capability, type, {
      value: sourceValue(event.target),
      checked: Boolean(event.target.checked),
      controls: controlState(),
      ...extraPayload,
    }),
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
  const sandbox = await createSandbox();
  sandbox.installJsonHostFunction("__macchiatoHost", (message) => capability.dispatch(message));

  sandbox.evalGlobal(guestRuntime, "dom-use-todos-runtime.js");
  const scripts = sandbox.callJsonFunction("__macchiatoBoot", sourceHtml, { rawArgument: true });
  if (scripts.error) throw new Error(scripts.error);
  scripts.forEach((script, index) => sandbox.evalModule(script.code, `todo-inline-${index}.js`));
  render(capability.serializeApp().html);

  app.addEventListener("click", (event) => {
    dispatchDomEvent(capability, sandbox, event, "click");
  });
  app.addEventListener("change", (event) => {
    dispatchDomEvent(capability, sandbox, event, "change");
  });
  app.addEventListener("dblclick", (event) => {
    dispatchDomEvent(capability, sandbox, event, "dblclick");
  });
  app.addEventListener("blur", (event) => {
    dispatchDomEvent(capability, sandbox, event, "blur");
  }, true);
  app.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== "Escape") return;
    dispatchDomEvent(capability, sandbox, event, "keydown", { key: event.key });
  });
  app.addEventListener("dragstart", (event) => {
    dragDataTransfer = { data: {}, effectAllowed: "move" };
    dispatchDomEvent(capability, sandbox, event, "dragstart", { dataTransfer: dragDataTransfer }, { render: false });
  });
  app.addEventListener("dragover", (event) => {
    if (!eventTargetFor(capability, event.target, "dragover")) return;
    event.preventDefault();
    dispatchDomEvent(capability, sandbox, event, "dragover", { dataTransfer: dragDataTransfer }, { render: false });
  });
  app.addEventListener("drop", (event) => {
    if (!eventTargetFor(capability, event.target, "drop")) return;
    event.preventDefault();
    dispatchDomEvent(capability, sandbox, event, "drop", { dataTransfer: dragDataTransfer });
    dragDataTransfer = null;
  });
}

main().catch((err) => {
  app.setAttribute("data-status", "error");
  app.textContent = `Sandbox error: ${err.message}`;
});
