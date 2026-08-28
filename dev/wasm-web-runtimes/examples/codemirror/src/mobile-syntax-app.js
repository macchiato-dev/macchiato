import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { mobileSyntax, mobileSyntaxTheme } from "./mobile-syntax.js";
import { nativeCaret } from "./native-caret.js";

const fixtureNames = {
  javascript: "JavaScript", css: "CSS", markdown: "Markdown",
  html: "HTML + CSS + JS",
};
const workspace = document.getElementById("workspace");
const tabs = document.createElement("nav");
const surface = document.createElement("div");
const status = document.createElement("div");
const records = [];
let active = 0;

tabs.className = "file-tabs";
tabs.setAttribute("aria-label", "Large syntax fixtures");
surface.className = "mobile-syntax-editor";
status.className = "mobile-syntax-status";
status.setAttribute("role", "status");
workspace.append(tabs, surface, status);

function showStats(record, stats) {
  record.stats = stats;
  status.textContent = `${record.name}: ${stats.documentLines} lines · ` +
    `${stats.retainedTokens} retained tokens · ${stats.parsedChars} visible chars · ` +
    `${stats.lookbackChars} lookback chars · ${stats.updateMilliseconds.toFixed(1)} ms`;
  // A viewport update may end with this report. Commit its batched writes even
  // when the runtime has no later DOM read to trigger an implicit flush.
  status.getBoundingClientRect();
}

function ensureView(index) {
  const record = records[index];
  if (record.view) return record.view;
  if (record.text === null) throw new Error(`${record.name} fixture has not loaded`);
  record.view = new EditorView({
    doc: record.text,
    extensions: [
      lineNumbers(), history(), keymap.of([...defaultKeymap, ...historyKeymap]),
      mobileSyntax(record.mode, stats => showStats(record, stats)),
      mobileSyntaxTheme, nativeCaret, EditorView.lineWrapping,
    ],
    parent: surface,
  });
  record.view.dom.setAttribute("data-mode", record.mode);
  return record.view;
}

function activate(index) {
  if (records[active]?.view) records[active].view.dom.setAttribute("hidden", "");
  active = index;
  records.forEach((record, position) =>
    record.button.setAttribute("aria-selected", String(position === index)));
  const view = ensureView(index);
  view.dom.removeAttribute("hidden");
  if (records[index].stats) showStats(records[index], records[index].stats);
}

Object.entries(fixtureNames).forEach(([mode, name], index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "tab");
  button.setAttribute("data-index", String(index));
  button.textContent = name;
  button.setAttribute("aria-selected", String(index === 0));
  tabs.appendChild(button);
  records.push({ mode, name, text: null,
    button, view: null, stats: null });
});
tabs.addEventListener("click", event => {
  const target = event.target;
  const index = Number(target?.getAttribute("data-index"));
  if (Number.isInteger(index) && records[index]) activate(index);
});

globalThis.loadMobileFixture = function loadMobileFixture(payload) {
  const modes = { j: "javascript", c: "css", m: "markdown", h: "html" };
  const mode = modes[payload.charAt(0)];
  let index = -1;
  for (let position = 0; position < records.length; position++) {
    if (records[position].mode === mode) { index = position; break; }
  }
  if (index < 0) throw new Error("Unknown mobile syntax fixture");
  records[index].text = payload.slice(1);
  if (index === active && !records[index].view) ensureView(index);
  return mode;
};
globalThis.mobileSyntaxExample = {
  activate,
  names: records.map(record => record.name),
  stats(index = active) { return records[index].stats; },
  view(index = active) { return ensureView(index); },
};
globalThis.__wwcResult = () => `CodeMirror:mobile-syntax:${records.length}`;
