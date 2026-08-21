import { mountQuickJsTerminal } from "@macchiato-dev/terminal-use/controller";

const root = document.getElementById("terminal");
const status = document.getElementById("status");
const shape = document.getElementById("shape");
let blocked = false;
const input = [];
function showError(error) {
  blocked = true;
  const message = error?.message || String(error);
  status.textContent = `Terminal blocked: ${message}`;
  status.dataset.state = "error";
}
addEventListener("error", (event) => showError(event.error || event.message));
addEventListener("unhandledrejection", (event) => showError(event.reason));
const manifest = await (await fetch("/-/app-manifest.json")).json();
const guestSource = (await Promise.all(manifest.scripts.map(async (script) => `${await (await fetch(script.url)).text()}\n//# sourceURL=${script.source}`))).join("\n");
let controller;
controller = await mountQuickJsTerminal({
  root,
  guestSource,
  onReady() { if (!blocked) { status.textContent = "QuickJS terminal ready; starting Pong…"; status.dataset.state = "ready"; } },
  onData(data) { input.push(data); },
  onViolation: showError,
});
try {
  controller.fit();
  controller.startPong();
  controller.focus();
  status.textContent = "Pong running · Click the terminal, then use W/S or ↑/↓";
} catch (error) {
  console.error("terminal-use Pong failed to start", error);
  showError(error);
}
const updateShape = () => { shape.textContent = `${root.querySelectorAll("*").length} constrained elements`; };
updateShape();
const shapeTimer = setInterval(updateShape, 1_000);
globalThis.__terminalBridge = Object.freeze({
  inspect: () => controller.inspect(),
  input: () => input.join(""),
  write: (text) => controller.write(text),
  startPong: () => controller.startPong(),
  stopPong: () => controller.stopPong(),
  destroy: () => controller.destroy(),
});
document.body.dataset.ready = "true";
addEventListener("pagehide", () => { clearInterval(shapeTimer); controller.destroy(); }, { once: true });
