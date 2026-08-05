import { mountQuickJsTerminal } from "@macchiato-dev/terminal-use/controller";

const root = document.getElementById("terminal");
const status = document.getElementById("status");
const shape = document.getElementById("shape");
const manifest = await (await fetch("/-/app-manifest.json")).json();
const guestSource = (await Promise.all(manifest.scripts.map(async (script) => `${await (await fetch(script.url)).text()}\n//# sourceURL=${script.source}`))).join("\n");
let controller;
controller = await mountQuickJsTerminal({
  root, guestSource,
  onReady() { status.textContent = "QuickJS terminal ready"; status.dataset.state = "ready"; },
  onData() {},
  onViolation(error) { status.textContent = `Terminal blocked: ${error.message}`; status.dataset.state = "error"; },
});
controller.startPong();
controller.focus();
const updateShape = () => { shape.textContent = `${root.querySelectorAll("*").length} constrained elements`; };
updateShape();
const shapeTimer = setInterval(updateShape, 1_000);
globalThis.__terminalBridge = Object.freeze({ inspect: () => controller.inspect(), write: (text) => controller.write(text), startPong: () => controller.startPong(), destroy: () => controller.destroy() });
document.body.dataset.ready = "true";
addEventListener("pagehide", () => { clearInterval(shapeTimer); controller.destroy(); }, { once: true });
