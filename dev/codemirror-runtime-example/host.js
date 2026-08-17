const SAFE_TAGS = new Set([
  "body", "br", "button", "div", "img", "input", "label", "span", "style", "textarea",
]);
const SAFE_ATTRIBUTES = new Set([
  "aria-autocomplete", "aria-expanded", "aria-hidden", "aria-label", "aria-live",
  "aria-multiline", "aria-readonly", "autocapitalize", "autocomplete",
  "autocorrect", "class", "contenteditable", "data-language", "form", "id",
  "main-field", "name", "placeholder", "role", "spellcheck", "tabindex",
  "translate", "type", "value", "writingsuggestions",
]);
const SAFE_PROPERTIES = new Set(["checked", "contentEditable", "disabled", "tabIndex", "value"]);

function safeCss(value) {
  const withoutInlineSvg = value.replace(
    /url\(\s*(['"]?)data:image\/svg\+xml,[^)]*\1\s*\)/gi, "");
  if (/url\s*\(|@import|(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(withoutInlineSvg)) {
    throw new Error("QuickJS DOM blocked CSS capable of loading a resource");
  }
  return value;
}

const projectedNodes = new Map();
const guestIds = new WeakMap();
const installedListeners = new WeakMap();
let deliverToGuest;

function encodeEvent(event) {
  const encoder = new TextEncoder();
  const strings = [event.type, event.key || "", event.code || "",
    typeof event.target.value === "string" ? event.target.value : ""]
    .map(value => encoder.encode(value));
  const length = 4 + strings.reduce((sum, value) => sum + 4 + value.length, 0) + 1;
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  view.setUint32(offset, guestIds.get(event.target), true); offset += 4;
  for (const value of strings) {
    view.setUint32(offset, value.length, true); offset += 4;
    bytes.set(value, offset); offset += value.length;
  }
  bytes[offset] = (event.metaKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) |
    (event.altKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
  return bytes;
}

function installEventListeners(element, types) {
  let installed = installedListeners.get(element);
  if (!installed) installedListeners.set(element, installed = new Set());
  for (const type of types || []) {
    if (installed.has(type)) continue;
    installed.add(type);
    element.addEventListener(type, event => {
      event.stopPropagation();
      deliverToGuest?.(encodeEvent(event));
    });
  }
}

function createProjectedNode(snapshot) {
  if (snapshot.type === 3) return document.createTextNode(snapshot.text);
  if (!SAFE_TAGS.has(snapshot.tag)) throw new Error(`QuickJS DOM blocked tag: ${snapshot.tag}`);
  return document.createElement(snapshot.tag);
}

function project(snapshot) {
  let node = projectedNodes.get(snapshot.id);
  if (!node) {
    node = createProjectedNode(snapshot);
    projectedNodes.set(snapshot.id, node);
    guestIds.set(node, snapshot.id);
  }
  if (snapshot.type === 3) {
    if (node.data !== snapshot.text) node.data = snapshot.text;
    return node;
  }
  const element = node;
  installEventListeners(element, snapshot.listeners);
  const attributes = snapshot.attributes || {};
  for (const name of element.getAttributeNames()) {
    if (!Object.hasOwn(attributes, name)) element.removeAttribute(name);
  }
  for (const [name, value] of Object.entries(snapshot.attributes || {})) {
    if (!SAFE_ATTRIBUTES.has(name)) throw new Error(`QuickJS DOM blocked attribute: ${name}`);
    if (name === "form" && value !== "") throw new Error("QuickJS DOM blocked form owner");
    if (name === "type" && !/^(?:button|checkbox|search|text)$/.test(value)) {
      throw new Error(`QuickJS DOM blocked input type: ${value}`);
    }
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
  for (const [name, value] of Object.entries(snapshot.properties || {})) {
    if (!SAFE_PROPERTIES.has(name)) {
      throw new Error(`QuickJS DOM blocked property: ${name}`);
    }
    if (element[name] !== value) element[name] = value;
  }
  const styles = snapshot.style || {};
  if (styles.cssText && element.style.cssText !== styles.cssText) {
    element.style.cssText = safeCss(styles.cssText);
  }
  for (const [name, value] of Object.entries(styles)) {
    if (name !== "cssText") element.style.setProperty(
      name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), safeCss(value));
  }
  const children = snapshot.children || [];
  if (snapshot.tag === "style") {
    const css = safeCss(children.filter(child => child.type === 3)
      .map(child => child.text).join(""));
    if (element.textContent !== css) element.textContent = css;
  } else {
    for (let index = 0; index < children.length; index++) {
      const child = project(children[index]);
      if (element.childNodes[index] !== child) element.insertBefore(child, element.childNodes[index] || null);
    }
    while (element.childNodes.length > children.length) element.lastChild.remove();
  }
  return element;
}

try {
const wasmSource = document.querySelector("#quickjs-surface")?.dataset.wasm;
if (!wasmSource) throw new Error("The demo does not declare a Wasm guest");
const response = await fetch(new URL(wasmSource, location.href));
if (!response.ok) throw new Error(`Wasm response ${response.status}`);
let memory;
const messages = [];
let pendingHostMessage;
const { instance } = await WebAssembly.instantiateStreaming(response, { host: {
  msg(offset, length) {
    if (pendingHostMessage) {
      const message = pendingHostMessage;
      pendingHostMessage = null;
      new Uint8Array(memory.buffer, offset, length).set(message);
      return message.length;
    }
    if (!length) return 0;
    const text = new TextDecoder().decode(new Uint8Array(memory.buffer, offset, length));
    if (text.startsWith("WWC_DOM:")) {
      const snapshot = JSON.parse(text.slice(8));
      const surface = document.querySelector("#quickjs-surface");
      guestIds.set(surface, snapshot.id);
      installEventListeners(surface, snapshot.listeners);
      const children = (snapshot.children || []).map(project);
      for (let index = 0; index < children.length; index++) {
        const child = children[index];
        if (surface.childNodes[index] !== child) {
          surface.insertBefore(child, surface.childNodes[index] || null);
        }
      }
      while (surface.childNodes.length > children.length) surface.lastChild.remove();
      document.body.dataset.ready = "true";
    } else messages.push(text);
    return 0;
  },
} });
memory = instance.exports.memory;
deliverToGuest = message => {
  pendingHostMessage = message;
  instance.exports.onmsg(message.length);
};
instance.exports.onmsg(0);
globalThis.__quickjsCodeMirrorHost = { messages };
} catch (error) {
  const status = document.querySelector(".runtime-status");
  if (status) {
    status.dataset.error = "";
    status.textContent = `QuickJS CodeMirror could not start: ${error?.message || error}`;
  }
  throw error;
}
