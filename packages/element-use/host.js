import { getQuickJS } from "https://cdn.jsdelivr.net/npm/quickjs-emscripten@0.32.0/+esm";

// element-use intentionally has one policy. It is a small component capability,
// not a general-purpose schema engine.
export const policy = Object.freeze({
  rateLimit: 10_000,
  imageLimit: 50 * 1024 * 1024,
  windowMs: 60_000,
  maxElements: 320,
  maxTextLength: 4_096,
  maxAttributeLength: 512,
  maxImageBytes: 8 * 1024 * 1024,
  elements: Object.freeze([
    "main",
    "header",
    "h1",
    "section",
    "div",
    "span",
    "button",
    "footer",
    "img",
  ]),
  attributes: Object.freeze({
    "*": Object.freeze([
      "id",
      "class",
      "title",
      "hidden",
      "aria-label",
      "role",
    ]),
    button: Object.freeze(["type", "data-index"]),
    img: Object.freeze(["src", "alt"]),
  }),
  events: Object.freeze(["click"]),
  inlineStyles: Object.freeze([
    "left",
    "top",
    "z-index",
    "inset",
    "width",
    "height",
    "object-fit",
  ]),
  imageDataUrl:
    /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/,
});

const cssProperties = new Set([
  "align-items",
  "aspect-ratio",
  "background",
  "border",
  "border-color",
  "border-radius",
  "box-shadow",
  "box-sizing",
  "color",
  "container-type",
  "cursor",
  "display",
  "filter",
  "flex-wrap",
  "font",
  "font-size",
  "font-weight",
  "gap",
  "height",
  "inset",
  "justify-content",
  "left",
  "margin",
  "margin-bottom",
  "margin-top",
  "max-width",
  "min-height",
  "object-fit",
  "opacity",
  "outline",
  "outline-offset",
  "overflow",
  "padding",
  "pointer-events",
  "position",
  "top",
  "transition",
  "width",
  "z-index",
]);

const customProperties = new Set([
  "--ground",
  "--panel",
  "--line",
  "--gold",
  "--ink",
  "--muted",
  "--tile",
]);

class MinuteWindow {
  constructor(limit) {
    this.limit = limit;
    this.started = Date.now();
    this.used = 0;
  }

  take(amount) {
    const now = Date.now();
    if (now - this.started >= policy.windowMs) {
      this.started = now;
      this.used = 0;
    }
    if (this.used + amount > this.limit) {
      throw new Error(`element-use limit exceeded (${this.limit} per minute)`);
    }
    this.used += amount;
  }
}

function validateStylesheet(css) {
  if (css.length > 24_000) {
    throw new Error("element-use stylesheet is too long");
  }
  if (/@(?:import|font-face|namespace)|url\s*\(/i.test(css)) {
    throw new Error("element-use stylesheets cannot load resources");
  }
  for (
    const match of css.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+|[a-z-]+)\s*:/gim)
  ) {
    const property = match[1].toLowerCase();
    if (!cssProperties.has(property) && !customProperties.has(property)) {
      throw new Error(`element-use CSS property is not allowed: ${property}`);
    }
  }
}

function splitSource(source) {
  const css = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join("\n");
  const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1]);
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(source)?.[1] || source;
  const html = body
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  return { html, css, scripts };
}

function imageBytes(value) {
  const comma = value.indexOf(",");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((value.length - comma - 1) * 3 / 4) - padding);
}

class ElementHost {
  constructor(root) {
    this.root = root;
    this.document = root.ownerDocument;
    this.nodes = new Map([["root", root]]);
    this.ids = new WeakMap([[root, "root"]]);
    this.listeners = new Map();
    this.nextId = 1;
    this.elementCount = 0;
    this.calls = new MinuteWindow(policy.rateLimit);
    this.images = new MinuteWindow(policy.imageLimit);
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

  attributeAllowed(element, name) {
    return policy.attributes["*"].includes(name) ||
      policy.attributes[element.localName]?.includes(name);
  }

  validateImage(value) {
    if (!policy.imageDataUrl.test(value)) {
      throw new Error("element-use img.src requires a base64 image data URL");
    }
    const bytes = imageBytes(value);
    if (bytes > policy.maxImageBytes) {
      throw new Error("element-use image is too large");
    }
    this.images.take(bytes);
  }

  mount(html, css) {
    validateStylesheet(css);
    const template = this.document.createElement("template");
    template.innerHTML = html;
    const elements = [...template.content.querySelectorAll("*")];
    if (elements.length > policy.maxElements) {
      throw new Error("element-use element cap exceeded");
    }
    this.elementCount = elements.length;

    let textLength = 0;
    for (const element of elements) {
      if (!policy.elements.includes(element.localName)) {
        throw new Error(
          `element-use element is not allowed: ${element.localName}`,
        );
      }
      for (const { name, value } of element.attributes) {
        if (!this.attributeAllowed(element, name)) {
          throw new Error(
            `element-use attribute is not allowed: ${element.localName}.${name}`,
          );
        }
        if (name === "src") this.validateImage(value);
        else if (value.length > policy.maxAttributeLength) {
          throw new Error("element-use attribute value is too long");
        }
      }
      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) textLength += child.data.length;
      }
    }
    if (textLength > policy.maxTextLength) {
      throw new Error("element-use text cap exceeded");
    }

    this.root.replaceChildren(...template.content.childNodes);
    const style = this.document.createElement("style");
    style.textContent = css;
    this.document.head.replaceChildren(style);
    return this.snapshot();
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

