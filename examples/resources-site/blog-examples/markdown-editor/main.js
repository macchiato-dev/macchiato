import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
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
async function render(source) {
  const result = await unified().use(remarkParse).use(remarkHtml, { sanitize: true }).process(source);
  preview.innerHTML = String(result);
}
const view = new EditorView({
  parent: document.querySelector("#editor"),
  state: EditorState.create({
    doc: initial,
    extensions: [history(), markdown(), keymap.of([...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping, EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString();
        render(content);
        if (embedded) parent.postMessage({ protocol: "resources-project-editor-v1", type: "change", content }, "*");
      }
    })],
  }),
});
render(initial);
if (embedded) {
  document.body.dataset.embedded = "true";
  addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== parent || message?.protocol !== "resources-project-editor-v1") return;
    if (message.type === "set-content" && typeof message.content === "string" && message.content.length <= 1_000_000) {
      document.body.dataset.mode = message.mode === "markdown" ? "markdown" : "code";
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: message.content } });
      view.focus();
      parent.postMessage({ protocol: "resources-project-editor-v1", type: "content-set" }, "*");
    }
  });
  parent.postMessage({ protocol: "resources-project-editor-v1", type: "ready" }, "*");
}
