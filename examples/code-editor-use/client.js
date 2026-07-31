import { browserUseQuickJsDomGuestSource } from "@macchiato-dev/browser-use/quickjs-dom-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { BrowserDomHost, CODE_EDITOR_DOM_POLICY, CodeMirrorInputBridge } from "/code-editor-host.js";

const root = document.getElementById("editor");
const status = document.getElementById("status");
const shape = document.getElementById("shape");
let sandbox;
let stopped = false;

function summary(message) {
  const current = host.inspect();
  status.textContent = `QuickJS owns ${message.characters} characters across ${message.lines} line${message.lines === 1 ? "" : "s"}.`;
  shape.textContent = `${current.elements} constrained DOM elements`;
}

const host = new BrowserDomHost(root, CODE_EDITOR_DOM_POLICY, {
  onViolation(error) {
    stopped = true;
    console.error("code-editor-use shape violation", error);
    status.textContent = `Editor stopped: ${error.message}`;
    status.dataset.state = "error";
  },
  onEvent(listenerId, event, nativeEvent) {
    if (!sandbox || stopped) return;
    const result = sandbox.callJsonFunction("__browserUseDispatchEvent", { listenerId, event });
    if (result.preventDefault) nativeEvent.preventDefault();
    if (result.stopPropagation) nativeEvent.stopPropagation();
  },
});

sandbox = await createSandbox();
sandbox.installJsonHostFunction("__browserUseHost", (message) => host.dispatch(message));
sandbox.installJsonHostFunction("__browserUseNotify", (message) => { summary(message); return {}; });
sandbox.evalGlobal(browserUseQuickJsDomGuestSource, "browser-use-dom-guest.js");
sandbox.evalGlobal(await (await fetch("/code-editor-guest.js")).text(), "code-editor-quickjs.js");
new CodeMirrorInputBridge(root, sandbox, { isStopped: () => stopped }).attach();
host.start();
globalThis.__codeEditorBridge = Object.freeze({
  command(payload) {
    const result = sandbox.callJsonFunction("__codeEditorCommand", payload);
    sandbox.callJsonFunction("__browserUseFlush", {});
    return result;
  },
  inspect() { return sandbox.callJsonFunction("__codeEditorInspect", {}); },
});
document.body.dataset.ready = "true";
