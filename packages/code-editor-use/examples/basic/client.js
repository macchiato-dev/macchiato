import { mountQuickJsCodeEditor } from "@macchiato-dev/code-editor-use/controller";

const root = document.getElementById("editor");
const status = document.getElementById("status");
const shape = document.getElementById("shape");
const manifest = await (await fetch("/-/app-manifest.json")).json();
const parameters = new URLSearchParams(location.search);
const limits = Object.fromEntries([
  ["maxLines", parameters.get("maxLines")],
  ["maxCharacters", parameters.get("maxCharacters")],
  ["maxSurfaceOperations", parameters.get("maxSurfaceOperations")],
].filter(([, value]) => value !== null).map(([name, value]) => [name, Number(value)]));
const guestSource = (await Promise.all(manifest.scripts.map(async (script) =>
  `${await (await fetch(script.url)).text()}\n//# sourceURL=${script.source}`))).join("\n");
let readyMessage = null;
const controller = await mountQuickJsCodeEditor({
  root,
  guestSource,
  limits,
  onReady(message) { readyMessage = message; },
  onChange(_content) { updateSummary(); },
  onLimit(message) {
    status.textContent = `Edit omitted: the ${message.limits.maxLines}-line or ${message.limits.maxCharacters}-character document budget was reached.`;
    status.dataset.state = "warning";
  },
  onViolation(error) {
    console.error("code-editor-use shape violation", error);
    status.textContent = `Editor stopped: ${error.message}`;
    status.dataset.state = "error";
  },
});

function updateSummary() {
  const current = controller.inspect();
  const characters = current.document.length;
  const lines = current.document.split("\n").length;
  status.textContent = `QuickJS owns ${characters} characters across ${lines} of ${current.limits.maxLines} lines.`;
  status.dataset.state = "ready";
  shape.textContent = `${root.querySelectorAll("*").length} constrained DOM elements`;
}
if (readyMessage) updateSummary();
globalThis.__codeEditorBridge = Object.freeze({
  command: (payload) => controller.command(payload),
  inspect: () => controller.inspect(),
  setContent: (content, language, options) => controller.setContent(content, language, options),
  destroy: () => controller.destroy(),
});
addEventListener("pagehide", () => controller.destroy(), { once: true });
document.body.dataset.ready = "true";
