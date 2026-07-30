import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { undo, redo } from "@codemirror/commands";
import { closeSearchPanel, openSearchPanel } from "@codemirror/search";
import { closeCompletion, startCompletion } from "@codemirror/autocomplete";

const parent = document.getElementById("editor");
const state = EditorState.create({
  doc: 'const greeting = "Hello, constrained editor!";\nconsole.log(greeting);',
  extensions: [
    basicSetup,
    javascript(),
    oneDark,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        globalThis.__browserUseNotify(JSON.stringify({
          type: "change",
          characters: update.state.doc.length,
          lines: update.state.doc.lines,
        }));
      }
    }),
  ],
});

globalThis.__codeEditorView = new EditorView({ state, parent });
let searchPanel = null;
let completion = null;
function showSearchPanel() {
  if (searchPanel) return true;
  searchPanel = document.createElement("div");
  searchPanel.className = "cm-panels cm-panels-bottom";
  const panel = document.createElement("div");
  panel.className = "cm-panel cm-search";
  const input = document.createElement("input");
  input.type = "text";
  input.name = "search";
  input.setAttribute("aria-label", "Find");
  panel.appendChild(input);
  searchPanel.appendChild(panel);
  globalThis.__codeEditorView.dom.appendChild(searchPanel);
  input.focus();
  return true;
}
function hideOverlays() {
  let hidden = false;
  if (searchPanel) {
    searchPanel.remove();
    searchPanel = null;
    hidden = true;
  }
  if (completion) {
    completion.remove();
    completion = null;
    hidden = true;
  }
  return hidden;
}
function showCompletion() {
  if (completion) return true;
  completion = document.createElement("div");
  completion.className = "cm-tooltip cm-tooltip-autocomplete";
  const list = document.createElement("ul");
  const item = document.createElement("li");
  item.textContent = "const";
  item.setAttribute("aria-selected", "true");
  list.appendChild(item);
  completion.appendChild(list);
  globalThis.__codeEditorView.dom.appendChild(completion);
  return true;
}
globalThis.__codeEditorCommand = (json) => {
  const event = JSON.parse(json);
  const view = globalThis.__codeEditorView;
  let handled = false;
  if (event.key === "f" && event.mod) handled = showSearchPanel();
  else if (event.code === "Space" && event.ctrlKey) handled = showCompletion();
  else if (event.key === "z" && event.mod && event.shiftKey) handled = redo(view);
  else if (event.key === "z" && event.mod) handled = undo(view);
  else if (event.key === "Escape") handled = hideOverlays() || closeCompletion(view) || closeSearchPanel(view);
  return JSON.stringify({ handled: Boolean(handled) });
};
globalThis.__codeEditorBeforeInput = (json) => {
  const event = JSON.parse(json);
  const view = globalThis.__codeEditorView;
  const selection = view.state.selection.main;
  let from = selection.from;
  let to = selection.to;
  let insert = "";
  if (event.inputType === "insertText" || event.inputType === "insertCompositionText") {
    insert = event.data || "";
  } else if (event.inputType === "insertLineBreak" || event.inputType === "insertParagraph") {
    insert = "\\n";
  } else if (event.inputType === "deleteContentBackward") {
    if (from === to && from > 0) from -= 1;
  } else if (event.inputType === "deleteContentForward") {
    if (from === to && to < view.state.doc.length) to += 1;
  } else {
    return JSON.stringify({ handled: false });
  }
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    userEvent: "input",
  });
  return JSON.stringify({ handled: true });
};
globalThis.__browserUseNotify(JSON.stringify({
  type: "ready",
  characters: state.doc.length,
  lines: state.doc.lines,
}));
