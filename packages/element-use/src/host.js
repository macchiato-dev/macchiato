import { assertElementUseStylesheet, ELEMENT_USE_POLICY } from "./policy.js";

class MinuteWindow {
  constructor(limit, now = Date.now()) {
    this.limit = limit;
    this.started = now;
    this.used = 0;
  }
  take(amount, now = Date.now()) {
    if (now - this.started >= ELEMENT_USE_POLICY.windowMs) {
      this.started = now;
      this.used = 0;
    }
    if (amount < 0 || this.used + amount > this.limit) {
      throw new Error(`element-use limit exceeded (${this.limit} per minute)`);
    }
    this.used += amount;
  }
}

function dataUrlBytes(value) {
  const comma = value.indexOf(",");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((value.length - comma - 1) * 3 / 4) - padding);
}

function attributeAllowed(element, name) {
  return ELEMENT_USE_POLICY.attributes["*"].includes(name) ||
    ELEMENT_USE_POLICY.attributes[element.localName]?.includes(name);
}

export class ElementUseHost {
  constructor(root) {
    this.root = root;
    this.document = root.ownerDocument;
    this.nodes = new Map([["root", root]]);
    this.ids = new WeakMap([[root, "root"]]);
    this.listeners = new Map();
    this.nextId = 1;
    this.elementCount = 0;
    this.calls = new MinuteWindow(ELEMENT_USE_POLICY.rateLimit);
    this.images = new MinuteWindow(ELEMENT_USE_POLICY.imageLimit);
  }

  id(node) {
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
    if (!node) throw new Error("element-use node is unavailable");
    return node;
  }

  assertElementCount(extra = 0) {
    if (
      this.elementCount + extra > ELEMENT_USE_POLICY.maxElements
    ) {
      throw new Error(
        `element-use allows ${ELEMENT_USE_POLICY.maxElements} elements`,
      );
    }
  }

  snapshot() {
    return [...this.root.querySelectorAll("*")].map((node) => ({
      id: this.id(node),
      parent: this.id(node.parentElement),
      tag: node.localName,
      attributes: Object.fromEntries(
        [...node.attributes].map(({ name, value }) => [name, value]),
      ),
      text: node.children.length ? "" : node.textContent,
    }));
  }

  mount(html, css) {
    assertElementUseStylesheet(css);
    const template = this.document.createElement("template");
    template.innerHTML = html;
    const elements = [...template.content.querySelectorAll("*")];
    if (elements.length > ELEMENT_USE_POLICY.maxElements) {
      throw new Error("element-use initial element cap exceeded");
    }
    this.elementCount = elements.length;
    let textLength = 0;
    for (const element of elements) {
      if (!ELEMENT_USE_POLICY.elements.includes(element.localName)) {
        throw new Error(
          `element-use element not allowed: ${element.localName}`,
        );
      }
      for (const { name, value } of [...element.attributes]) {
        if (!attributeAllowed(element, name)) {
          throw new Error(
            `element-use attribute not allowed: ${element.localName}.${name}`,
          );
        }
        if (name === "src") this.assertImage(value);
        else if (value.length > ELEMENT_USE_POLICY.maxAttributeLength) {
          throw new Error("element-use attribute value is too long");
        }
      }
      textLength += [...element.childNodes].filter((node) =>
        node.nodeType === 3
      ).reduce((sum, node) => sum + node.data.length, 0);
    }
    if (textLength > ELEMENT_USE_POLICY.maxTextLength) {
      throw new Error("element-use text cap exceeded");
    }
    this.root.replaceChildren(...template.content.childNodes);
    const style = this.document.createElement("style");
    style.textContent = css;
    this.document.head.replaceChildren(style);
    return this.snapshot();
  }

  assertImage(value) {
    if (!ELEMENT_USE_POLICY.imageDataUrl.test(value)) {
      throw new Error("element-use img.src requires a base64 image data URL");
    }
    const bytes = dataUrlBytes(value);
    if (bytes > ELEMENT_USE_POLICY.maxImageBytes) {
      throw new Error(
        `element-use image exceeds ${ELEMENT_USE_POLICY.maxImageBytes} bytes`,
      );
    }
    this.images.take(bytes);
  }

  dispatch(message, onEvent) {
    this.calls.take(1);
    const op = message.op;
    if (op === "create") {
      if (!ELEMENT_USE_POLICY.elements.includes(message.tag)) {
        throw new Error(`element-use element not allowed: ${message.tag}`);
      }
      this.assertElementCount(1);
      this.elementCount += 1;
      return { id: this.id(this.document.createElement(message.tag)) };
    }
    if (op === "append") {
      this.node(message.parent).append(this.node(message.child));
      return {};
    }
    if (op === "replaceChildren") {
      this.node(message.id).replaceChildren();
      return {};
    }
    if (op === "find") {
      if (!/^(?:img|#[A-Za-z][A-Za-z0-9_-]{0,80})$/.test(message.selector)) {
        throw new Error("element-use selector not allowed");
      }
      const found = this.node(message.id).querySelector(message.selector);
      return { id: found ? this.id(found) : null };
    }
    if (op === "setText") {
      this.node(message.id).textContent = String(message.value).slice(
        0,
        ELEMENT_USE_POLICY.maxTextLength,
      );
      return {};
    }
    if (op === "setAttribute") {
      const node = this.node(message.id),
        name = String(message.name),
        value = String(message.value);
      if (!attributeAllowed(node, name)) {
        throw new Error(
          `element-use attribute not allowed: ${node.localName}.${name}`,
        );
      }
      if (name === "src") this.assertImage(value);
      else if (value.length > ELEMENT_USE_POLICY.maxAttributeLength) {
        throw new Error("element-use attribute value is too long");
      }
      node.setAttribute(name, value);
      return {};
    }
    if (op === "removeAttribute") {
      const node = this.node(message.id);
      if (!attributeAllowed(node, message.name)) {
        throw new Error("element-use attribute not allowed");
      }
      node.removeAttribute(message.name);
      return {};
    }
    if (op === "setStyle") {
      const property = String(message.property).replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`,
      );
      if (!ELEMENT_USE_POLICY.inlineStyles.includes(property)) {
        throw new Error(`element-use inline style not allowed: ${property}`);
      }
      this.node(message.id).style.setProperty(property, String(message.value));
      return {};
    }
    if (op === "listen") {
      if (!ELEMENT_USE_POLICY.events.includes(message.type)) {
        throw new Error(`element-use event not allowed: ${message.type}`);
      }
      const node = this.node(message.id),
        key = `${message.id}:${message.type}:${message.listener}`;
      if (!this.listeners.has(key)) {
        const fn = () => onEvent(message.listener);
        node.addEventListener(message.type, fn);
        this.listeners.set(key, [node, message.type, fn]);
      }
      return {};
    }
    throw new Error(`element-use operation not allowed: ${op}`);
  }

  destroy() {
    for (const [node, type, listener] of this.listeners.values()) {
      node.removeEventListener(type, listener);
    }
    this.listeners.clear();
    this.nodes.clear();
    this.root.replaceChildren();
    this.document.head.replaceChildren();
  }
}
