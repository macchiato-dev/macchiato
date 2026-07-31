const COLOR = /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/;
const LENGTH = /^\d+(?:\.\d+)?(?:px|rem|em|ch|%)$/;
const blockTypes = new Set(["heading", "paragraph", "callout", "code-editor"]);

function text(value, name, maximum = 400) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new TypeError(`${name} must be a non-empty string of at most ${maximum} characters`);
  }
  return value;
}

export function defineStandardLayout(layout = {}) {
  const theme = layout.theme || {};
  for (const [name, value] of Object.entries(theme)) {
    if (!["background", "surface", "text", "muted", "accent", "border", "radius", "contentWidth"].includes(name)) {
      throw new TypeError(`Unknown layout theme token: ${name}`);
    }
    const pattern = name === "radius" || name === "contentWidth" ? LENGTH : COLOR;
    if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`Invalid layout theme token: ${name}`);
  }
  return Object.freeze({
    type: "standard",
    title: text(layout.title || "Macchiato app", "layout.title", 120),
    eyebrow: layout.eyebrow ? text(layout.eyebrow, "layout.eyebrow", 100) : "",
    description: layout.description ? text(layout.description, "layout.description", 500) : "",
    theme: Object.freeze({ ...theme }),
  });
}

export function defineContent({ allowedBlocks, blocks } = {}) {
  if (!Array.isArray(allowedBlocks) || !allowedBlocks.length) throw new TypeError("content.allowedBlocks must not be empty");
  for (const type of allowedBlocks) if (!blockTypes.has(type)) throw new TypeError(`Unknown allowed block: ${type}`);
  if (!Array.isArray(blocks)) throw new TypeError("content.blocks must be an array");
  for (const [index, block] of blocks.entries()) {
    if (!block || typeof block !== "object" || !allowedBlocks.includes(block.type)) {
      throw new TypeError(`content.blocks[${index}] is not allowed`);
    }
  }
  return Object.freeze({ allowedBlocks: Object.freeze([...allowedBlocks]), blocks: Object.freeze(blocks.map(Object.freeze)) });
}

export function defineDeclarativeApp({ id, layout, content }) {
  if (!/^[a-z][a-z0-9-]{0,62}$/.test(id || "")) throw new TypeError("app.id must be a lowercase slug");
  return Object.freeze({ id, layout: defineStandardLayout(layout), content: defineContent(content) });
}
