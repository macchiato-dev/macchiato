function host(op, data = {}) {
  const result = JSON.parse(globalThis.__macchiatoHost(JSON.stringify({ op, ...data })));
  if (result && result.__error) throw new Error(result.__error);
  return result;
}

const elementsById = new Map();
const listenersByNode = new Map();

function attrsFromSource(source) {
  const attrs = [];
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(re)) {
    attrs.push([match[1], match[2] ?? match[3] ?? match[4] ?? ""]);
  }
  return attrs;
}

class HostNode {
  constructor(id) {
    this.__hostNodeId = String(id);
    this.parentNode = null;
    this.children = [];
  }

  appendChild(child) {
    host("appendChild", { parentId: this.__hostNodeId, childId: child.__hostNodeId });
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    host("removeChild", { parentId: this.__hostNodeId, childId: child.__hostNodeId });
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  insertBefore(newNode, referenceNode) {
    host("insertBefore", {
      parentId: this.__hostNodeId,
      childId: newNode.__hostNodeId,
      referenceId: referenceNode?.__hostNodeId || null,
    });
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    const index = referenceNode ? this.children.indexOf(referenceNode) : -1;
    if (index === -1) this.children.push(newNode);
    else this.children.splice(index, 0, newNode);
    newNode.parentNode = this;
    return newNode;
  }
}

class HostText extends HostNode {
  constructor(text) {
    super(host("createTextNode", { text }).id);
    this.nodeType = 3;
    this._textContent = String(text);
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
    host("setTextContent", { id: this.__hostNodeId, value: this._textContent });
  }
}

class HostElement extends HostNode {
  constructor(tagName) {
    super(host("createElement", { tagName }).id);
    this.nodeType = 1;
    this.tagName = String(tagName).toLowerCase();
    this.attributes = {};
    this._textContent = "";
    this._className = "";
    this._value = "";
    this.checked = false;
    this.dataset = {};
  }

  get id() {
    return this.attributes.id || "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = String(value);
    this.setAttribute("class", this._className);
  }

  get textContent() {
    if (this.children.length) return this.children.map((child) => child.textContent || "").join("");
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
    host("setTextContent", { id: this.__hostNodeId, value: this._textContent });
  }

  get innerHTML() {
    return "";
  }

  set innerHTML(value) {
    this.children = [];
    host("setInnerHTML", { id: this.__hostNodeId, html: String(value) });
  }

  get value() {
    return this._value || this.attributes.value || "";
  }

  set value(value) {
    this._value = String(value);
    if (this.tagName === "input") this.setAttribute("value", this._value);
  }

  get style() {
    return new Proxy({}, {
      set: (_target, property, value) => {
        host("setStyle", { id: this.__hostNodeId, property: String(property), value: String(value) });
        return true;
      },
    });
  }

  setAttribute(name, value) {
    const key = String(name);
    const text = String(value);
    this.attributes[key] = text;
    if (key === "id") elementsById.set(text, this);
    if (key === "class") this._className = text;
    if (key === "value") this._value = text;
    if (key === "checked") this.checked = true;
    if (key.startsWith("data-")) {
      const datasetKey = key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[datasetKey] = text;
    }
    host("setAttribute", { id: this.__hostNodeId, name: key, value: text });
  }

  getAttribute(name) {
    return this.attributes[String(name)] ?? null;
  }

  removeAttribute(name) {
    const key = String(name);
    delete this.attributes[key];
    host("removeAttribute", { id: this.__hostNodeId, name: key });
  }

  addEventListener(event, handler) {
    const name = String(event);
    const listeners = listenersByNode.get(this.__hostNodeId) || {};
    if (!listeners[name]) listeners[name] = [];
    listeners[name].push(handler);
    listenersByNode.set(this.__hostNodeId, listeners);
    host("addEventListener", { id: this.__hostNodeId, event: name });
  }

