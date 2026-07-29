import { browserUseQuickJsGuestSource } from "@macchiato-dev/browser-use/quickjs-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { createCodeEditor } from "/code-editor.js";

const root = document.getElementById("editor");
const status = document.getElementById("status");
const shape = document.getElementById("shape");
let sandbox = null;
let violation = null;

function summary(result) {
  status.textContent = `QuickJS observed ${result.characters ?? "the initial"} characters across ${result.lines} line${result.lines === 1 ? "" : "s"}.`;
  shape.textContent = `${result.elements} constrained DOM elements`;
}

const editor = createCodeEditor({
  parent: root,
  onChange(value) {
    if (!sandbox) return;
    summary(sandbox.callJsonFunction("__codeEditorChanged", { characters: value.length }));
  },
  onViolation(error) {
    violation = error;
    console.error("code-editor-use shape violation", error);
    status.textContent = `Editor stopped: ${error.message}`;
    status.dataset.state = "error";
  },
});

sandbox = await createSandbox();
sandbox.installJsonHostFunction("__browserUseHost", (message) => editor.browserDom.dispatch(message));
sandbox.evalGlobal(browserUseQuickJsGuestSource, "browser-use-guest.js");
sandbox.evalModule(await (await fetch("/controller.js")).text(), "code-editor-controller.js");
const initial = sandbox.callJsonFunction("__codeEditorBoot", {});
if (!violation) summary({ ...initial, characters: editor.value.length });
document.body.dataset.ready = "true";
