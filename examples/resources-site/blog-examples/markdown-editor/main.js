import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkHtml from "remark-html";

const initial = `# A small Markdown editor

Edit this text and the **safe preview** updates alongside it.

- CodeMirror provides the editor
- Remark parses the Markdown`;
const preview = document.querySelector("#preview");
async function render(source) {
  const result = await unified().use(remarkParse).use(remarkHtml, { sanitize: true }).process(source);
  preview.innerHTML = String(result);
}
new EditorView({
  parent: document.querySelector("#editor"),
  state: EditorState.create({
    doc: initial,
    extensions: [history(), markdown(), keymap.of([...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping, EditorView.updateListener.of((update) => {
      if (update.docChanged) render(update.state.doc.toString());
    })],
  }),
});
render(initial);
