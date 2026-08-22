import { StyleUse } from "../../style-use/src/index.js";
import { parseProjectHtml } from "../../website/project-html-parser.js";
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
    this.styles = new StyleUse({
      imports: false,
      urls: false,
      limits: { maxStylesheetLength: 100_000, maxImports: 0 },
    });
  }

  compile(source) {
    if (typeof source !== "string") throw new TypeError("Project source must be text");
    const usage = sourceUsage(source);
    if (usage.lines > this.limits.maxLines || usage.codePoints > this.limits.maxCodePoints ||
        usage.longestLineCodePoints > this.limits.maxLineCodePoints) {
      throw new RangeError("Project source exceeds its line or code-point budget");
    }
    const parsed = parseProjectHtml(source);
    const scripts = [];
    const css = parsed.querySelectorAll("style").map((node) => node.textContent).join("\n");
    this.styles.validateStylesheet(css);
    for (const script of parsed.querySelectorAll("script")) {
      if (script.getAttribute("src")) throw new Error("External scripts are not available in the playground");
      if (script.getAttribute("type") && script.getAttribute("type") !== "text/javascript") {
        throw new Error("Only classic inline JavaScript is available in the playground");
      }
      if (script.textContent.trim()) scripts.push({ source: "index.html", code: script.textContent });
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
        if (!/^#[A-Za-z0-9_.:-]+$/.test(href)) throw new Error(`Link navigation was blocked: ${href}`);
        attributes.push(["href", href]);
      }
      return [[1, value.localName, 0, attributes, value.childNodes.flatMap(nodes)]];
    };
    const tree = parsed.body.childNodes.flatMap(nodes);
    if (css) scripts.unshift({
      source: "index.html#style",
      code: `var style=document.createElement("style");style.textContent=${JSON.stringify(css)};document.head.appendChild(style);`,
    });
    return { tree, scripts, usage };
  }
}

export function compileSingleFileProject(source, options) {
  return new SingleFileProjectCompiler(options).compile(source);
}
