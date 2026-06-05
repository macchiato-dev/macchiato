import { DomUse } from "./index.js";

export const DEFAULT_STORAGE_LIMIT = 10000;

export class LocalStorageBackend {
  constructor(config = {}) {
    this.mode = config.mode || "disabled";
    this.allowedKeys = config.keys ? new Set(config.keys) : null;
    this.limit = config.limit ?? DEFAULT_STORAGE_LIMIT;
    this.storage = config.storage || null;
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
    return this.backend().getItem(String(key));
  }

  setItem(key, value) {
    this.assertEnabled(key, value);
    this.backend().setItem(String(key), String(value));
  }

  backend() {
    if (!this.storage) this.storage = globalThis.localStorage;
    return this.storage;
  }
}

export class DomUseHostCapability {
  constructor(domSchema, styleUse, options = {}) {
    this.domUse = new DomUse(domSchema, styleUse);
    this.document = this.domUse.createDocument();
    this.storage = options.storage || new LocalStorageBackend();
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

  finishInit() {
    this.domUse.setGasLifecycle(this.document, "idle");
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
    const previousChildren = [...(node.children || [])];
    node.textContent = value;
    for (const child of previousChildren) this.pruneTree(child);
    return {};
  }

  setInnerHTML(id, html) {
    const node = this.node(id);
    const previousChildren = [...(node.children || [])];
    if (html === "") node.replaceChildren();
    else this.domUse.setInnerHTML(node, html);
    for (const child of previousChildren) this.pruneTree(child);
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
    const clean = this.domUse.sanitizeEventPayload(event, payload);
    this.domUse.spendGas(this.document, "eventPayload", {
      textLength: JSON.stringify(clean).length,
    });
    return { payload: clean };
  }

  beginEvent() {
    if (this.eventDepth === 0) this.domUse.setGasLifecycle(this.document, "event");
    this.eventDepth += 1;
    return {};
  }

  endEvent() {
    this.eventDepth = Math.max(0, this.eventDepth - 1);
    if (this.eventDepth === 0) {
      this.flushPrunedNodes();
      this.domUse.setGasLifecycle(this.document, "idle");
    }
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
      case "finishInit": return this.finishInit();
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

export function controlState(root) {
  return Array.from(root.querySelectorAll("input[data-node-id], textarea[data-node-id], select[data-node-id]"), (node) => ({
    nodeId: node.getAttribute("data-node-id"),
    value: node.value || "",
    checked: Boolean(node.checked),
  }));
}

export function eventPathNodeIds(root, target) {
  const nodeIds = [];
  for (let node = target; node && node !== root; node = node.parentElement) {
    if (node.hasAttribute("data-node-id")) nodeIds.push(node.getAttribute("data-node-id"));
  }
  return nodeIds;
}

export function eventTargetFor(capability, root, target, type) {
  const { id } = capability.dispatch({ op: "eventTarget", nodeIds: eventPathNodeIds(root, target), event: type });
  return id;
}

export function eventPayload(capability, type, payload) {
  return capability.dispatch({ op: "eventPayload", event: type, payload }).payload;
}

export function sourceValue(root, target, options = {}) {
  if (options.sourceValue) return options.sourceValue(target, root);
  return target.value || "";
}

export function dispatchGuestDomEvent(capability, sandbox, root, event, type, extraPayload = {}, options = {}) {
  capability.dispatch({ op: "beginEvent" });
  try {
    const nodeId = eventTargetFor(capability, root, event.target, type);
    if (!nodeId) return null;
    const payload = sandbox.callJsonFunction("__macchiatoDispatch", {
      nodeId,
      type,
      payload: eventPayload(capability, type, {
        value: sourceValue(root, event.target, options),
        checked: Boolean(event.target.checked),
        controls: controlState(root),
        ...extraPayload,
      }),
    });
    if (options.render !== false) root.innerHTML = payload.html;
    return payload;
  } finally {
    capability.dispatch({ op: "endEvent" });
  }
}
