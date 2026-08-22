import { mountResourcesProjectEditor, mountResourcesProjectPreview } from "../../../packages/website/project-editor-runtime.js";
import { parseProjectHtml } from "../../../packages/website/project-html-parser.js";

const SESSION_KEY = "-playground--editor";
const DEFAULT_SOURCE = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Small article</title>
<style>
  body { margin: 0; padding: 32px; color: #e8efed; background: #202524; font: 16px/1.5 system-ui; }
  article { max-width: 42rem; margin: auto; }
  h1 { color: #9fb0ff; }
</style>
<body>
<article>
  <h1>A small article</h1>
  <p>Edit this single HTML file. Its inline CSS and JavaScript run in a separate machine.</p>
  <button type="button" id="hello">Say hello</button>
  <p id="message" aria-live="polite"></p>
</article>
<script>
document.getElementById("hello").addEventListener("click", function () {
  document.getElementById("message").textContent = "Hello from QuickJS.";
});
</script>
</body>
</html>`;

const root = document.getElementById("playground");
root.innerHTML = `<header><strong>Playground</strong><span>index.html</span></header><main><section aria-label="Editor"><div id="editor"></div></section><section aria-label="Output"><div id="output"></div></section></main><footer role="status" hidden></footer>`;
const editorRoot = root.querySelector("section[aria-label=Editor]");
const outputRoot = root.querySelector("#output");
const status = root.querySelector("footer");

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
:root{color-scheme:dark;--bar:#17226e;--edge:#2d3d91;--ground:#202524;--text:#edf3f2}
*{box-sizing:border-box}html,body,#playground{width:100%;height:100%;margin:0;overflow:hidden}
body{color:var(--text);background:var(--ground);font:14px/1.4 system-ui,sans-serif}
#playground{display:grid;grid-template-rows:42px minmax(0,1fr) auto}
#playground>header{display:flex;align-items:center;gap:18px;padding:0 12px;border-bottom:2px solid var(--edge);background:var(--bar)}
#playground>header span{color:#cbd4ff;font-size:12px}
#playground>main{display:grid;grid-template-columns:minmax(0,1fr) 2px minmax(0,1fr);min-height:0;background:#454b4a}
#playground>main>section{min-width:0;min-height:0;overflow:hidden;background:var(--ground)}
#playground>main>section+section{grid-column:3}
#editor,#output{width:100%;height:100%;overflow:auto}
#editor .cm-editor{height:100%}#editor .cm-scroller{overflow:auto}
#playground>footer{min-height:31px;margin:4px;padding:4px 8px;border:1px solid #d45b62;border-radius:999px;color:#ffd0d2;background:#421f23;font-size:11px}
#playground>footer[hidden]{display:none}
@media(max-width:700px){#playground>main{grid-template-columns:1fr;grid-template-rows:1fr 1fr;gap:2px}#playground>main>section+section{grid-column:1;grid-row:2}}
@media(prefers-color-scheme:light){:root{color-scheme:light;--bar:#dbe4ff;--edge:#aebce6;--ground:#d9e1e3;--text:#263338}}
`);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

let preview = null;
let previewTimer = null;
let editor = null;
let source = DEFAULT_SOURCE;

function showStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

function outputProgram(value) {
  const parsed = parseProjectHtml(value);
  const scripts = [];
  const styles = parsed.querySelectorAll("style").map((node) => node.textContent).join("\n");
  for (const node of parsed.querySelectorAll("script")) {
    if (node.getAttribute("src")) throw new Error("External scripts are not available in the playground");
    if (node.textContent.trim()) scripts.push({ source: "index.html", code: node.textContent });
  }
  const wrappers = new Set(["html", "head", "body"]);
  const omitted = new Set(["meta", "title", "style", "script", "link"]);
  const allowed = new Set(["a", "article", "aside", "b", "br", "button", "canvas", "code", "div", "em", "footer", "form", "h1", "h2", "h3", "h4", "header", "i", "img", "input", "label", "li", "main", "nav", "ol", "option", "p", "section", "small", "span", "strong", "textarea", "ul"]);
  const attributes = new Set(["aria-label", "aria-live", "class", "contenteditable", "hidden", "id", "maxlength", "placeholder", "role", "tabindex", "type", "value"]);
  function nodes(value) {
    if (value.nodeType === 3) return [[0, value.textContent]];
    if (value.nodeType !== 1) return [];
    if (wrappers.has(value.localName)) return value.childNodes.flatMap(nodes);
    if (omitted.has(value.localName)) return [];
    if (!allowed.has(value.localName)) throw new Error(`<${value.localName}> is not available in the playground`);
    const attrs = value.attributeEntries.filter(([name, data]) => attributes.has(name) && data.length <= 2_000);
    if (value.localName === "a" && /^#[A-Za-z0-9_.:-]+$/.test(value.getAttribute("href") || "")) attrs.push(["href", value.getAttribute("href")]);
    return [[1, value.localName, 0, attrs, value.childNodes.flatMap(nodes)]];
  }
  const tree = parsed.body.childNodes.flatMap(nodes);
  if (styles) scripts.unshift({ source: "index.html#style", code: `var style=document.createElement("style");style.textContent=${JSON.stringify(styles)};document.head.appendChild(style);` });
  return { tree, scripts };
}

async function renderOutput() {
  try {
    const program = outputProgram(source);
    preview?.destroy();
    outputRoot.replaceChildren();
    preview = await mountResourcesProjectPreview({ root: outputRoot, scripts: [], onViolation: (error) => showStatus(`Blocked: ${error.message}`) });
    preview.setContent(program.tree);
    await preview.run(program.scripts);
    showStatus("");
  } catch (error) {
    showStatus(`Blocked: ${error.message}`);
  }
}

function scheduleOutput() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderOutput, 350);
}

const saved = sessionStorage.getItem(SESSION_KEY);
editor = await mountResourcesProjectEditor({
  root: editorRoot,
  limits: { maxLines: 500, maxCharacters: 160_000, maxCodePoints: 80_000, maxLineCodePoints: 256 },
  onReady() {},
  onLimit(usage) {
    const reason = usage.input === "paste" ? "Paste refused" : "Change refused";
    showStatus(`${reason}: use at most 500 lines, 80,000 code points, and 256 code points per pasted line.`);
  },
  onChange(value) {
    source = value;
    try {
      const state = editor.callGuest("__codeEditorSerialize", { maxUndo: 200, maxRedo: 50, maxBytes: 2 * 1024 * 1024 });
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch (error) { showStatus(`Session state was not stored: ${error.message}`); }
    scheduleOutput();
  },
});
const colorScheme = matchMedia("(prefers-color-scheme: light)");
const applyTheme = () => editor.setTheme(colorScheme.matches ? "light" : "dark");
applyTheme();
colorScheme.addEventListener("change", applyTheme);
editor.setContent(DEFAULT_SOURCE, "html");
if (saved) {
  try {
    const state = JSON.parse(saved);
    editor.callGuest("__codeEditorRestore", state);
    source = state.doc;
  } catch (error) {
    sessionStorage.removeItem(SESSION_KEY);
    showStatus(`Saved session was discarded: ${error.message}`);
  }
}
await renderOutput();
editor.focus();
