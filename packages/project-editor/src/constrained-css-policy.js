// Semantic CSS policy shared by server compilation and the browser host.
const CSS_PROPERTIES = new Set([
  "-webkit-user-modify", "-webkit-user-select", "align-content", "align-items", "align-self", "animation", "animation-duration",
  "animation-name", "aspect-ratio",
  "backdrop-filter", "backface-visibility", "background", "background-attachment", "background-clip",
  "background-color", "background-image", "background-origin",
  "background-position", "background-position-x", "background-position-y", "background-repeat",
  "background-size", "border-bottom-color", "border-bottom-left-radius",
  "border-bottom-right-radius", "border-bottom-style", "border-bottom-width",
  "border-image-outset", "border-image-repeat", "border-image-slice",
  "border-image-source", "border-image-width", "border-left-color",
  "border-left-style", "border-left-width", "border-right-color",
  "border-right-style", "border-right-width", "border-top-color",
  "border-top-left-radius", "border-top-right-radius", "border-top-style",
  "border-style", "border-top-width", "box-shadow", "box-sizing", "caret-color", "color", "column-gap",
  "color-scheme", "contain", "container-type", "content", "counter-reset", "cursor", "direction", "display", "fill", "filter", "flex", "flex-wrap", "font",
  "font-family", "flex-basis", "flex-direction", "flex-grow", "flex-shrink",
  "font-feature-settings", "font-kerning", "font-language-override",
  "font-optical-sizing", "font-size", "font-size-adjust", "font-stretch",
  "font-style", "font-variant-alternates", "font-variant-caps",
  "font-variant-east-asian", "font-variant-emoji", "font-variant-ligatures",
  "font-variant-numeric", "font-variant-position", "font-variation-settings",
  "font-weight", "grid-column", "grid-row", "grid-template-columns", "grid-template-rows", "height", "inset-inline-end", "inset-inline-start",
  "justify-content", "left",
  "letter-spacing", "line-height", "list-style", "bottom",
  "field-sizing", "margin-bottom", "margin-left", "margin-right", "margin-top", "max-height", "max-width",
  "mask-image", "min-height", "min-width", "mix-blend-mode", "object-fit", "opacity", "order", "outline", "outline-color", "outline-offset", "outline-style",
  "outline-width", "overflow-anchor", "overflow-x", "overflow-y", "overscroll-behavior", "padding-block", "padding-bottom",
  "padding-left", "padding-right", "padding-top", "pointer-events", "position",
  "resize", "right", "row-gap", "scrollbar-color", "stroke", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "stroke-width", "tab-size", "text-align", "text-decoration-color", "text-decoration-line",
  "text-decoration", "text-decoration-style", "text-decoration-thickness", "top",
  "text-overflow", "text-transform", "text-wrap", "transform", "transform-origin", "transform-style", "perspective",
  "transition",
  "transition-behavior", "transition-delay", "transition-duration",
  "transition-property", "transition-timing-function", "white-space",
  "unicode-bidi", "user-select", "vertical-align", "visibility", "white-space-collapse", "text-wrap-mode", "width", "word-break", "word-wrap", "overflow-wrap",
  "z-index"
]);
const CSS_VALUE_FUNCTIONS = new Set([
  "attr", "blur", "brightness", "calc", "clamp", "color-mix", "contrast", "counter", "cubic-bezier", "drop-shadow", "linear-gradient",
  "max", "min", "minmax", "radial-gradient", "repeat", "rgba", "rotate", "rotateX", "rotateY", "rotateZ",
  "saturate", "scale", "scaleX", "scaleY", "steps", "translate", "translate3d",
  "translateX", "translateY", "var"
]);
const SAFE_SELECTOR = /^[a-z0-9_.*#:\s>+~(),\[\]="'-]+$/i;
export function isAllowedCssProperty(name) {
  return CSS_PROPERTIES.has(name) || /^--[a-z][a-z0-9-]{0,63}$/i.test(name);
}

export function isAllowedCssMedia(condition) {
  const preference = /^\(prefers-(?:reduced-motion: (?:reduce|no-preference)|color-scheme: (?:dark|light))\)$/;
  const dimension = /^\((?:min|max)-(?:width|height): \d+(?:\.\d+)?(?:px|rem|em)\)$/;
  const aspect = /^\((?:min|max)-aspect-ratio: \d+ \/ \d+\)$/;
  return String(condition).split(/(?: and |, )/).every((part) =>
    preference.test(part) || dimension.test(part) || aspect.test(part));
}

function validateValue(node) {
  if (!Array.isArray(node)) throw new SyntaxError("CSS value node is not representable");
  if (node[0] === 7) {
    if (!CSS_VALUE_FUNCTIONS.has(node[1])) {
      throw new SyntaxError("CSS function " + node[1] + " is not allowed");
    }
    validateValue(node[2]);
  } else if (node[0] === 10) {
    node[2].forEach(validateValue);
  }
}

function validateDeclarations(declarations) {
  if (!Array.isArray(declarations) || declarations.length > 128) {
    throw new SyntaxError("CSS rule has too many declarations");
  }
  declarations.forEach(function (declaration) {
    if (declaration.comment !== undefined) return;
    if (!isAllowedCssProperty(declaration.property)) {
      throw new SyntaxError("CSS property " + declaration.property + " is not allowed");
    }
    if (declaration.value) validateValue(declaration.value);
    else {
      if (!Array.isArray(declaration.tokens) || declaration.tokens.length > 512) {
        throw new SyntaxError("CSS value has too many tokens");
      }
      declaration.tokens.forEach(function (token) {
        if (token[0] === 7 && !CSS_VALUE_FUNCTIONS.has(token[1])) {
          throw new SyntaxError("CSS function " + token[1] + " is not allowed");
        }
      });
    }
  });
}

export function validateConstrainedCssRules(rules) {
  if (!Array.isArray(rules) || rules.length > 2048) {
    throw new SyntaxError("CSS has too many rules");
  }
  rules.forEach(function (rule) {
    if (rule.comment !== undefined) return;
    if (rule.media !== undefined) {
      if (!isAllowedCssMedia(rule.media)) {
        throw new SyntaxError("CSS media condition is not allowed: " + String(rule.media));
      }
      validateConstrainedCssRules(rule.rules);
      return;
    }
    if (rule.keyframes !== undefined) {
      if (!/^[a-z_][a-z0-9_-]*$/i.test(rule.keyframes) || !Array.isArray(rule.frames) ||
          rule.frames.length > 256) throw new SyntaxError("CSS keyframes are not allowed");
      rule.frames.forEach(function (frame) { validateDeclarations(frame.declarations); });
      return;
    }
    if (typeof rule.selector !== "string" || rule.selector.length > 2048 ||
        !SAFE_SELECTOR.test(rule.selector)) {
      throw new SyntaxError("CSS selector is not allowed: " + String(rule.selector).slice(0, 120));
    }
    validateDeclarations(rule.declarations);
  });
  return rules;
}

export { CSS_PROPERTIES as CONSTRAINED_CSS_PROPERTIES,
  CSS_VALUE_FUNCTIONS as CONSTRAINED_CSS_VALUE_FUNCTIONS, SAFE_SELECTOR };
