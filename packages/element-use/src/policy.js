export const ELEMENT_USE_POLICY = Object.freeze({
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

export const ELEMENT_USE_CSS_PROPERTIES = Object.freeze(
  new Set([
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
  ]),
);

const CUSTOM_PROPERTIES = new Set([
  "--ground",
  "--panel",
  "--line",
  "--gold",
  "--ink",
  "--muted",
  "--tile",
]);

export function assertElementUseStylesheet(css) {
  const source = String(css);
  if (source.length > 24_000) {
    throw new Error("element-use stylesheet exceeds 24,000 characters");
  }
  if (/@(?:import|font-face|namespace)|url\s*\(/i.test(source)) {
    throw new Error("element-use stylesheets cannot load resources");
  }
  for (
    const match of source.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+|[a-z-]+)\s*:/gim)
  ) {
    const property = match[1].toLowerCase();
    if (
      !ELEMENT_USE_CSS_PROPERTIES.has(property) &&
      !CUSTOM_PROPERTIES.has(property)
    ) {
      throw new Error(`element-use CSS property is not allowed: ${match[1]}`);
    }
  }
  return source;
}
