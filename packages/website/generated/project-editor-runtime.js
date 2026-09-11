// dev/wasm-web-machine/dist/module/wasm-web-machine.js
var localPseudos = /* @__PURE__ */ new Set([
  "scope",
  "root",
  "hover",
  "active",
  "focus",
  "focus-visible",
  "focus-within",
  "checked",
  "disabled",
  "enabled",
  "empty",
  "indeterminate",
  "placeholder-shown",
  "read-only",
  "read-write",
  "required",
  "optional",
  "valid",
  "invalid"
]);
var positionalPseudos = /* @__PURE__ */ new Set([
  "first-child",
  "last-child",
  "only-child",
  "first-of-type",
  "last-of-type",
  "only-of-type"
]);
var pseudoElements = /* @__PURE__ */ new Set(["before", "after", "selection", "placeholder", "marker", "backdrop"]);
var joins = /* @__PURE__ */ new Set(["", " ", ">", "+", "~"]);
function readSelector(reader) {
  let remaining = 1536;
  const fail2 = () => {
    throw new Error("selector wire data is not representable");
  };
  function count() {
    const size = reader.uint();
    if (!Number.isInteger(size) || size < 1 || size > 512 || (remaining -= size) < 0) fail2();
    return size;
  }
  function choose(choices) {
    const value = choices[reader.byte()];
    if (value === void 0) fail2();
    return value;
  }
  function signed() {
    const value = reader.uint();
    if (!Number.isInteger(value) || value < 0 || value > 4294967294) fail2();
    return value % 2 ? -(value + 1) / 2 : value / 2;
  }
  function group(depth) {
    if (depth > 8) fail2();
    return Array.from({ length: count() }, () => Array.from({ length: count() }, () => {
      const join = choose(["", " ", ">", "+", "~"]);
      const terms = Array.from({ length: count() }, () => {
        const kind = choose(["tag", "id", "class", "pseudo", "element", "attribute", "is", "where", "not", "has", "nth"]);
        if (kind === "attribute") return [kind, reader.text(), choose(["", "=", "~=", "|=", "^=", "$=", "*="]), reader.text()];
        if (kind === "nth") return [kind, choose(["nth-child", "nth-last-child", "nth-of-type", "nth-last-of-type"]), signed(), signed()];
        if (kind === "is" || kind === "where" || kind === "not" || kind === "has") return [kind, group(depth + 1)];
        return [kind, reader.text()];
      });
      return [join, terms];
    }));
  }
  if (reader.uint() !== 1) fail2();
  return group(0);
}
function renderSelector(list, scopeClass, logicalRoot = false) {
  let remaining = 512;
  const fail2 = () => {
    throw new Error("selector data is not representable");
  };
  function identifier(value) {
    if (typeof value !== "string" || !value || value.length > 256) fail2();
    return CSS.escape(value);
  }
  const scope = scopeClass === null ? "" : "." + identifier(scopeClass);
  const guard = scope ? `:where(${scope}, ${scope} *)` : "";
  function position(native, rootMatches) {
    if (!scope) return native;
    return rootMatches ? `:is(${scope}, :where(:not(${scope}))${native})` : `:where(:not(${scope}))${native}`;
  }
  function group(selectors, relative, depth) {
    if (depth > 8 || !Array.isArray(selectors) || !selectors.length) fail2();
    return selectors.map((parts) => {
      if (!Array.isArray(parts) || !parts.length) fail2();
      return parts.map(([join, terms], index) => {
        if (!joins.has(join) || index === 0 && !relative && join !== "" || index > 0 && join === "" || !Array.isArray(terms) || !terms.length) fail2();
        let element = "";
        const compound = terms.map((term, termIndex) => {
          if (--remaining < 0 || !Array.isArray(term) || element) fail2();
          const kind = term[0];
          if (kind === "tag" || kind === "id" || kind === "class") {
            if (term.length !== 2) fail2();
            if (kind === "tag") {
              if (termIndex !== 0) fail2();
              if (scope && logicalRoot && /^(html|body)$/i.test(term[1])) return `:where(${scope}):is(${term[1]}, *)`;
              return term[1] === "*" ? "*" : identifier(term[1]);
            }
            return (kind === "id" ? "#" : ".") + identifier(term[1]);
          }
          if (kind === "attribute") {
            const [, name, operator, value] = term;
            if (term.length !== 4 || !["", "=", "~=", "|=", "^=", "$=", "*="].includes(operator) || typeof value !== "string" || value.length > 512 || /[\x00-\x1f\x7f]/.test(value)) fail2();
            const quoted = '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
            return `[${identifier(name)}${operator ? operator + quoted : ""}]`;
          }
          if (kind === "pseudo") {
            if (term.length !== 2) fail2();
            if (positionalPseudos.has(term[1])) return position(":" + term[1], true);
            if (!localPseudos.has(term[1])) fail2();
            if (scope && logicalRoot && (term[1] === "root" || term[1] === "scope")) return scope;
            return ":" + term[1];
          }
          if (kind === "element") {
            if (depth !== 0 || term.length !== 2 || !pseudoElements.has(term[1])) fail2();
            element = "::" + term[1];
            return "";
          }
          if (kind === "nth") {
            const [, name, a, b] = term;
            if (term.length !== 4 || !/^nth-(?:last-)?(?:child|of-type)$/.test(name) || !Number.isSafeInteger(a) || !Number.isSafeInteger(b) || Math.abs(a) > 2147483647 || Math.abs(b) > 2147483647) fail2();
            const n = (1 - b) / a;
            return position(
              `:${name}(${a}n${b < 0 ? "" : "+"}${b})`,
              a === 0 ? b === 1 : Number.isInteger(n) && n >= 0
            );
          }
          if (kind === "is" || kind === "where" || kind === "not" || kind === "has") {
            if (term.length !== 2) fail2();
            if (scope && kind === "has") {
              if (!Array.isArray(term[1]) || !term[1].length) fail2();
              return ":is(" + term[1].map((parts2) => {
                const child = group([parts2], true, depth + 1);
                const sibling2 = ["+", "~"].includes(parts2[0][0]);
                return (sibling2 ? `:where(:not(${scope}))` : "") + `:has(${child})`;
              }).join(", ") + ")";
            }
            return `:${kind}(${group(term[1], kind === "has", depth + 1)})`;
          }
          return fail2();
        }).join("");
        if (element && index !== parts.length - 1) fail2();
        const sibling = scope && index + 1 < parts.length && ["+", "~"].includes(parts[index + 1][0]);
        return join + (compound || "*") + guard + (sibling ? `:where(:not(${scope}))` : "") + element;
      }).join("");
    }).join(", ");
  }
  return group(list, false, 0);
}
var CSS_PROPERTIES = /* @__PURE__ */ new Set([
  "-webkit-user-modify",
  "-webkit-user-select",
  "align-content",
  "align-items",
  "align-self",
  "animation",
  "animation-duration",
  "animation-name",
  "aspect-ratio",
  "backdrop-filter",
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
  "border-style",
  "border-top-width",
  "box-shadow",
  "box-sizing",
  "caret-color",
  "color",
  "column-gap",
  "color-scheme",
  "contain",
  "container-type",
  "content",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "fill",
  "filter",
  "flex",
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
  "grid-column",
  "grid-row",
  "grid-template-columns",
  "grid-template-rows",
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
  "mask-image",
  "min-height",
  "min-width",
  "mix-blend-mode",
  "object-fit",
  "opacity",
  "order",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow-anchor",
  "overflow-x",
  "overflow-y",
  "overscroll-behavior",
  "padding-block",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "pointer-events",
  "position",
  "resize",
  "right",
  "row-gap",
  "scrollbar-color",
  "stroke",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-width",
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
  "text-wrap",
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
  "attr",
  "blur",
  "brightness",
  "calc",
  "clamp",
  "color-mix",
  "contrast",
  "counter",
  "cubic-bezier",
  "drop-shadow",
  "linear-gradient",
  "max",
  "min",
  "minmax",
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
    readSelector: readSelector2,
    renderSelector: renderSelector2,
    renderSvg
  } = dependencies;
  const keyframeNames = /* @__PURE__ */ new Map();
  const originalKeyframeNames = /* @__PURE__ */ new Map();
  function readStyleProperty(style, property) {
    const value = style.getPropertyValue(property);
    return property === "animation" || property === "animation-name" ? value.replace(/[-_a-z][-_a-z0-9]*/gi, (name) => originalKeyframeNames.get(name) || name) : value;
  }
  function installStylesheet(bytes, targetStyle = null, replace = false) {
    if (!(bytes instanceof Uint8Array) || bytes.length > 128 * 1024) {
      fail2("stylesheet operation must contain bounded bytes");
    }
    const reader = new Reader(bytes);
    if (reader.uint() !== 5) fail2("stylesheet operation version is not supported");
    const itemCount = reader.uint();
    if (itemCount > 2048) fail2("stylesheet has too many items");
    if (targetStyle && itemCount !== 1) fail2("inline style must contain one rule");
    const probe = new CSSStyleSheet();
    const output = [];
    let lastDeclaration = null;
    function readDeclarations(declarationCount, ruleIndex) {
      if (declarationCount > 128) fail2("stylesheet rule has too many declarations");
      let index;
      try {
        index = probe.insertRule(":root{}", probe.cssRules.length);
      } catch {
        fail2(`stylesheet declarations in rule ${ruleIndex + 1} could not be checked`);
      }
      const declaration = probe.cssRules[index].style;
      lastDeclaration = declaration;
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
            if (kind === 11) {
              const length = reader.uint();
              if (length > reader.bytes.length - reader.at) fail2("truncated SVG image");
              const image = reader.bytes.subarray(reader.at, reader.at + length);
              reader.at += length;
              return `url("${renderSvg(image)}")`;
            }
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
            value += (property === "animation" || property === "animation-name") && keyframeNames.has(identifier) ? keyframeNames.get(identifier) : identifier;
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
        if (!declaration.getPropertyValue(property)) continue;
        declarations.push(`  ${property}: ${value}${important ? " !important" : ""};`);
      }
      return declarations;
    }
    function readItems(itemCount2, output2) {
      for (let ruleIndex = 0; ruleIndex < itemCount2; ruleIndex++) {
        const itemKind = reader.byte();
        if (itemKind === 0) {
          if (targetStyle) fail2("inline style cannot contain a top-level comment");
          const comment = reader.text();
          if (comment.length > 4096 || comment.includes("*/")) {
            fail2("stylesheet comment is not representable");
          }
          output2.push(`/*${comment}*/`);
          continue;
        }
        if (itemKind === 3) {
          if (targetStyle) fail2("inline style cannot contain a media rule");
          const condition = reader.text();
          const preference = /^\(prefers-(?:reduced-motion: (?:reduce|no-preference)|color-scheme: (?:dark|light))\)$/;
          const dimension = /^\((?:min|max)-(?:width|height): \d+(?:\.\d+)?(?:px|rem|em)\)$/;
          const aspect = /^\((?:min|max)-aspect-ratio: \d+ \/ \d+\)$/;
          if (!condition.split(/(?: and |, )/).every((part) => preference.test(part) || dimension.test(part) || aspect.test(part))) {
            fail2(`stylesheet media condition is not representable: ${condition}`);
          }
          const nestedCount = reader.uint();
          if (nestedCount > 2048) fail2("stylesheet media rule has too many items");
          const nested = [];
          readItems(nestedCount, nested);
          output2.push(`@media ${condition} {
${nested.join("\n\n")}
}`);
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
        if (itemKind === 4) {
          if (targetStyle) fail2("inline style cannot contain keyframes");
          const name = reader.text();
          if (!/^[a-z_][a-z0-9_-]*$/i.test(name)) fail2("keyframe name is not representable");
          const scopedName = scopeClass ? `${scopeClass.slice(1)}--${name}` : name;
          keyframeNames.set(name, scopedName);
          originalKeyframeNames.set(scopedName, name);
          const frameCount = reader.uint();
          if (frameCount > 256) fail2("keyframes rule has too many frames");
          const frames = [];
          for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
            const frameSelector = reader.text();
            if (!frameSelector.split(/\s*,\s*/).every((part) => part === "from" || part === "to" || /^(?:100|\d{1,2})(?:\.\d+)?%$/.test(part))) {
              fail2("keyframe selector is not representable");
            }
            const declarations2 = readDeclarations(reader.uint(), ruleIndex);
            frames.push(`  ${frameSelector} {
${declarations2.map((line) => `  ${line}`).join("\n")}
  }`);
          }
          output2.push(`@keyframes ${scopedName} {
${frames.join("\n")}
}`);
          continue;
        }
        if (itemKind !== 1) fail2("stylesheet item is not representable");
        const selector = readSelector2(reader);
        const declarationCount = reader.uint();
        const renderedSelector = renderSelector2(selector, scopeClass, true);
        let index;
        try {
          index = probe.insertRule(`${renderedSelector}{}`, probe.cssRules.length);
        } catch {
          fail2(`stylesheet selector in rule ${ruleIndex + 1} was not accepted`);
        }
        const declarations = readDeclarations(declarationCount, ruleIndex);
        output2.push(`${renderedSelector.trim()} {
${declarations.join("\n")}
}`);
      }
    }
    readItems(itemCount, output);
    if (reader.at !== reader.bytes.length) fail2("trailing stylesheet operation data");
    if (targetStyle) {
      const declaration = lastDeclaration;
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
  return { installStylesheet, readStyleProperty };
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
  "details",
  "dialog",
  "div",
  "em",
  "fieldset",
  "figcaption",
  "figure",
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
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "meta",
  "nav",
  "ol",
  "option",
  "output",
  "p",
  "section",
  "small",
  "span",
  "strong",
  "summary",
  "template",
  "textarea",
  "title",
  "ul"
]);
var CONTENT_ELEMENTS = /* @__PURE__ */ new Set([...ELEMENTS, "html", "head", "body", "select", "optgroup"]);
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
  "disabled",
  "draggable",
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
  "method",
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
  "rel",
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
function fail(message2) {
  throw new Error(`wasm-web-machine: ${message2}`);
}
function isAllowedAttribute(name) {
  return ATTRIBUTES.has(name) || /^(?:aria|data)-[a-z][a-z0-9-]{0,63}$/.test(name);
}
function isRemovableAttribute(name) {
  return isAllowedAttribute(name) || name === "open" || name === "style";
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
      HTMLFormElement,
      HTMLImageElement,
      HTMLInputElement,
      HTMLMetaElement,
      HTMLSelectElement,
      HTMLTemplateElement,
      HTMLTextAreaElement,
      HTMLTitleElement,
      InputEvent,
      KeyboardEvent,
      MediaQueryList,
      MediaQueryListEvent,
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
    const serviceSubscriptions = /* @__PURE__ */ new Set();
    const timers = /* @__PURE__ */ new Map();
    const frames = /* @__PURE__ */ new Map();
    let nextFrame = 1;
    const cleanupCallbacks = /* @__PURE__ */ new Map();
    let nextTimer = 1;
    let nextCleanupCallback = 1;
    const ownedNodes = /* @__PURE__ */ new WeakSet();
    const graphicsObjects = /* @__PURE__ */ new WeakMap();
    const ownNode = (node) => {
      const pending = [node];
      while (pending.length) {
        const current = pending.pop();
        if (ownedNodes.has(current)) continue;
        ownedNodes.add(current);
        pending.push(...Array.from(current.childNodes));
      }
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
    const embeddedImage = (value2) => {
      const resolved = typeof options.resolveImage === "function" ? options.resolveImage(value2) : value2;
      if (typeof resolved !== "string" || resolved.length > 8 * 1024 * 1024 || !/^data:image\/(?:gif|jpeg|png|svg\+xml|webp);base64,[a-z0-9+/=]+$/i.test(resolved)) {
        fail("image source must be an embedded project image");
      }
      return resolved;
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
    function traceResult(result) {
      if (result === null || result === void 0 || typeof result === "string" || typeof result === "number" || typeof result === "boolean") return result;
      if (result instanceof Uint8Array) return { bytes: result.byteLength };
      return { type: result.constructor?.name || typeof result };
    }
    function reference(value2) {
      if (typeof value2 !== "object" && typeof value2 !== "function" || value2 === null) {
        return value2;
      }
      if (value2 instanceof Node && value2 !== hostDocument && insideDocument(value2)) ownedNodes.add(value2);
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
      if (ownedNodes.has(node)) return true;
      if (documentTarget ? hostDocument.documentElement.contains(node) : roots.some((root) => node === root || root.contains(node))) return true;
      for (let parent = node.parentNode; parent; parent = parent.parentNode) {
        if (ownedNodes.has(parent)) return true;
      }
      return false;
    }
    function accessibleNode(node) {
      return node === hostDocument ? documentTarget : insideDocument(node);
    }
    function requireNode(node) {
      if (!accessibleNode(node)) fail("node is outside the granted roots");
    }
    function querySelectorText(node, args) {
      if (args.length !== 1 || !(args[0] instanceof Uint8Array) || args[0].length > 16 * 1024) {
        fail("selector operation must contain bounded semantic bytes");
      }
      const reader = new Reader(args[0]);
      const selector = readSelector(reader);
      if (reader.at !== reader.bytes.length) fail("trailing selector operation data");
      const tree = node.getRootNode();
      const detachedGrant = tree !== hostDocument && accessibleNode(tree);
      return renderSelector(selector, detachedGrant ? null : scopeClass);
    }
    function requireRange(range) {
      requireNode(range.startContainer);
      requireNode(range.endContainer);
      requireNode(range.commonAncestorContainer);
    }
    function contentElement(element) {
      if (element.namespaceURI === "http://www.w3.org/2000/svg") {
        return SVG_ELEMENTS.has(element.localName);
      }
      if (element.namespaceURI !== "http://www.w3.org/1999/xhtml") return false;
      return CONTENT_ELEMENTS.has(element.localName) || /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(element.localName) && !customElements.get(element.localName);
    }
    function requireContentTarget(node) {
      for (let element = node instanceof Element ? node : node.parentElement; element; element = element.parentElement) {
        if (!contentElement(element)) fail(`content mutation of ${element.localName} is not allowed`);
        if (roots.includes(element)) break;
      }
    }
    function requireContentTree(node) {
      const pending = [node];
      function check(element) {
        if (!contentElement(element)) {
          fail(`inserting or cloning ${element.localName} is not allowed`);
        }
        if (element instanceof HTMLTemplateElement) pending.push(element.content);
      }
      while (pending.length) {
        const root = pending.pop();
        if (root instanceof Element) check(root);
        if (!root.hasChildNodes()) continue;
        const walker = hostDocument.createTreeWalker(
          root,
          1
          /* SHOW_ELEMENT */
        );
        for (let child = walker.nextNode(); child; child = walker.nextNode()) check(child);
      }
    }
    const guardSubmit = (event) => {
      const form = event.target;
      const submitter = event.submitter;
      if (form instanceof HTMLFormElement && (insideDocument(form) || submitter instanceof Node && insideDocument(submitter))) {
        const method = submitter?.getAttribute("formmethod")?.toLowerCase() ?? form.method;
        const action = submitter?.getAttribute("formaction") ?? form.action;
        let sameOrigin = false;
        if (options.allowNavigate === "self") {
          try {
            sameOrigin = new URL(action, hostDocument.baseURI).origin === realm.location.origin;
          } catch {
          }
        }
        if (method !== "dialog" && !sameOrigin) event.preventDefault();
      }
    };
    if (!messagesOnly) realm.addEventListener("submit", guardSubmit);
    function get(object, name) {
      if (object instanceof Node && object !== hostDocument && name !== "nodeType" && name !== "nodeName" && name !== "parentNode" && name !== "parentElement") requireNode(object);
      if ((object instanceof MediaQueryList || object instanceof MediaQueryListEvent) && (name === "matches" || name === "media")) return object[name];
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
      if (object instanceof Node && ["parentNode", "parentElement", "nextSibling", "previousSibling"].includes(name)) {
        const node = object[name];
        return node && insideDocument(node) ? reference(node) : null;
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
        if (name === "target") return reference(ownNode(node));
        return node && insideDocument(node) ? reference(node) : null;
      }
      if (object instanceof MutationRecord && ["addedNodeCount", "removedNodeCount"].includes(name)) {
        return object[name === "addedNodeCount" ? "addedNodes" : "removedNodes"].length;
      }
      if (object instanceof Text && (name === "nodeValue" || name === "textContent")) {
        return object[name];
      }
      if (object instanceof Element && name === "textContent" && (ownedNodes.has(object) || insideDocument(object))) return object.textContent;
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
      if (object instanceof HTMLTemplateElement && name === "content") {
        return reference(ownNode(object.content));
      }
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
      const graphics = object && graphicsObjects.get(object);
      if (graphics?.api === "webgl" && /^[A-Z][A-Z0-9_]*$/.test(name) && Number.isInteger(object[name])) return object[name];
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
      if (object instanceof PointerEvent && name === "pointerId") return object.pointerId;
      if (object instanceof Event && name === "target") {
        return object.target instanceof Node ? reference(object.target) : null;
      }
      if (object instanceof MouseEvent && name === "relatedTarget") {
        return object.relatedTarget instanceof Node && insideDocument(object.relatedTarget) ? reference(object.relatedTarget) : null;
      }
      fail(`property get ${name} is not allowed on ${object?.constructor?.name || typeof object}`);
    }
    function setAttribute(object, args) {
      requireContentTarget(object);
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
      if (args[0] === "method" && (!(object instanceof HTMLFormElement) || args[1] !== "dialog")) {
        fail("only the non-network dialog form method is allowed");
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
      if (args[0] === "rel" && (!(object instanceof HTMLAnchorElement) || args[1] !== "noopener noreferrer")) {
        fail("rel is only allowed as noopener noreferrer on links");
      }
      if (args[0] === "tabindex" && !["-1", "0"].includes(args[1])) {
        fail("tabindex must use normal or programmatic focus order");
      }
      if (args[0] === "value" && (!(object instanceof HTMLInputElement || object instanceof HTMLButtonElement || object instanceof HTMLLIElement || object.tagName === "OPTION") || args[1].length > 2048)) {
        fail("value attribute is not allowed on this element");
      }
      if (args[0] === "value" && object instanceof HTMLLIElement && (!/^-?\d{1,10}$/.test(args[1]) || Number(args[1]) < -2147483648 || Number(args[1]) > 2147483647)) {
        fail("list value must be a signed 32-bit integer");
      }
      if (args[0] === "placeholder" && (!(object instanceof HTMLInputElement || object instanceof HTMLTextAreaElement) || args[1].length > 512)) {
        fail("placeholder is not allowed on this element");
      }
      if (["contenteditable", "spellcheck", "writingsuggestions"].includes(args[0]) && !["true", "false"].includes(args[1])) {
        fail(`${args[0]} value is not allowed`);
      }
      if (args[0] === "draggable" && !["true", "false"].includes(args[1])) {
        fail("draggable value is not allowed");
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
    function set(object, name, next) {
      if (object instanceof Node) {
        requireNode(object);
        requireContentTarget(object);
      }
      if (object instanceof HTMLElement && name === "innerHTML" && typeof next === "string" && next.length <= 256 * 1024) {
        const template = hostDocument.createElement("template");
        template.innerHTML = next;
        const elements = Array.from(template.content.querySelectorAll("*"));
        for (const element of elements) {
          if (element instanceof HTMLTemplateElement) {
            elements.push(...Array.from(element.content.querySelectorAll("*")));
          }
          const svg = element instanceof SVGElement;
          if (!(svg ? SVG_ELEMENTS : ELEMENTS).has(element.localName)) {
            fail(`innerHTML element ${element.localName} is not allowed`);
          }
          for (const attribute of Array.from(element.attributes)) {
            if (attribute.name === "style" && /^--[a-z][a-z0-9-]{0,63}:\s*(?:#[0-9a-f]{3,8}|-?(?:\d+(?:\.\d*)?|\.\d+)%)$/i.test(attribute.value)) continue;
            if (attribute.name === "xmlns" && svg && attribute.value === "http://www.w3.org/2000/svg") continue;
            if (!svg && attribute.name === "src") {
              if (!(element instanceof HTMLImageElement)) fail("innerHTML src is not allowed on this element");
              element.setAttribute("src", embeddedImage(attribute.value));
              continue;
            }
            setAttribute(element, [attribute.name, attribute.value]);
          }
        }
        (object instanceof HTMLTemplateElement ? object.content : object).replaceChildren(template.content);
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
        object.src = embeddedImage(next);
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
    function scheduleTimeout(callback, delay) {
      const id = nextTimer++;
      const handle = realm.setTimeout(() => {
        timers.delete(id);
        deliver(callback);
      }, delay);
      timers.set(id, handle);
      return id;
    }
    function cancelFrame(id) {
      const frame = frames.get(id);
      if (!frame) return;
      if (frame.timeout) realm.clearTimeout(frame.handle);
      else realm.cancelAnimationFrame(frame.handle);
      frames.delete(id);
    }
    function call(object, name, args) {
      if (object instanceof Node && object !== hostDocument && name !== "contains" && name !== "closest") requireNode(object);
      if (object instanceof Element && ["setPointerCapture", "releasePointerCapture", "hasPointerCapture"].includes(name)) {
        if (args.length !== 1 || !Number.isInteger(args[0])) fail("pointer ID must be an integer");
        return object[name](args[0]) ?? null;
      }
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
      if (object instanceof HTMLCanvasElement && name === "getContext" && (args.length === 1 || args.length === 2) && ["2d", "webgl", "webgpu"].includes(args[0])) {
        if (args[0] === "webgpu") {
          if (args.length !== 1) fail("WebGPU context attributes are not allowed");
          const context2 = object.getContext("webgpu");
          if (context2) graphicsObjects.set(context2, { api: "webgpu", context: context2, canvas: object });
          return context2 ? reference(context2) : null;
        }
        if (args[0] === "webgl") {
          const attributes = args.length === 2 && typeof args[1] === "boolean" ? { preserveDrawingBuffer: args[1] } : void 0;
          if (args.length === 2 && !attributes) fail("WebGL context attributes are not allowed");
          const context2 = object.getContext("webgl", attributes);
          if (context2) graphicsObjects.set(context2, { api: "webgl", context: context2 });
          return context2 ? reference(context2) : null;
        }
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
      const graphics = object && graphicsObjects.get(object);
      if (graphics?.api === "webgl") {
        const gl = graphics.context;
        const make = { createBuffer: 0, createProgram: 0 }[name];
        if (make === 0 && args.length === 0) {
          const result = gl[name]();
          if (result) graphicsObjects.set(result, graphics);
          return result ? reference(result) : null;
        }
        if (name === "createShader" && args.length === 1 && Number.isInteger(args[0])) {
          const result = gl.createShader(args[0]);
          if (result) graphicsObjects.set(result, graphics);
          return result ? reference(result) : null;
        }
        if (name === "shaderSource" && args.length === 2 && graphicsObjects.get(args[0]) === graphics && typeof args[1] === "string" && args[1].length <= 64 * 1024) {
          gl.shaderSource(args[0], args[1]);
          return null;
        }
        if (name === "compileShader" && args.length === 1 && graphicsObjects.get(args[0]) === graphics) {
          gl.compileShader(args[0]);
          return null;
        }
        if (name === "attachShader" && args.length === 2 && graphicsObjects.get(args[0]) === graphics && graphicsObjects.get(args[1]) === graphics) {
          gl.attachShader(args[0], args[1]);
          return null;
        }
        if (name === "linkProgram" && args.length === 1 && graphicsObjects.get(args[0]) === graphics) {
          gl.linkProgram(args[0]);
          return null;
        }
        if (name === "useProgram" && args.length === 1 && (args[0] === null || graphicsObjects.get(args[0]) === graphics)) {
          gl.useProgram(args[0]);
          return null;
        }
        if (name === "bindBuffer" && args.length === 2 && Number.isInteger(args[0]) && (args[1] === null || graphicsObjects.get(args[1]) === graphics)) {
          gl.bindBuffer(args[0], args[1]);
          return null;
        }
        if (name === "getShaderParameter" && args.length === 2 && graphicsObjects.get(args[0]) === graphics && Number.isInteger(args[1])) return Boolean(gl.getShaderParameter(args[0], args[1]));
        if (name === "getProgramParameter" && args.length === 2 && graphicsObjects.get(args[0]) === graphics && Number.isInteger(args[1])) return Boolean(gl.getProgramParameter(args[0], args[1]));
        if (name === "getAttribLocation" && args.length === 2 && graphicsObjects.get(args[0]) === graphics && typeof args[1] === "string" && args[1].length <= 256) return gl.getAttribLocation(args[0], args[1]);
        if (name === "bufferData" && args.length === 3 && Number.isInteger(args[0]) && args[1] instanceof Uint8Array && args[1].byteLength <= 4e6 && args[1].byteLength % 4 === 0 && Number.isInteger(args[2])) {
          const bytes = args[1].slice();
          gl.bufferData(args[0], new Float32Array(bytes.buffer), args[2]);
          return null;
        }
        if (name === "clearColor" && args.length === 4 && args.every(Number.isInteger)) {
          gl.clearColor(
            args[0] / 1e6,
            args[1] / 1e6,
            args[2] / 1e6,
            args[3] / 1e6
          );
          return null;
        }
        if (["clear", "enableVertexAttribArray"].includes(name) && args.length === 1 && Number.isInteger(args[0])) {
          gl[name](args[0]);
          return null;
        }
        if (name === "vertexAttribPointer" && args.length === 6 && args.every((value2, index) => index === 3 ? typeof value2 === "boolean" : Number.isInteger(value2))) {
          gl.vertexAttribPointer(args[0], args[1], args[2], args[3], args[4], args[5]);
          return null;
        }
        if (name === "viewport" && args.length === 4 && args.every(Number.isInteger)) {
          gl.viewport(args[0], args[1], args[2], args[3]);
          return null;
        }
        if (name === "drawArrays" && args.length === 3 && args.every(Number.isInteger)) {
          gl.drawArrays(args[0], args[1], args[2]);
          return null;
        }
      }
      if (graphics?.api === "webgpu" && name === "renderTriangle" && args.length === 0) {
        const context = graphics.context;
        const canvas = graphics.canvas;
        canvas.dataset.webgpuStatus = "loading";
        void (async () => {
          try {
            const gpu = hostNavigator.gpu;
            if (!gpu) throw new Error("WebGPU is unavailable");
            const adapter = await gpu.requestAdapter();
            if (!adapter) throw new Error("WebGPU adapter is unavailable");
            const device = await adapter.requestDevice();
            const format = gpu.getPreferredCanvasFormat();
            context.configure({ device, format, alphaMode: "opaque" });
            const module = device.createShaderModule({ code: `
            @vertex fn vertex(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
              var points = array(vec2f(-0.75, -0.65), vec2f(0.75, -0.65), vec2f(0.0, 0.75));
              return vec4f(points[index], 0.0, 1.0);
            }
            @fragment fn fragment() -> @location(0) vec4f { return vec4f(0.68, 0.47, 1.0, 1.0); }
          ` });
            const pipeline = device.createRenderPipeline({
              layout: "auto",
              vertex: { module, entryPoint: "vertex" },
              fragment: { module, entryPoint: "fragment", targets: [{ format }] },
              primitive: { topology: "triangle-list" }
            });
            const encoder22 = device.createCommandEncoder();
            const pass = encoder22.beginRenderPass({ colorAttachments: [{
              view: context.getCurrentTexture().createView(),
              clearValue: { r: 0.06, g: 0.09, b: 0.16, a: 1 },
              loadOp: "clear",
              storeOp: "store"
            }] });
            pass.setPipeline(pipeline);
            pass.draw(3);
            pass.end();
            device.queue.submit([encoder22.finish()]);
            canvas.dataset.webgpuStatus = "ready";
          } catch (error) {
            canvas.dataset.webgpuStatus = "unavailable";
            options.onDebug?.(`WebGPU: ${error?.message || error}`);
          }
        })();
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
        return readStyleProperty(object, args[0]);
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
        if (args[0] instanceof Range) requireRange(args[0]);
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
      if (object === hostDocument && name === "mediaMatches" && args.length === 1 && typeof args[0] === "string" && args[0].length <= 256) {
        return hostDocument.defaultView.matchMedia(args[0]).matches;
      }
      if (object === hostDocument && name === "matchMedia" && args.length === 1 && typeof args[0] === "string" && args[0].length <= 256) {
        return reference(hostDocument.defaultView.matchMedia(args[0]));
      }
      if (object === hostDocument && name === "mutationObserve" && args.length === 3 && args[0] instanceof Node && Number.isInteger(args[1]) && Number.isInteger(args[2])) {
        const flags = args[1];
        if (flags < 0 || flags > 31) fail("mutation observer flags are not allowed");
        const targets = args[0] === hostDocument && !documentTarget ? roots : [args[0]];
        if (targets.some((node) => !insideDocument(node) && !ownedNodes.has(node))) {
          fail("mutation observer target is outside the granted roots");
        }
        const observer = new MutationObserver((records) => deliver(args[2], records));
        const settings = {
          attributes: Boolean(flags & 1),
          attributeOldValue: Boolean(flags & 2),
          characterData: Boolean(flags & 4),
          characterDataOldValue: Boolean(flags & 8),
          childList: true,
          subtree: Boolean(flags & 16)
        };
        for (const node of targets) observer.observe(node, settings);
        mutationObservers.add(observer);
        return reference(observer);
      }
      if (object === hostDocument && name === "timer") {
        if (!Number.isInteger(args[0]) || args[0] < 0 || args[0] > 2147483647 || !Number.isInteger(args[1]) || timers.size >= 1024) fail("timer is not allowed");
        const id = nextTimer++;
        timers.set(id, realm.setInterval(() => deliver(args[1]), args[0]));
        return id;
      }
      if (object === hostDocument && name === "timerCancel" && args.length === 1 && Number.isInteger(args[0])) {
        const timer = timers.get(args[0]);
        if (timer !== void 0) {
          realm.clearTimeout(timer);
          timers.delete(args[0]);
        }
        return null;
      }
      if (object === hostDocument && name === "timerOnce") {
        if (!Number.isInteger(args[0]) || args[0] < 0 || args[0] > 2147483647 || !Number.isInteger(args[1])) fail("one-shot timer is not allowed");
        return scheduleTimeout(args[1], args[0]);
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
        const id = nextFrame++;
        const run = () => {
          frames.delete(id);
          deliver(args[0]);
        };
        const handle = delay > 0 ? realm.setTimeout(run, Math.max(1, delay)) : realm.requestAnimationFrame(run);
        frames.set(id, { timeout: delay > 0, handle });
        return id;
      }
      if (object === hostDocument && name === "cancelAnimationFrame" && args.length === 1 && Number.isInteger(args[0])) {
        cancelFrame(args[0]);
        return null;
      }
      if (object === hostDocument && name === "task" && args.length === 1 && Number.isInteger(args[0])) {
        return scheduleTimeout(args[0], 0);
      }
      if (object === hostDocument && name === "windowListen") {
        return listen(realm, args[0], args[1]);
      }
      if (object === hostDocument && name === "windowUnlisten" && args.length === 2) {
        return unlisten(realm, args[0], args[1]);
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
      if (object instanceof Node && name === "cloneNode" && args.length === 1 && typeof args[0] === "boolean" && accessibleNode(object)) {
        if (args[0]) requireContentTree(object);
        else if (object instanceof Element && !contentElement(object)) {
          fail(`cloning ${object.localName} is not allowed`);
        }
        return reference(ownNode(object.cloneNode(args[0])));
      }
      if (object instanceof Node && name === "childNodes" && args.length === 0 && accessibleNode(object)) {
        return reference(Array.from(object.childNodes));
      }
      if (object instanceof Node && name === "childNodeReferences" && args.length === 0 && accessibleNode(object)) {
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
        return reference(ownNode(nodes[args[0]]));
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
        requireNode(args[0]);
        if (name === "extend" && object.anchorNode) {
          requireNode(object.anchorNode);
          let common = object.anchorNode;
          while (common && !common.contains(args[0])) common = common.parentNode;
          requireNode(common);
        }
        object[name](args[0], args[1]);
        return null;
      }
      if (object instanceof Selection && name === "removeAllRanges" && args.length === 0) {
        object.removeAllRanges();
        return null;
      }
      if (object instanceof Selection && name === "addRange" && args.length === 1 && args[0] instanceof Range) {
        requireRange(args[0]);
        object.addRange(args[0]);
        return null;
      }
      if (object instanceof Selection && name === "getRangeAt" && args.length === 1 && args[0] === 0 && object.rangeCount) {
        return reference(object.getRangeAt(0));
      }
      if (object instanceof Range && ["setStart", "setEnd"].includes(name) && args.length === 2 && args[0] instanceof Node && (insideDocument(args[0]) || ownedNodes.has(args[0])) && Number.isInteger(args[1]) && args[1] >= 0) {
        requireNode(args[0]);
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
        const stop = options.services.storage.listen(args[0], args[1], () => deliver(callback));
        if (typeof stop === "function") serviceSubscriptions.add(stop);
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
        const stop = options.services.route.listen(() => deliver(args[0]));
        if (typeof stop === "function") serviceSubscriptions.add(stop);
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
        const html = namespace === "http://www.w3.org/1999/xhtml" && ELEMENTS.has(tag);
        const svg = namespace === "http://www.w3.org/2000/svg" && SVG_ELEMENTS.has(tag);
        if (!html && !svg) {
          fail(`namespaced element ${tag} in ${String(namespace)} is not allowed`);
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
      if (object instanceof Element && name === "setAttribute") return setAttribute(object, args);
      if (object instanceof Element && name === "removeAttribute") {
        requireContentTarget(object);
        if (args.length !== 1 || typeof args[0] !== "string") {
          fail(`attribute removal is not allowed: ${String(args[0])}`);
        }
        if (!isRemovableAttribute(args[0]) && object.hasAttribute(args[0])) fail(`attribute removal is not allowed: ${args[0]}`);
        object.removeAttribute(args[0]);
        return null;
      }
      if (object instanceof Node && name === "closest") {
        const selector = querySelectorText(object, args);
        const element = object instanceof Element ? object : object.parentElement;
        const found = element?.closest(selector);
        return found && insideDocument(found) ? reference(found) : null;
      }
      if (object instanceof Element && name === "matches") {
        return object.matches(querySelectorText(object, args));
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
      if (object instanceof HTMLIFrameElement && name === "requestFullscreen" && args.length === 0) {
        void object.requestFullscreen();
        return null;
      }
      if (object instanceof HTMLElement && name === "focus" && args.length === 0) {
        object.focus();
        return null;
      }
      if (object instanceof HTMLElement && name === "blur" && args.length === 0) {
        object.blur();
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
        const selector = querySelectorText(object, args);
        if (name === "querySelector") {
          const found2 = object.querySelector(selector);
          return found2 ? reference(found2) : null;
        }
        const found = Array.from(object.querySelectorAll(selector));
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
        if (object instanceof Range) requireRange(object);
        return reference(Array.from(object.getClientRects()));
      }
      if (object instanceof Range && name === "getBoundingClientRect" && args.length === 0) {
        requireRange(object);
        return reference(object.getBoundingClientRect());
      }
      if (object instanceof Node && ["append", "appendChild", "replaceChildren"].includes(name)) {
        requireNode(object);
        requireContentTarget(object);
        for (const node of args) if (node instanceof Node) {
          requireNode(node);
          if (node.parentNode) requireContentTarget(node.parentNode);
          requireContentTree(node);
        }
        if (object === logicalHead && documentTarget && args.some((node) => !(node instanceof HTMLMetaElement || node instanceof HTMLTitleElement || node instanceof Comment))) {
          fail("only viewport meta and title elements may enter the logical head");
        }
        object[name](...args);
        return name === "appendChild" ? reference(args[0]) : null;
      }
      if (object instanceof Node && name === "insertBefore" && args.length === 2 && args[0] instanceof Node && (args[1] === null || args[1] instanceof Node)) {
        requireNode(object);
        requireContentTarget(object);
        requireNode(args[0]);
        if (args[0].parentNode) requireContentTarget(args[0].parentNode);
        requireContentTree(args[0]);
        if (args[1]) requireNode(args[1]);
        const next = args[1] !== null && args[1].parentNode === object ? args[1] : null;
        object.insertBefore(args[0], next);
        return reference(args[0]);
      }
      if (object instanceof Node && name === "removeChild" && args.length === 1 && args[0] instanceof Node && args[0].parentNode === object) {
        requireNode(object);
        requireContentTarget(object);
        requireNode(args[0]);
        object.removeChild(args[0]);
        return reference(args[0]);
      }
      if (object instanceof Node && name === "removeChild" && args.length === 1 && args[0] instanceof Node && args[0].parentNode === null) {
        requireNode(object);
        requireContentTarget(object);
        requireNode(args[0]);
        return reference(args[0]);
      }
      if (object instanceof Node && "remove" in object && typeof object.remove === "function" && name === "remove") {
        if (object.parentNode) requireContentTarget(object.parentNode);
        object.remove();
        return null;
      }
      fail(`method ${name} is not allowed on ${object?.constructor?.name || typeof object}`);
    }
    function listen(object, type, callback, capture = false) {
      if (object instanceof Node && object !== hostDocument) requireNode(object);
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
      const mediaEvent = object instanceof MediaQueryList && type === "change";
      const windowEvent = object === realm && ["beforeprint", "blur", "focus", "hashchange", "keydown", "message", "pagehide", "resize", "scroll"].includes(type);
      if (!elementEvent && !documentEvent && !mediaEvent && !windowEvent || !Number.isInteger(callback)) fail(`event listener ${type} is not allowed`);
      const scopedInput = !documentTarget && !mediaEvent && [
        "beforeinput",
        "change",
        "compositionend",
        "compositionstart",
        "compositionupdate",
        "copy",
        "cut",
        "dragend",
        "dragenter",
        "dragleave",
        "dragover",
        "dragstart",
        "drop",
        "input",
        "keydown",
        "keypress",
        "keyup",
        "paste",
        "submit"
      ].includes(type);
      const listener = (event) => {
        const target2 = event.target;
        if (target2 instanceof Node && target2 !== hostDocument && !ownedNodes.has(target2) && (documentTarget || insideDocument(target2) || event.composedPath().some((node) => roots.includes(node)))) {
          ownedNodes.add(target2);
        }
        if (scopedInput && !insideDocument(event.target) && !event.composedPath().some((node) => roots.includes(node))) return;
        try {
          deliver(callback, event);
        } finally {
          if (type === "submit" && event.cancelBubble) guardSubmit(event);
        }
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
      object.removeEventListener(type, records[index].listener, { capture: records[index].capture });
      records.splice(index, 1);
      if (!records.length) listenedObjects.delete(object);
      return null;
    }
    const operationHandlers = [
      () => reference(rootCapability),
      (_item, object, name) => get(object, name),
      (item, object, name) => set(object, name, value(item[3])),
      (item, object, name) => call(object, name, (item[3] || []).map(value)),
      (item, object, name) => listen(object, name, item[3], item[4] === true),
      (item, object, name) => unlisten(object, name, item[3])
    ];
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
        const handler = operationHandlers[item[0]];
        if (!handler) fail(`unknown operation ${String(item[0])}`);
        const result = handler(item, object, name);
        if (instrument) trace("operation-result", {
          code: item[0],
          object: item[1],
          name,
          result: traceResult(result)
        });
        return result;
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
          if (!Number.isFinite(next)) fail("wire number must be finite");
          if (!Number.isSafeInteger(next) || Object.is(next, -0)) {
            this.byte(9);
            const bytes = new Uint8Array(8);
            new DataView(bytes.buffer).setFloat64(0, next, true);
            for (const byte of bytes) this.byte(byte);
            return;
          }
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
    const { installStylesheet, readStyleProperty } = createCssRenderer({
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
      readSelector,
      renderSelector,
      renderSvg
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
      if (tag === 7) return reader.text();
      if (tag === 9) {
        if (reader.bytes.length - reader.at < 8) fail("truncated wire number");
        const value2 = new DataView(reader.bytes.buffer, reader.bytes.byteOffset + reader.at, 8).getFloat64(0, true);
        reader.at += 8;
        if (!Number.isFinite(value2)) fail("wire number must be finite");
        return value2;
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
      const start = 0;
      const end = Math.min(reader.bytes.length, 96);
      fail(`unknown operation ${code} at byte ${reader.at - 1}; wire ${Array.from(reader.bytes.slice(start, end), (byte) => Number(byte).toString(16).padStart(2, "0")).join(" ")}`);
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
        const message2 = decoder.decode(memory.subarray(
          offset + 5,
          end < 0 || end > offset + capacity ? offset + capacity : end
        ));
        fail(`guest execution failed at stage ${memory[offset + 4]}: ${message2}`);
      }
      const length = new DataView(memory.buffer).getUint32(offset, true);
      if (length > capacity - 4) fail("invalid guest message length");
      const reader = new Reader(memory.slice(offset + 4, offset + 4 + length));
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
      if (!instance) return;
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
        options.onError?.(error);
        throw error;
      }
      if (instrument) trace("event-complete", { callback, eventType: event?.type || null });
      if (!checkpointQueued) {
        checkpointQueued = true;
        queueMicrotask(() => {
          try {
            if (instance) instance.exports.onmsg(0);
          } catch (error) {
            options.onError?.(error);
            throw error;
          } finally {
            checkpointQueued = false;
          }
        });
      }
    }
    const writeU32 = (offset, value2) => {
      if (!instance?.exports?.memory) return;
      new DataView(instance.exports.memory.buffer).setUint32(offset, value2, true);
    };
    this.imports = {
      host: { msg, now: () => performance.now() },
      // Emscripten is the established browser build for native libraries such
      // as Oniguruma. Reactors need only these inert process-environment
      // services; memory growth remains inside the module.
      env: {
        emscripten_notify_memory_growth() {
        },
        __syscall_getcwd() {
          return -52;
        }
      },
      wasi_snapshot_preview1: {
        fd_write(_fd, _iovs, _count, written) {
          writeU32(written, 0);
          return 0;
        },
        environ_sizes_get(count, size) {
          writeU32(count, 0);
          writeU32(size, 0);
          return 0;
        },
        environ_get() {
          return 0;
        }
      }
    };
    this.connect = async (nextInstance) => {
      if (instance) fail("host is already running a guest");
      instance = nextInstance;
      if (typeof instance?.exports?.onmsg !== "function" || !(instance.exports.memory instanceof WebAssembly.Memory)) {
        fail("guest exports do not match the 0.1 ABI");
      }
      if (typeof instance.exports._initialize === "function") instance.exports._initialize();
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
      if (!messagesOnly) realm.removeEventListener("submit", guardSubmit);
      for (const object of listenedObjects) {
        for (const record of eventListeners.get(object) || []) {
          object.removeEventListener(record.type, record.listener, { capture: record.capture });
        }
      }
      listenedObjects.clear();
      for (const observer of mutationObservers) observer.disconnect();
      mutationObservers.clear();
      for (const stop of serviceSubscriptions) stop();
      serviceSubscriptions.clear();
      for (const timer of timers.values()) realm.clearTimeout(timer);
      timers.clear();
      for (const id of frames.keys()) cancelFrame(id);
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
    if (!(module instanceof WebAssembly.Module) && typeof module?.instantiate !== "function") {
      throw new TypeError("wasm-web-machine: module must be a WebAssembly.Module or runtime session");
    }
    this.#bridge = new WasmWebBridge(target, options);
    try {
      this.#instance = module instanceof WebAssembly.Module ? new WebAssembly.Instance(module, this.#bridge.imports) : module.instantiate(this.#bridge.imports);
    } catch (error) {
      this.#bridge.destroy();
      throw error;
    }
  }
  msg = (offset, length) => this.#bridge.imports.host.msg(offset, length);
  onmsg = (message2 = 0) => {
    if (!this.#connected) {
      if (message2 !== 0) {
        throw new Error("wasm-web-machine: first message must be the null message");
      }
      this.#connected = true;
      return this.#bridge.connect(this.#instance);
    }
    if (message2 === 0) return this.#instance.exports.onmsg(0);
    return this.#bridge.send(message2);
  };
  destroy = () => {
    try {
      this.#instance?.destroy?.();
    } finally {
      this.#bridge.destroy();
      this.#instance = void 0;
      this.#connected = false;
    }
  };
};

// packages/project-editor/src/languages.js
var editorLanguages = [
  { name: "javascript", title: "JavaScript", extensions: ["js", "mjs", "cjs"], aliases: ["js"], package: "javascript" },
  { name: "jsx", title: "JSX", extensions: ["jsx"], aliases: [], package: "javascript" },
  { name: "typescript", title: "TypeScript", extensions: ["ts", "mts", "cts"], aliases: ["ts"], package: "javascript" },
  { name: "tsx", title: "TSX", extensions: ["tsx"], aliases: [], package: "javascript" },
  { name: "html", title: "HTML", extensions: ["html", "htm", "svg"], aliases: [], package: "html" },
  { name: "css", title: "CSS", extensions: ["css"], aliases: [], package: "css" },
  { name: "json", title: "JSON", extensions: ["json"], aliases: [], package: "json" },
  { name: "vue", title: "Vue", extensions: ["vue"], aliases: [], package: "vue" },
  { name: "svelte", title: "Svelte", extensions: ["svelte"], aliases: [], package: "svelte" },
  { name: "markdown", title: "Markdown", extensions: ["md", "markdown"], aliases: ["md"], package: "markdown" },
  { name: "python", title: "Python", extensions: ["py", "pyw", "pyi"], aliases: ["py"], package: "python" },
  { name: "rust", title: "Rust", extensions: ["rs"], aliases: ["rs"], package: "rust" },
  { name: "sql", title: "SQL", extensions: ["sql"], aliases: [], package: "sql" },
  { name: "yaml", title: "YAML", extensions: ["yaml", "yml"], aliases: ["yml"], package: "yaml" },
  { name: "cpp", title: "C/C++", extensions: ["c", "h", "cc", "cpp", "cxx", "hpp", "hxx"], aliases: ["c", "c++"], package: "cpp" }
];

// dev/wasm-web-runtimes/quickjs/context-runtime.js
var QuickJSRuntime = class {
  #instance;
  #active;
  #sessions = /* @__PURE__ */ new Set();
  #nextId = 1;
  #destroyed = false;
  constructor(module) {
    this.#instance = new WebAssembly.Instance(module, { host: {
      now: () => this.#active.session.imports.host.now(),
      msg: (offset, length) => {
        const call = this.#active;
        if (call.control) {
          if (length < 12) throw new Error("QuickJS session control buffer is too small");
          new Uint8Array(this.#instance.exports.memory.buffer, offset, 12).set(call.control);
          call.control = null;
          return 12;
        }
        if (call.error && length !== 0) return 4294967295;
        try {
          return call.session.imports.host.msg(offset, length);
        } catch (error) {
          call.error ||= error;
          return 4294967295;
        }
      }
    } });
  }
  createSession() {
    if (this.#destroyed) throw new Error("QuickJS runtime is disposed");
    if (this.#nextId > 4294967295) throw new RangeError("QuickJS session IDs exhausted");
    const session = { id: this.#nextId++, imports: null, disposed: false, disposing: false, depth: 0 };
    return Object.freeze({
      instantiate: (imports) => {
        if (this.#destroyed) throw new Error("QuickJS runtime is disposed");
        if (session.imports || session.disposed) throw new Error("QuickJS session was already attached");
        session.imports = imports;
        this.#sessions.add(session);
        return {
          exports: {
            memory: this.#instance.exports.memory,
            onmsg: (length) => this.#call(session, length, 0)
          },
          destroy: () => this.#dispose(session)
        };
      }
    });
  }
  #call(session, length, action) {
    if (session.disposed || session.disposing && action !== 1) throw new Error("QuickJS session is disposed");
    const control = new Uint8Array(12), words = new DataView(control.buffer);
    words.setUint32(0, session.id, true);
    words.setUint32(4, length, true);
    words.setUint32(8, action, true);
    const previous = this.#active;
    this.#active = { session, control };
    session.depth++;
    try {
      this.#instance.exports.onmsg(12);
      if (this.#active.error) throw this.#active.error;
      if (this.#active.control) throw new Error("QuickJS build does not support sessions");
    } finally {
      session.depth--;
      this.#active = previous;
    }
  }
  #dispose(session) {
    if (session.disposed) return;
    if (session.depth) throw new Error("Cannot dispose a running QuickJS session");
    session.disposing = true;
    try {
      this.#call(session, 0, 1);
    } finally {
      session.disposed = true;
      session.imports = null;
      this.#sessions.delete(session);
    }
  }
  destroy() {
    if (this.#destroyed) return;
    for (const session of this.#sessions) {
      if (session.depth) throw new Error("Cannot dispose a running QuickJS runtime");
    }
    this.#destroyed = true;
    let failure;
    for (const session of this.#sessions) {
      try {
        this.#dispose(session);
      } catch (error) {
        failure ||= error;
      }
    }
    this.#instance = void 0;
    if (failure) throw failure;
  }
};

// packages/website/project-output-session.js
var encoder2 = new TextEncoder();
function message(name, payload) {
  const fn = encoder2.encode(name), argument = encoder2.encode(JSON.stringify(payload));
  const bytes = new Uint8Array(2 + fn.length + argument.length);
  bytes[0] = 2;
  bytes.set(fn, 1);
  bytes.set(argument, fn.length + 2);
  return bytes;
}
var OutputSession = class {
  constructor(Machine, runtime, root, options, onError) {
    this.pending = /* @__PURE__ */ new Map();
    this.nextRequest = 1;
    this.disposed = false;
    this.starting = true;
    this.onError = onError;
    this.options = options;
    this.abort = new AbortController();
    const files = new Map((options.files || []).map((file) => [file.path, file.content]));
    this.machine = new Machine(runtime.createSession(), root, {
      ...options,
      onError: (error) => this.report(error),
      services: { ...options.services, call(name, path) {
        if (name === "module.source") return JSON.stringify(files.get(path) ?? null);
        if (typeof options.services?.call === "function") return options.services.call(name, path);
        throw new Error(`Project service is unavailable: ${name}`);
      } },
      onMessage: (text) => {
        if (text.startsWith("__wwcModule:")) {
          const result = JSON.parse(text.slice(12)), pending = this.pending.get(result.id);
          if (!pending) return;
          this.pending.delete(result.id);
          if (result.error) pending.reject(new Error(result.error));
          else pending.resolve();
        } else if (text.startsWith("__wwcResponse:")) this.response = text.slice(14);
        else if (text.startsWith("__wwcError:")) this.report(new Error(text.slice(11)));
        else {
          let request;
          try {
            request = JSON.parse(text);
          } catch {
          }
          if (request?.type === "fetch" && Number.isSafeInteger(request.id) && typeof request.url === "string") {
            void this.answerFetch(request).catch((error) => {
              this.report(error);
              queueMicrotask(() => {
                throw error;
              });
            });
          } else options.onMessage?.(text);
        }
      }
    });
  }
  report(error) {
    if (this.disposed) return;
    this.error ||= error;
    if (this.starting) {
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
    } else queueMicrotask(() => {
      if (!this.disposed) this.onError?.(error);
    });
  }
  async answerFetch(request) {
    let reply;
    try {
      if (!this.options.fetchResource) throw new Error("Project network access is disabled");
      reply = { id: request.id, ...await this.options.fetchResource(request.url, { signal: this.abort.signal }) };
    } catch (error) {
      reply = { id: request.id, error: error.message || String(error) };
    }
    if (!this.disposed) this.machine.onmsg(message("__resourcesFetchResolve", reply));
  }
  call(name, payload) {
    if (this.disposed) throw new Error("Project output was replaced or destroyed");
    this.response = void 0;
    this.error = null;
    this.machine.onmsg(message(name, payload));
    if (this.error) throw this.error;
    if (this.response === void 0) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(this.response);
  }
  async run(scripts) {
    for (const [index, script] of scripts.entries()) {
      if (this.disposed) throw new Error("Project output was replaced or destroyed");
      this.error = null;
      if (script.module) {
        const id = this.nextRequest++;
        await new Promise((resolve, reject) => {
          this.pending.set(id, { resolve, reject });
          try {
            this.call("__resourcesOutputRunModule", { id, source: script.source, code: script.code });
          } catch (error) {
            this.pending.delete(id);
            reject(error);
          }
        });
      } else {
        const source = encoder2.encode(script.code), bytes = new Uint8Array(source.length + 1);
        bytes[0] = 1;
        bytes.set(source, 1);
        await this.machine.onmsg(bytes);
        if (this.error) throw new Error(`${script.source || `script ${index + 1}`}: ${this.error.message}`);
      }
    }
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    for (const request of this.pending.values()) request.reject(new Error("Project output was replaced or destroyed"));
    this.pending.clear();
    this.machine.destroy();
  }
};
var ProjectOutput = class {
  constructor(Machine, module, root, optionsFor, onError) {
    this.Machine = Machine;
    this.runtime = new QuickJSRuntime(module);
    this.root = root;
    this.optionsFor = optionsFor;
    this.onError = onError;
    this.programs = 0;
    this.destroyed = false;
    this.active = null;
    this.preparing = null;
  }
  load = async (project) => {
    if (this.destroyed) throw new Error("Project output was destroyed");
    this.remove(this.preparing);
    const wrapper = this.root.ownerDocument.createElement("div");
    const surface = this.root.ownerDocument.createElement("div");
    surface.className = "project-output-root";
    surface.tabIndex = -1;
    wrapper.append(surface);
    wrapper.inert = true;
    wrapper.style.cssText = "position:absolute;left:0;top:0;width:100%;opacity:0;visibility:hidden;pointer-events:none";
    this.root.style.position = "relative";
    this.root.append(wrapper);
    const pending = { wrapper, session: null };
    this.preparing = pending;
    try {
      const session = pending.session = new OutputSession(
        this.Machine,
        this.runtime,
        surface,
        this.optionsFor(project),
        this.onError
      );
      await session.machine.onmsg(0);
      if (this.preparing !== pending) throw new Error("Project output was replaced or destroyed");
      const result = session.call("__resourcesOutputLoad", {
        tree: project.tree || [],
        stylesheets: project.stylesheets || []
      });
      await session.machine.onmsg(0);
      await session.run(project.scripts || []);
      if (session.error) throw session.error;
      if (this.preparing !== pending) throw new Error("Project output was replaced or destroyed");
      const previous = this.active;
      this.active = pending;
      this.preparing = null;
      wrapper.removeAttribute("style");
      wrapper.inert = false;
      session.starting = false;
      this.programs += (project.scripts || []).length;
      this.remove(previous);
      if (!previous) for (const node of [...this.root.childNodes]) {
        if (node !== wrapper) node.remove();
      }
      return result;
    } catch (error) {
      if (this.preparing === pending) this.preparing = null;
      this.remove(pending);
      throw error;
    }
  };
  remove(entry) {
    if (!entry) return;
    try {
      entry.session?.destroy();
    } finally {
      entry.wrapper.remove();
    }
  }
  setContent = (tree) => {
    const session = this.active?.session;
    if (!session) throw new Error("Project output is unavailable");
    const result = session.call("__resourcesOutputSetContent", tree);
    session.machine.onmsg(0);
    return result;
  };
  run = async (scripts) => {
    if (!this.active) throw new Error("Project output is unavailable");
    await this.active.session.run(scripts);
    this.programs += scripts.length;
  };
  inspect = () => ({ runtime: "quickjs", programs: this.programs });
  destroy = () => {
    if (this.destroyed) return;
    this.destroyed = true;
    this.remove(this.preparing);
    this.remove(this.active);
    this.preparing = this.active = null;
    this.runtime.destroy();
  };
};

// packages/hub/src/url-pattern.js
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

// packages/website/project-machines.js
var encoder3 = new TextEncoder();
var decoder2 = new TextDecoder();
var runtimeModules = /* @__PURE__ */ new Map();
var editorBytecodeNames = new Set(editorLanguages.map((item) => `language-${item.package}.bin`));
var editorBytecodes = /* @__PURE__ */ new Map();
function editorBytecode(name) {
  if (!editorBytecodeNames.has(name)) throw new Error("Editor bytecode resource is not granted");
  if (!editorBytecodes.has(name)) editorBytecodes.set(
    name,
    fetch(`/-/resources-site/project-editor-${name}`, { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) throw new Error(`Editor bytecode response ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 1e6) throw new Error("Editor bytecode exceeds its size limit");
      return bytes;
    }).catch((error) => {
      editorBytecodes.delete(name);
      throw error;
    })
  );
  return editorBytecodes.get(name);
}
var nextMachine = 1;
async function moduleFor(url) {
  if (!runtimeModules.has(url)) runtimeModules.set(url, fetch(url, { credentials: "same-origin" }).then((response) => {
    if (!response.ok) throw new Error(`Project runtime response ${response.status}`);
    return WebAssembly.compileStreaming(response);
  }));
  return runtimeModules.get(url);
}
function callMessage(name, payload) {
  const fn = encoder3.encode(name), argument = encoder3.encode(JSON.stringify(payload)), message2 = new Uint8Array(2 + fn.length + argument.length);
  message2[0] = 2;
  message2.set(fn, 1);
  message2.set(argument, fn.length + 2);
  return message2;
}
function createConstrainedFetch(allowedOrigins = [], maxBytes = 1048576) {
  const origins = new Set(allowedOrigins.map((value) => new URL(value).origin));
  return async (value, { signal } = {}) => {
    const url = new URL(value);
    if (url.protocol !== "https:" || !origins.has(url.origin)) throw new Error(`Fetch blocked for ${url.origin}`);
    const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", signal }), bytes = new Uint8Array(await response.arrayBuffer());
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
  return async (value, options) => {
    if (/^https:\/\//.test(value)) return remoteFetch(value, options);
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
    else bytes = encoder3.encode(file.content);
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
      const bytes = encoder3.encode(file.content);
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32768)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      images.set(file.path, `data:image/svg+xml;base64,${btoa(binary)}`);
    }
  }
  return (value) => images.get(String(value).replace(/^\.\//, "")) || value;
}
async function createProjectOutputMachine({ root, scripts = [], options = {}, onError }) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  const output = new ProjectOutput(WasmWebMachine, module, root, (project) => {
    const files = project.files || options.files || [];
    return {
      ...options,
      files,
      environment: { ...options.environment, ...project.environment },
      fetchResource: options.fetchResource ?? createProjectFetch(files, project.allowedFetchOrigins || []),
      resolveImage: options.resolveImage ?? createProjectImageResolver(files),
      allowNavigate: options.allowNavigate ?? ((url) => urlMatchesAllowedPatterns(url, project.allowedLinkPatterns || []))
    };
  }, onError);
  try {
    await output.load({ scripts, files: options.files });
  } catch (error) {
    output.destroy();
    throw error;
  }
  const machineId = `wasm-web-machine-${nextMachine++}`;
  return Object.freeze({
    setContent: output.setContent,
    run: output.run,
    load: output.load,
    destroy: output.destroy,
    inspect: () => ({ ...output.inspect(), machine: { machineId } })
  });
}
async function createProjectBuildMachine() {
  const module = await moduleFor("/-/resources-site/project-builder-quickjs-runtime.wasm");
  let response, machineError;
  const machine = new WasmWebMachine(module, null, { onMessage(text) {
    if (text.startsWith("__wwcResponse:")) response = text.slice(14);
    else if (text.startsWith("__wwcError:")) machineError = text.slice(11);
  } });
  await machine.onmsg(0);
  return Object.freeze({
    compile(source) {
      response = void 0;
      machineError = void 0;
      machine.onmsg(callMessage("__resourcesBuildProject", { source }));
      if (machineError) throw new Error(machineError);
      if (response === void 0) throw new Error("Project build machine did not respond");
      return JSON.parse(response);
    },
    compileFiles(files, config) {
      response = machineError = void 0;
      machine.onmsg(callMessage("__resourcesCompileFiles", { files, config }));
      if (machineError) throw new Error(machineError);
      if (response === void 0) throw new Error("Project build machine did not respond");
      const result = JSON.parse(response);
      if (!result?.ok) throw new Error(result?.error || result?.stack || "Project compilation failed");
      return result.value;
    },
    build(files, config) {
      response = void 0;
      machineError = void 0;
      machine.onmsg(callMessage("__resourcesBuildFiles", { files, config }));
      if (machineError) throw new Error(machineError);
      if (response === void 0) throw new Error("Project build machine did not respond");
      return JSON.parse(response);
    },
    destroy() {
      machine.destroy();
    }
  });
}
async function createProjectEditorMachine({
  root,
  onChange,
  onReady,
  onLimit,
  onError,
  onRequest,
  services,
  limits,
  allowNavigate = false
}) {
  const module = await moduleFor("/-/resources-site/project-editor-quickjs-runtime.wasm");
  const sections = WebAssembly.Module.customSections(module, "wasm-web-machine");
  const machineId = `wasm-web-machine-${nextMachine++}`;
  let response, machineError, starting = true, machineStage = "startup";
  let installedName, disposed = false;
  const installedPrograms = /* @__PURE__ */ new Map();
  function installBytecode({ name }) {
    if (!installedPrograms.has(name)) installedPrograms.set(name, editorBytecode(name).then((bytes) => {
      if (disposed) throw new Error("Editor was closed during bytecode loading");
      const label = encoder3.encode(name + "\0");
      const packet = new Uint8Array(1 + label.length + bytes.length);
      packet[0] = 3;
      packet.set(label, 1);
      packet.set(bytes, 1 + label.length);
      installedName = void 0;
      machine.onmsg(packet);
      if (installedName !== name) throw new Error("Editor bytecode installation did not acknowledge");
      return null;
    }).catch((error) => {
      installedPrograms.delete(name);
      throw error;
    }));
    return installedPrograms.get(name);
  }
  const machine = new WasmWebMachine(module, root, {
    allowNavigate,
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : void 0,
    services,
    onMessage(text) {
      if (text.startsWith("__wwcBytecode:")) {
        installedName = text.slice(14);
        return;
      }
      if (text.startsWith("__wwcError:")) {
        machineError = `${machineStage}: ${text.slice(11)}`;
        if (!starting) queueMicrotask(() => onError?.(new Error(machineError)));
        return;
      }
      if (text.startsWith("__wwcResponse:")) {
        response = text.slice(14);
        return;
      }
      const message2 = JSON.parse(text);
      if (message2.type === "editor-bytecode-started") root.dataset.editorBytecodeState = "started";
      if (message2.type === "editor-application-ready") root.dataset.editorApplicationState = "ready";
      if (message2.protocol === "resources-editor-v1") {
        Promise.resolve().then(() => message2.name === "bytecode.load" ? installBytecode(message2.payload || {}) : onRequest(message2.name, message2.payload || {})).then(
          (value) => !disposed && machine.onmsg(callMessage("__resourcesEditorReceive", { id: message2.id, value })),
          (error) => !disposed && machine.onmsg(callMessage("__resourcesEditorReceive", {
            id: message2.id,
            error: error?.message || String(error)
          }))
        );
        return;
      }
      queueMicrotask(() => {
        if (message2.type === "change") onChange(message2.content, { syntaxErrors: message2.syntaxErrors === true });
        else if (message2.type === "ready") onReady?.(message2);
        else if (message2.type === "limit") onLimit?.(message2);
        else if (message2.type === "language-error") onError?.(new Error(`Language ${message2.language}: ${message2.message}`));
      });
    }
  });
  await machine.onmsg(0);
  if (machineError) throw new Error(machineError);
  starting = false;
  machineStage = "idle";
  function call(name, payload) {
    if (!/^__[A-Za-z0-9_]+$/.test(name)) throw new TypeError("Guest function name is invalid");
    response = machineError = void 0;
    machineStage = `call ${name}`;
    machine.onmsg(callMessage(name, payload));
    if (machineError) throw new Error(machineError);
    if (response === void 0) throw new Error(`Guest function ${name} did not respond`);
    machineStage = "idle";
    return JSON.parse(response);
  }
  if (limits !== false) call("__codeEditorConfigureLimits", limits || { maxLines: 5e3, maxCharacters: 1e6 });
  return Object.freeze({
    machineId,
    setContent(content, language = "plain", options = {}) {
      return call("__codeEditorSetContent", { content, language, ...options });
    },
    command: (payload) => call("__codeEditorCommand", payload),
    callGuest: call,
    receive(message2) {
      if (!disposed) machine.onmsg(callMessage("__resourcesEditorReceive", message2));
    },
    inspect: () => ({ ...call("__codeEditorInspect", {}), machine: { machineId } }),
    focus() {
      root.querySelector(".cm-content")?.focus();
    },
    destroy() {
      disposed = true;
      machine.destroy();
      root.replaceChildren();
    }
  });
}

// packages/website/project-editor-runtime.js
async function mountResourcesProjectEditor(options) {
  const controller = await createProjectEditorMachine({
    root: options.root,
    onChange: options.onChange,
    onReady: options.onReady,
    onLimit: options.onLimit,
    limits: options.limits
  });
  return Object.freeze({
    ...controller,
    destroy() {
      controller.destroy();
    },
    history: Object.freeze({
      initialize(value) {
        return controller.callGuest("__resourcesProjectHistoryInitialize", value);
      },
      setCurrent(snapshot) {
        return controller.callGuest("__resourcesProjectHistorySetCurrent", { snapshot });
      },
      checkpoint(snapshot, options2 = {}) {
        return controller.callGuest("__resourcesProjectHistoryCheckpoint", {
          snapshot,
          now: options2.now || Date.now(),
          destructive: options2.destructive === true,
          checkpointIntervalMs: options2.checkpointIntervalMs
        });
      },
      inspect() {
        return controller.callGuest("__resourcesProjectHistoryInspect", {});
      }
    }),
    projectStatus: Object.freeze({
      begin(generation) {
        return controller.callGuest("__resourcesProjectStatusBegin", { generation });
      },
      report(generation, event) {
        return controller.callGuest("__resourcesProjectStatusReport", { generation, event });
      },
      inspect() {
        return controller.callGuest("__resourcesProjectStatusInspect", {});
      }
    }),
    projectOutput: Object.freeze({
      request(generation) {
        return controller.requestOutput(generation);
      }
    }),
    setTheme(theme) {
      return controller.callGuest("__codeEditorSetTheme", { theme });
    }
  });
}
async function mountResourcesProjectPreview({ root, statusRoot = root, scripts, violations = [], tags, files = [], allowedFetchOrigins = [], allowNavigate = false, environment = {}, onViolation = () => {
} }) {
  if (violations.length) {
    statusRoot.dataset.previewViolations = String(violations.length);
    violations.forEach(onViolation);
  }
  let controller;
  const projectLocation = () => {
    const hash = root.ownerDocument?.defaultView?.location?.hash || "";
    return /^#\/[A-Za-z0-9._/-]*(?:#[A-Za-z0-9_.:-]+)?$/.test(hash) && !hash.includes("//") ? hash.slice(1) : "/";
  };
  try {
    controller = await createProjectOutputMachine({
      root,
      scripts,
      options: {
        frameInterval: () => document.activeElement?.closest(".cm-editor") ? 1e3 : 50,
        fetchResource: createProjectFetch(files, allowedFetchOrigins),
        resolveImage: createProjectImageResolver(files),
        allowNavigate,
        environment,
        services: {
          route: { get: projectLocation, listen() {
          } },
          storage: { get: () => null, set() {
          }, delete() {
          }, listen() {
          } }
        }
      },
      onError: onViolation
    });
  } catch (error) {
    throw error;
  }
  statusRoot.dataset.previewRuntime = scripts.length ? "quickjs" : "quickjs-static";
  return {
    inspect: () => ({ ...controller.inspect(), violations: violations.length }),
    load(project) {
      return controller.load(project);
    },
    setContent(tree) {
      return controller.setContent(tree);
    },
    run(scripts2) {
      return controller.run(scripts2);
    },
    destroy() {
      controller.destroy();
    }
  };
}
export {
  createConstrainedFetch,
  createProjectBuildMachine,
  createProjectOutputMachine,
  mountResourcesProjectEditor,
  mountResourcesProjectPreview
};
