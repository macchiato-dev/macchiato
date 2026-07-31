function pattern(value, label) {
  if (value instanceof RegExp) return value;
  if (typeof value !== "string" || value.length > 2_000) throw new Error(`${label} must be a bounded pattern`);
  return new RegExp(value);
}

function attributeEntries(element) {
  return Array.from(element.attributes || [], (entry) => [String(entry.name), String(entry.value)]);
}

function elementChildren(element) {
  return Array.from(element.children || []).filter((child) => child?.nodeType === undefined || child.nodeType === 1);
}

export function compileDomShapePolicy(input = {}) {
  const tags = new Set((input.tags || []).map((tag) => String(tag).toLowerCase()));
  if (!tags.size) throw new Error("DOM shape policy requires tags");
  const attributes = Object.fromEntries(Object.entries(input.attributes || {}).map(([name, value]) => [
    name,
    value === true ? true : pattern(value, `attribute ${name}`),
  ]));
  const classNames = (input.classNames || []).map((value) => pattern(value, "class name"));
  const events = new Set((input.events || []).map((event) => String(event).toLowerCase()));
  return Object.freeze({
    tags,
    attributes: Object.freeze(attributes),
    classNames: Object.freeze(classNames),
    events,
    maxElements: Math.max(1, Math.min(Number(input.maxElements || 500), 10_000)),
    maxDepth: Math.max(1, Math.min(Number(input.maxDepth || 20), 100)),
    maxTextLength: Math.max(0, Math.min(Number(input.maxTextLength || 100_000), 1_000_000)),
  });
}

function assertAttribute(policy, name, value) {
  const rule = policy.attributes[name];
  if (!rule) throw new Error(`DOM shape rejected attribute: ${name}`);
  if (rule !== true && !rule.test(value)) throw new Error(`DOM shape rejected ${name}: ${value}`);
  if (name === "class") {
    for (const token of value.split(/\s+/).filter(Boolean)) {
      if (!policy.classNames.some((allowed) => allowed.test(token))) {
        throw new Error(`DOM shape rejected class: ${token}`);
      }
    }
  }
}

export function inspectDomShape(root, policyInput) {
  const policy = policyInput?.tags instanceof Set ? policyInput : compileDomShapePolicy(policyInput);
  const tags = {};
  let elements = 0;
  let textLength = 0;
  function visit(element, depth) {
    if (depth > policy.maxDepth) throw new Error(`DOM shape exceeds depth ${policy.maxDepth}`);
    const tag = String(element.localName || element.tagName || "").toLowerCase();
    if (!policy.tags.has(tag)) throw new Error(`DOM shape rejected element: ${tag}`);
    elements += 1;
    if (elements > policy.maxElements) throw new Error(`DOM shape exceeds ${policy.maxElements} elements`);
    tags[tag] = (tags[tag] || 0) + 1;
    for (const [name, value] of attributeEntries(element)) assertAttribute(policy, name, value);
    for (const child of Array.from(element.childNodes || [])) {
      if (child.nodeType === 3) textLength += String(child.textContent || "").length;
    }
    if (textLength > policy.maxTextLength) throw new Error(`DOM shape exceeds text limit ${policy.maxTextLength}`);
    for (const child of elementChildren(element)) visit(child, depth + 1);
  }
  for (const child of elementChildren(root)) visit(child, 1);
  return Object.freeze({ elements, textLength, tags: Object.freeze(tags) });
}

export class BrowserDomHost {
  constructor(root, policy, { onViolation = () => {}, onEvent = () => {} } = {}) {
    if (!root?.querySelectorAll) throw new Error("BrowserDomHost requires a browser root");
    this.root = root;
    this.policy = compileDomShapePolicy(policy);
    this.onViolation = onViolation;
    this.onEvent = onEvent;
    this.nodes = new Map([["root", root]]);
    this.ids = new WeakMap([[root, "root"]]);
    this.nodes.set("document", root.ownerDocument);
    this.ids.set(root.ownerDocument, "document");
    this.nextId = 1;
    this.observer = null;
    this.listeners = new Map();
  }

  register(node) {
    if (!this.root.contains(node) && node !== this.root) throw new Error("DOM handle is outside the granted root");
    let id = this.ids.get(node);
    if (!id) {
      id = String(this.nextId++);
      this.ids.set(node, id);
      this.nodes.set(id, node);
    }
    return id;
  }

