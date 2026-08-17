import { EditorView } from "@codemirror/view";

// The browser already knows the exact geometry of its projected contenteditable
// tree. Until layout measurements cross the Wasm boundary, its native caret is
// both more accurate and less expensive than CodeMirror's positioned cursor.
export const nativeCaret = EditorView.theme({
  "&.cm-focused .cm-content, &.cm-focused .cm-line": {
    caretColor: "#528bff !important",
  },
  ".cm-cursorLayer": { display: "none" },
});
