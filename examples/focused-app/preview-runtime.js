import { BrowserDomHost } from "./browser-use-host.js";
import { browserUseQuickJsDomGuestSource } from "@macchiato-dev/browser-use/quickjs-dom-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";

let active;
let generation = 0;
const policy = {
  tags: ["a", "article", "aside", "button", "code", "div", "em", "footer", "form", "h1", "h2", "h3", "header", "input", "label", "li", "main", "nav", "ol", "output", "p", "pre", "section", "small", "span", "strong", "textarea", "ul"],
  events: ["blur", "change", "click", "focus", "input", "keydown", "keyup", "submit"],
  attributes: {
    id: "^[A-Za-z][A-Za-z0-9_-]{0,100}$", class: "^[A-Za-z0-9 _-]{0,200}$", type: "^(?:button|text|submit|checkbox)$",
    name: "^[A-Za-z][A-Za-z0-9_-]{0,80}$", value: "^[^<>]{0,500}$", placeholder: "^[^<>]{0,160}$",
    role: "^(?:button|status|textbox|region)$", "aria-label": "^[^<>]{0,160}$", "aria-live": "^(?:polite|assertive|off)$",
    checked: "^(?:|checked)$", disabled: "^(?:|disabled)$", required: "^(?:|required)$"
  },
  classNames: ["^[A-Za-z][A-Za-z0-9_-]*$"], maxElements: 500, maxDepth: 20, maxTextLength: 200000,
};

function safeDocument(app, token) {
  const body = String(app.html || "")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:src|href)\s*=\s*(?:"(?:https?:|\/\/)[^"]*"|'(?:https?:|\/\/)[^']*')/gi, "");
  const css = app.styles.filter((style) => !style.external).map((style) => style.code).join("\n").replace(/@import[^;]+;?/gi, "").replace(/url\([^)]*\)/gi, "none");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="macchiato-preview" content="${token}"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>${css.replace(/<\/style/gi, "<\\/style")}</style></head><body>${body}</body></html>`;
}

async function waitForPreviewLoad(iframe, token) {
  while (iframe.contentDocument?.querySelector('meta[name="macchiato-preview"]')?.content !== token) {
    if (token !== String(generation)) return false;
    await new Promise((resolve) => iframe.addEventListener("load", resolve, { once: true }));
  }
  return true;
}

export async function previewDeclarativeApp(iframe, app, onStatus = () => {}) {
  const currentGeneration = ++generation;
  const token = String(currentGeneration);
  active?.host.stop();
  active?.sandbox?.dispose?.();
  iframe.srcdoc = safeDocument(app, token);
  if (!await waitForPreviewLoad(iframe, token) || currentGeneration !== generation) return;
  const root = iframe.contentDocument.body;
  let sandbox;
  const host = new BrowserDomHost(root, policy, {
    onViolation(error) { onStatus(`Preview stopped: ${error.message}`); },
    onEvent(listenerId, event, nativeEvent) {
      const result = sandbox.callJsonFunction("__browserUseDispatchEvent", { listenerId, event });
      if (result.preventDefault) nativeEvent.preventDefault();
      if (result.stopPropagation) nativeEvent.stopPropagation();
    },
  });
  host.start();
  if (app.scripts.length) {
    sandbox = await createSandbox();
    if (currentGeneration !== generation) { sandbox.dispose?.(); return; }
    sandbox.installJsonHostFunction("__browserUseHost", (message) => host.dispatch(message));
    sandbox.evalGlobal(browserUseQuickJsDomGuestSource, "browser-use-dom-guest.js");
    for (const script of app.scripts) {
      if (script.external && !script.code) continue;
      sandbox.evalGlobal(script.code, script.source);
    }
  }
  active = { host, sandbox };
  onStatus(app.scripts.length ? "Running in QuickJS/WASM." : "Static declarative preview.");
}
