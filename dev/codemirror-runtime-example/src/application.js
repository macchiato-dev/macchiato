import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { openSearchPanel, SearchQuery, setSearchQuery } from "@codemirror/search";
import { foldCode } from "@codemirror/language";
import fixtures from "../generated/fixtures.js";

const languages = {
  typescript: () => javascript({ typescript: true }),
  html,
  css,
  json,
  markdown,
};

export function start() {
  const parent = document.getElementById("editor");
  const language = new Compartment();
  let current = "typescript";
  const view = new EditorView({
    doc: fixtures[current].text,
    extensions: [basicSetup, language.of(languages[current]()), oneDark,
      EditorView.lineWrapping],
    parent,
  });

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
