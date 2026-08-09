import { browserUseQuickJsDomGuestSource } from "@macchiato-dev/browser-use/quickjs-dom-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { BrowserDomHost, CodeMirrorInputBridge, createCodeEditorDomPolicy, normalizeCodeEditorLimits } from "./host.js";

export async function mountQuickJsCodeEditor({ root, guestSource, limits = {}, onChange = () => {}, onLimit = () => {}, onReady = () => {}, onViolation = console.error }) {
  if (!(root instanceof Element)) throw new TypeError("A DOM root is required");
  if (typeof guestSource !== "string") throw new TypeError("QuickJS guest source is required");
  const originalRootId = root.id;
  if (!root.id) root.id = "editor";
  let sandbox = await createSandbox({
    memoryLimitBytes: limits.memoryLimitBytes ?? 128 * 1024 * 1024,
    maxStackBytes: limits.maxStackBytes ?? 4 * 1024 * 1024,
    wasmMachine: limits.wasmMachine ?? "dedicated",
    role: limits.role ?? "code-editor",
  });
  let stopped = false;
  let inputBridge;
  const editorLimits = normalizeCodeEditorLimits(limits);
  const violate = (error) => {
    if (stopped) return;
    stopped = true;
    onViolation(error);
  };
  const host = new BrowserDomHost(root, createCodeEditorDomPolicy(editorLimits), {
    onViolation(error) { stopped = true; onViolation(error); },
    onEvent(listenerId, event, nativeEvent) {
      if (!sandbox || stopped) return;
      host.renewOperationBudget();
      try {
        const result = sandbox.callJsonFunction("__browserUseDispatchEvent", { listenerId, event });
        if (result.preventDefault) nativeEvent.preventDefault();
        if (result.stopPropagation) nativeEvent.stopPropagation();
        inputBridge?.reconcileSelection();
      } catch (error) {
        violate(error);
      }
    },
  });
  sandbox.installJsonHostFunction("__browserUseHost", (message) => host.dispatch(message));
  sandbox.installJsonHostFunction("__browserUseNotify", (message) => {
    if (message.type === "change") onChange(message.content);
    if (message.type === "limit") onLimit(message);
    if (message.type === "ready") onReady(message);
    return {};
  });
  sandbox.evalGlobal(browserUseQuickJsDomGuestSource, "browser-use-dom-guest.js");
  sandbox.callJsonFunction("__browserUseConfigureEnvironment", {
    platform: navigator.platform, userAgent: navigator.userAgent, vendor: navigator.vendor,
  });
  sandbox.evalGlobal(guestSource, "code-editor-guest.js");
  sandbox.callJsonFunction("__codeEditorConfigureLimits", {
    maxLines: editorLimits.maxLines,
    maxCharacters: editorLimits.maxCharacters,
  });
  inputBridge = new CodeMirrorInputBridge(root, sandbox, { isStopped: () => stopped }).attach();
  host.start();
  const refillTimer = setInterval(() => host.renewOperationBudget(), editorLimits.surfaceRefillMs);
  let destroyed = false;
  return Object.freeze({
    setContent(content, language = "plain", { readOnly = false } = {}) {
      if (destroyed) throw new Error("Editor sandbox has been disposed");
      host.renewOperationBudget();
      try {
        const result = sandbox.callJsonFunction("__codeEditorSetContent", { content, language, readOnly });
        sandbox.callJsonFunction("__browserUseFlush", {});
        return result;
      } catch (error) {
        if (/operation gas exhausted/.test(error.message)) violate(error);
        throw error;
      }
    },
    inspect() {
      if (destroyed) throw new Error("Editor sandbox has been disposed");
      return { ...sandbox.callJsonFunction("__codeEditorInspect", {}), machine: sandbox.inspectMachine(), surface: host.inspectSurface() };
    },
    command(payload) {
      if (destroyed) throw new Error("Editor sandbox has been disposed");
      host.renewOperationBudget();
      try {
        const result = sandbox.callJsonFunction("__codeEditorCommand", payload);
        sandbox.callJsonFunction("__browserUseFlush", {});
        return result;
      } catch (error) {
        if (/operation gas exhausted/.test(error.message)) violate(error);
        throw error;
      }
    },
    callGuest(name, payload) {
      if (destroyed) throw new Error("Editor sandbox has been disposed");
      if (!/^__[A-Za-z0-9_]+$/.test(name)) throw new TypeError("Guest function name is invalid");
      return sandbox.callJsonFunction(name, payload);
    },
    focus() { root.querySelector(".cm-content")?.focus(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearInterval(refillTimer);
      inputBridge?.destroy();
      host.destroy();
      root.replaceChildren();
      if (!originalRootId) root.removeAttribute("id");
      sandbox?.dispose();
      sandbox = null;
    },
  });
}
