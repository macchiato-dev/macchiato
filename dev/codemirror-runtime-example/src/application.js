import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

export function start() {
  const parent = document.getElementById("editor");
  const view = new EditorView({
    doc: "const engine = 'replaceable';",
    extensions: [basicSetup, javascript(), oneDark, EditorView.lineWrapping],
    parent,
  });

  globalThis.editorExample = {
    text() { return view.state.doc.toString(); },
    dispose() { view.destroy(); },
  };
  globalThis.__wwcResult = () =>
    `CodeMirror:${view.state.doc.toString()}:${view.dom.className}`;
}
