import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap }
  from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentLess, redo, undo }
  from "@codemirror/commands";
import { bracketMatching, defaultHighlightStyle, foldCode, foldGutter, foldKeymap,
  getIndentUnit, indentOnInput, indentString, syntaxHighlighting }
  from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, openSearchPanel, SearchQuery, searchKeymap,
  setSearchQuery } from "@codemirror/search";
import { Compartment, EditorState } from "@codemirror/state";
import { crosshairCursor, dropCursor, EditorView, highlightActiveLine,
  highlightActiveLineGutter, keymap, lineNumbers,
  rectangularSelection } from "@codemirror/view";
import fixtures from "../generated/fixtures.js";
import { nativeCaret } from "./native-caret.js";

const languages = {
  typescript: () => javascript({ typescript: true }),
  html,
  css,
  json,
  markdown,
};

function projectBrowserSelection(view) {
  const range = view.state.selection.main;
  const anchor = view.domAtPos(range.anchor);
  const head = view.domAtPos(range.head);
  const selection = document.getSelection();
  selection.collapse(anchor.node, anchor.offset);
  if (range.anchor !== range.head) selection.extend(head.node, head.offset);
}

function readBrowserSelection(view) {
  const selection = document.getSelection();
  if (!selection || !selection.anchorNode || !selection.focusNode) return;
  const anchor = view.posAtDOM(selection.anchorNode, selection.anchorOffset);
  const head = view.posAtDOM(selection.focusNode, selection.focusOffset);
  const current = view.state.selection.main;
  if (current.anchor !== anchor || current.head !== head) {
    view.dispatch({ selection: { anchor, head } });
  }
}

function moveOneLine(view, direction) {
  const state = view.state;
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  const number = Math.max(1, Math.min(state.doc.lines, line.number + direction));
  const target = state.doc.line(number);
  const column = head - line.from;
  view.dispatch({ selection: { anchor: target.from + Math.min(column, target.length) },
    scrollIntoView: true, userEvent: "select" });
}

const browserSelectionProjection = EditorView.updateListener.of((update) => {
  if (update.docChanged || update.selectionSet || update.viewportChanged) {
    projectBrowserSelection(update.view);
  }
});

const projectedLineGeometry = EditorView.theme({
  ".cm-content": { lineHeight: "18px" },
});

let syncingGutter = false;
function scheduleGutterSync(view) {
  if (syncingGutter) return;
  syncingGutter = true;
  try {
    const lines = view.contentDOM.querySelectorAll(".cm-line");
    const numbers = view.dom.querySelectorAll(".cm-lineNumbers .cm-gutterElement");
    if (!lines.length || numbers.length !== lines.length + 1) return;
    numbers[0].style.height = "0px";
    const gutter = numbers[0].parentElement;
    const top = Math.max(0, lines[0].getBoundingClientRect().top -
      gutter.getBoundingClientRect().top);
    gutter.style.setProperty("padding-top", `${top}px`);
    const foldGutter = view.dom.querySelectorAll(".cm-foldGutter")[0];
    if (foldGutter) foldGutter.style.setProperty("padding-top", `${top}px`);
    for (let index = 0; index < lines.length; index++) {
      numbers[index + 1].style.height = `${lines[index].getBoundingClientRect().height}px`;
    }
  } finally {
    syncingGutter = false;
  }
}

const gutterProjection = EditorView.updateListener.of((update) => {
  if (update.docChanged || update.geometryChanged || update.viewportChanged) {
    scheduleGutterSync(update.view);
  }
});

// The browser's native selection and caret are the projection for this guest,
// so this intentionally omits CodeMirror's drawSelection() extension.
const editorSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  foldGutter(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap,
    ...historyKeymap, ...foldKeymap, ...completionKeymap, ...lintKeymap]),
];

