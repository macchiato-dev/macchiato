import { mountQuickJsTerminal } from "@macchiato-dev/terminal-use/controller";

const root = document.getElementById("terminal");
const status = document.getElementById("status");
const shape = document.getElementById("shape");
const manifest = await (await fetch("/-/app-manifest.json")).json();
const guestSource = (await Promise.all(manifest.scripts.map(async (script) => `${await (await fetch(script.url)).text()}\n//# sourceURL=${script.source}`))).join("\n");
let line = "";
let controller;
controller = await mountQuickJsTerminal({
  root, guestSource,
  onReady() { status.textContent = "QuickJS terminal ready"; status.dataset.state = "ready"; },
  onData(data) {
    if (data === "\r") { controller.write(`\r\nYou typed: ${line}\r\n$ `); line = ""; }
    else if (data === "\u007f") { if (line) { line = line.slice(0, -1); controller.write("\b \b"); } }
    else if (!/^[\u0000-\u001f]$/.test(data)) { line += data; controller.write(data); }
    shape.textContent = `${root.querySelectorAll("*").length} constrained elements`;
  },
  onViolation(error) { status.textContent = `Terminal blocked: ${error.message}`; status.dataset.state = "error"; },
});
controller.write("terminal-use in-memory demo\r\n$ ");
controller.focus();
globalThis.__terminalBridge = Object.freeze({ inspect: () => controller.inspect(), write: (text) => controller.write(text), destroy: () => controller.destroy() });
document.body.dataset.ready = "true";
