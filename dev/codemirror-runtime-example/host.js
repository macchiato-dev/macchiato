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
const SAFE_PROPERTIES = new Set(["checked", "disabled", "value"]);

function safeCss(value) {
  const withoutInlineSvg = value.replace(
    /url\(\s*(['"]?)data:image\/svg\+xml,[^)]*\1\s*\)/gi, "");
  if (/url\s*\(|@import|(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(withoutInlineSvg)) {
    throw new Error("QuickJS DOM blocked CSS capable of loading a resource");
  }
  return value;
}

const projectedNodes = new Map();

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
  }
  if (snapshot.type === 3) {
    if (node.data !== snapshot.text) node.data = snapshot.text;
    return node;
  }
  const element = node;
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

const response = await fetch("./generated/quickjs-codemirror.wasm");
let memory;
const messages = [];
const { instance } = await WebAssembly.instantiateStreaming(response, { host: {
  msg(offset, length) {
    if (!length) return 0;
    const text = new TextDecoder().decode(new Uint8Array(memory.buffer, offset, length));
    if (text.startsWith("WWC_DOM:")) {
      const snapshot = JSON.parse(text.slice(8));
      const body = project(snapshot);
      const surface = document.querySelector("#quickjs-surface");
      const children = [...body.childNodes];
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
instance.exports.onmsg(0);
globalThis.__quickjsCodeMirrorHost = { messages };
