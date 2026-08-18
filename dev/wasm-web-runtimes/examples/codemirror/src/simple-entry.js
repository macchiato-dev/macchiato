import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { nativeCaret } from "./native-caret.js";

const documentText = `function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("QuickJS"));`;

const view = new EditorView({
  doc: documentText,
  extensions: [
    lineNumbers(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    javascript(),
    oneDark,
    nativeCaret,
  ],
  parent: document.getElementById("editor"),
});

globalThis.__wwcResult = () => `CodeMirror:simple:${view.state.doc.lines}`;
