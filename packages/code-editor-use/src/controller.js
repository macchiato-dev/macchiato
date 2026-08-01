import { browserUseQuickJsDomGuestSource } from "@macchiato-dev/browser-use/quickjs-dom-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { BrowserDomHost, CODE_EDITOR_DOM_POLICY, CodeMirrorInputBridge } from "./host.js";

export async function mountQuickJsCodeEditor({ root, guestSource, onChange = () => {}, onReady = () => {}, onViolation = console.error }) {
  if (!(root instanceof Element)) throw new TypeError("A DOM root is required");
  if (typeof guestSource !== "string") throw new TypeError("QuickJS guest source is required");
  let sandbox = await createSandbox();
  let stopped = false;
  let inputBridge;
  const host = new BrowserDomHost(root, CODE_EDITOR_DOM_POLICY, {
    onViolation(error) { stopped = true; onViolation(error); },
    onEvent(listenerId, event, nativeEvent) {
      if (!sandbox || stopped) return;
      const result = sandbox.callJsonFunction("__browserUseDispatchEvent", { listenerId, event });
      if (result.preventDefault) nativeEvent.preventDefault();
      if (result.stopPropagation) nativeEvent.stopPropagation();
      inputBridge?.reconcileSelection();
    },
  });
  sandbox.installJsonHostFunction("__browserUseHost", (message) => host.dispatch(message));
  sandbox.installJsonHostFunction("__browserUseNotify", (message) => {
    if (message.type === "change") onChange(message.content);
    if (message.type === "ready") onReady(message);
    return {};
  });
  sandbox.evalGlobal(browserUseQuickJsDomGuestSource, "browser-use-dom-guest.js");
  sandbox.callJsonFunction("__browserUseConfigureEnvironment", {
    platform: navigator.platform, userAgent: navigator.userAgent, vendor: navigator.vendor,
  });
  sandbox.evalGlobal(guestSource, "code-editor-guest.js");
  inputBridge = new CodeMirrorInputBridge(root, sandbox, { isStopped: () => stopped }).attach();
  host.start();
  let destroyed = false;
  return Object.freeze({
    setContent(content, language = "plain") {
      if (destroyed) throw new Error("Editor sandbox has been disposed");
      const result = sandbox.callJsonFunction("__codeEditorSetContent", { content, language });
      sandbox.callJsonFunction("__browserUseFlush", {});
      return result;
    },
    inspect() {
      if (destroyed) throw new Error("Editor sandbox has been disposed");
      return sandbox.callJsonFunction("__codeEditorInspect", {});
    },
    focus() { root.querySelector(".cm-content")?.focus(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      inputBridge?.destroy();
      host.stop();
      root.replaceChildren();
      sandbox?.dispose();
      sandbox = null;
    },
  });
}