  removeEventListener(event, handler) {
    const listeners = listenersByNode.get(this.__hostNodeId);
    if (!listeners?.[event]) return;
    listeners[event] = listeners[event].filter((entry) => entry !== handler);
  }

  matches(selector) {
    if (selector.startsWith(".")) return this.className.split(/\s+/).includes(selector.slice(1));
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    return this.tagName === selector.toLowerCase();
  }

  querySelector(selector) {
    return find(this, (node) => node instanceof HostElement && node.matches(selector));
  }

  focus() {}
}

function find(node, predicate) {
  for (const child of node.children || []) {
    if (predicate(child)) return child;
    const found = find(child, predicate);
    if (found) return found;
  }
  return null;
}

const document = {
  body: null,
  createElement(tagName) {
    return new HostElement(tagName);
  },
  createTextNode(text) {
    return new HostText(text);
  },
  getElementById(id) {
    return elementsById.get(String(id)) || null;
  },
  querySelector(selector) {
    return this.body?.querySelector(selector) || null;
  },
};

const localStorage = {
  getItem(key) {
    return host("storageGet", { key }).value;
  },
  setItem(key, value) {
    host("storageSet", { key, value: String(value) });
  },
};

globalThis.document = document;
globalThis.localStorage = localStorage;

function parseInitialHtml(source) {
  const scripts = [];
  host("resetDom");
  elementsById.clear();
  listenersByNode.clear();

  const body = document.createElement("body");
  document.body = body;
  const stack = [body];
  const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>|<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;

  for (const match of source.matchAll(tagRe)) {
    if (match[0].startsWith("<script")) {
      scripts.push({ attrs: attrsFromSource(match[1] || ""), code: match[2] || "" });
      continue;
    }
    const tagName = match[3]?.toLowerCase();
    if (!tagName || tagName === "html" || tagName === "head" || tagName === "body" || tagName === "meta" || tagName === "title" || tagName === "style") {
      continue;
    }
    if (match[0].startsWith("</")) {
      while (stack.length > 1) {
        const node = stack.pop();
        if (node.tagName === tagName) break;
      }
      continue;
    }
    const node = document.createElement(tagName);
    for (const [name, value] of attrsFromSource(match[4] || "")) node.setAttribute(name, value);
    stack[stack.length - 1].appendChild(node);
    if (!["br", "input", "hr", "img", "meta", "link"].includes(tagName)) stack.push(node);
  }

  const app = document.getElementById("app");
  host("setAppRoot", { id: app?.__hostNodeId || body.__hostNodeId });
  return scripts;
}

function makeEvent(target, payload) {
  target.value = payload.value || "";
  target.checked = Boolean(payload.checked);
  return {
    target,
    key: payload.key || "",
    preventDefault() {},
    stopPropagation() {},
    dataTransfer: {
      getData() { return ""; },
      setData() {},
      effectAllowed: "move",
    },
  };
}

function applyControlState(controls) {
  for (const control of controls || []) {
    const node = find(document.body, (entry) => entry.__hostNodeId === String(control.nodeId));
    if (!node) continue;
    node.value = control.value || "";
    node.checked = Boolean(control.checked);
  }
}

globalThis.__macchiatoBoot = (source) => {
  try {
    return JSON.stringify(parseInitialHtml(source));
  } catch (err) {
    return JSON.stringify({ error: err.message });
  }
};

globalThis.__macchiatoDispatch = (json) => {
  try {
    const event = JSON.parse(json);
    const listeners = listenersByNode.get(String(event.nodeId))?.[event.type] || [];
    const target = host("nodeTag", { id: event.nodeId }).tagName
      ? find(document.body, (node) => node.__hostNodeId === String(event.nodeId))
      : null;
    if (target) {
      applyControlState(event.payload?.controls);
      const guestEvent = makeEvent(target, event.payload || {});
      for (const listener of listeners) listener(guestEvent);
    }
    return host("serializeApp").html;
  } catch (err) {
    return `__MACCHIATO_ERROR__${err.message}`;
  }
};
