import { DomUseHostCapability, LocalStorageBackend, dispatchGuestDomEvent } from "@macchiato-dev/dom-use/bridge";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { StyleUse } from "@macchiato-dev/style-use";

export async function mountPresentationRuntime({ root, project, onStatus = () => {} }) {
  const sourceHtml = project.file || project.html || "";
  const sourceCss = project.css ?? [...sourceHtml.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
  const styleUse = new StyleUse(project.cssSchema || {});
  styleUse.validateStylesheet(sourceCss);
  const style = document.createElement("style");
  style.textContent = sourceCss;
  document.head.append(style);
  const storedValues = new Map(Object.entries(project.storage || {}));
  const isolatedStorage = {
    getItem(key) { return storedValues.get(String(key)) ?? null; },
    setItem(key, value) { storedValues.set(String(key), String(value)); onStatus({ type: "storage", key: String(key), value: String(value) }); },
    removeItem(key) { storedValues.delete(String(key)); onStatus({ type: "storage", key: String(key), value: null }); },
  };
  const storage = new LocalStorageBackend({
    mode: project.capabilities?.sessionStorage ? "passthrough" : "disabled",
    keys: project.capabilities?.storageKeys || null,
    limit: project.capabilities?.storageLimit || 100_000,
    storage: isolatedStorage,
  });
  const capability = new DomUseHostCapability(project.domSchema || {}, styleUse, { storage });
  const sandbox = await createSandbox({
    modules: project.modules || {},
    memoryLimitBytes: project.limits?.memoryBytes || 64 * 1024 * 1024,
    maxStackBytes: project.limits?.stackBytes || 1024 * 1024,
  });
  let pointerTransaction = false;
  let renderPending = false;
  let pointerRelease = null;
  const render = () => {
    root.innerHTML = capability.serializeApp().html;
    root.dataset.hostNodeCount = String(capability.document.createdNodes);
  };
  const requestRender = () => {
    if (pointerTransaction) {
      renderPending = true;
      return;
    }
    render();
  };
  const beginPointerTransaction = () => {
    if (pointerRelease !== null) clearTimeout(pointerRelease);
    pointerRelease = null;
    pointerTransaction = true;
  };
  const endPointerTransaction = () => {
    if (pointerRelease !== null) clearTimeout(pointerRelease);
    // A click is synthesized after pointerup. Keep its target alive through
    // that browser transaction, then project the latest virtual DOM.
    pointerRelease = setTimeout(() => {
      pointerRelease = null;
      pointerTransaction = false;
      if (renderPending) {
        renderPending = false;
        render();
      }
    }, 0);
  };
  try {
    sandbox.installJsonHostFunction("__macchiatoHost", (message) => capability.dispatch(message));
    const guestRuntime = project.guestRuntime || (typeof __PRESENTATION_USE_GUEST_RUNTIME__ === "string" ? __PRESENTATION_USE_GUEST_RUNTIME__ : "");
    if (!guestRuntime) throw new Error("presentation-use guest runtime is missing");
    sandbox.evalGlobal(`Object.assign(globalThis, ${JSON.stringify(project.globals || {})})`, "presentation-globals.js");
    sandbox.evalGlobal(guestRuntime, "dom-use-guest-runtime.js");
    const inline = sandbox.callJsonFunction("__macchiatoBoot", sourceHtml, { rawArgument: true });
    if (inline.error) throw new Error(inline.error);
    for (const [index, script] of [...inline, ...(project.scripts || [])].entries()) {
      const code = typeof script === "string" ? script : script.code;
      if (code?.trim()) await sandbox.evalModuleAsync(code, script.source || `presentation-${index}.js`);
    }
    render();
    capability.finishInit();
  } catch (error) {
    sandbox.dispose?.();
    style.remove();
    throw error;
  }
  const events = project.capabilities?.events || ["click", "input", "change", "keydown"];
  const listeners = events.map((type) => {
    const listener = (event) => {
      try {
        const revision = capability.revision;
        const result = dispatchGuestDomEvent(capability, sandbox, root, event, type, { key: event.key || "" }, {
          fallbackNodeIds: [capability.documentRootId, capability.appRootId],
          render: false,
        });
        if (result && capability.revision !== revision) requestRender();
        if (type === "keydown" && event.key === "Escape") onStatus({ type: "escape" });
      } catch (error) {
        onStatus({ type: "blocked", message: error.message });
      }
    };
    root.addEventListener(type, listener);
    return [type, listener];
  });
  root.dataset.runtime = "quickjs-dom-use";
  root.addEventListener("pointerdown", beginPointerTransaction, true);
  root.addEventListener("pointerup", endPointerTransaction, true);
  root.addEventListener("pointercancel", endPointerTransaction, true);
  const timer = setInterval(() => {
    try {
      const revision = capability.revision;
      const result = sandbox.callJsonFunction("__macchiatoTimers", Date.now(), { rawArgument: true });
      if (result?.changed && capability.revision !== revision) requestRender();
    } catch (error) {
      clearInterval(timer);
      onStatus({ type: "blocked", message: error.message });
    }
  }, project.capabilities?.timerResolution || 100);
  onStatus({ type: "mounted", runtime: "quickjs-dom-use" });
  return {
    inspect: () => ({ runtime: "quickjs-dom-use", dom: capability.serializeApp() }),
    destroy() {
      for (const [type, listener] of listeners) root.removeEventListener(type, listener);
      root.removeEventListener("pointerdown", beginPointerTransaction, true);
      root.removeEventListener("pointerup", endPointerTransaction, true);
      root.removeEventListener("pointercancel", endPointerTransaction, true);
      if (pointerRelease !== null) clearTimeout(pointerRelease);
      clearInterval(timer);
      sandbox.dispose?.();
      style.remove();
      root.replaceChildren();
      delete root.dataset.runtime;
    },
  };
}
