import { parseProjectHtml } from "../../website/project-html-parser.js";
import { parseConstrainedCss } from "./constrained-css.js";
import { validateConstrainedCssRules } from "./constrained-css-policy.js";
import { encodeConstrainedCss } from "./constrained-css-wire.js";
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
      validateConstrainedCssRules(parseConstrainedCss(css));
      stylesheet = [...encodeConstrainedCss(css)];
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
      if (!ELEMENTS.has(value.localName)) throw new Error(`<${value.localName}> is not available in the playground`);
      const attributes = value.attributeEntries.filter(([name, data]) => ATTRIBUTES.has(name) && data.length <= 2_000);
      const href = value.getAttribute("href") || "";
      if (value.localName === "a" && href) {
        if (href.length > 2_048) throw new Error("Link URL is too long");
        attributes.push(["href", href]);
        if (config.containerOptions?.links?.addTargetBlank !== false) {
          attributes.push(["target", "_blank"], ["rel", "noopener noreferrer"]);
        }
      }
      return [[1, value.localName, 0, attributes, value.childNodes.flatMap(nodes)]];
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

export function compileProjectFiles(files, config = {}) {
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
  return new SingleFileProjectCompiler().compile(resources.get(entry), { config, resources, sourceName: entry });
}