  dispatch(message, sendEvent) {
    this.calls.take(1);
    const op = message.op;

    if (op === "create") {
      if (!policy.elements.includes(message.tag)) {
        throw new Error("element-use element is not allowed");
      }
      if (++this.elementCount > policy.maxElements) {
        throw new Error("element-use element cap exceeded");
      }
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
        throw new Error("element-use selector is not allowed");
      }
      const found = this.node(message.id).querySelector(message.selector);
      return { id: found ? this.id(found) : null };
    }
    if (op === "setText") {
      const value = String(message.value);
      if (value.length > policy.maxTextLength) {
        throw new Error("element-use text is too long");
      }
      this.node(message.id).textContent = value;
      return {};
    }
    if (op === "setAttribute") {
      const node = this.node(message.id);
      const name = String(message.name);
      const value = String(message.value);
      if (!this.attributeAllowed(node, name)) {
        throw new Error("element-use attribute is not allowed");
      }
      if (name === "src") this.validateImage(value);
      else if (value.length > policy.maxAttributeLength) {
        throw new Error("element-use attribute is too long");
      }
      node.setAttribute(name, value);
      return {};
    }
    if (op === "removeAttribute") {
      const node = this.node(message.id);
      if (!this.attributeAllowed(node, message.name)) {
        throw new Error("element-use attribute is not allowed");
      }
      node.removeAttribute(message.name);
      return {};
    }
    if (op === "setStyle") {
      const property = String(message.property).replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`,
      );
      if (!policy.inlineStyles.includes(property)) {
        throw new Error("element-use inline style is not allowed");
      }
      this.node(message.id).style.setProperty(property, String(message.value));
      return {};
    }
    if (op === "listen") {
      if (!policy.events.includes(message.type)) {
        throw new Error("element-use event is not allowed");
      }
      const node = this.node(message.id);
      const key = `${message.id}:${message.type}:${message.listener}`;
      if (!this.listeners.has(key)) {
        const listener = () => sendEvent(message.listener);
        node.addEventListener(message.type, listener);
        this.listeners.set(key, [node, message.type, listener]);
      }
      return {};
    }
    throw new Error(`element-use operation is not allowed: ${op}`);
  }

  destroy() {
    for (const [node, type, listener] of this.listeners.values()) {
      node.removeEventListener(type, listener);
    }
    this.listeners.clear();
    this.root.replaceChildren();
    this.document.head.replaceChildren();
  }
}

function quickJSError(context, handle) {
  const value = context.dump(handle);
  handle.dispose();
  return new Error(
    [value?.name, value?.message, value?.stack].filter(Boolean).join(": ") ||
      String(value),
  );
}

function evaluate(context, code, filename, options) {
  const result = context.evalCode(code, filename, options);
  if (result.error) throw quickJSError(context, result.error);
  return result.value;
}

function callJson(context, name, value) {
  const result = evaluate(
    context,
    `${name}(${JSON.stringify(value)})`,
    "element-use-call.js",
  );
  const text = String(context.dump(result));
  result.dispose();
  return JSON.parse(text);
}

// Mount onto any supplied element. Iframe creation and messaging deliberately
// belong to the composing application, not to element-use.
export async function mountElementUse(
  { root, source, guestUrl, resources = {}, onError = console.error },
) {
  if (!(root instanceof Element)) {
    throw new TypeError("element-use root must be an Element");
  }
  const { html, css, scripts } = splitSource(String(source));
  const host = new ElementHost(root);
  const snapshot = host.mount(html, css);
  const guestSource = await fetch(guestUrl).then((response) => {
    if (!response.ok) {
      throw new Error(`element-use guest response: ${response.status}`);
    }
    return response.text();
  });

  const module = await getQuickJS();
  const runtime = module.newRuntime();
  runtime.setMemoryLimit(32 * 1024 * 1024);
  runtime.setMaxStackSize(512 * 1024);
  const context = runtime.newContext();

  const hostFunction = context.newFunction(
    "__elementUseHost",
    (messageHandle) => {
      try {
        const message = JSON.parse(context.getString(messageHandle));
        const response = host.dispatch(
          message,
          (listener) => callJson(context, "__elementUseEvent", listener),
        );
        return context.newString(JSON.stringify(response));
      } catch (error) {
        return context.newString(JSON.stringify({ __error: error.message }));
      }
    },
  );
  context.setProp(context.global, "__elementUseHost", hostFunction);
  hostFunction.dispose();

  try {
    evaluate(context, guestSource, "element-use-guest.js").dispose();
    callJson(context, "__elementUseInit", snapshot);
    evaluate(
      context,
      `
      globalThis.__elementUseResources = ${JSON.stringify(resources)};
      globalThis.fetch = async function fetch(url) {
        const data = globalThis.__elementUseResources[String(url)];
        if (!data) throw new TypeError("Fetch URL is outside the element-use grant");
        return Object.freeze({ ok: true, status: 200, async resourceUrl() { return data; } });
      };
    `,
      "element-use-resources.js",
    ).dispose();

    for (const [index, script] of scripts.entries()) {
      const result = evaluate(context, script, `element-use-game-${index}.js`, {
        type: "module",
      });
      const settledPromise = context.resolvePromise(result);
      result.dispose();
      while (runtime.hasPendingJob()) runtime.executePendingJobs();
      const settled = await settledPromise;
      if (settled.error) throw quickJSError(context, settled.error);
      settled.value.dispose();
    }
  } catch (error) {
    host.destroy();
    context.dispose();
    runtime.dispose();
    throw error;
  }

  let active = true;
  const timer = setInterval(() => {
    if (!active) return;
    try {
      callJson(context, "__elementUseTimers", Date.now());
    } catch (error) {
      active = false;
      clearInterval(timer);
      onError(error);
    }
  }, 50);

  root.dataset.runtime = "quickjs-element-use";
  return {
    destroy() {
      active = false;
      clearInterval(timer);
      host.destroy();
      context.dispose();
      runtime.dispose();
      delete root.dataset.runtime;
    },
  };
}
