import { parseProjectHtml } from "../../website/project-html-parser.js";
import { parseConstrainedCss } from "./constrained-css.js";
import { validateConstrainedCssRules } from "./constrained-css-policy.js";
import { encodeConstrainedCssRules } from "./constrained-css-wire.js";
import { SOURCE_LIMITS, sourceUsage } from "./source-envelope.js";

const WRAPPERS = new Set(["html", "head", "body"]);
const OMITTED = new Set(["meta", "title", "style", "script", "link"]);
const ELEMENTS = new Set([
  "a", "article", "aside", "b", "br", "button", "canvas", "code", "dialog", "div", "em", "footer", "form",
  "h1", "h2", "h3", "h4", "header", "i", "img", "input", "label", "li", "main", "nav", "ol",
  "optgroup", "option", "p", "pre", "section", "select", "small", "span", "strong", "textarea", "ul",
]);
const ATTRIBUTES = new Set([
  "aria-label", "aria-live", "class", "contenteditable", "dir", "hidden", "id", "lang", "maxlength", "placeholder",
  "role", "tabindex", "title", "translate", "type", "value", "autocomplete", "checked", "cols",
  "disabled", "readonly", "rows", "selected", "spellcheck",
]);
const SVG_ELEMENTS = new Map([
  "svg", "g", "defs", "circle", "ellipse", "line", "linearGradient", "path", "rect", "stop", "text", "title",
].map((name) => [name.toLowerCase(), name]));
const SVG_ATTRIBUTES = new Set([
  "cx", "cy", "d", "fill", "gradientUnits", "height", "offset", "opacity", "r", "rx", "ry",
  "stop-color", "stroke", "stroke-linecap", "stroke-width", "viewBox", "width", "x", "x1", "x2", "y", "y1", "y2",
]);

// Playground authoring limits are not project-container limits. Resources
// already bounds its request bodies; a long SVG path or formatted HTML file
// must not inherit the playground's 256-column/500-line exercise budget.
export const PROJECT_SOURCE_LIMITS = Object.freeze({
  maxCodePoints: 2 * 1024 * 1024,
  maxLineCodePoints: 2 * 1024 * 1024,
  maxLines: 100_000,
});

function cssImages(rules) {
  function image(node) {
    if (node[0] === 7 && node[1] === "url") {
      const value = node[2];
      const prefix = "data:image/svg+xml,";
      if (value[0] !== 4 || !value[1].startsWith(prefix)) {
        throw new SyntaxError("CSS image must be an embedded SVG; external URLs are not allowed");
      }
      const parsed = parseProjectHtml(decodeURIComponent(value[1].slice(prefix.length)));
      const roots = parsed.body.childNodes.filter((child) => child.nodeType !== 3 || child.textContent.trim());
      if (roots.length !== 1 || roots[0].localName !== "svg") throw new SyntaxError("CSS image requires one SVG root");
      function tree(element) {
        if (element.nodeType !== 1 || !SVG_ELEMENTS.has(element.localName)) {
          throw new SyntaxError("CSS SVG element is not supported");
        }
        return [SVG_ELEMENTS.get(element.localName), element.attributeEntries
          .filter(([name]) => name !== "xmlns")
          .map(([name, value]) => [({ viewbox: "viewBox", gradientunits: "gradientUnits" }[name] || name), value]),
        element.childNodes.filter((child) => child.nodeType !== 3 || child.textContent.trim()).map(tree)];
      }
      // Only data crosses the boundary. The host's SVG renderer validates it
      // and produces the image URL itself; no guest URL reaches browser CSS.
      return [11, tree(roots[0])];
    }
    if (node[0] === 7) node[2] = image(node[2]);
    if (node[0] === 10) node[2] = node[2].map(image);
    return node;
  }
  for (const rule of rules) {
    if (rule.rules) cssImages(rule.rules);
    if (rule.frames) cssImages(rule.frames);
    for (const declaration of rule.declarations || []) {
      if (declaration.value && (declaration.property === "background" || declaration.property === "background-image")) {
        declaration.value = image(declaration.value);
      }
    }
  }
  return rules;
}

