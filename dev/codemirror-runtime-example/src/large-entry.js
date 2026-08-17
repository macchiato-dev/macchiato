import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import documentText from "../generated/large-fixture.js";
import { nativeCaret } from "./native-caret.js";

const view = new EditorView({
  doc: documentText,
  extensions: [basicSetup, javascript({ typescript: true }), oneDark, nativeCaret,
    EditorView.lineWrapping],
  parent: document.getElementById("editor"),
});

globalThis.__wwcResult = () => `CodeMirror:large:${view.state.doc.lines}`;
