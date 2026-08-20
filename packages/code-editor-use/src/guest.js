import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { Compartment, EditorSelection, EditorState, findClusterBreak } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { oneDark } from "@codemirror/theme-one-dark";
import { redo, undo } from "@codemirror/commands";
import { closeSearchPanel, openSearchPanel } from "@codemirror/search";
import { closeCompletion, startCompletion } from "@codemirror/autocomplete";
import { hasSyntaxErrors } from "./syntax.js";

if (!globalThis.__browserUseNotify && globalThis.__wwcPostMessage) {
  globalThis.__browserUseNotify = globalThis.__wwcPostMessage;
}

const parent = document.getElementById("editor");
const editorSetup = new Compartment();
const language = new Compartment();
const editability = new Compartment();
const appearance = new Compartment();
const nativeSelectionTheme = EditorView.theme({
  ".cm-content .cm-line::selection, .cm-content .cm-line ::selection": { backgroundColor: "#3e526f !important" },
});
const lightEditorTheme = EditorView.theme({
  "&": { color: "#263338", backgroundColor: "#d9e1e3" },
  ".cm-content": { caretColor: "#1f5268" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#1f5268" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#9fbfcd" },
  ".cm-activeLine": { backgroundColor: "#cedadd" },
  ".cm-gutters": { color: "#66777e", backgroundColor: "#cbd6d9", borderRightColor: "#aebec3" },
  ".cm-activeLineGutter": { color: "#25363d", backgroundColor: "#becdd1" },
  ".cm-panels, .cm-tooltip": { color: "#263338", backgroundColor: "#d2dcdf" },
}, { dark: false });
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#6c3d82" },
  { tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName], color: "#265d73" },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "#7a4b22" },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: "#765b12" },
  { tag: [tags.definition(tags.name), tags.separator], color: "#304f66" },
  { tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: "#875025" },
  { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link], color: "#3b6b64" },
  { tag: [tags.meta, tags.comment], color: "#63747a", fontStyle: "italic" },
  { tag: tags.string, color: "#43682e" },
  { tag: tags.invalid, color: "#a12c36" },
]);
let currentTheme = "dark";
function appearanceExtension() {
  return currentTheme === "light"
    ? [lightEditorTheme, syntaxHighlighting(lightHighlightStyle)]
    : oneDark;
}
let applyingHostContent = false;
let resetHistoryOnNextEdit = false;
let currentLanguage = "javascript";
let currentReadOnly = false;
let documentLimits = { maxLines: 5_000, maxCharacters: 1_000_000 };
function documentUsage(doc) {
  return {
    characters: doc.length,
    lines: doc.lines,
    remainingCharacters: documentLimits.maxCharacters - doc.length,
    remainingLines: documentLimits.maxLines - doc.lines,
  };
}
const documentLimitFilter = EditorState.transactionFilter.of((transaction) => {
  if (transaction.newDoc.length <= documentLimits.maxCharacters && transaction.newDoc.lines <= documentLimits.maxLines) return transaction;
  globalThis.__browserUseNotify(JSON.stringify({
    type: "limit",
    ...documentUsage(transaction.newDoc),
    limits: documentLimits,
  }));
  return [];
});
function languageExtension(name) {
  if (name === "javascript") return javascript();
  if (name === "html") return html();
  if (name === "css") return css();
  if (name === "json") return json();
  if (name === "markdown") return markdown();
  return [];
}
function editorExtensions() {
  return [
    keymap.of([
      { key: "Ctrl-z", run: undo },
      { key: "Ctrl-Shift-z", run: redo },
      { key: "Ctrl-y", run: redo },
      { key: "Meta-z", run: undo },
      { key: "Meta-Shift-z", run: redo },
      { key: "Mod-z", run: undo },
      { key: "Mod-Shift-z", run: redo },
    ]),
    editorSetup.of(basicSetup),
    lineNumbers(),
    language.of(languageExtension(currentLanguage)),
    editability.of([
      EditorState.readOnly.of(currentReadOnly),
      EditorView.contentAttributes.of({ "aria-readonly": currentReadOnly ? "true" : "false" }),
    ]),
    appearance.of(appearanceExtension()),
    EditorView.lineWrapping,
    nativeSelectionTheme,
    documentLimitFilter,
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !applyingHostContent) {
        globalThis.__browserUseNotify(JSON.stringify({
          type: "change",
          content: update.state.doc.toString(),
          characters: update.state.doc.length,
          lines: update.state.doc.lines,
          syntaxErrors: hasSyntaxErrors(update.state, currentLanguage),
        }));
      }
    }),
  ];
}
function mountEditor(content = 'const greeting = "Hello, constrained editor!";\nconsole.log(greeting);') {
  const state = EditorState.create({ doc: content, extensions: editorExtensions() });
  globalThis.__codeEditorView = new EditorView({ state, parent });
  globalThis.__codeEditorView.contentDOM.addEventListener("beforeinput", (event) => {
    const handle = globalThis.__codeEditorBeforeInput;
    if (typeof handle !== "function") return;
    const result = JSON.parse(handle(JSON.stringify({ inputType: event.inputType, data: event.data })));
    if (!result.handled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  globalThis.__browserUseNotify(JSON.stringify({
    type: "ready", characters: state.doc.length, lines: state.doc.lines,
  }));
  return globalThis.__codeEditorView;
}
if (!globalThis.__CODE_EDITOR_DEFER_START__) mountEditor();
function setSelection(anchor, head = anchor) {
  const view = globalThis.__codeEditorView;
  const length = view.state.doc.length;
  anchor = Math.max(0, Math.min(length, Number(anchor)));
  head = Math.max(0, Math.min(length, Number(head)));
  view.dispatch({ selection: { anchor, head }, scrollIntoView: true });
  view.focus();
  const selection = view.state.selection.main;
  return { anchor: selection.anchor, head: selection.head, from: selection.from, to: selection.to };
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
    if (event.mod) {
      next = event.key === "ArrowUp" ? 0 : view.state.doc.length;
      setSelection(event.shiftKey ? selection.anchor : next, next);
      return true;
    }
    const moved = view.moveVertically(selection, event.key === "ArrowDown");
    const range = event.shiftKey
      ? EditorSelection.range(selection.anchor, moved.head, moved.goalColumn, moved.bidiLevel, moved.assoc)
      : moved;
    view.dispatch({ selection: range, scrollIntoView: true });
    view.focus();
    return true;
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
  const view = globalThis.__codeEditorView;
  const viewportLine = view.state.doc.lineAt(view.viewport.from).number;
  const positionFromLocation = (location) => {
    if (!location) return null;
    const lineNumber = Math.max(1, Math.min(view.state.doc.lines, viewportLine + Number(location.renderedLineIndex)));
    const line = view.state.doc.line(lineNumber);
    return line.from + Math.max(0, Math.min(line.length, Number(location.lineOffset)));
  };
  const head = positionFromLocation(selection.headLocation) ?? selection.head;
  const anchor = selection.anchor ?? positionFromLocation(selection.anchorLocation) ?? head;
  return JSON.stringify(setSelection(anchor, head));
};
globalThis.__codeEditorGetSelection = () => {
  const selection = globalThis.__codeEditorView.state.selection.main;
  return JSON.stringify({ anchor: selection.anchor, head: selection.head, from: selection.from, to: selection.to });
};
globalThis.__codeEditorSelectLine = (json) => {
  const request = JSON.parse(json);
  const view = globalThis.__codeEditorView;
  const viewportLine = view.state.doc.lineAt(view.viewport.from).number;
  const lineNumber = Math.max(1, Math.min(view.state.doc.lines, viewportLine + Number(request.renderedLineIndex)));
  const line = view.state.doc.line(lineNumber);
  return JSON.stringify(setSelection(line.from, Math.min(view.state.doc.length, line.to + 1)));
};
globalThis.__codeEditorInspect = () => {
  const view = globalThis.__codeEditorView;
  if (!view) return JSON.stringify({ document: "", selection: null, viewport: null, usage: { characters: 0, lines: 0 }, limits: documentLimits });
  const selection = view.state.selection.main;
  return JSON.stringify({
    document: view.state.doc.toString(),
    selection: { anchor: selection.anchor, head: selection.head, from: selection.from, to: selection.to },
    viewport: { from: view.viewport.from, to: view.viewport.to },
    usage: documentUsage(view.state.doc),
    limits: documentLimits,
  });
};
globalThis.__codeEditorConfigureLimits = (json) => {
  const request = JSON.parse(json);
  for (const name of ["maxLines", "maxCharacters"]) {
    if (!Number.isSafeInteger(request[name]) || request[name] < 1) throw new TypeError(`${name} must be a positive integer`);
  }
  documentLimits = Object.freeze({ maxLines: request.maxLines, maxCharacters: request.maxCharacters });
  const view = globalThis.__codeEditorView;
  return JSON.stringify({ limits: documentLimits, ...(view ? documentUsage(view.state.doc) : { characters: 0, lines: 0 }) });
};
globalThis.__codeEditorSetTheme = (json) => {
  const requested = JSON.parse(json).theme;
  if (!["dark", "light"].includes(requested)) throw new TypeError("Editor theme must be dark or light");
  currentTheme = requested;
  globalThis.__codeEditorView?.dispatch({ effects: appearance.reconfigure(appearanceExtension()) });
  return JSON.stringify({ theme: currentTheme });
};
globalThis.__codeEditorSetContent = (json) => {
  const request = JSON.parse(json);
  if (typeof request.content !== "string") throw new TypeError("Editor content must be a string");
  const requestedLines = request.content.split("\n").length;
  if (request.content.length > documentLimits.maxCharacters || requestedLines > documentLimits.maxLines) {
    throw new RangeError(`Editor content exceeds its document budget (${requestedLines}/${documentLimits.maxLines} lines, ${request.content.length}/${documentLimits.maxCharacters} characters)`);
  }
  const languageChanged = currentLanguage !== request.language;
  currentLanguage = request.language;
  currentReadOnly = request.readOnly === true;
  if (!globalThis.__codeEditorView || languageChanged) {
    globalThis.__codeEditorView?.destroy();
    parent.replaceChildren();
    const view = mountEditor(request.content);
    return JSON.stringify(documentUsage(view.state.doc));
  }
  const view = globalThis.__codeEditorView;
  applyingHostContent = true;
  try {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: request.content },
      selection: { anchor: 0 },
      effects: [
        language.reconfigure(languageExtension(request.language)),
        editability.reconfigure([
          EditorState.readOnly.of(request.readOnly === true),
          EditorView.contentAttributes.of({ "aria-readonly": request.readOnly === true ? "true" : "false" }),
        ]),
      ],
    });
  } finally {
    applyingHostContent = false;
  }
  if (request.resetHistoryOnEdit === true) resetHistoryOnNextEdit = true;
  return JSON.stringify(documentUsage(view.state.doc));
};
let searchPanel = null;
let searchInput = null;
let searchQuery = "";
let completion = null;
function findSearchMatch({ restart = false } = {}) {
  if (!searchQuery) return false;
  const view = globalThis.__codeEditorView;
  const text = view.state.doc.toString();
  const start = restart ? 0 : view.state.selection.main.to;
  let from = text.indexOf(searchQuery, start);
  if (from < 0 && start > 0) from = text.indexOf(searchQuery);
  if (from < 0) return false;
  view.dispatch({ selection: { anchor: from, head: from + searchQuery.length }, scrollIntoView: true });
  return true;
}
function findPreviousSearchMatch() {
  if (!searchQuery) return false;
  const view = globalThis.__codeEditorView;
  const text = view.state.doc.toString();
  const before = Math.max(0, view.state.selection.main.from - 1);
  let from = text.lastIndexOf(searchQuery, before);
  if (from < 0) from = text.lastIndexOf(searchQuery);
  if (from < 0) return false;
  view.dispatch({ selection: { anchor: from, head: from + searchQuery.length }, scrollIntoView: true });
  return true;
}
function showSearchPanel() {
  if (searchPanel) {
    searchInput.focus();
    return true;
  }
  searchPanel = document.createElement("div");
  searchPanel.className = "cm-panels cm-panels-bottom";
  const panel = document.createElement("div");
  panel.className = "cm-panel cm-search";
  const input = document.createElement("input");
  input.type = "text";
  input.name = "search";
  input.setAttribute("aria-label", "Find");
  input.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    findSearchMatch({ restart: true });
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      findSearchMatch();
      event.preventDefault();
    }
  });
  const previous = document.createElement("button");
  previous.type = "button";
  previous.setAttribute("aria-label", "Previous match");
  previous.textContent = "↑";
  previous.addEventListener("click", findPreviousSearchMatch);
  const next = document.createElement("button");
  next.type = "button";
  next.setAttribute("aria-label", "Next match");
  next.textContent = "↓";
  next.addEventListener("click", () => findSearchMatch());
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Close search");
  close.textContent = "×";
  close.addEventListener("click", () => { hideOverlays(); globalThis.__codeEditorView.focus(); });
  panel.appendChild(input);
  panel.appendChild(previous);
  panel.appendChild(next);
  panel.appendChild(close);
  searchPanel.appendChild(panel);
  globalThis.__codeEditorView.dom.appendChild(searchPanel);
  searchInput = input;
  input.focus();
  return true;
}
function hideOverlays() {
  let hidden = false;
  if (searchPanel) {
    searchPanel.remove();
    searchPanel = null;
    searchInput = null;
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
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  let handled = false;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) handled = moveSelection(event);
  else if (event.key.toLowerCase() === "f" && (mac ? event.metaKey : event.ctrlKey)) handled = showSearchPanel();
  else if (event.code === "Space" && event.ctrlKey) handled = showCompletion();
  else if (event.key === "z" && event.mod && event.shiftKey) handled = redo(view);
  else if (event.key === "z" && event.mod) handled = undo(view);
  else if (event.key === "Escape") {
    handled = hideOverlays() || closeCompletion(view) || closeSearchPanel(view);
    if (handled) view.focus();
  }
  const selection = view.state.selection.main;
  return JSON.stringify({ handled: Boolean(handled), from: selection.from, to: selection.to });
};
globalThis.__codeEditorBeforeInput = (json) => {
  const event = JSON.parse(json);
  const view = globalThis.__codeEditorView;
  if (resetHistoryOnNextEdit) {
    resetHistoryOnNextEdit = false;
    view.setState(EditorState.create({
      doc: view.state.doc,
      selection: view.state.selection,
      extensions: editorExtensions(),
    }));
  }
  const selection = view.state.selection.main;
  if (view.state.readOnly) return JSON.stringify({ handled: true, from: selection.from, to: selection.to });
  let from = selection.from;
  let to = selection.to;
  let insert = "";
  if (event.inputType === "insertText" || event.inputType === "insertCompositionText") {
    insert = event.data || "";
    const pairs = { "(": ")", "[": "]", "{": "}", "\"": "\"", "'": "'", "`": "`" };
    const closing = new Set(Object.values(pairs));
    if (from === to && pairs[insert]) {
      view.dispatch({ changes: { from, to, insert: insert + pairs[insert] }, selection: { anchor: from + 1 }, userEvent: "input.type" });
      const pairedSelection = view.state.selection.main;
      return JSON.stringify({ handled: true, from: pairedSelection.from, to: pairedSelection.to });
    }
    if (from === to && closing.has(insert) && view.state.doc.sliceString(from, from + 1) === insert) {
      setSelection(from + 1);
      return JSON.stringify({ handled: true, from: from + 1, to: from + 1 });
    }
  } else if (event.inputType === "insertLineBreak" || event.inputType === "insertParagraph") {
    insert = "\\n";
  } else if (event.inputType === "deleteContentBackward") {
    if (from === to && from > 0) from -= 1;
  } else if (event.inputType === "deleteContentForward") {
    if (from === to && to < view.state.doc.length) to += 1;
  } else {
    return JSON.stringify({ handled: false, from: selection.from, to: selection.to });
  }
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    userEvent: event.inputType.startsWith("delete") ? "delete.backward" : "input.type",
  });
  const nextSelection = view.state.selection.main;
  return JSON.stringify({ handled: true, from: nextSelection.from, to: nextSelection.to });
};
