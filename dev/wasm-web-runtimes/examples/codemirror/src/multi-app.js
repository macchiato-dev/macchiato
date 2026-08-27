import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import fixtures from "../generated/fixtures.js";
import { nativeCaret } from "./native-caret.js";

export function startMultiEditor(files) {
  const workspace = document.getElementById("workspace");
  const tabs = document.createElement("nav");
  const search = document.createElement("form");
  const input = document.createElement("input");
  const results = document.createElement("ol");
  const editors = document.createElement("section");
  const records = [];
  let active = 0;

  tabs.className = "file-tabs";
  tabs.setAttribute("aria-label", "Open files");
  search.className = "file-search";
  input.type = "search";
  input.placeholder = "Search across files";
  input.setAttribute("aria-label", "Search across files");
  results.className = "search-results";
  editors.className = "file-editors";
  search.appendChild(input);
  search.appendChild(results);
  workspace.appendChild(tabs);
  workspace.appendChild(search);
  workspace.appendChild(editors);

  function ensureView(index) {
    const record = records[index];
    if (record.view) return record.view;
    record.view = new EditorView({
      doc: fixtures[record.fixture].text,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        record.language(),
        oneDark,
        nativeCaret,
        EditorView.lineWrapping,
      ],
      parent: record.surface,
    });
    return record.view;
  }

  function activate(index, selection) {
    active = index;
    records.forEach((record, position) => {
      const selected = position === index;
      record.button.setAttribute("aria-selected", String(selected));
      record.surface.style.display = selected ? "block" : "none";
    });
    const view = ensureView(index);
    if (selection) view.dispatch({ selection, scrollIntoView: true });
  }

  function searchFiles(query) {
    results.replaceChildren();
    if (!query) return [];
    const needle = query.toLowerCase();
    const matches = [];
    records.forEach((record, fileIndex) => {
      const text = record.view ?
        record.view.state.doc.toString() : fixtures[record.fixture].text;
      const lower = text.toLowerCase();
      let from = 0;
      while ((from = lower.indexOf(needle, from)) >= 0) {
        const line = text.slice(0, from).split("\n").length;
        matches.push({ fileIndex, from, to: from + query.length, line });
        from += Math.max(1, query.length);
      }
    });
    matches.forEach((match) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${records[match.fileIndex].name}:${match.line}`;
      button.addEventListener("click", () => activate(match.fileIndex, {
        anchor: match.from,
        head: match.to,
      }));
      item.appendChild(button);
      results.appendChild(item);
    });
    return matches;
  }

  files.forEach((file, index) => {
    const fixture = file[0];
    const name = file[1];
    const language = file[2];
    const button = document.createElement("button");
    const surface = document.createElement("div");
    button.type = "button";
    button.textContent = name;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(index === 0));
    button.addEventListener("click", () => activate(index));
    surface.className = "file-editor";
    surface.style.display = index === 0 ? "block" : "none";
    editors.appendChild(surface);
    tabs.appendChild(button);
    records.push({ fixture, name, language, button, surface, view: null });
  });
  ensureView(0);

  search.addEventListener("submit", (event) => {
    event.preventDefault();
    searchFiles(input.value);
  });
  input.addEventListener("input", () => searchFiles(input.value));

  globalThis.multiEditorExample = {
    activate,
    files: records.map((record) => record.name),
    search: searchFiles,
    text(index = active) { return ensureView(index).state.doc.toString(); },
  };
  globalThis.__wwcResult = () =>
    `CodeMirror:multi:${records.length}:${records.map((record) =>
      (record.view ? record.view.state.doc.lines :
        fixtures[record.fixture].text.split("\n").length)).join(",")}`;
}
