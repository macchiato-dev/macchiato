import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0] },
    text: { group: "inline" },
    hard_break: { inline: true, group: "inline", selectable: false, toDOM: () => ["br"] },
  },
  marks: {
    strong: { toDOM: () => ["strong", 0] },
    emphasis: { toDOM: () => ["em", 0] },
    code: { excludes: "_", toDOM: () => ["code", 0] },
  },
});

const paragraph = text => schema.nodes.paragraph.create(null, schema.text(text));
const initialDocument = schema.nodes.doc.create(null, [
  paragraph("ProseMirror is executing inside QuickJS WebAssembly."),
  paragraph("Select text, apply formatting, type, and use ordinary undo and redo shortcuts."),
]);

const style = document.createElement("style");
style.textContent = `
  :root { font-family: ui-sans-serif, system-ui, sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #111827; color: #e5eefb; padding: 32px; }
  main { width: min(760px, 100%); margin: 0 auto; }
  .eyebrow { color: #72d6c9; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 8px 0 6px; font-size: clamp(30px, 6vw, 52px); letter-spacing: -.04em; }
  .lede { color: #9eb0c7; margin: 0 0 22px; }
  .toolbar { display: flex; gap: 7px; padding: 8px; background: #182337; border: 1px solid #34445e; border-bottom: 0; border-radius: 12px 12px 0 0; }
  button { min-width: 38px; min-height: 34px; border: 1px solid #42536d; border-radius: 7px; background: #223049; color: #e5eefb; cursor: pointer; font-weight: 750; }
  button:hover { background: #2b3d5c; border-color: #72d6c9; }
  #editor { min-height: 260px; background: #f8fafc; color: #172033; border: 1px solid #34445e; border-radius: 0 0 12px 12px; }
  .ProseMirror { min-height: 258px; padding: 24px; outline: none; line-height: 1.65; }
  .ProseMirror p { margin: 0 0 1em; }
  .ProseMirror code { background: #dbe5f1; border-radius: 4px; padding: 1px 4px; }
  #status { min-height: 1.4em; color: #9eb0c7; margin-top: 10px; font-size: 13px; }
`;
document.head.appendChild(style);

const main = document.createElement("main");
main.innerHTML = `<div class="eyebrow">QuickJS · wasm-web-machine</div>
  <h1>ProseMirror</h1><p class="lede">A rich-text editor with no prose-editor-use adapter.</p>
  <div class="toolbar" aria-label="Formatting">
    <button type="button" data-command="strong" aria-label="Bold"><strong>B</strong></button>
    <button type="button" data-command="emphasis" aria-label="Italic"><em>I</em></button>
    <button type="button" data-command="code" aria-label="Code">&lt;/&gt;</button>
    <button type="button" data-command="undo" aria-label="Undo">Undo</button>
    <button type="button" data-command="redo" aria-label="Redo">Redo</button>
  </div><div id="editor"></div><div id="status" role="status"></div>`;
document.body.replaceChildren(main);

const status = document.getElementById("status");
const view = new EditorView(document.getElementById("editor"), {
  state: EditorState.create({
    schema,
    doc: initialDocument,
    plugins: [
      history(),
      keymap({ "Mod-b": toggleMark(schema.marks.strong), "Mod-i": toggleMark(schema.marks.emphasis),
        "Mod-`": toggleMark(schema.marks.code), "Mod-z": undo, "Shift-Mod-z": redo, "Mod-y": redo }),
      keymap(baseKeymap),
    ],
  }),
  dispatchTransaction(transaction) {
    view.updateState(view.state.apply(transaction));
    if (transaction.docChanged) status.textContent = `${view.state.doc.textContent.length} characters`;
  },
  attributes: { "aria-label": "Message", spellcheck: "true" },
});

function nativeTextSelection() {
  const selection = document.getSelection();
  return selection && selection.anchorNode && selection.focusNode
    ? TextSelection.create(view.state.doc,
      view.posAtDOM(selection.anchorNode, selection.anchorOffset),
      view.posAtDOM(selection.focusNode, selection.focusOffset))
    : null;
}

// A pointer selection belongs to the host DOM. Synchronize it before
// ProseMirror's keymap sees the next key, matching an in-realm editor's order.
view.dom.addEventListener("keydown", () => {
  const selection = nativeTextSelection();
  if (selection && !selection.eq(view.state.selection)) {
    view.dispatch(view.state.tr.setSelection(selection));
  }
}, true);

const commands = {
  strong: toggleMark(schema.marks.strong), emphasis: toggleMark(schema.marks.emphasis),
  code: toggleMark(schema.marks.code), undo, redo,
};
let toolbarSelection = null;
Object.keys(commands).forEach(name => {
  const button = document.querySelector(`[data-command="${name}"]`);
  button.addEventListener("mousedown", event => {
    toolbarSelection = nativeTextSelection();
    event.preventDefault();
  });
  button.addEventListener("click", () => {
    try {
      if (toolbarSelection && !toolbarSelection.eq(view.state.selection)) {
        view.dispatch(view.state.tr.setSelection(toolbarSelection));
      }
      toolbarSelection = null;
      commands[name](view.state, transaction => view.dispatch(transaction), view);
      view.focus();
    } catch (error) {
      status.textContent = String(error && error.stack || error);
    }
  });
});
view.focus();
globalThis.__wwcResult = () => `ProseMirror:${view.state.doc.textContent}`;
