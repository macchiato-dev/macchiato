// ../../dev/wasm-web-machine/dist/module/wasm-web-machine.js
var CSS_PROPERTIES = /* @__PURE__ */ new Set([
  "-webkit-user-modify",
  "-webkit-user-select",
  "align-items",
  "animation",
  "animation-duration",
  "animation-name",
  "aspect-ratio",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "box-shadow",
  "box-sizing",
  "caret-color",
  "color",
  "column-gap",
  "contain",
  "container-type",
  "content",
  "cursor",
  "direction",
  "display",
  "filter",
  "flex-wrap",
  "font",
  "font-family",
  "flex-basis",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "font-feature-settings",
  "font-kerning",
  "font-language-override",
  "font-optical-sizing",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-emoji",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "font-variation-settings",
  "font-weight",
  "grid-template-columns",
  "height",
  "inset-inline-end",
  "inset-inline-start",
  "justify-content",
  "left",
  "letter-spacing",
  "line-height",
  "list-style",
  "bottom",
  "field-sizing",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "object-fit",
  "opacity",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow-anchor",
  "overflow-x",
  "overflow-y",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "pointer-events",
  "position",
  "resize",
  "right",
  "row-gap",
  "tab-size",
  "text-align",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration",
  "text-decoration-style",
  "text-decoration-thickness",
  "top",
  "text-overflow",
  "text-transform",
  "transform",
  "transform-origin",
  "transform-style",
  "perspective",
  "transition",
  "transition-behavior",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "white-space",
  "unicode-bidi",
  "user-select",
  "vertical-align",
  "visibility",
  "white-space-collapse",
  "text-wrap-mode",
  "width",
  "word-break",
  "word-wrap",
  "overflow-wrap",
  "z-index"
]);
var CSS_VALUE_FUNCTIONS = /* @__PURE__ */ new Set([
  "blur",
  "brightness",
  "calc",
  "clamp",
  "cubic-bezier",
  "drop-shadow",
  "linear-gradient",
  "min",
  "radial-gradient",
  "repeat",
  "rgba",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "saturate",
  "scale",
  "scaleX",
  "scaleY",
  "steps",
  "translate",
  "translate3d",
  "translateX",
  "translateY",
  "var"
]);
var SAFE_SELECTOR = /^[#.a-z0-9_[\]="' >,():-]+$/i;
function isAllowedCssProperty(name) {
  return CSS_PROPERTIES.has(name) || /^--[a-z][a-z0-9-]{0,63}$/i.test(name);
}
var isAllowedProperty = isAllowedCssProperty;
function createCssRenderer(dependencies) {
  const {
    CSS_VALUE_FUNCTIONS: CSS_VALUE_FUNCTIONS2,
    Reader,
    hostDocument,
    installFont: installFont2,
    installedStyles,
    isAllowedProperty: isAllowedProperty2,
    logicalHead,
    options,
    pendingChecks,
    reject: fail2,
    scopeClass,
    scopeSelector: scopeSelector2
  } = dependencies;
  function installStylesheet(bytes, targetStyle = null, replace = false) {
    if (!(bytes instanceof Uint8Array) || bytes.length > 128 * 1024) {
      fail2("stylesheet operation must contain bounded bytes");
    }
    const reader = new Reader(bytes);
    if (reader.uint() !== 4) fail2("stylesheet operation version is not supported");
    const itemCount = reader.uint();
    if (itemCount > 2048) fail2("stylesheet has too many items");
    if (targetStyle && itemCount !== 1) fail2("inline style must contain one rule");
    const probe = new CSSStyleSheet();
    const output = [];
    for (let ruleIndex = 0; ruleIndex < itemCount; ruleIndex++) {
      const itemKind = reader.byte();
      if (itemKind === 0) {
        if (targetStyle) fail2("inline style cannot contain a top-level comment");
        const comment = reader.text();
        if (comment.length > 4096 || comment.includes("*/")) {
          fail2("stylesheet comment is not representable");
        }
        output.push(`/*${comment}*/`);
        continue;
      }
      if (itemKind === 2) {
        if (targetStyle) fail2("inline style cannot contain a font");
        const font = {
          family: reader.text(),
          style: reader.text(),
          weight: reader.text(),
          display: reader.text()
        };
        const length = reader.uint();
        if (length > 256 * 1024 || length > reader.bytes.length - reader.at) {
          fail2("font bytes are not representable");
        }
        const bytes2 = reader.bytes.slice(reader.at, reader.at + length);
        reader.at += length;
        pendingChecks.push(installFont2(font, bytes2, options.allowFont));
        continue;
      }
      if (itemKind !== 1) fail2("stylesheet item is not representable");
      const selector = reader.text();
      if (!selector || selector.length > 512 || !/^[a-z0-9_.*#:\s>+~(),\[\]="'-]+$/i.test(selector)) {
        fail2(`stylesheet selector is not representable: ${selector.slice(0, 120)}`);
      }
      const declarationCount = reader.uint();
      if (declarationCount > 128) fail2("stylesheet rule has too many declarations");
      const renderedSelector = scopeClass ? scopeSelector2(selector, scopeClass) : selector;
      let index;
      try {
        index = probe.insertRule(`${renderedSelector}{}`, probe.cssRules.length);
      } catch {
        fail2(`stylesheet selector in rule ${ruleIndex + 1} was not accepted`);
      }
      const declaration = probe.cssRules[index].style;
      const declarations = [];
      for (let declarationIndex = 0; declarationIndex < declarationCount; declarationIndex++) {
        const declarationKind = reader.byte();
        if (declarationKind === 0) {
          const comment = reader.text();
          if (comment.length > 4096 || comment.includes("*/")) {
            fail2("stylesheet declaration comment is not representable");
          }
          declarations.push(`  /*${comment}*/`);
          continue;
        }
        if (declarationKind !== 1 && declarationKind !== 2) {
          fail2("stylesheet declaration is not representable");
        }
        const property = reader.text();
        if (!isAllowedProperty2(property)) fail2(`CSS property ${property} is not allowed`);
        const important = reader.byte();
        if (important > 1) fail2("stylesheet priority is not representable");
        if (declarationKind === 2) {
          if (property !== "background" && property !== "background-image") {
            fail2(`structured ${property} is not supported`);
          }
          let nodes = 0;
          const readValue = (depth2 = 0) => {
            if (++nodes > 512 || depth2 > 16) fail2("stylesheet value tree is too complex");
            const kind = reader.byte();
            if (kind === 1) {
              const identifier = reader.text();
              if (!/^--?[a-z][a-z0-9-]*$|^[a-z][a-z0-9-]*$/i.test(identifier)) {
                fail2("stylesheet identifier is not representable");
              }
              return identifier;
            }
            if (kind === 2) {
              const number = reader.text();
              if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[a-z]+|%)?$/i.test(number)) {
                fail2("stylesheet number is not representable");
              }
              return number;
            }
            if (kind === 3) {
              const color = reader.text();
              if (!/^[0-9a-f]{3,8}$/i.test(color)) fail2("stylesheet color is not representable");
              return `#${color}`;
            }
            if (kind === 4) return JSON.stringify(reader.text());
            if (kind === 7) {
              const name = reader.text();
              if (!CSS_VALUE_FUNCTIONS2.has(name)) fail2(`CSS function ${name} is not allowed`);
              return `${name}(${readValue(depth2 + 1)})`;
            }
            if (kind === 9) {
              const comment = reader.text();
              if (comment.length > 4096 || comment.includes("*/")) {
                fail2("stylesheet value comment is not representable");
              }
              return `/*${comment}*/`;
            }
            if (kind === 10) {
              const separator = reader.byte();
              if (separator > 2) fail2("stylesheet list separator is not representable");
              const count = reader.uint();
              if (count < 2 || count > 128) fail2("stylesheet value list is not representable");
              const values = [];
              for (let valueIndex = 0; valueIndex < count; valueIndex++) {
                values.push(readValue(depth2 + 1));
              }
              return values.join([" ", ", ", " / "][separator]);
            }
            fail2("stylesheet value node is not representable");
          };
          const value2 = readValue();
          declaration.setProperty(property, value2, important ? "important" : "");
          if (!declaration.getPropertyValue(property)) {
            fail2(`CSS value for ${property} in rule ${ruleIndex + 1} was not accepted`);
          }
          declarations.push(`  ${property}: ${value2}${important ? " !important" : ""};`);
          continue;
        }
        const tokenCount = reader.uint();
        if (tokenCount > 512) fail2("stylesheet value has too many tokens");
        let value = "", depth = 0;
        for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex++) {
          const kind = reader.byte();
          if (kind === 0) value += " ";
          else if (kind === 1) {
            const identifier = reader.text();
            if (!/^--?[a-z_][a-z0-9_-]*$|^[a-z_][a-z0-9_-]*$/i.test(identifier)) {
              fail2("stylesheet identifier is not representable");
            }
            value += identifier;
          } else if (kind === 2) {
            const number = reader.text();
            if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[a-z]+|%)?$/i.test(number)) {
              fail2("stylesheet number is not representable");
            }
            value += number;
          } else if (kind === 3) {
            const color = reader.text();
            if (!/^[0-9a-f]{3,8}$/i.test(color)) fail2("stylesheet color is not representable");
            value += `#${color}`;
          } else if (kind === 4) value += JSON.stringify(reader.text());
          else if (kind === 5) value += ",";
          else if (kind === 6) value += "/";
          else if (kind === 7) {
            const name = reader.text();
            if (!CSS_VALUE_FUNCTIONS2.has(name)) fail2(`CSS function ${name} is not allowed`);
            value += `${name}(`;
            depth++;
          } else if (kind === 8 && depth > 0) {
            value += ")";
            depth--;
          } else if (kind === 9) {
            const comment = reader.text();
            if (comment.length > 4096 || comment.includes("*/")) {
              fail2("stylesheet value comment is not representable");
            }
            value += `/*${comment}*/`;
          } else if (kind === 11) {
            const operator = reader.text();
            if (!/^[+*-]$/.test(operator)) fail2("stylesheet operator is not representable");
            value += operator;
          } else fail2("stylesheet token is not representable");
        }
        if (depth !== 0) fail2("stylesheet function tokens do not balance");
        declaration.setProperty(property, value, important ? "important" : "");
        if (!declaration.getPropertyValue(property)) {
          continue;
        }
        declarations.push(`  ${property}: ${value}${important ? " !important" : ""};`);
      }
      output.push(`${renderedSelector.trim()} {
${declarations.join("\n")}
}`);
    }
    if (reader.at !== reader.bytes.length) fail2("trailing stylesheet operation data");
    if (targetStyle) {
      const declaration = probe.cssRules[0].style;
      if (replace) targetStyle.cssText = "";
      for (const property of declaration) {
        targetStyle.setProperty(
          property,
          declaration.getPropertyValue(property),
          declaration.getPropertyPriority(property)
        );
      }
      return;
    }
    const style = hostDocument.createElement("style");
    style.textContent = `${output.join("\n\n")}
`;
    logicalHead.append(style);
    installedStyles.add(style);
  }
  return installStylesheet;
}
var SVG_ELEMENTS = /* @__PURE__ */ new Set([
  "circle",
  "defs",
  "ellipse",
  "g",
  "line",
  "linearGradient",
  "path",
  "rect",
  "stop",
  "svg",
  "text",
  "title"
]);
var SVG_IMAGE_ATTRIBUTES = /* @__PURE__ */ new Set([
  "aria-hidden",
  "aria-label",
  "aria-labelledby",
  "class",
  "cx",
  "cy",
  "d",
  "fill",
  "gradientUnits",
  "height",
  "id",
  "offset",
  "opacity",
  "r",
  "role",
  "rx",
  "ry",
  "stop-color",
  "stroke",
  "stroke-linecap",
  "stroke-width",
  "viewBox",
  "width",
  "x",
  "x1",
  "x2",
  "y",
  "y1",
  "y2"
]);
function xmlAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function svgImageAttributeAllowed(name, value) {
  if (typeof value !== "string") return false;
  if ([
    "cx",
    "cy",
    "height",
    "r",
    "rx",
    "ry",
    "stroke-width",
    "width",
    "x",
    "x1",
    "x2",
    "y",
    "y1",
    "y2"
  ].includes(name)) {
    return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value);
  }
  if (["fill", "stop-color", "stroke"].includes(name)) {
    return /^(?:currentColor|none|white|#[0-9a-f]{3,8}|url\(#[a-z][a-z0-9_.:-]{0,127}\))$/i.test(value);
  }
  if (name === "opacity") return /^(?:0|1|\.\d+|0?\.\d+)$/.test(value) && Number(value) <= 1;
  if (name === "stroke-linecap") return ["butt", "round", "square"].includes(value);
  if (name === "viewBox") return /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:\s+-?(?:\d+(?:\.\d*)?|\.\d+)){3}$/.test(value);
  if (name === "aria-hidden") return value === "true" || value === "false";
  if (["aria-label", "aria-labelledby", "id"].includes(name)) {
    return /^[a-z][a-z0-9_.: -]{0,127}$/i.test(value);
  }
  if (name === "role") return value === "img";
  if (name === "offset") return /^(?:100|[0-9]{1,2})%$/.test(value) || /^(?:0|1|0?\.\d+)$/.test(value);
  if (name === "gradientUnits") return ["objectBoundingBox", "userSpaceOnUse"].includes(value);
  if (name === "class") return value === "" || /^[a-z_][a-z0-9_-]{0,127}(?:\s+[a-z_][a-z0-9_-]{0,127})*$/i.test(value);
  if (name === "d") return value.length <= 2048 && !/["'<>;&]/.test(value);
  return false;
}
function createSvgRenderer(Reader, encoder22, reject) {
  return function renderSvg(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length > 128 * 1024) {
      reject("SVG operation must contain bounded bytes");
    }
    const reader = new Reader(bytes);
    if (reader.uint() !== 1) reject("SVG operation version is not supported");
    let nodes = 0;
    function node(depth) {
      if (++nodes > 256 || depth > 16) reject("SVG tree exceeds its structural limit");
      const tag = reader.text();
      if (!SVG_ELEMENTS.has(tag)) reject(`SVG image element ${tag} is not allowed`);
      const attributeCount = reader.uint();
      if (attributeCount > 32) reject("SVG image element has too many attributes");
      const attributes = [];
      for (let index = 0; index < attributeCount; index++) {
        const name = reader.text(), value = reader.text();
        if (!SVG_IMAGE_ATTRIBUTES.has(name) || value.length > 2048 || !svgImageAttributeAllowed(name, value)) {
          reject(`SVG image attribute ${name} is not allowed`);
        }
        attributes.push(`${name}="${xmlAttribute(value)}"`);
      }
      const childCount = reader.uint();
      if (childCount > 128) reject("SVG image element has too many children");
      const children = [];
      for (let index = 0; index < childCount; index++) children.push(node(depth + 1));
      const namespace = depth === 0 ? ' xmlns="http://www.w3.org/2000/svg"' : "";
      return `<${tag}${namespace}${attributes.length ? ` ${attributes.join(" ")}` : ""}>${children.join("")}</${tag}>`;
    }
    const source = node(0);
    if (!source.startsWith("<svg ") || reader.at !== reader.bytes.length) {
      reject("SVG operation must contain exactly one SVG root");
    }
    const encoded = encoder22.encode(source);
    let binary = "";
    for (let at = 0; at < encoded.length; at += 8192) {
      binary += String.fromCharCode(...encoded.subarray(at, at + 8192));
    }
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  };
}
var decoder = new TextDecoder("utf-8", { fatal: true });
var encoder = new TextEncoder();
var CHUNK_SIZE = 8192;
var CHUNK_COUNT = 128;
var ELEMENTS = /* @__PURE__ */ new Set([
  "a",
  "article",
  "aside",
  "b",
  "br",
  "button",
  "canvas",
  "code",
  "dialog",
  "div",
  "em",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "header",
  "i",
  "img",
  "input",
  "label",
  "li",
  "main",
  "meta",
  "nav",
  "ol",
  "option",
  "p",
  "section",
  "small",
  "span",
  "strong",
  "textarea",
  "title",
  "ul"
]);
var ATTRIBUTES = /* @__PURE__ */ new Set([
  "aria-autocomplete",
  "aria-expanded",
  "aria-haspopup",
  "aria-hidden",
  "aria-label",
  "aria-live",
  "aria-modal",
  "aria-multiline",
  "aria-pressed",
  "aria-selected",
  "autocapitalize",
  "accept",
  "autocomplete",
  "autocorrect",
  "class",
  "content",
  "contenteditable",
  "data-language",
  "hidden",
  "maxlength",
  "cx",
  "cy",
  "d",
  "data-href",
  "fill",
  "form",
  "gradientUnits",
  "height",
  "href",
  "id",
  "main-field",
  "name",
  "offset",
  "opacity",
  "r",
  "placeholder",
  "readonly",
  "role",
  "rx",
  "ry",
  "spellcheck",
  "stroke",
  "stroke-linecap",
  "stroke-width",
  "tabindex",
  "target",
  "title",
  "translate",
  "type",
  "value",
  "viewBox",
  "writingsuggestions",
  "x1",
  "x2",
  "width",
  "x",
  "y",
  "y1",
  "y2",
  "stop-color"
]);
function selectorParts(selector) {
  const parts = [];
  let at = 0, start = 0, depth = 0, quote = "";
  for (; at < selector.length; at++) {
    const character = selector[at];
    if (quote) {
      if (character === "\\") at++;
      else if (character === quote) quote = "";
    } else if (character === '"' || character === "'") quote = character;
    else if (character === "(" || character === "[") depth++;
    else if (character === ")" || character === "]") depth--;
    else if (character === "," && depth === 0) {
      parts.push(selector.slice(start, at));
      start = at + 1;
    }
  }
  parts.push(selector.slice(start));
  return parts;
}
function scopeSelector(selector, scopeClass) {
  const scope = `.${scopeClass}`;
  return selectorParts(selector).map((part) => {
    const trimmed = part.trim();
    if (/^(?::root|html|body)(?=$|[.#[:\s>+~])/i.test(trimmed)) {
      return trimmed.replace(/^(?::root|html|body)/i, scope);
    }
    return `${scope} ${trimmed}`;
  }).join(", ");
}
function fail(message) {
  throw new Error(`wasm-web-machine: ${message}`);
}
function isAllowedAttribute(name) {
  return ATTRIBUTES.has(name) || /^(?:aria|data)-[a-z][a-z0-9-]{0,63}$/.test(name);
}
async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function installFont(font, bytes, allowFont) {
  if (!font || !(bytes instanceof Uint8Array) || !/^[a-z][a-z0-9 ]{0,63}$/i.test(font.family) || font.style !== "normal" || !/^\d{1,4}(?: \d{1,4})?$/.test(font.weight) || !["auto", "block", "fallback", "optional", "swap"].includes(font.display)) {
    fail("font record is not allowed");
  }
  const weights = font.weight.split(" ").map(Number);
  if (weights.some((weight) => weight < 1 || weight > 1e3) || weights.length === 2 && weights[0] > weights[1]) fail("font weight is not allowed");
  let allowed = false;
  if (typeof allowFont === "function") allowed = await allowFont(bytes) === true;
  else if (typeof allowFont === "string") allowed = await sha256(bytes) === allowFont;
  else if (Array.isArray(allowFont)) allowed = allowFont.includes(await sha256(bytes));
  if (!allowed) fail("custom font was not allowed");
  const face = new FontFace(font.family, bytes, font);
  await face.load();
  document.fonts.add(face);
}
function isVirtualHref(value) {
  if (/^#[a-z0-9][a-z0-9_.:-]{0,127}$/i.test(value)) return true;
  if (value === "#/") return true;
  if (!/^#\/[a-z0-9][a-z0-9._/-]{0,254}(?:#[a-z0-9][a-z0-9_.:-]{0,127})?$/i.test(value) || value.includes("//")) {
    return false;
  }
  const path = value.slice(2).split("#", 1)[0];
  return !path.split("/").some((part) => part === "." || part === "..");
}
var WasmWebBridge = class {
  imports;
  connect;
  destroy;
  send;
  constructor(target, options) {
    const elementFromItsRealm = (value2) => Boolean(value2?.ownerDocument?.defaultView?.Element && value2 instanceof value2.ownerDocument.defaultView.Element);
    const messagesOnly = target == null;
    const documentTarget = !messagesOnly && target === document;
    const targetRoots = documentTarget || messagesOnly ? [] : elementFromItsRealm(target) ? [target] : Array.from(target || []);
    const portalRoots = Array.from(options.portals || []);
    if (!documentTarget && !messagesOnly && (!targetRoots.length || [...targetRoots, ...portalRoots].some((root) => !elementFromItsRealm(root)))) {
      fail("target must be null, document, an element, or a non-empty element collection");
    }
    const roots = [.../* @__PURE__ */ new Set([...targetRoots, ...portalRoots])];
    const hostDocument = documentTarget || messagesOnly ? document : targetRoots[0].ownerDocument;
    const realm = hostDocument.defaultView || globalThis;
    const {
      CanvasRenderingContext2D,
      Comment,
      CSSStyleDeclaration,
      DataTransfer,
      DOMRectReadOnly,
      Element,
      Event,
      FocusEvent,
      HTMLAnchorElement,
      HTMLButtonElement,
      HTMLCanvasElement,
      HTMLDialogElement,
      HTMLElement,
      HTMLImageElement,
      HTMLInputElement,
      HTMLMetaElement,
      HTMLSelectElement,
      HTMLTextAreaElement,
      HTMLTitleElement,
      InputEvent,
      KeyboardEvent,
      MouseEvent,
      MutationObserver,
      MutationRecord,
      Navigator,
      Node,
      Range,
      Selection,
      SVGElement,
      Text
    } = realm;
    const hostNavigator = realm.navigator;
    const primaryRoot = documentTarget || messagesOnly ? hostDocument.body : targetRoots[0];
    const logicalHead = documentTarget ? hostDocument.head : portalRoots[0] || primaryRoot;
    let scopeClass = null;
    if (!documentTarget && !messagesOnly) do {
      scopeClass = `wwm-${Array.from(
        crypto.getRandomValues(new Uint8Array(3)),
        (byte) => byte.toString(16).padStart(2, "0")
      ).join("").slice(0, 5)}`;
    } while (hostDocument.querySelector(`.${scopeClass}`));
    if (scopeClass) roots.forEach((root) => root.classList.add(scopeClass));
    const installedStyles = /* @__PURE__ */ new Set();
    const messageRoot = Object.freeze({});
    const rootCapability = messagesOnly ? messageRoot : hostDocument;
    const chunks = [];
    const leases = [];
    const reverse = /* @__PURE__ */ new WeakMap();
    const pendingChecks = [];
    const strings = [];
    const instrument = typeof options.instrument === "function" ? options.instrument : null;
    let instrumentSequence = 0;
    let nextReference = 0;
    let instance;
    const stamp = options.stamp;
    let delivery;
    let checkpointQueued = false;
    const eventListeners = /* @__PURE__ */ new WeakMap();
    const listenedObjects = /* @__PURE__ */ new Set();
    const mutationObservers = /* @__PURE__ */ new Set();
    const intervals = /* @__PURE__ */ new Map();
    const animationTimeouts = /* @__PURE__ */ new Set();
    const cleanupCallbacks = /* @__PURE__ */ new Map();
    let nextInterval = 1;
    let nextCleanupCallback = 1;
    const ownedNodes = /* @__PURE__ */ new WeakSet();
    const ownNode = (node) => {
      ownedNodes.add(node);
      return node;
    };
    const navigationAllowed = (value2) => {
      if (typeof options.allowNavigate === "function") {
        return options.allowNavigate(value2) === true;
      }
      if (options.allowNavigate === "fragment") return isVirtualHref(value2);
      if (options.allowNavigate === "self") {
        try {
          return new URL(value2, location.href).origin === location.origin;
        } catch {
          return false;
        }
      }
      return false;
    };
    function trace(type, detail) {
      if (!instrument) return;
      try {
        instrument({ sequence: ++instrumentSequence, time: performance.now(), type, ...detail });
      } catch {
      }
    }
    function traceValue(encoded) {
      if (!Array.isArray(encoded)) {
        return typeof encoded === "string" ? encoded.slice(0, 512) : encoded;
      }
      if (encoded[0] === "r") return { reference: encoded[1] };
      if (encoded[0] === "s") return { string: strings[encoded[1]]?.slice(0, 512) };
      if (encoded instanceof Uint8Array) return { bytes: encoded.byteLength };
      return { arrayLength: encoded.length };
    }
    function reference(value2) {
      if (typeof value2 !== "object" && typeof value2 !== "function" || value2 === null) {
        return value2;
      }
      const known = reverse.get(value2);
      if (known !== void 0) {
        leases[known]++;
        options.onReferenceLease?.(known, leases[known], value2);
        return ["r", known];
      }
      if (nextReference >= CHUNK_SIZE * CHUNK_COUNT) fail("reference space exhausted");
      const id = nextReference++;
      const chunk = Math.floor(id / CHUNK_SIZE);
      (chunks[chunk] ||= [])[id % CHUNK_SIZE] = value2;
      leases[id] = 1;
      options.onReferenceLease?.(id, leases[id], value2);
      reverse.set(value2, id);
      options.onReferenceCreate?.(id, value2);
      if (instrument) trace("reference-create", {
        id,
        kind: value2?.constructor?.name || typeof value2,
        node: value2 instanceof Node ? value2.nodeName : void 0
      });
      return ["r", id];
    }
    function dereference(id) {
      if (!Number.isInteger(id) || id < 0 || id >= nextReference) {
        fail("invalid reference");
      }
      const value2 = chunks[Math.floor(id / CHUNK_SIZE)]?.[id % CHUNK_SIZE];
      if (value2 === void 0) fail(`released reference ${id}`);
      return value2;
    }
    function value(encoded) {
      if (!Array.isArray(encoded)) return encoded;
      if (encoded.length !== 2) fail("invalid encoded value");
      if (encoded[0] === "r") return dereference(encoded[1]);
      if (encoded[0] === "s") {
        const text = strings[encoded[1]];
        if (text === void 0) fail("invalid string reference");
        return text;
      }
      fail("unknown encoded value");
    }
    function insideDocument(node) {
      if (node === hostDocument) return true;
      if (!(node instanceof Node)) return false;
      if (documentTarget) return node === hostDocument.head || node === hostDocument.body || hostDocument.documentElement.contains(node);
      return ownedNodes.has(node) || roots.some((root) => node === root || root.contains(node));
    }
    function get(object, name) {
      if (object === hostDocument && name === "profiling" && options.development === true) {
        return options.profiling === true;
      }
      if (object === hostDocument && (name === "documentElement" || name === "head" || name === "body")) {
        return reference(name === "head" ? logicalHead : name === "documentElement" && documentTarget ? hostDocument.documentElement : primaryRoot);
      }
      if (object === hostDocument && name === "navigator") return reference(hostNavigator);
      if (object === hostDocument && name === "activeElement") {
        return object.activeElement && insideDocument(object.activeElement) ? reference(object.activeElement) : null;
      }
      if (object instanceof Navigator && ["language", "languages", "maxTouchPoints", "platform", "userAgent", "vendor"].includes(name)) {
        return object[name];
      }
      if (object === hostDocument && name === "hidden") return hostDocument.hidden;
      if (object === hostDocument && ["devicePixelRatio", "innerHeight", "innerWidth", "pageXOffset", "pageYOffset"].includes(name)) {
        return Math.round(globalThis[name]);
      }
      if (object instanceof Node && (name === "parentNode" || name === "parentElement")) {
        const parent = object[name];
        return parent && insideDocument(parent) ? reference(parent) : null;
      }
      if (object instanceof Node && name === "nodeType") return object.nodeType;
      if (object instanceof Node && name === "nodeName") return object.nodeName;
      if (object instanceof HTMLElement && name === "hidden") return object.hidden;
      if (object instanceof Selection && ["anchorOffset", "focusOffset", "isCollapsed", "rangeCount"].includes(name)) return object[name];
      if (object instanceof Selection && (name === "anchorNode" || name === "focusNode")) {
        const node = object[name];
        return node && insideDocument(node) ? reference(node) : null;
      }
      if (Array.isArray(object) && name === "length") return object.length;
      if (object instanceof MutationRecord && ["attributeName", "oldValue", "type"].includes(name)) return object[name];
      if (object instanceof MutationRecord && ["nextSibling", "previousSibling", "target"].includes(name)) {
        const node = object[name];
        return node && insideDocument(node) ? reference(node) : null;
      }
      if (object instanceof MutationRecord && ["addedNodeCount", "removedNodeCount"].includes(name)) {
        return object[name === "addedNodeCount" ? "addedNodes" : "removedNodes"].length;
      }
      if (object instanceof Text && (name === "nodeValue" || name === "textContent")) {
        return object[name];
      }
      if (object instanceof DOMRectReadOnly && ["bottom", "height", "left", "right", "top", "width", "x", "y"].includes(name)) {
        return Math.round(object[name] * 64);
      }
      if (object instanceof CSSStyleDeclaration && name === "cssText") return object.cssText;
      if (object instanceof CSSStyleDeclaration && [
        "direction",
        "height",
        "overflow",
        "paddingBottom",
        "paddingLeft",
        "paddingRight",
        "paddingTop",
        "position",
        "whiteSpace",
        "width"
      ].includes(name)) return object[name];
      if (object instanceof Element && name === "childElementCount") {
        return object.childElementCount;
      }
      if (object instanceof Element && name === "localName") return object.localName;
      if (object instanceof Element && name === "namespaceURI") return object.namespaceURI;
      if (object instanceof Element && "style" in object && name === "style") return reference(object.style);
      if (object instanceof Element && ["clientHeight", "clientWidth", "scrollHeight", "scrollWidth"].includes(name)) {
        return object[name];
      }
      if (object instanceof HTMLElement && ["offsetHeight", "offsetWidth", "scrollLeft", "scrollTop"].includes(name)) {
        return Math.round(object[name]);
      }
      if (object instanceof HTMLTextAreaElement && (name === "selectionStart" || name === "selectionEnd")) return object[name];
      if ((object instanceof HTMLInputElement || object instanceof HTMLSelectElement || object instanceof HTMLTextAreaElement) && name === "value") return object.value;
      if (object instanceof HTMLInputElement && name === "checked") return object.checked;
      if (object instanceof HTMLDialogElement && name === "open") return object.open;
      if (object instanceof HTMLCanvasElement && ["height", "width"].includes(name)) {
        return object[name];
      }
      if (object instanceof Event && [
        "altKey",
        "ctrlKey",
        "defaultPrevented",
        "metaKey",
        "shiftKey",
        "type"
      ].includes(name)) return object[name];
      if (object instanceof FocusEvent && name === "relatedTarget") {
        return object.relatedTarget instanceof Node && insideDocument(object.relatedTarget) ? reference(object.relatedTarget) : null;
      }
      if (object instanceof KeyboardEvent && ["code", "key"].includes(name)) return object[name];
      if (object instanceof KeyboardEvent && ["charCode", "keyCode"].includes(name)) return object[name];
      if (object instanceof KeyboardEvent && name === "repeat") return object.repeat;
      if (object instanceof InputEvent && ["data", "inputType", "isComposing"].includes(name)) {
        return object[name];
      }
      if (["startContainer", "endContainer"].includes(name) && object?.[name] instanceof Node) {
        return reference(object[name]);
      }
      if (["startOffset", "endOffset"].includes(name) && Number.isInteger(object?.[name])) {
        return object[name];
      }
      if (object instanceof Event && ["clipboardData", "dataTransfer"].includes(name)) {
        const transfer = object[name];
        return transfer instanceof DataTransfer ? reference(transfer) : null;
      }
      if (object instanceof DataTransfer && ["dropEffect", "effectAllowed"].includes(name)) {
        return object[name];
      }
      if (object instanceof MouseEvent && ["button", "buttons", "clientX", "clientY", "detail"].includes(name)) {
        return object[name];
      }
      if (object instanceof Event && name === "target") {
        return object.target instanceof Node ? reference(object.target) : null;
      }
      if (object instanceof MouseEvent && name === "relatedTarget") {
        return object.relatedTarget instanceof Node && insideDocument(object.relatedTarget) ? reference(object.relatedTarget) : null;
      }
      fail(`property get ${name} is not allowed on ${object?.constructor?.name || typeof object}`);
    }
    function set(object, name, next) {
      if (object instanceof HTMLElement && name === "innerHTML" && typeof next === "string" && next.length <= 256 * 1024) {
        const template = hostDocument.createElement("template");
        template.innerHTML = next;
        for (const element of template.content.querySelectorAll("*")) {
          const svg = element instanceof SVGElement;
          if (!(svg ? SVG_ELEMENTS : ELEMENTS).has(element.localName)) {
            fail(`innerHTML element ${element.localName} is not allowed`);
          }
          for (const attribute of Array.from(element.attributes)) {
            if (attribute.name === "style" && /^--[a-z][a-z0-9-]{0,63}:\s*(?:#[0-9a-f]{3,8}|-?(?:\d+(?:\.\d*)?|\.\d+)%)$/i.test(attribute.value)) continue;
            if (attribute.name === "xmlns" && svg && attribute.value === "http://www.w3.org/2000/svg") continue;
            if (!isAllowedAttribute(attribute.name) || svg && (!SVG_IMAGE_ATTRIBUTES.has(attribute.name) || !svgImageAttributeAllowed(attribute.name, attribute.value))) {
              fail(`innerHTML attribute ${attribute.name} is not allowed`);
            }
          }
        }
        object.replaceChildren(template.content);
        return null;
      }
      if (object instanceof CanvasRenderingContext2D && ["fillStyle", "strokeStyle"].includes(name) && typeof next === "string" && /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i.test(next)) {
        object[name] = next;
        return null;
      }
      if (object instanceof CanvasRenderingContext2D && name === "lineWidth" && Number.isInteger(next) && next >= 0 && next <= 1024e4) {
        object.lineWidth = next / 1024;
        return null;
      }
      if (object instanceof DataTransfer && ["dropEffect", "effectAllowed"].includes(name) && typeof next === "string" && next.length <= 16) {
        object[name] = next;
        return null;
      }
      if (object instanceof HTMLElement && ["scrollLeft", "scrollTop"].includes(name) && Number.isInteger(next)) {
        object[name] = next;
        return null;
      }
      if (object instanceof HTMLImageElement && name === "src" && typeof next === "string") {
        const resolved = typeof options.resolveImage === "function" ? options.resolveImage(next) : next;
        if (typeof resolved !== "string" || resolved.length > 8 * 1024 * 1024 || !/^data:image\/(?:gif|jpeg|png|svg\+xml|webp);base64,[a-z0-9+/=]+$/i.test(resolved)) {
          fail("image source must be an embedded project image");
        }
        object.src = resolved;
        return null;
      }
      if (object instanceof HTMLElement && name === "hidden" && typeof next === "boolean") {
        object.hidden = next;
        return null;
      }
      if (object instanceof HTMLElement && name === "tabIndex" && Number.isInteger(next) && next >= -1 && next <= 0) {
        object.tabIndex = next;
        return null;
      }
      if (object instanceof HTMLInputElement && name === "value" && typeof next === "string" && next.length <= 2048) {
        object.value = next;
        return null;
      }
      if (object instanceof HTMLTextAreaElement && name === "value" && typeof next === "string" && next.length <= 2 * 1024 * 1024) {
        object.value = next;
        return null;
      }
      if (object instanceof HTMLSelectElement && name === "value" && typeof next === "string" && next.length <= 2048) {
        object.value = next;
        return null;
      }
      if (object instanceof HTMLInputElement && name === "checked" && typeof next === "boolean") {
        object.checked = next;
        return null;
      }
      if (object instanceof HTMLElement && name === "className" && typeof next === "string" && /^(?:(?:[a-z_][a-z0-9_-]*)(?:\s+[a-z_][a-z0-9_-]*)*)?$/i.test(next)) {
        object.className = next;
        return null;
      }
      if (object instanceof HTMLElement && ["textContent", "title"].includes(name) && typeof next === "string") {
        object[name] = next;
        return null;
      }
      if (object instanceof Comment && name === "textContent" && typeof next === "string" && next.length <= 4096) {
        object.textContent = next;
        return null;
      }
      if (object instanceof Text && (name === "nodeValue" || name === "textContent") && typeof next === "string" && next.length <= 1024 * 1024) {
        object[name] = next;
        return null;
      }
      fail(`property set ${name} is not allowed`);
    }
    function call(object, name, args) {
      if (object instanceof HTMLDialogElement && name === "showModal" && args.length === 0) {
        object.showModal();
        return null;
      }
      if (object instanceof HTMLDialogElement && name === "close" && args.length <= 1 && (args.length === 0 || typeof args[0] === "string")) {
        object.close(args[0]);
        return null;
      }
      if (object instanceof Element && name === "dispatchEvent" && args.length === 1 && (args[0] === "change" || args[0] === "input")) {
        return object.dispatchEvent(new Event(args[0], { bubbles: true, cancelable: true }));
      }
      if (object instanceof HTMLCanvasElement && name === "getContext" && args.length === 1 && args[0] === "2d") {
        const context = object.getContext("2d");
        return context ? reference(context) : null;
      }
      const canvasMethods = {
        arc: 6,
        beginPath: 0,
        clearRect: 4,
        closePath: 0,
        fill: 0,
        fillRect: 4,
        lineTo: 2,
        moveTo: 2,
        restore: 0,
        rotate: 1,
        save: 0,
        scale: 2,
        stroke: 0,
        strokeRect: 4,
        translate: 2
      };
      const canvasArity = name === "arc" ? args.length === 5 || args.length === 6 : args.length === canvasMethods[name];
      if (object instanceof CanvasRenderingContext2D && name in canvasMethods && canvasArity && args.every((argument) => Number.isInteger(argument) && Math.abs(argument) <= 1024e6)) {
        object[name](...args.map((argument) => argument / 1024));
        return null;
      }
      if (object === hostDocument && name === "detachedRoots" && args.length === 0) {
        return new Uint8Array();
      }
      if (object === hostDocument && name === "debug" && options.development === true) {
        if (args.length !== 1 || typeof args[0] !== "string" || args[0].length > 16 * 1024) {
          fail("debug message is not bounded text");
        }
        options.onDebug?.(args[0]);
        return null;
      }
      if (object === rootCapability && name === "postMessage" && args.length === 1 && typeof args[0] === "string" && args[0].length <= 2 * 1024 * 1024) {
        options.onMessage?.(args[0]);
        return null;
      }
      if (object === rootCapability && name === "serviceCall" && args.length === 2 && typeof args[0] === "string" && args[0].length <= 128 && typeof args[1] === "string" && args[1].length <= 2 * 1024 * 1024) {
        if (typeof options.services?.call !== "function") fail("application services are not available");
        const result = options.services.call(args[0], args[1]);
        if (typeof result !== "string" || result.length > 2 * 1024 * 1024) {
          fail("application service result is not bounded text");
        }
        return result;
      }
      if (object === hostDocument && name === "installStylesheet") {
        installStylesheet(args[0]);
        return null;
      }
      if (object instanceof CSSStyleDeclaration && name === "applyDeclarations") {
        installStylesheet(args[0], object);
        return null;
      }
      if (object instanceof CSSStyleDeclaration && name === "replaceDeclarations") {
        installStylesheet(args[0], object, true);
        return null;
      }
      if (object instanceof CSSStyleDeclaration && name === "removeProperty" && args.length === 1 && typeof args[0] === "string" && isAllowedProperty(args[0])) {
        object.removeProperty(args[0]);
        return null;
      }
      if (object instanceof CSSStyleDeclaration && name === "getPropertyValue" && args.length === 1 && typeof args[0] === "string" && isAllowedProperty(args[0])) {
        return object.getPropertyValue(args[0]);
      }
      if (object === hostDocument && name === "renderSvg") return renderSvg(args[0]);
      if (object === hostDocument && name === "getSelection" && args.length === 0) {
        const selection = hostDocument.getSelection();
        return selection ? reference(selection) : null;
      }
      if (object === hostDocument && name === "getComputedStyle" && args.length === 1 && args[0] instanceof Element && insideDocument(args[0])) {
        return reference(getComputedStyle(args[0]));
      }
      if (object === hostDocument && ["measureRect", "measureClientRects"].includes(name) && args.length === 1 && (args[0] instanceof Range || args[0] instanceof Element && (insideDocument(args[0]) || ownedNodes.has(args[0])))) {
        const rects = name === "measureRect" ? [args[0].getBoundingClientRect()] : Array.from(args[0].getClientRects());
        const bytes = new Uint8Array(4 + rects.length * 32);
        const view = new DataView(bytes.buffer);
        view.setUint32(0, rects.length, true);
        const names = ["bottom", "height", "left", "right", "top", "width", "x", "y"];
        rects.forEach((rect, index) => names.forEach((property, propertyIndex) => view.setInt32(
          4 + index * 32 + propertyIndex * 4,
          Math.round(rect[property] * 64),
          true
        )));
        return bytes;
      }
      if (object === hostDocument && name === "createRange" && args.length === 0) {
        return reference(hostDocument.createRange());
      }
      if (object === hostDocument && name === "hasFocus" && args.length === 0) {
        return hostDocument.hasFocus();
      }
      if (object === hostDocument && name === "scrollBy" && args.length === 2 && args.every(Number.isInteger)) {
        window.scrollBy(args[0], args[1]);
        return null;
      }
      if (object === hostDocument && name === "dateNow" && args.length === 0) {
        return Date.now();
      }
      if (object === hostDocument && name === "datePart" && args.length === 2 && Number.isSafeInteger(args[0]) && Number.isInteger(args[1]) && args[1] >= 0 && args[1] <= 7) {
        const date = new realm.Date(args[0]);
        if (!Number.isFinite(date.valueOf())) fail("date value is not representable");
        return [
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getDay(),
          date.getHours(),
          date.getMinutes(),
          date.getSeconds(),
          date.getTimezoneOffset()
        ][args[1]];
      }
      if (object === hostDocument && name === "performanceNow" && args.length === 0) {
        return Math.round(performance.now());
      }
      if (object === hostDocument && name === "mutationObserve" && args.length === 3 && args[0] instanceof Node && Number.isInteger(args[1]) && Number.isInteger(args[2])) {
        const flags = args[1];
        if (flags < 1 || flags > 31) fail("mutation observer flags are not allowed");
        const observer = new MutationObserver((records) => deliver(args[2], records));
        mutationObservers.add(observer);
        observer.observe(args[0], {
          attributes: Boolean(flags & 1),
          attributeOldValue: Boolean(flags & 2),
          characterData: Boolean(flags & 4),
          characterDataOldValue: Boolean(flags & 8),
          childList: true,
          subtree: Boolean(flags & 16)
        });
        return reference(observer);
      }
      if (object === hostDocument && name === "timer") {
        if (!Number.isInteger(args[0]) || args[0] < 0 || args[0] > 2147483647 || !Number.isInteger(args[1]) || intervals.size >= 1024) fail("timer is not allowed");
        const id = nextInterval++;
        intervals.set(id, setInterval(() => deliver(args[1]), args[0]));
        return id;
      }
      if (object === hostDocument && name === "timerCancel" && args.length === 1 && Number.isInteger(args[0])) {
        const timer = intervals.get(args[0]);
        if (timer !== void 0) {
          clearInterval(timer);
          intervals.delete(args[0]);
        }
        return null;
      }
      if (object === hostDocument && name === "timerOnce") {
        if (!Number.isInteger(args[0]) || args[0] < 0 || args[0] > 2147483647 || !Number.isInteger(args[1])) fail("one-shot timer is not allowed");
        setTimeout(() => deliver(args[1]), args[0]);
        return null;
      }
      if (object === hostDocument && name === "cleanupOpportunity" && args.length === 2) {
        if (!Number.isInteger(args[0]) || args[0] < 0 || args[0] > 6e4 || !Number.isInteger(args[1]) || cleanupCallbacks.size >= 1024) {
          fail("cleanup opportunity is not allowed");
        }
        const id = nextCleanupCallback++;
        const run = () => {
          cleanupCallbacks.delete(id);
          deliver(args[1]);
        };
        const handle = typeof requestIdleCallback === "function" ? requestIdleCallback(run, { timeout: args[0] }) : setTimeout(run, Math.min(args[0], 50));
        cleanupCallbacks.set(id, handle);
        return id;
      }
      if (object === hostDocument && name === "animationFrame" && args.length === 1 && Number.isInteger(args[0])) {
        const configured = typeof options.frameInterval === "function" ? options.frameInterval() : options.frameInterval;
        const delay = Number.isFinite(configured) ? Math.max(0, configured) : 0;
        if (delay > 0) {
          const handle = setTimeout(() => {
            animationTimeouts.delete(handle);
            deliver(args[0]);
          }, Math.max(1, delay));
          animationTimeouts.add(handle);
          return handle;
        }
        return requestAnimationFrame(() => deliver(args[0]));
      }
      if (object === hostDocument && name === "cancelAnimationFrame" && args.length === 1 && Number.isInteger(args[0])) {
        if (animationTimeouts.delete(args[0])) clearTimeout(args[0]);
        else cancelAnimationFrame(args[0]);
        return null;
      }
      if (object === hostDocument && name === "task" && args.length === 1 && Number.isInteger(args[0])) {
        setTimeout(() => deliver(args[0]), 0);
        return null;
      }
      if (object === hostDocument && name === "windowListen") {
        if (!["beforeprint", "blur", "focus", "hashchange", "keydown", "message", "pagehide", "resize", "scroll"].includes(args[0]) || !Number.isInteger(args[1])) {
          fail("window event listener is not allowed");
        }
        hostDocument.defaultView.addEventListener(args[0], (event) => deliver(args[1], event));
        return null;
      }
      if (object instanceof Event && ["preventDefault", "stopImmediatePropagation", "stopPropagation"].includes(name) && args.length === 0) {
        object[name]();
        return null;
      }
      if (object instanceof DataTransfer && ["getData", "setData"].includes(name)) {
        if (typeof args[0] !== "string" || args[0].length > 64) fail("transfer type is invalid");
        if (name === "getData" && args.length === 1) return object.getData(args[0]);
        if (name === "setData" && args.length === 2 && typeof args[1] === "string" && args[1].length <= 2 * 1024 * 1024) {
          object.setData(args[0], args[1]);
          return null;
        }
        fail(`transfer ${name} arguments are invalid`);
      }
      if (object instanceof DataTransfer && name === "clearData" && args.length === 0) {
        object.clearData();
        return null;
      }
      if (object instanceof Node && name === "contains" && args.length === 1 && (args[0] === null || args[0] instanceof Node)) {
        return object.contains(args[0]);
      }
      if (object instanceof Node && name === "childNodes" && args.length === 0 && insideDocument(object)) {
        return reference(Array.from(object.childNodes));
      }
      if (object instanceof Node && name === "childNodeReferences" && args.length === 0 && insideDocument(object)) {
        const children = Array.from(object.childNodes);
        const bytes = new Uint8Array(4 + children.length * 4);
        const view = new DataView(bytes.buffer);
        view.setUint32(0, children.length, true);
        children.forEach((node, index) => view.setUint32(4 + index * 4, reference(node)[1], true));
        return bytes;
      }
      if (Array.isArray(object) && name === "item" && args.length === 1 && Number.isInteger(args[0]) && args[0] >= 0 && args[0] < object.length) {
        return reference(object[args[0]]);
      }
      if (object instanceof InputEvent && name === "getTargetRanges" && args.length === 0) {
        return reference(Array.from(object.getTargetRanges()));
      }
      if (object instanceof MutationRecord && ["addedNodeAt", "removedNodeAt"].includes(name) && args.length === 1 && Number.isInteger(args[0])) {
        const nodes = object[name === "addedNodeAt" ? "addedNodes" : "removedNodes"];
        if (args[0] < 0 || args[0] >= nodes.length) fail("mutation node index is invalid");
        return reference(nodes[args[0]]);
      }
      if (object instanceof Element && name === "getAttribute" && args.length === 1 && typeof args[0] === "string" && (isAllowedAttribute(args[0]) || args[0] === "style")) {
        return object.getAttribute(args[0]);
      }
      if (object instanceof MutationObserver && name === "disconnect" && args.length === 0) {
        object.disconnect();
        return null;
      }
      if (object instanceof Element && name === "getAttribute") {
        fail(`getAttribute ${String(args[0])} is not allowed on ${object.constructor.name}`);
      }
      if (object instanceof MutationObserver && name === "takeRecords" && args.length === 0) {
        return reference(object.takeRecords());
      }
      if (object instanceof Selection && ["collapse", "extend"].includes(name) && args.length === 2 && args[0] instanceof Node && (insideDocument(args[0]) || ownedNodes.has(args[0])) && Number.isInteger(args[1]) && args[1] >= 0) {
        object[name](args[0], args[1]);
        return null;
      }
      if (object instanceof Selection && name === "removeAllRanges" && args.length === 0) {
        object.removeAllRanges();
        return null;
      }
      if (object instanceof Selection && name === "addRange" && args.length === 1 && args[0] instanceof Range) {
        object.addRange(args[0]);
        return null;
      }
      if (object instanceof Selection && name === "getRangeAt" && args.length === 1 && args[0] === 0 && object.rangeCount) {
        return reference(object.getRangeAt(0));
      }
      if (object instanceof Range && ["setStart", "setEnd"].includes(name) && args.length === 2 && args[0] instanceof Node && (insideDocument(args[0]) || ownedNodes.has(args[0])) && Number.isInteger(args[1]) && args[1] >= 0) {
        object[name](args[0], args[1]);
        return null;
      }
      if (object instanceof Range && name === "collapse" && args.length === 1 && typeof args[0] === "boolean") {
        object.collapse(args[0]);
        return null;
      }
      if (object instanceof Range && name === "detach" && args.length === 0) {
        object.detach();
        return null;
      }
      if (object instanceof KeyboardEvent && name === "getModifierState" && args.length === 1 && typeof args[0] === "string" && args[0].length <= 32) {
        return object.getModifierState(args[0]);
      }
      if (object instanceof Event && name === "composedPathReferences" && args.length === 0) {
        const path = object.composedPath().filter((entry) => entry instanceof Node && insideDocument(entry));
        const bytes = new Uint8Array(4 + path.length * 4);
        const view = new DataView(bytes.buffer);
        view.setUint32(0, path.length, true);
        path.forEach((node, index) => view.setUint32(4 + index * 4, reference(node)[1], true));
        return bytes;
      }
      if (object instanceof Node && name === "contains") {
        fail(`contains argument is ${args[0]?.constructor?.name || String(args[0])}; inside=${args[0] instanceof Node && insideDocument(args[0])}`);
      }
      if (object === hostDocument && name === "storageGet") {
        if (!options.services?.storage) fail("storage is not available");
        return options.services.storage.get(args[0], args[1]);
      }
      if (object === hostDocument && name === "storageSet") {
        if (!options.services?.storage) fail("storage is not available");
        options.services.storage.set(args[0], args[1], args[2]);
        return null;
      }
      if (object === hostDocument && name === "storageDelete") {
        if (!options.services?.storage) fail("storage is not available");
        options.services.storage.delete(args[0], args[1]);
        return null;
      }
      if (object === hostDocument && name === "storageListen") {
        if (!options.services?.storage) fail("storage is not available");
        const callback = args[2];
        if (!Number.isInteger(callback)) fail("storage callback is not allowed");
        options.services.storage.listen(args[0], args[1], () => deliver(callback));
        return null;
      }
      if (object === hostDocument && name === "routeGet") {
        if (!options.services?.route) fail("routing is not available");
        return options.services.route.get();
      }
      if (object === hostDocument && name === "routeSearch") {
        if (!options.services?.route) fail("routing is not available");
        return typeof options.services.route.search === "function" ? options.services.route.search() : "";
      }
      if (object === hostDocument && name === "routeListen") {
        if (!options.services?.route) fail("routing is not available");
        if (!Number.isInteger(args[0])) fail("route callback is not allowed");
        options.services.route.listen(() => deliver(args[0]));
        return null;
      }
      if (object === hostDocument && name === "createElement") {
        const tag = args[0];
        const inertCustomElement = typeof tag === "string" && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(tag) && !customElements.get(tag);
        if (!ELEMENTS.has(tag) && !inertCustomElement) fail(`element ${tag} is not allowed`);
        return reference(ownNode(hostDocument.createElement(tag)));
      }
      if (object === hostDocument && name === "createElementNS") {
        const [namespace, tag] = args;
        if (namespace !== "http://www.w3.org/2000/svg" || !SVG_ELEMENTS.has(tag)) {
          fail(`namespaced element ${tag} is not allowed`);
        }
        return reference(ownNode(hostDocument.createElementNS(namespace, tag)));
      }
      if (object === hostDocument && name === "createComment") {
        if (typeof args[0] !== "string" || args[0].length > 4096) {
          fail("comment text is not allowed");
        }
        return reference(ownNode(hostDocument.createComment(args[0])));
      }
      if (object === hostDocument && name === "createTextNode") {
        if (args.length !== 1 || typeof args[0] !== "string" || args[0].length > 1024 * 1024) {
          fail("text node content is not bounded text");
        }
        return reference(ownNode(hostDocument.createTextNode(args[0])));
      }
      if (object === hostDocument && name === "createDocumentFragment" && args.length === 0) {
        return reference(ownNode(hostDocument.createDocumentFragment()));
      }
      if (object === hostDocument && name === "getElementById") {
        if (typeof args[0] !== "string") fail("element id must be a string");
        const found = documentTarget ? hostDocument.getElementById(args[0]) : roots.map((root) => root.id === args[0] ? root : root.querySelector(`#${CSS.escape(args[0])}`)).find(Boolean);
        return found && insideDocument(found) ? reference(found) : null;
      }
      if (object === hostDocument && name === "elementFromPoint") {
        if (args.length !== 2 || !args.every(Number.isFinite)) {
          fail("point coordinates must be finite numbers");
        }
        const found = hostDocument.elementFromPoint(args[0], args[1]);
        return found && insideDocument(found) ? reference(found) : null;
      }
      if (object instanceof Element && name === "setAttribute") {
        if (!isAllowedAttribute(args[0]) || typeof args[1] !== "string") {
          fail(`attribute ${args[0]} is not allowed`);
        }
        if (object instanceof HTMLMetaElement && !(args[0] === "name" && args[1] === "viewport" || args[0] === "content" && args[1] === "width=device-width, initial-scale=1")) {
          fail("only the standard viewport metadata is allowed");
        }
        if (!(object instanceof HTMLMetaElement) && args[0] === "content") {
          fail("attribute content is only allowed on meta");
        }
        if (args[0] === "name" && !(object instanceof HTMLMetaElement) && (!(object instanceof HTMLInputElement || object instanceof HTMLButtonElement || object instanceof HTMLTextAreaElement) || !/^[a-z_][a-z0-9_.:-]{0,127}$/i.test(args[1]))) {
          fail("name attribute is not allowed on this element");
        }
        if (args[0] === "form" && (!(object instanceof HTMLInputElement || object instanceof HTMLButtonElement) || args[1] !== "")) {
          fail("only an empty form override is allowed on controls");
        }
        if (args[0] === "main-field" && (!(object instanceof HTMLInputElement) || args[1] !== "true")) {
          fail("main-field is only allowed on a search input");
        }
        if (object instanceof SVGElement && (!SVG_IMAGE_ATTRIBUTES.has(args[0]) || !svgImageAttributeAllowed(args[0], args[1]))) {
          fail(`SVG attribute ${args[0]} value is not allowed`);
        }
        if (args[0].startsWith("data-") && args[1].length > 2048) {
          fail("data attribute is too long");
        }
        if (args[0] === "href" && (!(object instanceof HTMLAnchorElement) || !navigationAllowed(args[1]))) {
          fail("href is not allowed by navigation policy");
        }
        if (args[0] === "target" && (!(object instanceof HTMLAnchorElement) || args[1] !== "_blank")) {
          fail("target is only allowed as _blank on links");
        }
        if (args[0] === "tabindex" && !["-1", "0"].includes(args[1])) {
          fail("tabindex must use normal or programmatic focus order");
        }
        if (args[0] === "value" && (!(object instanceof HTMLInputElement || object instanceof HTMLButtonElement || object.tagName === "OPTION") || args[1].length > 2048)) {
          fail("value attribute is not allowed on this element");
        }
        if (args[0] === "placeholder" && (!(object instanceof HTMLInputElement || object instanceof HTMLTextAreaElement) || args[1].length > 512)) {
          fail("placeholder is not allowed on this element");
        }
        if (["contenteditable", "spellcheck", "writingsuggestions"].includes(args[0]) && !["true", "false"].includes(args[1])) {
          fail(`${args[0]} value is not allowed`);
        }
        if (args[0] === "aria-autocomplete" && !["both", "inline", "list", "none"].includes(args[1])) {
          fail("aria-autocomplete value is not allowed");
        }
        if (["autocapitalize", "autocomplete", "autocorrect"].includes(args[0]) && !["off", "on"].includes(args[1])) {
          fail(`${args[0]} value is not allowed`);
        }
        if (args[0] === "translate" && !["no", "yes"].includes(args[1])) {
          fail("translate value is not allowed");
        }
        object.setAttribute(args[0], args[1]);
        return null;
      }
      if (object instanceof Element && name === "removeAttribute") {
        if (args.length !== 1 || typeof args[0] !== "string" || !isAllowedAttribute(args[0])) {
          fail("attribute removal is not allowed");
        }
        object.removeAttribute(args[0]);
        return null;
      }
      if (object instanceof Node && name === "closest") {
        if (args.length !== 1 || typeof args[0] !== "string" || args[0].length > 128 || !SAFE_SELECTOR.test(args[0])) {
          fail(`closest selector is not allowed: ${JSON.stringify(args[0])}`);
        }
        const element = object instanceof Element ? object : object.parentElement;
        const found = element?.closest(args[0]);
        return found && insideDocument(found) ? reference(found) : null;
      }
      if (object instanceof Element && name === "matches") {
        if (args.length !== 1 || typeof args[0] !== "string" || args[0].length > 128 || !SAFE_SELECTOR.test(args[0])) {
          fail("matches selector is not allowed");
        }
        return object.matches(args[0]);
      }
      if (object instanceof Element && name === "childAt") {
        const index = args[0];
        if (!Number.isInteger(index) || index < 0) fail("child index is not allowed");
        const child = object.children[index];
        return child ? reference(child) : null;
      }
      if (object instanceof Element && name === "scrollIntoView" && args.length === 0) {
        object.scrollIntoView();
        return null;
      }
      if (object instanceof HTMLElement && name === "focus" && args.length === 0) {
        object.focus();
        return null;
      }
      if ((object instanceof HTMLInputElement || object instanceof HTMLTextAreaElement) && name === "select" && args.length === 0) {
        object.select();
        return null;
      }
      if ((object instanceof HTMLInputElement || object instanceof HTMLTextAreaElement || object instanceof HTMLSelectElement) && name === "setCustomValidity" && args.length === 1 && typeof args[0] === "string" && args[0].length <= 512) {
        object.setCustomValidity(args[0]);
        return null;
      }
      if (object instanceof Element && name === "getBoundingClientRect" && args.length === 0) {
        return reference(object.getBoundingClientRect());
      }
      if (object instanceof Element && ["querySelector", "querySelectorAll", "querySelectorAllReferences"].includes(name)) {
        if (args.length !== 1 || typeof args[0] !== "string" || args[0].length > 512 || !SAFE_SELECTOR.test(args[0])) {
          fail(`query selector is not allowed: ${JSON.stringify(args[0])}`);
        }
        if (name === "querySelector") {
          const found2 = object.querySelector(args[0]);
          return found2 ? reference(found2) : null;
        }
        const found = Array.from(object.querySelectorAll(args[0]));
        if (name === "querySelectorAll") return reference(found);
        const bytes = new Uint8Array(4 + found.length * 4);
        const view = new DataView(bytes.buffer);
        view.setUint32(0, found.length, true);
        found.forEach((node, index) => view.setUint32(4 + index * 4, reference(node)[1], true));
        return bytes;
      }
      if (object instanceof Element && name === "hasAttribute" && args.length === 1 && typeof args[0] === "string" && isAllowedAttribute(args[0])) {
        return object.hasAttribute(args[0]);
      }
      if ((object instanceof Element || object instanceof Range) && name === "getClientRects" && args.length === 0) {
        return reference(Array.from(object.getClientRects()));
      }
      if (object instanceof Range && name === "getBoundingClientRect" && args.length === 0) {
        return reference(object.getBoundingClientRect());
      }
      if (object instanceof Node && ["append", "appendChild", "replaceChildren"].includes(name)) {
        if (object === logicalHead && documentTarget && args.some((node) => !(node instanceof HTMLMetaElement || node instanceof HTMLTitleElement || node instanceof Comment))) {
          fail("only viewport meta and title elements may enter the logical head");
        }
        object[name](...args);
        return name === "appendChild" ? reference(args[0]) : null;
      }
      if (object instanceof Node && name === "insertBefore" && args.length === 2 && args[0] instanceof Node && (args[1] === null || args[1] instanceof Node)) {
        const next = args[1] !== null && args[1].parentNode === object ? args[1] : null;
        object.insertBefore(args[0], next);
        return reference(args[0]);
      }
      if (object instanceof Node && name === "removeChild" && args.length === 1 && args[0] instanceof Node && args[0].parentNode === object) {
        object.removeChild(args[0]);
        return reference(args[0]);
      }
      if (object instanceof Node && name === "removeChild" && args.length === 1 && args[0] instanceof Node && args[0].parentNode === null) {
        return reference(args[0]);
      }
      if (object instanceof Node && "remove" in object && typeof object.remove === "function" && name === "remove") {
        object.remove();
        return null;
      }
      fail(`method ${name} is not allowed on ${object?.constructor?.name || typeof object}`);
    }
    function listen(object, type, callback, capture = false) {
      const elementEventName = [
        "auxclick",
        "beforeinput",
        "blur",
        "change",
        "click",
        "compositionend",
        "compositionstart",
        "compositionupdate",
        "contextmenu",
        "copy",
        "cut",
        "dragend",
        "dragenter",
        "dragleave",
        "dragover",
        "dragstart",
        "drop",
        "focus",
        "focusout",
        "input",
        "keydown",
        "keypress",
        "keyup",
        "mousedown",
        "mouseleave",
        "mousemove",
        "mouseout",
        "mouseover",
        "mouseup",
        "mousewheel",
        "paste",
        "pointerdown",
        "pointerenter",
        "pointerleave",
        "pointermove",
        "pointerup",
        "scroll",
        "submit",
        "touchend",
        "touchmove",
        "touchstart",
        "wheel"
      ].includes(type);
      const elementEvent = object instanceof Element && elementEventName;
      const documentEvent = object === hostDocument && (elementEventName || ["instanttooltiphide", "selectionchange", "themechange", "visibilitychange"].includes(type));
      if (!elementEvent && !documentEvent || !Number.isInteger(callback)) fail(`event listener ${type} is not allowed`);
      const listener = (event) => {
        deliver(callback, event);
      };
      object.addEventListener(type, listener, { capture });
      const records = eventListeners.get(object) || [];
      records.push({ type, callback, listener, capture });
      eventListeners.set(object, records);
      listenedObjects.add(object);
      return null;
    }
    function unlisten(object, type, callback) {
      const records = eventListeners.get(object) || [];
      const index = records.findIndex((record) => record.type === type && record.callback === callback);
      if (index < 0) return null;
      object.removeEventListener(type, records[index].listener);
      records.splice(index, 1);
      if (!records.length) listenedObjects.delete(object);
      return null;
    }
    function operation(item) {
      if (!Array.isArray(item)) fail("operation must be an array");
      const object = item[1] === null ? null : dereference(item[1]);
      const name = item[2] === null ? null : value(["s", item[2]]);
      if (instrument) trace("operation", {
        code: item[0],
        object: item[1],
        name,
        argumentCount: item[0] === 3 ? (item[3] || []).length : void 0,
        value: item[0] === 2 ? traceValue(item[3]) : void 0,
        arguments: item[0] === 3 ? (item[3] || []).map(traceValue) : void 0
      });
      try {
        if (item[0] === 0) return reference(rootCapability);
        if (item[0] === 1) return get(object, name);
        if (item[0] === 2) return set(object, name, value(item[3]));
        if (item[0] === 3) return call(object, name, (item[3] || []).map(value));
        if (item[0] === 4) return listen(object, name, item[3], item[4] === true);
        if (item[0] === 5) return unlisten(object, name, item[3]);
        fail("unknown operation");
      } catch (error) {
        if (instrument) trace("operation-error", {
          code: item[0],
          object: item[1],
          name,
          message: error?.message || String(error)
        });
        throw error;
      }
    }
    function write(memory, offset, capacity, bytes) {
      if (bytes.length + 4 > capacity) fail("guest transfer buffer is too small");
      const view = new DataView(memory.buffer);
      view.setUint32(offset, bytes.length, true);
      memory.set(bytes, offset + 4);
      return bytes.length + 4;
    }
    class Reader {
      bytes;
      at;
      constructor(bytes) {
        this.bytes = bytes;
        this.at = 0;
      }
      byte() {
        if (this.at >= this.bytes.length) fail("truncated wire message");
        return this.bytes[this.at++];
      }
      uint() {
        let value2 = 0, scale = 1, byte;
        do {
          byte = this.byte();
          value2 += (byte & 127) * scale;
          scale *= 128;
        } while (byte & 128);
        return value2;
      }
      text() {
        const length = this.uint();
        if (length > this.bytes.length - this.at) fail("truncated wire text");
        const text = decoder.decode(this.bytes.subarray(this.at, this.at + length));
        this.at += length;
        return text;
      }
    }
    class Writer {
      bytes;
      constructor() {
        this.bytes = [];
      }
      byte(value2) {
        this.bytes.push(value2);
      }
      uint(value2) {
        do {
          const next = value2 % 128;
          value2 = Math.floor(value2 / 128);
          this.byte(next | (value2 ? 128 : 0));
        } while (value2);
      }
      value(next) {
        if (next === null) return this.byte(0);
        if (next === false) return this.byte(1);
        if (next === true) return this.byte(2);
        if (typeof next === "number") {
          if (!Number.isInteger(next)) fail("wire number must be an integer");
          if (next >= 0) {
            this.byte(3);
            return this.uint(next);
          }
          this.byte(8);
          return this.uint(-next * 2 - 1);
        }
        if (typeof next === "string") {
          this.byte(7);
          const bytes = encoder.encode(next);
          this.uint(bytes.length);
          for (const byte of bytes) this.byte(byte);
          return;
        }
        if (next instanceof Uint8Array) {
          this.byte(6);
          this.uint(next.length);
          for (const byte of next) this.byte(byte);
          return;
        }
        if (next[0] === "r") {
          this.byte(4);
          return this.uint(next[1]);
        }
        if (next[0] === "s") {
          this.byte(5);
          return this.uint(next[1]);
        }
        fail("unsupported wire response value");
      }
    }
    const renderSvg = createSvgRenderer(Reader, encoder, fail);
    const installStylesheet = createCssRenderer({
      CSS_VALUE_FUNCTIONS,
      Reader,
      hostDocument,
      installFont,
      installedStyles,
      isAllowedProperty,
      logicalHead,
      options,
      pendingChecks,
      reject: fail,
      scopeClass,
      scopeSelector
    });
    function readValue(reader) {
      const tag = reader.byte();
      if (tag === 0) return null;
      if (tag === 1) return false;
      if (tag === 2) return true;
      if (tag === 3) return reader.uint();
      if (tag === 4) return ["r", reader.uint()];
      if (tag === 5) return ["s", reader.uint()];
      if (tag === 8) return -(reader.uint() + 1) / 2;
      if (tag === 6) {
        const length = reader.uint();
        if (length > reader.bytes.length - reader.at) fail("truncated wire bytes");
        const bytes = reader.bytes.slice(reader.at, reader.at + length);
        reader.at += length;
        return bytes;
      }
      fail("unknown wire value");
    }
    function readOperation(reader) {
      const code = reader.byte();
      if (code === 0) return [0, null, null];
      const object = reader.uint(), name = reader.uint();
      if (code === 1) return [code, object, name];
      if (code === 2) return [code, object, name, readValue(reader)];
      if (code === 3) {
        const count = reader.uint(), args = [];
        while (args.length < count) args.push(readValue(reader));
        return [code, object, name, args];
      }
      if (code === 4) return [code, object, name, reader.uint(), reader.byte() === 1];
      if (code === 5) return [code, object, name, reader.uint()];
      fail("unknown operation");
    }
    function msg(offset, capacity) {
      if (capacity === 0) {
        if (offset === 0) return 0;
        if (offset > CHUNK_SIZE * CHUNK_COUNT) {
          fail(`guest execution failed at stage ${offset - CHUNK_SIZE * CHUNK_COUNT}`);
        }
        const id = offset - 1;
        const object = dereference(id);
        const remaining = --leases[id];
        options.onReferenceLease?.(id, remaining, object);
        if (remaining === 0) {
          chunks[Math.floor(id / CHUNK_SIZE)][id % CHUNK_SIZE] = void 0;
          reverse.delete(object);
          if (typeof options.onReferenceRelease === "function") {
            options.onReferenceRelease(id, object);
          }
          if (instrument) trace("reference-release", { id });
        }
        return 0;
      }
      const memory = new Uint8Array(instance.exports.memory.buffer);
      if (offset > memory.length || capacity > memory.length - offset || capacity < 4) {
        fail("guest buffer is outside memory");
      }
      if (delivery !== void 0) {
        const bytes = delivery;
        delivery = void 0;
        if (bytes.length > capacity) fail("guest event buffer is too small");
        memory.set(bytes, offset);
        return bytes.length;
      }
      if (capacity >= 4 && memory[offset] === 68 && memory[offset + 1] === 85 && memory[offset + 2] === 76 && memory[offset + 3] === 83) {
        if (!stamp || stamp.length > capacity) fail("stamped guest data is unavailable or too large");
        memory.set(stamp, offset);
        return stamp.length;
      }
      if (capacity >= 6 && memory[offset] === 68 && memory[offset + 1] === 85 && memory[offset + 2] === 76 && memory[offset + 3] === 69) {
        const end = memory.indexOf(0, offset + 5);
        const message = decoder.decode(memory.subarray(
          offset + 5,
          end < 0 || end > offset + capacity ? offset + capacity : end
        ));
        fail(`guest execution failed at stage ${memory[offset + 4]}: ${message}`);
      }
      const length = new DataView(memory.buffer).getUint32(offset, true);
      if (length > capacity - 4) fail("invalid guest message length");
      const reader = new Reader(memory.subarray(offset + 4, offset + 4 + length));
      const stringCount = reader.uint();
      for (let index = 0; index < stringCount; index++) strings.push(reader.text());
      const operationCount = reader.uint();
      if (instrument) trace("operation-batch", { operationCount, stringCount, bytes: length });
      const writer = new Writer();
      writer.uint(operationCount);
      for (let index = 0; index < operationCount; index++) {
        writer.value(operation(readOperation(reader)));
      }
      if (reader.at !== reader.bytes.length) fail("trailing wire data");
      return write(memory, offset, capacity, Uint8Array.from(writer.bytes));
    }
    function deliver(callback, event = null) {
      if (!Number.isInteger(callback) || callback < 0 || callback >= 4096) {
        fail("event callback space exhausted");
      }
      const eventReference = event ? reference(event)[1] + 1 : 0;
      if (instrument) {
        const selection = globalThis.getSelection?.();
        trace("event-deliver", {
          callback,
          eventReference: eventReference ? eventReference - 1 : null,
          eventType: event?.type || null,
          targetReference: event?.target ? reverse.get(event.target) ?? null : null,
          key: event?.key,
          button: event?.button,
          buttons: event?.buttons,
          clientX: event?.clientX,
          clientY: event?.clientY,
          selection: selection ? {
            collapsed: selection.isCollapsed,
            anchorOffset: selection.anchorOffset,
            focusOffset: selection.focusOffset,
            text: String(selection).slice(0, 512)
          } : null
        });
      }
      delivery = new Uint8Array(4);
      const view = new DataView(delivery.buffer);
      view.setUint32(0, callback * 1048576 + eventReference, true);
      try {
        instance.exports.onmsg(4);
        if (delivery !== void 0) fail("guest did not receive event");
      } catch (error) {
        if (instrument) trace("event-error", {
          callback,
          eventType: event?.type || null,
          message: error?.stack || String(error)
        });
        throw error;
      }
      if (instrument) trace("event-complete", { callback, eventType: event?.type || null });
      if (!checkpointQueued) {
        checkpointQueued = true;
        queueMicrotask(() => {
          try {
            instance.exports.onmsg(0);
          } finally {
            checkpointQueued = false;
          }
        });
      }
    }
    this.imports = { host: { msg, now: () => performance.now() } };
    this.connect = async (nextInstance) => {
      if (instance) fail("host is already running a guest");
      instance = nextInstance;
      if (typeof instance?.exports?.onmsg !== "function" || !(instance.exports.memory instanceof WebAssembly.Memory)) {
        fail("guest exports do not match the 0.1 ABI");
      }
      instance.exports.onmsg(0);
      await Promise.all(pendingChecks);
      if (instrument) trace("connected", { pendingChecks: pendingChecks.length });
    };
    this.send = (bytes) => {
      if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
        fail("host message must be a non-empty Uint8Array");
      }
      if (!instance) fail("host is not connected to a guest");
      if (delivery !== void 0) fail("a host message is already being delivered");
      delivery = bytes;
      instance.exports.onmsg(bytes.length);
      if (delivery !== void 0) {
        delivery = void 0;
        fail("guest did not receive host message");
      }
    };
    this.destroy = () => {
      for (const object of listenedObjects) {
        for (const record of eventListeners.get(object) || []) {
          object.removeEventListener(record.type, record.listener, { capture: record.capture });
        }
      }
      listenedObjects.clear();
      for (const observer of mutationObservers) observer.disconnect();
      mutationObservers.clear();
      for (const timer of intervals.values()) clearInterval(timer);
      intervals.clear();
      animationTimeouts.forEach(clearTimeout);
      animationTimeouts.clear();
      for (const handle of cleanupCallbacks.values()) {
        if (typeof cancelIdleCallback === "function") cancelIdleCallback(handle);
        else clearTimeout(handle);
      }
      cleanupCallbacks.clear();
      installedStyles.forEach((style) => style.remove());
      installedStyles.clear();
      if (scopeClass) roots.forEach((root) => root.classList.remove(scopeClass));
      instance = void 0;
      delivery = void 0;
    };
  }
};
var WasmWebMachine = class {
  #bridge;
  #connected = false;
  #instance;
  constructor(module, target = document, options = {}) {
    if (!(module instanceof WebAssembly.Module)) {
      throw new TypeError("wasm-web-machine: module must be a WebAssembly.Module");
    }
    this.#bridge = new WasmWebBridge(target, options);
    this.#instance = new WebAssembly.Instance(module, this.#bridge.imports);
  }
  msg = (offset, length) => this.#bridge.imports.host.msg(offset, length);
  onmsg = (message = 0) => {
    if (!this.#connected) {
      if (message !== 0) {
        throw new Error("wasm-web-machine: first message must be the null message");
      }
      this.#connected = true;
      return this.#bridge.connect(this.#instance);
    }
    if (message === 0) return this.#instance.exports.onmsg(0);
    return this.#bridge.send(message);
  };
  destroy = () => {
    this.#bridge.destroy();
    this.#instance = void 0;
    this.#connected = false;
  };
};

// project-machines.js
var encoder2 = new TextEncoder();
var decoder2 = new TextDecoder();
var runtimeModules = /* @__PURE__ */ new Map();
var nextMachine = 1;
async function moduleFor(url) {
  if (!runtimeModules.has(url)) runtimeModules.set(url, fetch(url, { credentials: "same-origin" }).then((response) => {
    if (!response.ok) throw new Error(`Project runtime response ${response.status}`);
    return WebAssembly.compileStreaming(response);
  }));
  return runtimeModules.get(url);
}
function taggedMessage(tag, value) {
  const bytes = encoder2.encode(value), message = new Uint8Array(bytes.length + 1);
  message[0] = tag;
  message.set(bytes, 1);
  return message;
}
function callMessage(name, payload) {
  const fn = encoder2.encode(name), argument = encoder2.encode(JSON.stringify(payload)), message = new Uint8Array(2 + fn.length + argument.length);
  message[0] = 2;
  message.set(fn, 1);
  message.set(argument, fn.length + 2);
  return message;
}
function createConstrainedFetch(allowedOrigins = [], maxBytes = 1048576) {
  const origins = new Set(allowedOrigins.map((value) => new URL(value).origin));
  return async (value) => {
    const url = new URL(value);
    if (url.protocol !== "https:" || !origins.has(url.origin)) throw new Error(`Fetch blocked for ${url.origin}`);
    const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" }), bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error(`Fetch response exceeds ${maxBytes} bytes`);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    const mime = response.headers.get("content-type")?.split(";", 1)[0] || "application/octet-stream";
    return { status: response.status, body: decoder2.decode(bytes), resourceUrl: `data:${mime};base64,${btoa(binary)}` };
  };
}
function createProjectFetch(files = [], allowedOrigins = [], maxBytes = 1048576) {
  const projectFiles = new Map(files.map((file) => [file.path, file]));
  const remoteFetch = createConstrainedFetch(allowedOrigins, maxBytes);
  return async (value) => {
    if (/^https:\/\//.test(value)) return remoteFetch(value);
    if (typeof value !== "string" || value.includes("?") || value.includes("#"))
      throw new Error("Project file fetch requires a relative file path");
    const path = value.replace(/^\.\//, "");
    if (!path || path.startsWith("/") || path.split("/").includes(".."))
      throw new Error("Project file fetch path is invalid");
    const file = projectFiles.get(path);
    if (!file) throw new Error(`Project file not found: ${path}`);
    const extension = path.split(".").at(-1).toLowerCase();
    const mime = {
      css: "text/css",
      gif: "image/gif",
      html: "text/html",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      js: "text/javascript",
      json: "application/json",
      png: "image/png",
      svg: "image/svg+xml",
      txt: "text/plain"
    }[extension] || "application/octet-stream";
    const data = /^data:([^;,]+);base64,(.*)$/s.exec(file.content);
    let bytes;
    if (data) bytes = Uint8Array.from(atob(data[2]), (character) => character.charCodeAt(0));
    else bytes = encoder2.encode(file.content);
    if (bytes.byteLength > maxBytes) throw new Error(`Project file exceeds ${maxBytes} bytes: ${path}`);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    return { status: 200, body: data ? "" : file.content, resourceUrl: `data:${mime};base64,${btoa(binary)}` };
  };
}
function createProjectImageResolver(files = []) {
  const images = /* @__PURE__ */ new Map();
  for (const file of files) {
    if (/^data:image\/(?:gif|jpeg|png|webp);base64,/i.test(file.content)) images.set(file.path, file.content);
    else if (file.path.toLowerCase().endsWith(".svg")) {
      const bytes = encoder2.encode(file.content);
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32768)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      images.set(file.path, `data:image/svg+xml;base64,${btoa(binary)}`);
    }
  }
  return (value) => images.get(String(value).replace(/^\.\//, "")) || value;
}
async function createProjectOutputMachine({ root, scripts, options = {}, onError }) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  let reportedError = null, response, starting = true, destroyed = false, machine;
  async function answerFetch(request) {
    try {
      if (typeof options.fetchResource !== "function") throw new Error("Project network access is disabled");
      const result = await options.fetchResource(request.url), reply = { id: request.id, ...result };
      if (!destroyed) machine.onmsg(callMessage("__resourcesFetchResolve", reply));
    } catch (error) {
      if (!destroyed) machine.onmsg(callMessage("__resourcesFetchResolve", { id: request.id, error: error.message }));
    }
  }
  machine = new WasmWebMachine(module, root, { ...options, onMessage(text) {
    if (text.startsWith("__wwcResponse:")) {
      response = text.slice(14);
      return;
    }
    if (text.startsWith("__wwcError:") && !reportedError) {
      reportedError = new Error(text.slice(11));
      if (!starting) queueMicrotask(() => onError?.(reportedError));
      return;
    }
    try {
      const request = JSON.parse(text);
      if (request.type === "fetch" && Number.isSafeInteger(request.id) && typeof request.url === "string")
        return void answerFetch(request);
    } catch {
    }
    options.onMessage?.(text);
  } });
  const machineId = `wasm-web-machine-${nextMachine++}`;
  await machine.onmsg(0);
  async function evaluate(script, index) {
    reportedError = null;
    await machine.onmsg(taggedMessage(1, script.code));
    if (!reportedError) return;
    const source = typeof script?.source === "string" && script.source ? script.source : `script ${index + 1}`;
    throw new Error(`${source}: ${reportedError.message}`);
  }
  try {
    for (let index = 0; index < scripts.length; index++) await evaluate(scripts[index], index);
  } catch (error) {
    machine.destroy();
    throw error;
  }
  let programs = scripts.length;
  starting = false;
  function call(name, payload) {
    response = void 0;
    reportedError = null;
    machine.onmsg(callMessage(name, payload));
    if (reportedError) throw reportedError;
    if (response === void 0) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(response);
  }
  return Object.freeze({
    setContent(tree) {
      const result = call("__resourcesOutputSetContent", tree);
      machine.onmsg(0);
      return result;
    },
    async run(nextScripts) {
      for (let index = 0; index < nextScripts.length; index++) await evaluate(nextScripts[index], index);
      programs += nextScripts.length;
    },
    async load(project) {
      const result = call("__resourcesOutputLoad", {
        tree: project.tree || [],
        stylesheets: project.stylesheets || []
      });
      machine.onmsg(0);
      const nextScripts = project.scripts || [];
      for (let index = 0; index < nextScripts.length; index++) await evaluate(nextScripts[index], index);
      programs += nextScripts.length;
      return result;
    },
    destroy() {
      destroyed = true;
      machine.destroy();
    },
    inspect() {
      return { runtime: "quickjs", programs, machine: { machineId } };
    }
  });
}
async function createProjectEditorMachine({ root, onChange, onReady, onLimit, limits }) {
  const module = await moduleFor("/-/resources-site/project-editor-quickjs-runtime.wasm");
  const machineId = `wasm-web-machine-${nextMachine++}`;
  let response, machineError, outputRequest = 0;
  const machine = new WasmWebMachine(module, root, { onMessage(text) {
    if (text.startsWith("__wwcError:")) {
      machineError = text.slice(11);
      return;
    }
    if (text.startsWith("__wwcResponse:")) {
      response = text.slice(14);
      return;
    }
    const message = JSON.parse(text);
    if (message.type === "mount-project-output") outputRequest = message.generation;
    queueMicrotask(() => {
      if (message.type === "change") onChange(message.content, { syntaxErrors: message.syntaxErrors === true });
      else if (message.type === "ready") onReady?.(message);
      else if (message.type === "limit") onLimit?.(message);
    });
  } });
  await machine.onmsg(0);
  if (machineError) throw new Error(machineError);
  function call(name, payload) {
    if (!/^__[A-Za-z0-9_]+$/.test(name)) throw new TypeError("Guest function name is invalid");
    response = machineError = void 0;
    machine.onmsg(callMessage(name, payload));
    if (machineError) throw new Error(machineError);
    if (response === void 0) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(response);
  }
  call("__codeEditorConfigureLimits", limits || { maxLines: 5e3, maxCharacters: 1e6 });
  return Object.freeze({
    setContent: (content, language = "plain", options = {}) => call("__codeEditorSetContent", { content, language, ...options }),
    command: (payload) => call("__codeEditorCommand", payload),
    callGuest: call,
    requestOutput(generation) {
      outputRequest = 0;
      const result = call("__resourcesProjectRequestOutput", { generation });
      if (!result.requested || outputRequest !== generation) throw new Error("Project editor did not request its output machine");
      return result;
    },
    inspect: () => ({ ...call("__codeEditorInspect", {}), machine: { machineId } }),
    focus() {
      root.querySelector(".cm-content")?.focus();
    },
    destroy() {
      machine.destroy();
      root.replaceChildren();
    }
  });
}

// ../hub/src/url-pattern.js
var HOST_LABEL = /^(?:\*|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/i;
function wildcardSource(value, { dotAware = false } = {}) {
  return value.split("*").map((part) => part.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")).join(dotAware ? "[^.]+" : ".*");
}
function compileAllowedUrlPattern(input) {
  const source = String(input || "").trim();
  if (!source) throw new Error("URL pattern cannot be empty");
  if (source.startsWith("`") || source.endsWith("`")) {
    if (!(source.length > 2 && source.startsWith("`") && source.endsWith("`"))) throw new Error("Exact URLs need matching backquotes");
    const exact = source.slice(1, -1);
    const parsed = new URL(exact);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Exact URLs must use HTTP or HTTPS");
    return (value) => String(value) === exact;
  }
  if (source.startsWith("/")) {
    const lastSlash = source.lastIndexOf("/");
    if (lastSlash === 0) throw new Error("Regular expressions need a closing slash");
    const expression2 = new RegExp(source.slice(1, lastSlash), source.slice(lastSlash + 1));
    return (value) => {
      expression2.lastIndex = 0;
      return expression2.test(String(value));
    };
  }
  const slash = source.indexOf("/");
  const hostname = (slash < 0 ? source : source.slice(0, slash)).toLowerCase();
  const path = slash < 0 ? "/*" : source.slice(slash);
  if (!hostname.includes(".") || hostname.split(".").some((label) => !HOST_LABEL.test(label))) throw new Error("Use a hostname such as *.wikipedia.org");
  if (!path.startsWith("/")) throw new Error("A hostname path must start with /");
  const hostnamePattern = wildcardSource(hostname, { dotAware: true });
  const pathPattern = wildcardSource(path);
  const expression = new RegExp(`^${hostnamePattern}$`, "i");
  const pathname = new RegExp(`^${pathPattern}$`);
  return (value) => {
    try {
      const url = new URL(String(value));
      return (url.protocol === "https:" || url.protocol === "http:") && expression.test(url.hostname) && pathname.test(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      return false;
    }
  };
}
function urlMatchesAllowedPatterns(url, patterns) {
  const value = String(url || "");
  if (value.length <= 2048 && /^#[^\u0000-\u001f\u007f]*$/.test(value)) return true;
  return (patterns || []).some((pattern) => compileAllowedUrlPattern(pattern)(url));
}

// resources-machine-devices.js
var encoder3 = new TextEncoder();
var allowedMethods = /* @__PURE__ */ new Set(["GET", "POST", "DELETE"]);
var responseHeaders = /* @__PURE__ */ new Set(["content-type", "content-length", "etag", "last-modified"]);
var ResourcesStorageDevice = class {
  constructor(window2) {
    this.window = window2;
    this.listeners = /* @__PURE__ */ new Map();
    window2.addEventListener("storage", (event) => {
      const kind = event.storageArea === window2.localStorage ? "local" : "session";
      for (const listener of this.listeners.get(kind) || []) listener();
    });
  }
  area(kind) {
    return kind === "local" ? this.window.localStorage : this.window.sessionStorage;
  }
  get(kind, key) {
    return this.area(kind).getItem(key);
  }
  set(kind, key, value) {
    this.area(kind).setItem(key, value);
  }
  delete(kind, key) {
    this.area(kind).removeItem(key);
  }
  listen(kind, _key, listener) {
    if (!this.listeners.has(kind)) this.listeners.set(kind, /* @__PURE__ */ new Set());
    this.listeners.get(kind).add(listener);
  }
};
var ResourcesFetchDevice = class {
  constructor(window2) {
    this.window = window2;
  }
  async request(payload) {
    const url = new URL(payload.url, this.window.location.href);
    if (url.origin !== this.window.location.origin) throw new Error("Frontend fetch is restricted to this origin");
    const method = String(payload.method || "GET").toUpperCase();
    if (!allowedMethods.has(method)) throw new Error(`Frontend fetch method ${method} is not allowed`);
    const headers = new Headers(payload.headers || {});
    if ([...headers].length > 32) throw new Error("Frontend fetch has too many headers");
    const body = payload.body == null ? void 0 : String(payload.body);
    if (body && encoder3.encode(body).byteLength > 2 * 1024 * 1024) throw new Error("Frontend fetch body is too large");
    const response = await this.window.fetch(url, {
      method,
      headers,
      body,
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store"
    });
    const text = await response.text();
    if (encoder3.encode(text).byteLength > 2 * 1024 * 1024) throw new Error("Frontend fetch response is too large");
    return {
      status: response.status,
      url: response.url,
      headers: [...response.headers].filter(([name]) => responseHeaders.has(name.toLowerCase())),
      body: text
    };
  }
};
var ResourcesEditorDevice = class {
  constructor(document2, deliver) {
    this.document = document2;
    this.deliver = deliver;
    this.editor = null;
  }
  async mount() {
    this.editor?.destroy();
    const root = this.document.querySelector("[data-project-editor-mount]");
    if (!root) throw new Error("Project editor mount is unavailable");
    this.editor = await createProjectEditorMachine({
      root,
      onChange: (content, details) => this.deliver({
        type: "editor-change",
        content,
        syntaxErrors: details.syntaxErrors
      }),
      onReady: (value) => this.deliver({ type: "editor-ready", value }),
      onLimit: (value) => this.deliver({ type: "editor-limit", value })
    });
    return this.editor.inspect();
  }
  call(name, payload) {
    if (!this.editor) throw new Error(`Project editor is not mounted: ${name}`);
    if (name === "editor.setContent") return this.editor.setContent(payload.content, payload.language, payload);
    if (name === "editor.command") return this.editor.command(payload);
    if (name === "editor.inspect") return this.editor.inspect();
    if (name === "editor.focus") return this.editor.focus();
    if (name === "editor.history.initialize") return this.editor.callGuest("__resourcesProjectHistoryInitialize", payload);
    if (name === "editor.history.setCurrent") return this.editor.callGuest("__resourcesProjectHistorySetCurrent", payload);
    if (name === "editor.history.checkpoint") return this.editor.callGuest("__resourcesProjectHistoryCheckpoint", payload);
    if (name === "editor.history.inspect") return this.editor.callGuest("__resourcesProjectHistoryInspect", {});
    if (name === "editor.status.begin") return this.editor.callGuest("__resourcesProjectStatusBegin", payload);
    if (name === "editor.status.report") return this.editor.callGuest("__resourcesProjectStatusReport", payload);
    if (name === "editor.status.inspect") return this.editor.callGuest("__resourcesProjectStatusInspect", {});
    if (name === "editor.output.request") return this.editor.requestOutput(payload.generation);
    if (name === "editor.theme") return this.editor.callGuest("__codeEditorSetTheme", payload);
    if (name === "editor.destroy") {
      this.destroy();
      return null;
    }
    throw new Error(`Unknown editor operation: ${name}`);
  }
  destroy() {
    this.editor?.destroy();
    this.editor = null;
  }
};
var ResourcesOutputDevice = class {
  constructor(document2, deliver) {
    this.document = document2;
    this.deliver = deliver;
    this.outputs = /* @__PURE__ */ new Map();
    this.nextId = 1;
  }
  async mount(payload) {
    if (typeof payload.rootKey !== "string" || !/^[1-9][0-9]{0,9}$/.test(payload.rootKey))
      throw new Error("Project output mount identity is invalid");
    const root = [...this.document.querySelectorAll("[data-project-output-mount]")].find((element) => element.dataset.projectOutputMount === payload.rootKey);
    if (!root) throw new Error("Project output mount is unavailable");
    const id = this.nextId++;
    const files = Array.isArray(payload.files) ? payload.files : [];
    const output = await createProjectOutputMachine({
      root,
      scripts: Array.isArray(payload.scripts) ? payload.scripts : [],
      options: {
        frameInterval: () => this.document.activeElement?.closest(".cm-editor") ? 1e3 : 50,
        fetchResource: createProjectFetch(
          files,
          Array.isArray(payload.allowedFetchOrigins) ? payload.allowedFetchOrigins : []
        ),
        resolveImage: createProjectImageResolver(files),
        allowNavigate: (url) => urlMatchesAllowedPatterns(
          url,
          Array.isArray(payload.allowedLinkPatterns) ? payload.allowedLinkPatterns : []
        ),
        environment: payload.environment || {},
        services: {
          route: { get: () => location.hash.slice(1) || "/", search: () => "", listen() {
          } },
          storage: { get: () => null, set() {
          }, delete() {
          }, listen() {
          } }
        }
      },
      onError: (error) => this.deliver({
        type: "output-error",
        id,
        message: error?.message || String(error)
      })
    });
    this.outputs.set(id, output);
    return id;
  }
  async run(payload) {
    const output = this.require(payload.id);
    await output.run(Array.isArray(payload.scripts) ? payload.scripts : []);
    return null;
  }
  async load(payload) {
    const output = this.require(payload.id);
    const project = payload.project || {};
    this.validateTree(project.tree);
    await output.load({
      tree: project.tree,
      stylesheets: Array.isArray(project.stylesheets) ? project.stylesheets : [],
      scripts: Array.isArray(project.scripts) ? project.scripts : []
    });
    return null;
  }
  call(name, payload) {
    const output = this.require(payload.id);
    if (name === "output.inspect") return output.inspect();
    if (name === "output.setContent") {
      this.validateTree(payload.tree);
      return output.setContent(payload.tree);
    }
    if (name === "output.destroy") {
      output.destroy();
      this.outputs.delete(payload.id);
      return null;
    }
    throw new Error(`Unknown output operation: ${name}`);
  }
  require(id) {
    const output = this.outputs.get(id);
    if (!output) throw new Error("Project output machine is unavailable");
    return output;
  }
  validateTree(tree) {
    if (!Array.isArray(tree)) throw new Error("Project output tree is invalid");
    let count = 0;
    const validate = (node, path) => {
      if (!Array.isArray(node) || node[0] !== 0 && node[0] !== 1)
        throw new Error(`Project output node is invalid at ${path}`);
      if (++count > 5e4) throw new Error("Project output has too many nodes");
      if (node[0] === 0) return;
      if (typeof node[1] !== "string" || !node[1])
        throw new Error(`Project output element name is missing at ${path}`);
      if (!Array.isArray(node[4])) throw new Error(`Project output children are invalid at ${path}`);
      node[4].forEach((child, index) => validate(child, `${path}.${index}`));
    };
    tree.forEach((node, index) => validate(node, String(index)));
  }
  destroy() {
    for (const output of this.outputs.values()) output.destroy();
    this.outputs.clear();
  }
};

// resources-machine-controller.js
var encoder4 = new TextEncoder();
var nextMachine2 = 1;
function callMessage2(name, payload) {
  const fn = encoder4.encode(name);
  const argument = encoder4.encode(JSON.stringify(payload));
  const message = new Uint8Array(2 + fn.length + argument.length);
  message[0] = 2;
  message.set(fn, 1);
  message.set(argument, fn.length + 2);
  return message;
}
async function loadModule(url) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Machine response ${response.status}: ${url}`);
  return WebAssembly.compileStreaming(response);
}
async function startResourcesMachineController() {
  const module = await loadModule("/-/resources-site/resources-frontend-microquickjs.wasm");
  const sections = WebAssembly.Module.customSections(module, "wasm-web-machine");
  let machine;
  async function deliver(message) {
    await machine.onmsg(callMessage2("__resourcesFrontendReceive", message));
  }
  const fetchDevice = new ResourcesFetchDevice(window);
  const editorDevice = new ResourcesEditorDevice(document, deliver);
  const outputDevice = new ResourcesOutputDevice(document, deliver);
  const storageDevice = new ResourcesStorageDevice(window);
  async function receive(text) {
    if (text.startsWith("__wwcError:")) {
      document.documentElement.dataset.resourcesFrontendMachineState = "failed";
      console.error("Resources frontend machine:", text.slice(11));
      return;
    }
    let request;
    try {
      request = JSON.parse(text);
    } catch {
      return;
    }
    if (request.protocol !== "resources-frontend-v1" || !Number.isSafeInteger(request.id)) return;
    try {
      let value;
      if (request.name === "fetch") value = await fetchDevice.request(request.payload || {});
      else if (request.name === "editor.mount") value = await editorDevice.mount();
      else if (request.name === "output.mount") value = await outputDevice.mount(request.payload || {});
      else if (request.name === "output.run") value = await outputDevice.run(request.payload || {});
      else if (request.name === "output.load") value = await outputDevice.load(request.payload || {});
      else throw new Error(`Unknown asynchronous service: ${request.name}`);
      await deliver({ id: request.id, value });
    } catch (error) {
      console.error("Resources controller service:", request.name, error);
      await deliver({ id: request.id, error: error?.message || String(error) });
    }
  }
  machine = new WasmWebMachine(module, document, {
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : void 0,
    services: {
      call(name, payloadText) {
        console.debug("Resources controller call:", name);
        const payload = payloadText ? JSON.parse(payloadText) : {};
        let value;
        if (name.startsWith("editor.")) value = editorDevice.call(name, payload);
        else if (name.startsWith("output.")) value = outputDevice.call(name, payload);
        else throw new Error(`Unknown synchronous frontend service: ${name}`);
        if (name === "editor.inspect") console.debug("Resources editor inspection:", JSON.stringify(value));
        return JSON.stringify(value === void 0 ? null : value);
      },
      route: { get: () => location.pathname, search: () => location.search, listen() {
      } },
      storage: storageDevice
    },
    onMessage: receive
  });
  const machineId = `resources-frontend-${nextMachine2++}`;
  document.documentElement.dataset.resourcesFrontendMachine = "microquickjs";
  document.documentElement.dataset.resourcesFrontendMachineId = machineId;
  document.documentElement.dataset.resourcesFrontendMachineState = "starting";
  await machine.onmsg(0);
  document.documentElement.dataset.resourcesFrontendMachineState = "ready";
  return Object.freeze({ machineId, destroy() {
    editorDevice.destroy();
    outputDevice.destroy();
    machine.destroy();
  } });
}
startResourcesMachineController().catch((error) => {
  document.documentElement.dataset.resourcesFrontendMachineState = "failed";
  console.error("Resources Machine Controller:", error);
});
export {
  startResourcesMachineController
};