function inlineStyle(source) {
  // Reuse the semantic declaration format, but do not let a closing brace
  // turn an attribute into additional rules. Its selector is never applied.
  const rules = cssImages(parseConstrainedCss(`.wwc-inline { ${source} }`));
  if (rules.length !== 1 || rules[0].selector !== ".wwc-inline") {
    throw new SyntaxError("Inline style must contain only declarations");
  }
  validateConstrainedCssRules(rules);
  const bytes = encodeConstrainedCssRules(rules);
  if (bytes.length > 128 * 1024) throw new RangeError("Inline style operations are too large");
  return [...bytes];
}

// The inert parser retains explicit wrappers. Keep their attributes separate
// from body content instead of flattening three different elements into a div.
// This is deliberately not HTML's error-recovery algorithm: misplaced or
// duplicate document wrappers fail rather than acquiring surprising meanings.
function documentParts(parsed) {
  const direct = (children, name) => {
    const matches = children.filter(node => node.nodeType === 1 && node.localName === name);
    if (matches.length > 1) throw new SyntaxError(`Duplicate document ${name} element`);
    return matches[0];
  };
  const html = direct(parsed.body.childNodes, "html");
  if (html && parsed.body.childNodes.some(node => node !== html &&
      (node.nodeType !== 3 || node.textContent.trim()))) {
    throw new SyntaxError("Content outside the document html element");
  }
  const children = html ? html.childNodes : parsed.body.childNodes;
  const head = direct(children, "head"), body = direct(children, "body");
  if (head?.childNodes.some(node => node.nodeType === 3 ? node.textContent.trim()
      : !OMITTED.has(node.localName))) {
    throw new SyntaxError("Unsupported content in document head");
  }
  const wrappers = new Set([html, head, body]);
  function check(node) {
    if (node.nodeType === 1 && WRAPPERS.has(node.localName) && !wrappers.has(node)) {
      throw new SyntaxError(`Misplaced document ${node.localName} element`);
    }
    for (const child of node.childNodes) check(child);
  }
  for (const node of parsed.body.childNodes) check(node);
  return { html, head, body,
    content: children.flatMap(node => node === head ? [] : node === body ? node.childNodes : [node]) };
}

export class SingleFileProjectCompiler {
  constructor({ limits = SOURCE_LIMITS } = {}) {
    this.limits = Object.freeze({ ...limits });
  }

