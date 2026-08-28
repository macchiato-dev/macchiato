import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView, lineNumbers } from "@codemirror/view";
import { mobileSyntax, mobileSyntaxTheme } from "./mobile-syntax.js";
import { nativeCaret } from "./native-caret.js";

const languages = { javascript, css, markdown, html };
const workspace = document.getElementById("workspace");
const status = document.getElementById("benchmark-status");
let view = null;
let record = null;
let revision = 0;

function percentile(values, fraction) {
  const sorted = values.slice().sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function summarize(values) {
  let sum = 0;
  for (const value of values) sum += value;
  return {
    minimum: Math.min(...values), median: percentile(values, 0.5),
    p95: percentile(values, 0.95), maximum: Math.max(...values),
    mean: sum / values.length,
  };
}

function publish() {
  status.textContent = JSON.stringify(record);
  status.setAttribute("data-ready", record.ready ? "true" : "false");
  status.setAttribute("data-revision", String(revision));
  status.getBoundingClientRect();
}

function updateListener(update) {
  if (!update.docChanged) return;
  revision++;
  status.setAttribute("data-revision", String(revision));
}

globalThis.setupMobileSyntaxBenchmark = function setup(payload) {
  const first = payload.indexOf("|");
  const second = payload.indexOf("|", first + 1);
  const strategy = payload.slice(0, first);
  const mode = payload.slice(first + 1, second);
  const text = payload.slice(second + 1);
  if (!languages[mode] || (strategy !== "normal" && strategy !== "viewport"))
    throw new RangeError("Unknown mobile syntax benchmark configuration");
  if (view) view.destroy();
  workspace.textContent = "";
  revision = 0;
  let syntaxStats = null;
  const syntax = strategy === "normal" ? [
    languages[mode](), syntaxHighlighting(defaultHighlightStyle),
  ] : [
    mobileSyntax(mode, stats => {
      syntaxStats = stats;
      if (record && record.strategy === strategy && record.mode === mode) {
        record.syntaxStats = stats;
        publish();
      }
    }), mobileSyntaxTheme,
  ];
  const started = performance.now();
  view = new EditorView({
    doc: text,
    extensions: [lineNumbers(), nativeCaret, EditorView.lineWrapping,
      EditorView.updateListener.of(updateListener), ...syntax],
    parent: workspace,
  });
  record = { strategy, mode, lines: view.state.doc.lines,
    characters: view.state.doc.length, creationMs: performance.now() - started,
    ready: false, syntaxStats, trace: null };
  publish();
  const finishWhenReady = () => requestAnimationFrame(() => {
    if (strategy === "viewport" && !syntaxStats) {
      setTimeout(finishWhenReady, 10);
      return;
    }
    record.ready = true;
    record.readyMs = performance.now() - started;
    record.syntaxStats = syntaxStats;
    publish();
  });
  requestAnimationFrame(finishWhenReady);
  return `${strategy}:${mode}:${record.lines}`;
};

globalThis.selectMobileSyntaxBenchmark = function select(payload) {
  const separator = payload.indexOf("|");
  const lineNumber = Math.max(1, Math.min(view.state.doc.lines,
    Number(payload.slice(0, separator))));
  const line = view.state.doc.line(lineNumber);
  const column = Math.max(0, Math.min(line.length, Number(payload.slice(separator + 1))));
  view.dispatch({ selection: { anchor: line.from + column }, scrollIntoView: false });
  view.focus();
  return line.from + column;
};

globalThis.showMobileSyntaxBenchmark = function show(lineText) {
  const line = view.state.doc.line(Math.max(1,
    Math.min(view.state.doc.lines, Number(lineText))));
  view.dispatch({ selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: "start" }) });
  view.focus();
  return line.from;
};

globalThis.runMobileSyntaxDispatchTrace = function runTrace(countText) {
  const count = Math.max(1, Math.min(1000, Number(countText)));
  const latencies = [];
  let seed = 0x4d595df4;
  const started = performance.now();
  for (let index = 0; index < count; index++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const line = view.state.doc.line(1 + seed % Math.min(35, view.state.doc.lines));
    const at = line.from + Math.min(line.length, (seed >>> 8) % 48);
    const before = performance.now();
    view.dispatch({
      changes: { from: at, insert: index % 11 === 0 ? "_" : "x" },
      selection: { anchor: at + 1 }, userEvent: "input.type",
    });
    latencies.push(performance.now() - before);
  }
  record.trace = { count, totalMs: performance.now() - started,
    latencyMs: summarize(latencies) };
  record.syntaxStats = record.syntaxStats || null;
  publish();
  return record.trace.totalMs;
};

globalThis.mobileSyntaxBenchmark = {
  view() { return view; },
  record() { return record; },
};
globalThis.__wwcResult = () => "CodeMirror:mobile-syntax-benchmark";
