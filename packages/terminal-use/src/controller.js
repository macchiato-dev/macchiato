import { browserUseQuickJsDomGuestSource } from "@macchiato-dev/browser-use/quickjs-dom-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { BrowserDomHost, createTerminalDomPolicy, normalizeTerminalLimits } from "./host.js";

export async function mountQuickJsTerminal({ root, guestSource, limits = {}, onData = () => {}, onReady = () => {}, onViolation = console.error }) {
  if (!(root instanceof Element)) throw new TypeError("A DOM root is required");
  if (typeof guestSource !== "string") throw new TypeError("QuickJS guest source is required");
  const terminalLimits = normalizeTerminalLimits(limits);
  let sandbox = await createSandbox({ memoryLimitBytes: limits.memoryLimitBytes ?? 128 * 1024 * 1024 });
  let stopped = false;
  const violate = (error) => { if (!stopped) { stopped = true; onViolation(error); } };
  const host = new BrowserDomHost(root, createTerminalDomPolicy(terminalLimits), {
    onViolation: violate,
    onEvent(listenerId, event, nativeEvent) {
      if (stopped || !sandbox) return;
      host.renewOperationBudget();
      try {
        const result = sandbox.callJsonFunction("__browserUseDispatchEvent", { listenerId, event });
        if (result.preventDefault) nativeEvent.preventDefault();
        if (result.stopPropagation) nativeEvent.stopPropagation();
      } catch (error) { violate(error); }
    },
  });
  sandbox.installJsonHostFunction("__browserUseHost", (message) => host.dispatch(message));
  sandbox.installJsonHostFunction("__browserUseNotify", (message) => {
    if (message.type === "data") onData(message.data);
    if (message.type === "ready") onReady(message);
    return {};
  });
  sandbox.evalGlobal(browserUseQuickJsDomGuestSource, "browser-use-dom-guest.js");
  sandbox.callJsonFunction("__browserUseConfigureEnvironment", { platform: navigator.platform, userAgent: navigator.userAgent, vendor: navigator.vendor });
  sandbox.evalGlobal(guestSource, "terminal-guest.js");
  sandbox.callJsonFunction("__terminalConfigure", terminalLimits);
  host.start();
  sandbox.callJsonFunction("__browserUseFlush", {});
  const timer = setInterval(() => {
    if (stopped || !sandbox) return;
    host.renewOperationBudget();
    try { sandbox.callJsonFunction("__browserUseTick", {}); } catch (error) { violate(error); }
  }, terminalLimits.surfaceRefillMs);
  return Object.freeze({
    write(text) {
      if (stopped || !sandbox) throw new Error("Terminal sandbox is not running");
      if (typeof text !== "string" || text.length > terminalLimits.maxWriteCharacters) throw new RangeError("Terminal write exceeds its character budget");
      host.renewOperationBudget();
      const result = sandbox.callJsonFunction("__terminalWrite", { text });
      sandbox.callJsonFunction("__browserUseFlush", {});
      return result;
    },
    inspect() { return { ...sandbox.callJsonFunction("__terminalInspect", {}), surface: host.inspectSurface() }; },
    focus() { root.querySelector("textarea")?.focus(); },
    destroy() { clearInterval(timer); host.stop(); root.replaceChildren(); sandbox?.dispose(); sandbox = null; },
  });
}
