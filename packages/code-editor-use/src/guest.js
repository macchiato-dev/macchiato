import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState, findClusterBreak } from "@codemirror/state";
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
function setSelection(anchor, head = anchor) {
  const view = globalThis.__codeEditorView;
  const length = view.state.doc.length;
  anchor = Math.max(0, Math.min(length, Number(anchor)));
  head = Math.max(0, Math.min(length, Number(head)));
  view.dispatch({ selection: { anchor, head }, scrollIntoView: true });
  view.focus();
  return { anchor, head };
}

function moveSelection(event) {
  const view = globalThis.__codeEditorView;
  const selection = view.state.selection.main;
  const head = selection.head;
  let next = head;
  if (event.key === "ArrowLeft") {
    if (!event.shiftKey && !selection.empty) next = selection.from;
    else if (head > 0) {
      const line = view.state.doc.lineAt(head);
      next = head === line.from ? head - 1 : line.from + findClusterBreak(line.text, head - line.from, false);
    }
  } else if (event.key === "ArrowRight") {
    if (!event.shiftKey && !selection.empty) next = selection.to;
    else if (head < view.state.doc.length) {
      const line = view.state.doc.lineAt(head);
      next = head === line.to ? head + 1 : line.from + findClusterBreak(line.text, head - line.from, true);
    }
  } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    const line = view.state.doc.lineAt(head);
    const targetNumber = line.number + (event.key === "ArrowUp" ? -1 : 1);
    if (targetNumber >= 1 && targetNumber <= view.state.doc.lines) {
      const target = view.state.doc.line(targetNumber);
      next = target.from + Math.min(head - line.from, target.length);
    }
  } else if (event.key === "Home") {
    next = event.mod ? 0 : view.state.doc.lineAt(head).from;
  } else if (event.key === "End") {
    next = event.mod ? view.state.doc.length : view.state.doc.lineAt(head).to;
  } else {
    return false;
  }
  setSelection(event.shiftKey ? selection.anchor : next, next);
  return true;
}

globalThis.__codeEditorSelect = (json) => {
  const selection = JSON.parse(json);
  return JSON.stringify(setSelection(selection.anchor, selection.head));
};
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
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) handled = moveSelection(event);
  else if (event.key === "f" && event.mod) handled = showSearchPanel();
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
