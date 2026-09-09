import { parseProjectHtml } from "../../website/project-html-parser.js";
import { parseConstrainedCss } from "./constrained-css.js";
import { validateConstrainedCssRules } from "./constrained-css-policy.js";
import { encodeConstrainedCssRules } from "./constrained-css-wire.js";
import { SOURCE_LIMITS, sourceUsage } from "./source-envelope.js";

const WRAPPERS = new Set(["html", "head", "body"]);
const OMITTED = new Set(["meta", "title", "style", "script", "link"]);
const ELEMENTS = new Set([
  "a", "article", "aside", "b", "br", "button", "canvas", "code", "div", "em", "footer", "form",
  "h1", "h2", "h3", "h4", "header", "i", "img", "input", "label", "li", "main", "nav", "ol",
  "option", "p", "section", "small", "span", "strong", "textarea", "ul",
]);
const ATTRIBUTES = new Set([
  "aria-label", "aria-live", "class", "contenteditable", "hidden", "id", "maxlength", "placeholder",
  "role", "tabindex", "type", "value",
]);
const SVG_ELEMENTS = new Map([
  "svg", "g", "defs", "circle", "ellipse", "line", "linearGradient", "path", "rect", "stop", "text",
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
      if (declaration.value) declaration.value = image(declaration.value);
    }
  }
  return rules;
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
      if (script.getAttribute("type") && script.getAttribute("type") !== "text/javascript") {
        throw new Error("Only classic inline JavaScript is available in the playground");
      }
      if (src) {
        const path = localResourcePath(src);
        if (!resources?.has(path)) throw new Error(`Project script not found: ${path}`);
        scripts.push({ source: path, code: resources.get(path) });
      } else if (script.textContent.trim()) scripts.push({ source: sourceName, code: script.textContent });
    }
    const nodes = (value) => {
      if (value.nodeType === 3) return [[0, value.textContent]];
      if (value.nodeType !== 1) return [];
      if (WRAPPERS.has(value.localName)) return value.childNodes.flatMap(nodes);
      if (OMITTED.has(value.localName)) return [];
      const svg = value.namespaceURI === "http://www.w3.org/2000/svg";
      const name = svg ? SVG_ELEMENTS.get(value.localName) : value.localName;
      if (!name || (!svg && !ELEMENTS.has(name))) throw new Error(`<${value.localName}> is not available in the project surface`);
      const attributes = value.attributeEntries
        .map(([key, data]) => [svg ? ({ viewbox: "viewBox", gradientunits: "gradientUnits" }[key] || key) : key, data])
        .filter(([key, data]) => (ATTRIBUTES.has(key) || /^(aria|data)-[a-z][a-z0-9-]*$/.test(key) ||
          svg && SVG_ATTRIBUTES.has(key)) && data.length <= 2_000);
      const href = value.getAttribute("href") || "";
      if (value.localName === "a" && href) {
        if (href.length > 2_048) throw new Error("Link URL is too long");
        attributes.push(["href", href]);
        if (config.containerOptions?.links?.addTargetBlank !== false) {
          attributes.push(["target", "_blank"], ["rel", "noopener noreferrer"]);
        }
      }
      // Preserve the namespace in the wire tree. The host still validates
      // every element and attribute when the output guest creates the nodes.
      return [[1, name, svg ? 1 : 0, attributes, value.childNodes.flatMap(nodes)]];
    };
    const tree = parsed.body.childNodes.flatMap(nodes);
    // The server build can hand the guest semantic operations directly. A
    // client build may instead supply source and let the guest encode it.
    return { tree, stylesheets: stylesheet ? [{ operations: stylesheet }] : [], scripts, usage };
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
