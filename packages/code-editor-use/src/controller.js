import { browserUseQuickJsDomGuestSource } from "@macchiato-dev/browser-use/quickjs-dom-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { BrowserDomHost, CODE_EDITOR_DOM_POLICY, CodeMirrorInputBridge } from "./host.js";

export async function mountQuickJsCodeEditor({ root, guestSource, limits = {}, onChange = () => {}, onReady = () => {}, onViolation = console.error }) {
  if (!(root instanceof Element)) throw new TypeError("A DOM root is required");
  if (typeof guestSource !== "string") throw new TypeError("QuickJS guest source is required");
  const originalRootId = root.id;
  if (!root.id) root.id = "editor";
  let sandbox = await createSandbox({
    memoryLimitBytes: limits.memoryLimitBytes ?? 128 * 1024 * 1024,
    maxStackBytes: limits.maxStackBytes ?? 4 * 1024 * 1024,
  });
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
    setContent(content, language = "plain", { readOnly = false } = {}) {
      if (destroyed) throw new Error("Editor sandbox has been disposed");
      const result = sandbox.callJsonFunction("__codeEditorSetContent", { content, language, readOnly });
      sandbox.callJsonFunction("__browserUseFlush", {});
      return result;
    },
    inspect() {
      if (destroyed) throw new Error("Editor sandbox has been disposed");
      return sandbox.callJsonFunction("__codeEditorInspect", {});
    },
    command(payload) {
      if (destroyed) throw new Error("Editor sandbox has been disposed");
      const result = sandbox.callJsonFunction("__codeEditorCommand", payload);
      sandbox.callJsonFunction("__browserUseFlush", {});
      return result;
    },
    focus() { root.querySelector(".cm-content")?.focus(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      inputBridge?.destroy();
      host.stop();
      root.replaceChildren();
      if (!originalRootId) root.removeAttribute("id");
      sandbox?.dispose();
      sandbox = null;
    },
  });
}
