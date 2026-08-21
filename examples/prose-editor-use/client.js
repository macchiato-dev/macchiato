import { browserUseQuickJsGuestSource } from "@macchiato-dev/browser-use/quickjs-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { createMessageEditor } from "/prose-editor.js";

const root = document.getElementById("editor");
const status = document.getElementById("status");
const shape = document.getElementById("shape");
const sent = document.getElementById("sent");
let sandbox = null;
let violation = null;
let engineName = "Editor";

function summary(result) {
  status.textContent = `${engineName} via QuickJS observed ${result.characters} characters across ${result.paragraphs} paragraph${result.paragraphs === 1 ? "" : "s"}.`;
  shape.textContent = `${result.elements} constrained DOM elements`;
}

sandbox = await createSandbox();
sandbox.evalModule(await (await fetch("/controller.js")).text(), "message-editor-controller.js");
const config = sandbox.callJsonFunction("__messageEditorConfig", {});
const editor = createMessageEditor({
  engine: config.engine,
  parent: root,
  onChange(snapshot) {
    if (!sandbox) return;
    summary(sandbox.callJsonFunction("__proseEditorChanged", snapshot));
  },
  onViolation(error) {
    violation = error;
    console.error("prose-editor-use shape violation", error);
    status.textContent = `Editor stopped: ${error.message}`;
    status.dataset.state = "error";
  },
});
engineName = editor.engine;

sandbox.installJsonHostFunction("__browserUseHost", (message) => editor.browserDom.dispatch(message));
sandbox.evalGlobal(browserUseQuickJsGuestSource, "browser-use-guest.js");
const initial = sandbox.callJsonFunction("__proseEditorBoot", editor.snapshot());
if (!violation) summary(initial);

for (const button of document.querySelectorAll("[data-command]")) {
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => editor[button.dataset.command]?.());
}

document.getElementById("send").addEventListener("click", () => {
  const result = sandbox.callJsonFunction("__proseEditorSubmit", editor.snapshot());
  sent.textContent = result.text;
  sent.hidden = false;
  editor.focus();
});

document.body.dataset.ready = "true";