  node(id) {
    const node = this.nodes.get(String(id));
    if (!node) throw new Error("DOM handle is no longer available");
    return node;
  }

  inspect() {
    return inspectDomShape(this.root, this.policy);
  }

  query(selector, all = false) {
    if (typeof selector !== "string" || selector.length > 120 || /[,:+~[\]]/.test(selector)) {
      throw new Error("Selector is outside the browser-use subset");
    }
    const found = all ? Array.from(this.root.querySelectorAll(selector)) : [this.root.querySelector(selector)].filter(Boolean);
    return { ids: found.map((node) => this.register(node)) };
  }

  read(id, property) {
    const node = this.node(id);
    if (!["textContent", "value", "checked", "className", "tagName", "childElementCount"].includes(property)) {
      throw new Error(`DOM read is not allowed: ${property}`);
    }
    return { value: node[property] };
  }

  write(id, property, value) {
    const node = this.node(id);
    if (!["textContent", "value", "checked"].includes(property)) throw new Error(`DOM write is not allowed: ${property}`);
    node[property] = property === "checked" ? Boolean(value) : String(value);
    this.inspect();
    return {};
  }

  create(tag) {
    const name = String(tag).toLowerCase();
    if (!this.policy.tags.has(name)) throw new Error(`DOM shape rejected element: ${name}`);
    const node = this.root.ownerDocument.createElement(name);
    const id = String(this.nextId++);
    this.ids.set(node, id);
    this.nodes.set(id, node);
    return { id };
  }

  mutate(message) {
    const node = this.node(message.id);
    if (message.action === "append") {
      node.appendChild(this.node(message.child));
    } else if (message.action === "insertBefore") {
      node.insertBefore(this.node(message.child), message.before ? this.node(message.before) : null);
    } else if (message.action === "remove") {
      node.remove();
    } else if (message.action === "replaceChildren") {
      node.replaceChildren(...(message.children || []).map((id) => this.node(id)));
    } else if (message.action === "attribute") {
      assertAttribute(this.policy, String(message.name), String(message.value));
      node.setAttribute(String(message.name), String(message.value));
    } else if (message.action === "removeAttribute") {
      node.removeAttribute(String(message.name));
    } else {
      throw new Error(`DOM mutation is not allowed: ${message.action}`);
    }
    if (this.root.contains(node) || node === this.root) this.inspect();
    return {};
  }

  listen(id, type, listenerId) {
    const node = this.node(id);
    type = String(type).toLowerCase();
    if (!this.policy.events.has(type)) throw new Error(`DOM event subscription is not allowed: ${type}`);
    const key = `${id}:${type}:${listenerId}`;
    if (this.listeners.has(key)) return {};
    const listener = (event) => this.onEvent(String(listenerId), {
      type: event.type,
      key: event.key,
      code: event.code,
      keyCode: event.keyCode,
      charCode: event.charCode,
      which: event.which,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      button: event.button,
      buttons: event.buttons,
      clientX: event.clientX,
      clientY: event.clientY,
      inputType: event.inputType,
      data: event.data,
      isComposing: event.isComposing,
      repeat: event.repeat,
      target: this.register(event.target),
    }, event);
    node.addEventListener(type, listener);
    this.listeners.set(key, { node, type, listener });
    return {};
  }

