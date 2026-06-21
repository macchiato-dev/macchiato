import {
  DEFAULT_STORAGE_LIMIT,
  DomUseHostCapability,
  LocalStorageBackend,
  dispatchGuestDomEvent,
} from "@macchiato-dev/dom-use/bridge";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { StyleUse } from "@macchiato-dev/style-use";

const app = document.getElementById("app");

async function loadText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.text();
}

async function loadJson(path) {
  return JSON.parse(await loadText(path));
}

function render(html) {
  app.innerHTML = html;
  app.removeAttribute("data-status");
  document.getElementById("macchiato-loading-style")?.remove();
}

function sourceValue(target) {
  if (target.matches(".go-button")) return app.querySelector(".matrix-source")?.value || "";
  return target.value || "";
}

function errorText(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function dispatch(capability, sandbox, event, type) {
  const payload = dispatchGuestDomEvent(capability, sandbox, app, event, type, {}, {
    render: false,
    sourceValue,
  });
  if (!payload) return;
  render(payload.html);
}

async function main() {
  const [sourceHtml, guestRuntime, domSchema, cssSchema] = await Promise.all([
    loadText("/source.html"),
    loadText("/-/@macchiato-dev/dom-use/guest-runtime.js"),
    loadJson("/dom.schema.json"),
    loadJson("/css.schema.json"),
  ]);

  const css = await loadText("/styles.css");
  const styleUse = new StyleUse(cssSchema);
  styleUse.validateStylesheet(css);
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const storage = new LocalStorageBackend({
    mode: "passthrough",
    keys: ["todo-matrix-state"],
    limit: DEFAULT_STORAGE_LIMIT * 2,
  });
  const capability = new DomUseHostCapability(domSchema, styleUse, { storage });
  const sandbox = await createSandbox();
  sandbox.installJsonHostFunction("__macchiatoHost", (message) => capability.dispatch(message));
  try {
    sandbox.evalGlobal(guestRuntime, "todo-matrix-runtime.js");
  } catch (err) {
    throw new Error(`runtime: ${errorText(err)}`);
  }
  let scripts;
  try {
    scripts = sandbox.callJsonFunction("__macchiatoBoot", sourceHtml, { rawArgument: true });
  } catch (err) {
    throw new Error(`boot: ${errorText(err)}`);
  }
  if (scripts.error) throw new Error(`boot: ${errorText(scripts.error)}`);
  scripts.forEach((script, index) => {
    try {
      sandbox.evalModule(script.code, `todo-matrix-${index}.js`);
    } catch (err) {
      throw new Error(`script ${index}: ${errorText(err)}`);
    }
  });
  render(capability.serializeApp().html);
  capability.finishInit();

  app.addEventListener("click", (event) => dispatch(capability, sandbox, event, "click"));
}

main().catch((err) => {
  app.setAttribute("data-status", "error");
  app.textContent = `Sandbox error: ${errorText(err)}`;
});
