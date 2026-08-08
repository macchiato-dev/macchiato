// @ts-nocheck -- this file intentionally installs a partial synthetic DOM in guest globals.
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
  let match;
  while ((match = re.exec(source)) !== null) {
    attrs.push([match[1], match[2] ?? match[3] ?? match[4] ?? ""]);
  }
  return attrs;
}

function textFromSource(source) {
  return String(source).replace(/&(?:#(\d+)|#x([0-9a-f]+)|amp|lt|gt|quot|apos|nbsp);/gi, (entity, decimal, hexadecimal) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
    return { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": "\u00a0" }[entity.toLowerCase()] || entity;
  });
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

  append(...nodes) {
    for (const node of nodes) this.appendChild(node instanceof HostNode ? node : new HostText(String(node)));
  }

  replaceChildren(...nodes) {
    for (const child of [...this.children]) this.removeChild(child);
    this.append(...nodes);
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
    this._dataset = {};
    this.dataset = typeof Proxy === "function" ? new Proxy(this._dataset, {
      set: (_target, property, value) => {
        this.setAttribute(`data-${String(property).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value);
        return true;
      },
    }) : this._dataset;
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

  get classList() {
    const values = () => this.className.split(/\s+/).filter(Boolean);
    const write = (items) => { this.className = [...new Set(items)].join(" "); };
    return {
      contains: (name) => values().includes(String(name)),
      add: (...names) => write([...values(), ...names.map(String)]),
      remove: (...names) => { const removed = new Set(names.map(String)); write(values().filter((name) => !removed.has(name))); },
      toggle: (name, force) => {
        const present = values().includes(String(name));
        const enabled = force === undefined ? !present : Boolean(force);
        if (enabled && !present) write([...values(), String(name)]);
        if (!enabled && present) write(values().filter((item) => item !== String(name)));
        return enabled;
      },
    };
  }

  get hidden() { return this.attributes.hidden !== undefined; }
  set hidden(value) { if (value) this.setAttribute("hidden", ""); else this.removeAttribute("hidden"); }
  get src() { return this.getAttribute("src") || ""; }
  set src(value) { this.setAttribute("src", value); }

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
    else if (this.tagName === "textarea") this.textContent = this._value;
  }

  get style() {
    const style = {
      setProperty: (property, value) => {
        host("setStyle", { id: this.__hostNodeId, property: String(property), value: String(value) });
      },
    };
    if (typeof Proxy !== "function") return style;
    return new Proxy(style, {
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
    if (key.slice(0, 5) === "data-") {
      const datasetKey = key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this._dataset[datasetKey] = text;
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
    const attribute = /^\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]$/.exec(selector);
    if (attribute) return this.attributes[attribute[1]] !== undefined && (attribute[2] === undefined || this.attributes[attribute[1]] === attribute[2]);
    if (selector.slice(0, 1) === ".") return this.className.split(/\s+/).indexOf(selector.slice(1)) !== -1;
    if (selector.slice(0, 1) === "#") return this.id === selector.slice(1);
    return this.tagName === selector.toLowerCase();
  }

  querySelector(selector) {
    return find(this, (node) => node instanceof HostElement && node.matches(selector));
  }

  querySelectorAll(selector) {
    return findAll(this, (node) => node instanceof HostElement && node.matches(selector));
  }

  closest(selector) {
    for (let node = this; node instanceof HostElement; node = node.parentNode) if (node.matches(selector)) return node;
    return null;
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

function findAll(node, predicate, matches = []) {
  for (const child of node.children || []) {
    if (predicate(child)) matches.push(child);
    findAll(child, predicate, matches);
  }
  return matches;
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
  querySelectorAll(selector) {
    return this.body?.querySelectorAll(selector) || [];
  },
  addEventListener(event, handler) {
    this.body?.addEventListener(event, handler);
  },
  removeEventListener(event, handler) {
    this.body?.removeEventListener(event, handler);
  },
  hasFocus() { return true; },
  visibilityState: "visible",
};

const localStorage = {
  getItem(key) {
    return host("storageGet", { key }).value;
  },
  setItem(key, value) {
    host("storageSet", { key, value: String(value) });
  },
  removeItem(key) {
    host("storageRemove", { key });
  },
};

globalThis.document = document;
globalThis.localStorage = localStorage;
// Storage remains a host capability. Containers that grant session semantics
// can bind the same synchronous guest facade to an isolated, session-scoped
// backend without exposing the iframe or page's native origin storage.
globalThis.sessionStorage = localStorage;

class HostSearchParams {
  values;
  constructor(search = "") {
    this.values = new Map();
    for (const part of String(search).replace(/^\?/, "").split("&")) {
      if (!part) continue;
      const [key, value = ""] = part.split("=");
      this.values.set(decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, " ")));
    }
  }
  get(key) { return this.values.get(String(key)) ?? null; }
}

class HostURL {
  href;
  search;
  searchParams;
  constructor(input, base = "https://presentation.invalid/") {
    const value = String(input);
    this.href = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `${String(base).replace(/[^/]*$/, "")}${value.replace(/^\//, "")}`;
    const query = this.href.indexOf("?");
    const fragment = this.href.indexOf("#", query);
    this.search = query < 0 ? "" : this.href.slice(query, fragment < 0 ? undefined : fragment);
    this.searchParams = new HostSearchParams(this.search);
  }
}

globalThis.URL = HostURL;
globalThis.location = Object.freeze({ href: globalThis.__macchiatoLocationHref || "https://presentation.invalid/" });

let nextTimerId = 1;
const timers = new Map();
globalThis.setTimeout = (callback, delay = 0) => {
  const id = nextTimerId++;
  timers.set(id, { callback, delay: Math.max(0, Number(delay) || 0), due: Date.now() + Math.max(0, Number(delay) || 0), repeat: false });
  return id;
};
globalThis.clearTimeout = (id) => timers.delete(Number(id));
globalThis.setInterval = (callback, delay = 0) => {
  const id = nextTimerId++;
  const milliseconds = Math.max(1, Number(delay) || 0);
  timers.set(id, { callback, delay: milliseconds, due: Date.now() + milliseconds, repeat: true });
  return id;
};
globalThis.clearInterval = globalThis.clearTimeout;
globalThis.addEventListener = (event, handler) => document.addEventListener(event, handler);
globalThis.removeEventListener = (event, handler) => document.removeEventListener(event, handler);

globalThis.__macchiatoTimers = (nowValue) => {
  try {
    const now = Number(nowValue) || Date.now();
    let changed = false;
    for (const [id, timer] of [...timers]) {
      if (timer.due > now) continue;
      if (timer.repeat) timer.due = now + timer.delay;
      else timers.delete(id);
      timer.callback();
      changed = true;
    }
    return JSON.stringify(changed ? { changed: true } : { changed: false });
  } catch (err) {
    return `__MACCHIATO_ERROR__${err.message}`;
  }
};

function parseInitialHtml(source) {
  const scripts = [];
  host("resetDom");
  elementsById.clear();
  listenersByNode.clear();

  const body = document.createElement("body");
  document.body = body;
  const stack = [body];
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(source);
  const markup = bodyMatch ? bodyMatch[1] : source;
  const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>|<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;

  let match;
  let cursor = 0;
  while ((match = tagRe.exec(markup)) !== null) {
    const preceding = markup.slice(cursor, match.index);
    if (preceding) stack[stack.length - 1].appendChild(document.createTextNode(textFromSource(preceding)));
    cursor = tagRe.lastIndex;
    if (match[0].slice(0, 7) === "<script") {
      scripts.push({ attrs: attrsFromSource(match[1] || ""), code: match[2] || "" });
      continue;
    }
    const tagName = match[3]?.toLowerCase();
    if (!tagName || tagName === "html" || tagName === "head" || tagName === "body" || tagName === "meta" || tagName === "link" || tagName === "title" || tagName === "style") {
      continue;
    }
    if (match[0].slice(0, 2) === "</") {
      while (stack.length > 1) {
        const node = stack.pop();
        if (node.tagName === tagName) break;
      }
      continue;
    }
    const node = document.createElement(tagName);
    for (const [name, value] of attrsFromSource(match[4] || "")) node.setAttribute(name, value);
    stack[stack.length - 1].appendChild(node);
    const selfClosing = /\/\s*>$/.test(match[0]);
    if (!selfClosing && ["br", "input", "hr", "img", "meta", "link"].indexOf(tagName) === -1) stack.push(node);
  }
  const trailing = markup.slice(cursor);
  if (trailing) stack[stack.length - 1].appendChild(document.createTextNode(textFromSource(trailing)));

  const app = document.getElementById("app");
  host("setAppRoot", { id: app?.__hostNodeId || body.__hostNodeId });
  return scripts;
}

function makeEvent(target, payload) {
  target.value = payload.value || "";
  target.checked = Boolean(payload.checked);
  const transferData = { ...(payload.dataTransfer?.data || {}) };
  const dataTransfer = {
    getData(type) {
      return transferData[String(type)] || "";
    },
    setData(type, value) {
      transferData[String(type)] = String(value);
    },
    effectAllowed: payload.dataTransfer?.effectAllowed || "move",
  };
  return {
    target,
    key: payload.key || "",
    preventDefault() {},
    stopPropagation() {},
    dataTransfer,
    __macchiatoDataTransfer: { data: transferData, effectAllowed: dataTransfer.effectAllowed },
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
      host("beginEvent");
      try {
        applyControlState(event.payload?.controls);
        const guestEvent = makeEvent(target, event.payload || {});
        for (const listener of listeners) listener(guestEvent);
        guestEvent.__macchiatoDataTransfer.effectAllowed = guestEvent.dataTransfer.effectAllowed;
        event.dataTransfer = guestEvent.__macchiatoDataTransfer;
      } finally {
        host("endEvent");
      }
    }
    return JSON.stringify({ html: host("serializeApp").html, dataTransfer: event.dataTransfer || null });
  } catch (err) {
    return `__MACCHIATO_ERROR__${err.message}`;
  }
};