  remote(message) {
    const allowedProperties = new Set([
      "activeElement", "assignedSlot", "attributes", "childNodes", "children", "className", "clientHeight", "clientWidth",
      "contentEditable", "dataset", "firstChild", "firstElementChild", "height", "innerHTML", "lastChild",
      "lastElementChild", "localName", "name", "nextSibling", "nodeName", "nodeType", "nodeValue",
      "offsetHeight", "offsetLeft", "offsetParent", "offsetTop", "offsetWidth", "ownerDocument",
      "parentElement", "parentNode", "previousSibling", "scrollHeight", "scrollLeft", "scrollTop",
      "scrollWidth", "selectionEnd", "selectionStart", "spellcheck", "style", "tabIndex", "textContent",
      "type", "value", "width", "rangeCount", "anchorNode", "anchorOffset", "focusNode", "focusOffset",
    ]);
    const allowedMethods = new Set([
      "appendChild", "blur", "contains", "focus", "getAttribute", "getBoundingClientRect",
      "getClientRects", "hasAttribute", "insertBefore", "matches", "querySelector", "querySelectorAll",
      "remove", "removeAttribute", "removeChild", "replaceChild", "replaceChildren", "scrollIntoView",
      "setAttribute", "setSelectionRange",
      "addRange", "collapse", "collapseToEnd", "collapseToStart", "extend", "getRangeAt", "removeAllRanges",
      "setBaseAndExtent",
      "selectNode", "selectNodeContents", "setEnd", "setEndAfter", "setEndBefore", "setStart",
      "setStartAfter", "setStartBefore",
    ]);
    const encode = (value) => {
      if (value == null || ["string", "number", "boolean"].includes(typeof value)) return { value };
      if (value instanceof Node || value instanceof Range || value instanceof Selection) return { handle: this.registerRemote(value) };
      if (typeof value.length === "number" && typeof value !== "function") {
        return { list: Array.from(value, (item) => encode(item)) };
      }
      if (typeof value === "object") {
        const plain = {};
        for (const key of ["x", "y", "top", "right", "bottom", "left", "width", "height"]) {
          if (typeof value[key] === "number") plain[key] = value[key];
        }
        return { value: plain };
      }
      return { value: null };
    };
    const decode = (value) => value && typeof value === "object" && value.__handle
      ? this.remoteNode(value.__handle)
      : value;
    if (message.action === "createElement") return encode(this.root.ownerDocument.createElement(String(message.tag)));
    if (message.action === "createTextNode") return encode(this.root.ownerDocument.createTextNode(String(message.text)));
    if (message.action === "createRange") return encode(this.root.ownerDocument.createRange());
    if (message.action === "getSelection") return encode(this.root.ownerDocument.getSelection());
    if (message.action === "getElementById") {
      const found = this.root.id === message.id ? this.root : this.root.querySelector(`#${CSS.escape(String(message.id))}`);
      return encode(found);
    }
    const node = this.remoteNode(message.id);
    if (message.action === "get") {
      if (!allowedProperties.has(message.property)) throw new Error(`DOM property is not readable: ${message.property}`);
      if (message.property === "style") return { style: true, handle: String(message.id) };
      if (message.property === "dataset") return { dataset: true, handle: String(message.id) };
      return encode(node[message.property]);
    }
    if (message.action === "set") {
      if (!allowedProperties.has(message.property)) throw new Error(`DOM property is not writable: ${message.property}`);
      node[message.property] = decode(message.value);
      return {};
    }
    if (message.action === "styleGet") return { value: node.style[String(message.property)] || "" };
    if (message.action === "styleSet") {
      node.style[String(message.property)] = String(message.value);
      return {};
    }
    if (message.action === "call") {
      if (!allowedMethods.has(message.method)) throw new Error(`DOM method is not callable: ${message.method}`);
      const args = (message.args || []).map(decode);
      return encode(node[message.method](...args));
    }
    throw new Error(`Unsupported remote DOM action: ${message.action}`);
  }

  registerRemote(node) {
    let id = this.ids.get(node);
    if (!id) {
      id = String(this.nextId++);
      this.ids.set(node, id);
      this.nodes.set(id, node);
    }
    return id;
  }

  remoteNode(id) {
    const node = this.nodes.get(String(id));
    if (!node) throw new Error("Remote DOM handle is unavailable");
    return node;
  }

  start() {
    this.inspect();
    if (typeof MutationObserver === "undefined") return;
    this.observer = new MutationObserver(() => {
      try {
        this.inspect();
      } catch (error) {
        this.stop();
        this.root.replaceChildren();
        this.onViolation(error);
      }
    });
    this.observer.observe(this.root, { subtree: true, childList: true, attributes: true, characterData: true });
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    for (const { node, type, listener } of this.listeners.values()) node.removeEventListener(type, listener);
    this.listeners.clear();
  }

  dispatch(message) {
    switch (message.op) {
      case "query": return this.query(message.selector, Boolean(message.all));
      case "read": return this.read(message.id, message.property);
      case "write": return this.write(message.id, message.property, message.value);
      case "inspect": return this.inspect();
      case "create": return this.create(message.tag);
      case "mutate": return this.mutate(message);
      case "listen": return this.listen(message.id, message.type, message.listenerId);
      case "remote": return this.remote(message);
      default: throw new Error(`Unsupported browser DOM operation: ${message.op}`);
    }
  }
}
