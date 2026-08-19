import { DomUseHostCapability, LocalStorageBackend, dispatchGuestDomEvent } from "@macchiato-dev/dom-use/bridge";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { StyleUse } from "@macchiato-dev/style-use";

function compatibleNode(current, next) {
  return current?.nodeType === next?.nodeType
    && (current.nodeType !== Node.ELEMENT_NODE || (current.localName === next.localName && current.namespaceURI === next.namespaceURI));
}

function reconcileNode(current, next) {
  if (current.nodeType === Node.TEXT_NODE) {
    if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
    return;
  }
  for (const attribute of [...current.attributes]) {
    if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
  }
  for (const attribute of [...next.attributes]) {
    if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
  }
  reconcileChildren(current, next);
}

function reconcileChildren(currentParent, nextParent) {
  let index = 0;
  while (index < nextParent.childNodes.length) {
    const next = nextParent.childNodes[index];
    const current = currentParent.childNodes[index];
    if (!current) currentParent.append(next.cloneNode(true));
    else if (!compatibleNode(current, next)) current.replaceWith(next.cloneNode(true));
    else reconcileNode(current, next);
    index += 1;
  }
  while (currentParent.childNodes.length > nextParent.childNodes.length) currentParent.lastChild.remove();
}

export function reconcileRenderedDom(root, html, resourceUrls = {}) {
  const template = document.createElement("template");
  template.innerHTML = html;
  for (const image of template.content.querySelectorAll("img[src^='macchiato-resource:']")) {
    const resolved = resourceUrls[image.getAttribute("src")];
    if (!resolved) throw new Error("Rendered image references an unavailable project resource");
    image.setAttribute("src", resolved);
  }
  reconcileChildren(root, template.content);
}

export async function mountPresentationRuntime({ root, project, onStatus = () => {} }) {
  const sourceHtml = project.file || project.html || "";
  const inlineCss = [...sourceHtml.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
  const sourceCss = project.css ?? inlineCss;
  const styleUse = new StyleUse(project.cssSchema || {});
  styleUse.validateStylesheet(sourceCss);
  const style = document.createElement("style");
  style.textContent = sourceCss;
  document.head.append(style);
  if (project.capabilities?.documentSurface) document.documentElement.dataset.documentSurface = "";
  else if (project.capabilities?.scroll === "vertical") {
    root.style.overflowX = "hidden";
    root.style.overflowY = "auto";
  }
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
  const guestFetchResources = project.fetchResources || {};
  const renderedResourceUrls = Object.fromEntries(Object.values(guestFetchResources).map((resource, index) => [`macchiato-resource:${index}`, resource.dataUrl]));
  const guestResourceRefs = Object.fromEntries(Object.entries(guestFetchResources).map(([url, resource], index) => [url, { ...resource, resourceRef: `macchiato-resource:${index}` }]));
  const sandbox = await createSandbox({
    modules: project.modules || {},
    memoryLimitBytes: project.limits?.memoryBytes || 64 * 1024 * 1024,
    maxStackBytes: project.limits?.stackBytes || 1024 * 1024,
  });
  let pointerTransaction = false;
  let renderPending = false;
  let pointerRelease = null;
  const render = () => {
    reconcileRenderedDom(root, capability.serializeApp().html, renderedResourceUrls);
    root.dataset.hostNodeCount = String(capability.document.createdNodes);
    root.dataset.hostLiveNodeCount = String(capability.liveNodeCount());
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
    if (Object.keys(guestFetchResources).length) {
      sandbox.evalGlobal(`
        globalThis.__macchiatoFetchResources = ${JSON.stringify(guestResourceRefs)};
        globalThis.fetch = async function fetch(url, options) {
          const method = String(options && options.method || "GET").toUpperCase();
          if (method !== "GET") throw new TypeError("Constrained fetch only supports GET");
          const key = String(url);
          const resource = globalThis.__macchiatoFetchResources[key];
          if (!resource) throw new TypeError("Fetch URL is outside the container grant");
          return Object.freeze({
            ok: resource.status >= 200 && resource.status < 300,
            status: resource.status,
            url: key,
            headers: Object.freeze({ get(name) { return String(name).toLowerCase() === "content-type" ? resource.type : null; } }),
            async text() { return resource.text; },
            async json() { return JSON.parse(resource.text); },
            async dataUrl() { return resource.dataUrl; },
            async resourceUrl() { return resource.resourceRef; },
          });
        };
      `, "presentation-fetch-guest.js");
    }
    sandbox.evalGlobal(guestRuntime, "dom-use-guest-runtime.js");
    sandbox.evalGlobal(`globalThis.navigator = Object.assign(globalThis.navigator || {}, {
      language: ${JSON.stringify(project.environment?.language || "en")}
    })`, "presentation-environment.js");
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
      root.style.overflowX = "";
      root.style.overflowY = "";
      delete document.documentElement.dataset.documentSurface;
      root.replaceChildren();
      delete root.dataset.runtime;
    },
  };
}
