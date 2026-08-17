import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import documentText from "../generated/large-fixture.js";

const view = new EditorView({
  doc: documentText,
  extensions: [basicSetup, javascript({ typescript: true }), oneDark,
    EditorView.lineWrapping],
  parent: document.getElementById("editor"),
});

globalThis.__wwcResult = () => `CodeMirror:large:${view.state.doc.lines}`;
