import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap,
  insertBracket }
  from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, insertNewlineAndIndent, redo, undo }
  from "@codemirror/commands";
import { bracketMatching, defaultHighlightStyle, foldCode, foldGutter, foldKeymap,
  indentOnInput, syntaxHighlighting }
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

const bridgedLineGeometry = EditorView.theme({
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

// The browser's native selection and caret are exposed to this guest,
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
  const initial = parent.getAttribute("data-initial");
  let current = initial && fixtures[initial] ? initial : "typescript";
  const view = new EditorView({
    doc: initial === "blank" ? "" : fixtures[current].text,
    extensions: [editorSetup, gutterProjection,
      language.of(languages[current]()), oneDark, nativeCaret, bridgedLineGeometry,
      EditorView.lineWrapping],
    parent,
  });
  scheduleGutterSync(view);
  // The guest has no ambient ResizeObserver. Give CodeMirror one post-mount
  // measurement so its height map uses browser geometry rather than
  // initial estimates (notably for pointer and drop coordinates).
  setTimeout(() => view.requestMeasure(), 0);
  // Native CodeMirror uses browser-owned contenteditable mutations. The guest
  // adapter currently owns edits explicitly while its MutationObserver and
  // selection ordering are brought to parity. Cancel the native mutation
  // before dispatch so there can never be two authorities for one keypress.
  if (Number.isInteger(document.reference)) view.contentDOM.addEventListener("keydown", (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (!event.altKey && modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.stopImmediatePropagation();
      (event.shiftKey ? redo : undo)(view);
      return;
    }
    if (!event.altKey && event.ctrlKey && event.key.toLowerCase() === "y") {
      event.preventDefault();
      event.stopImmediatePropagation();
      redo(view);
      return;
    }
    if (event.altKey || modifier) return;
    if (event.key.length !== 1 && (event.shiftKey || event.key !== "Enter")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key.length === 1) {
      const bracket = insertBracket(view.state, event.key);
      if (bracket) {
        view.dispatch(bracket);
        return;
      }
      const range = view.state.selection.main;
      const at = range.from + event.key.length;
      view.dispatch({
        changes: { from: range.from, to: range.to, insert: event.key },
        selection: { anchor: at },
        userEvent: "input.type",
      });
      return;
    }
    if (view.contentDOM.getAttribute("aria-activedescendant") && acceptCompletion(view)) return;
    insertNewlineAndIndent(view);
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