  compile(source, { config = {}, resources = null, sourceName = "index.html" } = {}) {
    if (typeof source !== "string") throw new TypeError("Project source must be text");
    const usage = sourceUsage(source);
    if (usage.lines > this.limits.maxLines || usage.codePoints > this.limits.maxCodePoints ||
        usage.longestLineCodePoints > this.limits.maxLineCodePoints) {
      throw new RangeError("Project source exceeds its line or code-point budget");
    }
    const parsed = parseProjectHtml(source);
    const parts = documentParts(parsed);
    const scripts = [];
    const cssParts = parsed.querySelectorAll("style").map((node) => node.textContent);
    for (const link of parsed.querySelectorAll('link[rel="stylesheet"][href]')) {
      const path = localResourcePath(link.getAttribute("href"));
      if (!resources?.has(path)) throw new Error(`Project stylesheet not found: ${path}`);
      cssParts.push(resources.get(path));
    }
    const css = cssParts.join("\n");
    let stylesheet = null;
    if (css) {
      const rules = cssImages(parseConstrainedCss(css));
      validateConstrainedCssRules(rules);
      stylesheet = [...encodeConstrainedCssRules(rules)];
    }
    for (const script of parsed.querySelectorAll("script")) {
      const src = script.getAttribute("src");
      const module = script.getAttribute("type") === "module";
      if (script.getAttribute("type") && script.getAttribute("type") !== "text/javascript" && !module) {
        throw new Error("Script type is not supported");
      }
      if (src) {
        const path = localResourcePath(src);
        if (!resources?.has(path)) throw new Error(`Project script not found: ${path}`);
        scripts.push({ source: path, code: resources.get(path), ...(module ? { module: true } : {}) });
      } else if (script.textContent.trim()) scripts.push({
        source: module ? `${sourceName}.inline-${scripts.length}.js` : sourceName,
        code: script.textContent, ...(module ? { module: true } : {}) });
    }
    const nodes = (value) => {
      if (value.nodeType === 3) return [[0, value.textContent]];
      if (value.nodeType !== 1) return [];
      if (WRAPPERS.has(value.localName)) return value.childNodes.flatMap(nodes);
      const svg = value.namespaceURI === "http://www.w3.org/2000/svg";
      // An SVG title labels the drawing; only HTML title is page metadata.
      if (OMITTED.has(value.localName) && (!svg || value.localName !== "title")) return [];
      const name = svg ? SVG_ELEMENTS.get(value.localName) : value.localName;
      if (!name || (!svg && !ELEMENTS.has(name))) throw new Error(`<${value.localName}> is not available in the project surface`);
      const attributes = value.attributeEntries
        .map(([key, data]) => [svg ? ({ viewbox: "viewBox", gradientunits: "gradientUnits" }[key] || key) : key, data])
        .filter(([key, data]) => (ATTRIBUTES.has(key) || /^(aria|data)-[a-z][a-z0-9-]*$/.test(key) ||
          svg && SVG_ATTRIBUTES.has(key)) && data.length <= 2_000);
      const href = value.getAttribute("href") || "";
      if (name === "form" && value.getAttribute("method") === "dialog") {
        attributes.push(["method", "dialog"]);
      }
      if (value.localName === "a" && href) {
        if (href.length > 2_048) throw new Error("Link URL is too long");
        attributes.push(["href", href]);
        // Fragment navigation belongs to this document. Opening it in a new
        // window loses app state and is blocked by script-free render frames.
        // The machine still validates the actual destination independently.
        if (!href.startsWith("#") && config.containerOptions?.links?.addTargetBlank !== false) {
          attributes.push(["target", "_blank"], ["rel", "noopener noreferrer"]);
        }
      }
      // Preserve the namespace in the wire tree. The host still validates
      // every element and attribute when the output guest creates the nodes.
      const node = [1, name, svg ? 1 : 0, attributes, value.childNodes.flatMap(nodes)];
      const style = value.getAttribute("style");
      if (style !== null) node.push(inlineStyle(style));
      return [node];
    };
    const tree = parts.content.flatMap(nodes);
    const document = {};
    for (const name of WRAPPERS) {
      const part = parts[name];
      const attributes = (part?.attributeEntries || []).filter(([key, value]) =>
        (ATTRIBUTES.has(key) || /^(aria|data)-[a-z][a-z0-9-]*$/.test(key)) && value.length <= 2_000);
      const node = [1, name, 0, attributes, []];
      const style = part?.getAttribute("style");
      if (style != null) node.push(inlineStyle(style));
      document[name] = node;
    }
    // The server build can hand the guest semantic operations directly. A
    // client build may instead supply source and let the guest encode it.
    return { tree, document, stylesheets: stylesheet ? [{ operations: stylesheet }] : [], scripts, usage };
  }
}

function localResourcePath(value) {
  const path = String(value || "").replace(/^\.\//, "");
  if (!path || path.startsWith("/") || path.includes("?") || path.includes("#") ||
      path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Project resource path is invalid: ${value}`);
  }
  return path;
}

export function compileSingleFileProject(source, options) {
  return new SingleFileProjectCompiler(options).compile(source);
}

export function compileProjectFiles(files, config = {}, options = {}) {
  if (!Array.isArray(files)) throw new TypeError("Project files must be an array");
  const resources = new Map();
  for (const file of files) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string") {
      throw new TypeError("Project files must contain text paths and content");
    }
    resources.set(file.path, file.content);
  }
  const entry = localResourcePath(config.entry || "index.html");
  if (!resources.has(entry)) throw new Error(`Project entry not found: ${entry}`);
  return new SingleFileProjectCompiler(options).compile(resources.get(entry), { config, resources, sourceName: entry });
}
