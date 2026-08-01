import { mountQuickJsCodeEditor } from "@macchiato-dev/code-editor-use/controller";

const root = document.getElementById("editor");
const status = document.getElementById("status");
const shape = document.getElementById("shape");
const manifest = await (await fetch("/-/app-manifest.json")).json();
const guestSource = (await Promise.all(manifest.scripts.map(async (script) =>
  `${await (await fetch(script.url)).text()}\n//# sourceURL=${script.source}`))).join("\n");
let readyMessage = null;
const controller = await mountQuickJsCodeEditor({
  root,
  guestSource,
  onReady(message) { readyMessage = message; },
  onChange(_content) { updateSummary(); },
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
  status.textContent = `QuickJS owns ${characters} characters across ${lines} line${lines === 1 ? "" : "s"}.`;
  shape.textContent = `${root.querySelectorAll("*").length} constrained DOM elements`;
}
if (readyMessage) updateSummary();
globalThis.__codeEditorBridge = Object.freeze({
  command: (payload) => controller.command(payload),
  inspect: () => controller.inspect(),
  destroy: () => controller.destroy(),
});
addEventListener("pagehide", () => controller.destroy(), { once: true });
document.body.dataset.ready = "true";
