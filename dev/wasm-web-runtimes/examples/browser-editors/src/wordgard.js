import { Command } from "wordgard/command";
import { Wordgard } from "wordgard/editor";
import { history, redo, undo } from "wordgard/history";
import { blockDoc, code, emphasis, lineBreak, paragraph, strong } from "wordgard/schema";

const style = document.createElement("style");
style.textContent = `
  :root { font-family: ui-sans-serif, system-ui, sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #171326; color: #f2eefe; padding: 32px; }
  main { width: min(760px, 100%); margin: 0 auto; }
  .eyebrow { color: #d4a5ff; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 8px 0 6px; font-size: clamp(30px, 6vw, 52px); letter-spacing: -.04em; }
  .lede { color: #b9accd; margin: 0 0 22px; }
  .toolbar { display: flex; gap: 7px; padding: 8px; background: #271e3c; border: 1px solid #55456f; border-bottom: 0; border-radius: 12px 12px 0 0; }
  button { min-width: 38px; min-height: 34px; border: 1px solid #66547f; border-radius: 7px; background: #36294e; color: #f2eefe; cursor: pointer; font-weight: 750; }
  button:hover { background: #493662; border-color: #d4a5ff; }
  #editor { min-height: 260px; background: #fcfaff; color: #241d31; border: 1px solid #55456f; border-radius: 0 0 12px 12px; padding: 24px; }
  wordgard-editor, wg-scroller, wg-content { display: block; }
  wordgard-editor { min-height: 210px; outline: none; line-height: 1.65; }
  wg-content p { margin: 0 0 1em; }
  #status { min-height: 1.4em; color: #b9accd; margin-top: 10px; font-size: 13px; }
`;
document.head.appendChild(style);

const main = document.createElement("main");
main.innerHTML = `<div class="eyebrow">QuickJS · wasm-web-machine</div>
  <h1>Wordgard</h1><p class="lede">A semantic rich-text editor running directly inside the machine.</p>
  <div class="toolbar" aria-label="Formatting">
    <button type="button" data-command="strong" aria-label="Bold"><strong>B</strong></button>
    <button type="button" data-command="emphasis" aria-label="Italic"><em>I</em></button>
    <button type="button" data-command="code" aria-label="Code">&lt;/&gt;</button>
    <button type="button" data-command="undo" aria-label="Undo">Undo</button>
    <button type="button" data-command="redo" aria-label="Redo">Redo</button>
  </div><div id="editor"></div><div id="status" role="status"></div>`;
document.body.replaceChildren(main);

const status = document.getElementById("status");
const editor = Wordgard.create({
  parent: document.getElementById("editor"),
  doc: { type: "Doc", content: [
    { type: "Paragraph", content: [
      { type: "Text", param: "Wordgard is executing inside QuickJS WebAssembly." },
    ] },
    { type: "Paragraph", content: [
      { type: "Text", param: "Type, format text, and use ordinary undo and redo shortcuts." },
    ] },
  ] },
  config: [blockDoc(), paragraph(), lineBreak(), strong(), emphasis(), code(), history(),
    Wordgard.label("Message"),
    Wordgard.updateListener.of(update => {
      if (update.docChanged) {
        update.editor.flush();
        status.textContent = `${update.editor.state.doc.textContent({ blockSeparator: " " }).length} characters`;
      }
    })],
});
editor.flush();
const commands = { strong: strong.button.run, emphasis: emphasis.button.run, code: code.button.run, undo, redo };
editor.contentDOM.addEventListener("keydown", event => {
  if (!(event.ctrlKey || event.metaKey)) return;
  const command = event.key.toLowerCase() === "z" ? (event.shiftKey ? redo : undo) :
    event.key.toLowerCase() === "y" ? redo : null;
  if (!command) return;
  editor.flush();
  if (Command.dispatch(editor, command)) event.preventDefault();
});
Object.keys(commands).forEach(name => {
  const button = document.querySelector(`[data-command="${name}"]`);
  button.addEventListener("mousedown", event => event.preventDefault());
  button.addEventListener("click", () => {
    const command = commands[name];
    editor.flush();
    Command.dispatch(editor, command);
    editor.focus();
  });
});
editor.focus();
globalThis.__wwcResult = () => `Wordgard:${editor.state.doc.textContent({ blockSeparator: " " })}`;
