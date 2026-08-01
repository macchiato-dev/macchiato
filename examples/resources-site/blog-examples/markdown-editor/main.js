import { basicSetup } from "codemirror";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkHtml from "remark-html";

const demo = `# A small Markdown editor

Edit this text and the **safe preview** updates alongside it.

- CodeMirror provides the editor
- Remark parses the Markdown`;
const embedded = window.parent !== window;
const initial = embedded ? "" : demo;
const preview = document.querySelector("#preview");
const projectPreview = document.querySelector("#project-preview");
const language = new Compartment();
function languageExtension(name) {
  if (name === "javascript") return javascript();
  if (name === "html") return html();
  if (name === "css") return css();
  if (name === "markdown") return markdown();
  return [];
}
async function render(source) {
  const result = await unified().use(remarkParse).use(remarkHtml, { sanitize: true }).process(source);
  preview.innerHTML = String(result);
}
function projectDocument(snapshot) {
  const files = new Map((snapshot?.files || []).map((file) => [file.path, file.content]));
  const entry = snapshot?.config?.entry || "index.html";
  let source = files.get(entry) || "";
  if (entry.endsWith(".svg")) return `<!doctype html><style>html,body{margin:0;min-height:100%;background:#151717}svg{display:block;max-width:100%;height:auto}</style>${source}`;
  source = source.replace(/<link\b[^>]*href=["']\.\/(.*?)['"][^>]*>/gi, (tag, path) => files.has(path) && /\brel=["']stylesheet["']/i.test(tag) ? `<style>${files.get(path).replaceAll("</style", "<\\/style")}</style>` : tag);
  source = source.replace(/<script\b[^>]*src=["']\.\/(.*?)['"][^>]*><\/script>/gi, (tag, path) => files.has(path) ? `<script>${files.get(path).replaceAll("</script", "<\\/script")}<\/script>` : tag);
  return source;
}
function renderProject(snapshot) {
  preview.hidden = true;
  projectPreview.hidden = false;
  projectPreview.srcdoc = projectDocument(snapshot);
}
const view = new EditorView({
  parent: document.querySelector("#editor"),
  state: EditorState.create({
    doc: initial,
    extensions: [basicSetup, oneDark, language.of(markdown()), EditorView.lineWrapping, EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString();
        render(content);
        if (embedded) parent.postMessage({ protocol: "resources-project-editor-v1", type: "change", content }, "*");
      }
    })],
  }),
});
render(initial);
const workspace = document.querySelector("main");
const splitter = document.querySelector(".splitter");
function setSplit(clientX) {
  const rect = workspace.getBoundingClientRect();
  const percent = Math.max(20, Math.min(80, ((clientX - rect.left) / rect.width) * 100));
  workspace.style.setProperty("--source-width", `${percent}%`);
  splitter.setAttribute("aria-valuenow", String(Math.round(percent)));
}
splitter.addEventListener("pointerdown", (event) => {
  splitter.setPointerCapture(event.pointerId);
  setSplit(event.clientX);
});
splitter.addEventListener("pointermove", (event) => {
  if (splitter.hasPointerCapture(event.pointerId)) setSplit(event.clientX);
});
splitter.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const current = Number(splitter.getAttribute("aria-valuenow") || 50);
  const next = Math.max(20, Math.min(80, current + (event.key === "ArrowRight" ? 5 : -5)));
  workspace.style.setProperty("--source-width", `${next}%`);
  splitter.setAttribute("aria-valuenow", String(next));
});
for (const button of document.querySelectorAll("[data-view]")) {
  button.addEventListener("click", () => {
    workspace.dataset.view = button.dataset.view;
    for (const item of document.querySelectorAll("[data-view]")) item.setAttribute("aria-pressed", item === button ? "true" : "false");
    if (button.dataset.view !== "preview") view.focus();
  });
}
if (embedded) {
  document.body.dataset.embedded = "true";
  addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== parent || message?.protocol !== "resources-project-editor-v1") return;
    if (message.type === "set-content" && typeof message.content === "string" && message.content.length <= 1_000_000) {
      document.body.dataset.mode = message.mode === "markdown" ? "markdown" : "code";
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: message.content },
        effects: language.reconfigure(languageExtension(message.language)),
      });
      if (message.mode === "markdown") {
        projectPreview.hidden = true;
        preview.hidden = false;
        render(message.content);
      } else if (message.snapshot) renderProject(message.snapshot);
      view.focus();
      parent.postMessage({ protocol: "resources-project-editor-v1", type: "content-set" }, "*");
    }
  });
  parent.postMessage({ protocol: "resources-project-editor-v1", type: "ready" }, "*");
}
