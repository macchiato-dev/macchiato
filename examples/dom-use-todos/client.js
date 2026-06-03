import {
  DEFAULT_STORAGE_LIMIT,
  DomUseHostCapability,
  LocalStorageBackend,
  dispatchGuestDomEvent,
  eventTargetFor,
} from "@macchiato-dev/dom-use/bridge";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { StyleUse } from "@macchiato-dev/style-use";

const app = document.getElementById("app");
let dragDataTransfer = null;

function extractStyle(source) {
  return source.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || "";
}

async function loadText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.text();
}

async function loadJson(path) {
  return JSON.parse(await loadText(path));
}

function todoSourceValue(target, root) {
  if (target.matches(".add-btn")) return root.querySelector(".new-todo")?.value || "";
  return target.value || "";
}

function render(html) {
  app.innerHTML = html;
  app.removeAttribute("data-status");
  document.getElementById("macchiato-loading-style")?.remove();
}

function dispatchDomEvent(capability, sandbox, event, type, extraPayload = {}, options = {}) {
  const payload = dispatchGuestDomEvent(capability, sandbox, app, event, type, extraPayload, {
    ...options,
    render: false,
    sourceValue: todoSourceValue,
  });
  if (!payload) return;
  if (payload.dataTransfer) dragDataTransfer = payload.dataTransfer;
  if (options.render !== false) render(payload.html);
}

async function main() {
  const [sourceHtml, guestRuntime, domSchema, cssSchema] = await Promise.all([
    loadText("/source.html"),
    loadText("/-/@macchiato-dev/dom-use/guest-runtime.js"),
    loadJson("/dom.schema.json"),
    loadJson("/css.schema.json"),
  ]);
  const css = extractStyle(sourceHtml);
  const styleUse = new StyleUse(cssSchema);
  styleUse.validateStylesheet(css);
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const storage = new LocalStorageBackend({
    mode: "passthrough",
    keys: ["guest-todos"],
    limit: DEFAULT_STORAGE_LIMIT,
  });
  const capability = new DomUseHostCapability(domSchema, styleUse, { storage });
  const sandbox = await createSandbox();
  sandbox.installJsonHostFunction("__macchiatoHost", (message) => capability.dispatch(message));

  sandbox.evalGlobal(guestRuntime, "dom-use-todos-runtime.js");
  const scripts = sandbox.callJsonFunction("__macchiatoBoot", sourceHtml, { rawArgument: true });
  if (scripts.error) throw new Error(scripts.error);
  scripts.forEach((script, index) => sandbox.evalModule(script.code, `todo-inline-${index}.js`));
  render(capability.serializeApp().html);

  app.addEventListener("click", (event) => {
    dispatchDomEvent(capability, sandbox, event, "click");
  });
  app.addEventListener("change", (event) => {
    dispatchDomEvent(capability, sandbox, event, "change");
  });
  app.addEventListener("dblclick", (event) => {
    dispatchDomEvent(capability, sandbox, event, "dblclick");
  });
  app.addEventListener("blur", (event) => {
    dispatchDomEvent(capability, sandbox, event, "blur");
  }, true);
  app.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== "Escape") return;
    dispatchDomEvent(capability, sandbox, event, "keydown", { key: event.key });
  });
  app.addEventListener("dragstart", (event) => {
    dragDataTransfer = { data: {}, effectAllowed: "move" };
    dispatchDomEvent(capability, sandbox, event, "dragstart", { dataTransfer: dragDataTransfer }, { render: false });
  });
  app.addEventListener("dragover", (event) => {
    if (!eventTargetFor(capability, app, event.target, "dragover")) return;
    event.preventDefault();
    dispatchDomEvent(capability, sandbox, event, "dragover", { dataTransfer: dragDataTransfer }, { render: false });
  });
  app.addEventListener("drop", (event) => {
    if (!eventTargetFor(capability, app, event.target, "drop")) return;
    event.preventDefault();
    dispatchDomEvent(capability, sandbox, event, "drop", { dataTransfer: dragDataTransfer });
    dragDataTransfer = null;
  });
}

main().catch((err) => {
  app.setAttribute("data-status", "error");
  app.textContent = `Sandbox error: ${err.message}`;
});
