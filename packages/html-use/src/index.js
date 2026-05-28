/**
 * @macchiato-dev/html-use
 *
 * HTML parser, serializer, and sanitizer — used by dom-use.
 *
 * html-use does NOT depend on dom-use. Instead, dom-use passes its
 * createElement factory and schema into html-use at runtime.
 */

import { StyleUse } from "@macchiato-dev/style-use";

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function decodeEntities(value) {
  return String(value)
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttributes(source) {
  const attrs = [];
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(re)) {
    attrs.push([match[1], decodeEntities(match[2] ?? match[3] ?? match[4] ?? "")]);
  }
  return attrs;
}

function appendText(parent, text, createTextNode) {
  if (!text) return;
  const decoded = decodeEntities(text);
  if (!decoded) return;
  parent.appendChild(createTextNode ? createTextNode(decoded) : { tagName: "#text", textContent: decoded });
}

/**
 * Parse an HTML string into a tree of guest nodes.
 *
 * @param {string} html
 * @param {object} options
 * @param {(tagName: string) => object} options.createElement — factory from dom-use
 * @param {object} [options.schema] — dom-use schema for validation
 * @param {StyleUse} [options.styleUse] — for CSS validation
 * @returns {object} root fragment node
 */
export function parseHTML(html, { createElement, createTextNode, schema, styleUse } = {}) {
  if (!createElement) throw new Error("parseHTML requires createElement");

  const root = {
    tagName: "#fragment",
    children: [],
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index !== -1) this.children.splice(index, 1);
      child.parentNode = null;
      return child;
    },
  };
  const stack = [root];
  const styles = styleUse || new StyleUse();
  let skipTag = null;
  let lastIndex = 0;
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;

  for (const match of html.matchAll(tagRe)) {
    if (!skipTag) {
      appendText(stack[stack.length - 1], html.slice(lastIndex, match.index), createTextNode);
    }
    lastIndex = match.index + match[0].length;

    if (match[0].startsWith("<!--")) continue;

    const rawTag = match[1];
    const tagName = rawTag.toLowerCase();
    const isClose = match[0].startsWith("</");
    const isSelfClosing = /\/\s*>$/.test(match[0]) || VOID_ELEMENTS.has(tagName);

    if (skipTag) {
      if (isClose && tagName === skipTag) skipTag = null;
      continue;
    }

    if (isClose) {
      while (stack.length > 1) {
        const node = stack.pop();
        if (node.tagName === tagName) break;
      }
      continue;
    }

    let node;
    try {
      node = createElement(tagName);
      for (const [name, value] of parseAttributes(match[2] || "")) {
        if (name.toLowerCase() === "style") {
          for (const decl of value.split(";")) {
            const [property, ...rest] = decl.split(":");
            if (property && rest.length) styles.validateInline(property, rest.join(":"));
          }
        }
        node.setAttribute?.(name, value);
        if (!node.setAttribute) node.attributes = { ...(node.attributes || {}), [name]: value };
      }
      stack[stack.length - 1].appendChild(node);
    } catch {
      if (!isSelfClosing) skipTag = tagName;
      continue;
    }

    if (!isSelfClosing) stack.push(node);
  }

  appendText(stack[stack.length - 1], html.slice(lastIndex), createTextNode);
  void schema;
  return root;
}

/**
 * Serialize a guest node tree to an HTML string.
 *
 * @param {object} node — guest DOM node
 * @returns {string}
 */
export function serializeHTML(node) {
  if (!node) return "";
  const children = node.children || [];

  if (node.tagName === "#text") return escapeHtml(node.textContent || "");
  if (node.tagName === "#fragment") return children.map(serializeHTML).join("");

  const tag = String(node.tagName || "").toLowerCase();
  if (!tag) return children.map(serializeHTML).join("");

  const attrs = Object.entries(node.attributes || {})
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([name, value]) => value === true || value === ""
      ? ` ${name}`
      : ` ${name}="${escapeAttr(value)}"`)
    .join("");
  const style = node.styleText ? ` style="${escapeAttr(node.styleText)}"` : "";
  const open = `<${tag}${attrs}${style}>`;
  if (VOID_ELEMENTS.has(tag)) return open;

  const text = node.textContent && children.length === 0 ? escapeHtml(node.textContent) : "";
  const body = text || children.map(serializeHTML).join("");
  return `${open}${body}</${tag}>`;
}

/**
 * Parse, validate against a schema, and return a clean HTML string.
 *
 * @param {string} html
 * @param {object} options
 * @param {object} [options.schema]
 * @param {StyleUse} [options.styleUse]
 * @returns {string} sanitized HTML
 */
export function sanitizeHTML(html, { schema, styleUse }) {
  const nodes = schema?.nodes || {};
  const fragment = parseHTML(html, {
    schema,
    styleUse,
    createElement(tagName) {
      const tag = String(tagName).toLowerCase();
      if (Object.keys(nodes).length && !nodes[tag]) {
        throw new Error(`Node not allowed: ${tag}`);
      }
      return {
        tagName: tag,
        attributes: {},
        children: [],
        setAttribute(name, value) {
          this.attributes[name] = String(value);
        },
        appendChild(child) {
          this.children.push(child);
          return child;
        },
      };
    },
    createTextNode(text) {
      return { tagName: "#text", textContent: text };
    },
  });
  return serializeHTML(fragment);
}