export function start() {
  const parent = document.getElementById("editor");
  const language = new Compartment();
  let current = "typescript";
  const view = new EditorView({
    doc: fixtures[current].text,
    extensions: [editorSetup, browserSelectionProjection, gutterProjection,
      language.of(languages[current]()), oneDark, nativeCaret, projectedLineGeometry,
      EditorView.lineWrapping],
    parent,
  });
  projectBrowserSelection(view);
  scheduleGutterSync(view);
  // The guest has no ambient ResizeObserver. Give CodeMirror one post-mount
  // measurement so its height map uses projected browser geometry rather than
  // initial estimates (notably for pointer and drop coordinates).
  setTimeout(() => view.requestMeasure(), 0);
  let dragging = false;
  view.contentDOM.addEventListener("mouseup", () => {
    if (!dragging) readBrowserSelection(view);
  });
  view.contentDOM.addEventListener("pointerup", () => {
    if (!dragging) readBrowserSelection(view);
  });
  view.contentDOM.addEventListener("dragstart", () => {
    dragging = true;
  });
  view.contentDOM.addEventListener("dragend", () => {
    projectBrowserSelection(view);
    setTimeout(() => {
      projectBrowserSelection(view);
      dragging = false;
    }, 0);
  });
  // The browser projection must not independently mutate contenteditable.
  // Handle ordinary text/navigation in the guest before CodeMirror's bubble
  // listener, while leaving shortcuts and composition to their own handlers.
  view.contentDOM.addEventListener("keydown", (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (!event.altKey && modifier && event.key.toLowerCase() === "z") {
      (event.shiftKey ? redo : undo)(view);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!event.altKey && event.ctrlKey && event.key.toLowerCase() === "y") {
      redo(view);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.altKey || modifier) return;
    if (event.key.length === 1) {
      const range = view.state.selection.main;
      const line = view.state.doc.lineAt(range.from);
      const dedentClosingBrace = event.key === "}" &&
        !/\S/.test(view.state.sliceDoc(line.from, range.from));
      const at = range.from + event.key.length;
      view.dispatch({
        changes: { from: range.from, to: range.to, insert: event.key },
        selection: { anchor: at },
        userEvent: "input.type",
      });
      if (dedentClosingBrace) indentLess(view);
    } else if (!event.shiftKey && event.key === "ArrowUp") moveOneLine(view, -1);
    else if (!event.shiftKey && event.key === "ArrowDown") moveOneLine(view, 1);
    else if (!event.shiftKey && event.key === "Enter") {
      const state = view.state;
      const range = state.selection.main;
      const line = state.doc.lineAt(range.from);
      const before = state.sliceDoc(line.from, range.from);
      let indent = /^\s*/.exec(line.text)[0];
      if (/[{[(]\s*$/.test(before)) {
        indent += indentString(state, getIndentUnit(state));
      }
      const insert = state.lineBreak + indent;
      view.dispatch({
        changes: { from: range.from, to: range.to, insert },
        selection: { anchor: range.from + insert.length },
        userEvent: "input",
      });
    }
    else return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  globalThis.editorExample = {
    text() { return view.state.doc.toString(); },
    open(name) {
      if (!fixtures[name]) throw new RangeError(`Unknown fixture: ${name}`);
      current = name;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: fixtures[name].text },
        effects: language.reconfigure(languages[name]()),
      });
      return { name, path: fixtures[name].path, lines: view.state.doc.lines };
    },
    type(text) {
      for (const character of text) {
        const at = view.state.selection.main.head;
        view.dispatch({ changes: { from: at, insert: character },
          selection: { anchor: at + character.length } });
      }
      return view.state.doc.length;
    },
    benchmark(name = current, count = 200) {
      this.open(name);
      const original = view.state.doc.length;
      const started = Date.now();
      for (let index = 0; index < count; index++) {
        view.dispatch({ changes: { from: view.state.doc.length,
          insert: index % 7 ? "x" : "\n" } });
      }
      const elapsed = Date.now() - started;
      view.dispatch({ changes: { from: original, to: view.state.doc.length } });
      return { name, count, elapsed, lines: view.state.doc.lines };
    },
    metrics() { return globalThis.__wwcDomMetrics?.(); },
    dispose() { view.destroy(); },
  };
  globalThis.__wwcBenchmark = () => {
    const results = [];
    for (const name of Object.keys(languages)) {
      const measurement = editorExample.benchmark(name, 100);
      results.push(`${name}=${measurement.lines}/${measurement.elapsed}ms`);
    }
    editorExample.open("typescript");
    return results.join(",");
  };
  globalThis.__wwcResult = () => {
    const metrics = globalThis.__wwcDomMetrics?.();
    return `CodeMirror:typescript=${view.state.doc.lines}:nodes=${metrics?.nodes}:listeners=${metrics?.listeners}`;
  };
  globalThis.__wwcPrepareVisual = () => {
    openSearchPanel(view);
    view.dispatch({
      selection: { anchor: view.state.doc.line(13).from },
      effects: setSearchQuery.of(new SearchQuery({ search: "URL" })),
    });
    foldCode(view);
  };
}
