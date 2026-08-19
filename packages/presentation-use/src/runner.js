import { mountPresentationRuntime } from "./runtime.js";

const PROTOCOL = "macchiato-presentation-use-v1";
const mount = document.querySelector("[data-presentation-root]");
let active = null;
let channel = null;

function applyColorScheme(value) {
  const colorScheme = value === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = colorScheme;
  document.documentElement.style.colorScheme = colorScheme;
  document.documentElement.style.setProperty("--macchiato-color-scheme", colorScheme);
}

mount.tabIndex = 0;
mount.addEventListener("pointerup", () => setTimeout(() => {
  if (document.activeElement === document.body) mount.focus({ preventScroll: true });
}, 0));

function send(type, detail = {}) {
  parent.postMessage({ protocol: PROTOCOL, channel, type, ...detail }, "*");
}

async function start(project) {
  active?.destroy();
  applyColorScheme(project.colorScheme);
  active = await mountPresentationRuntime({ root: mount, project, onStatus: (status) => send(status.type, status) });
  send("mounted", { runtime: "quickjs-dom-use" });
}

addEventListener("message", (event) => {
  if (event.data?.protocol !== PROTOCOL) return;
  channel = event.data.channel;
  if (event.data.type === "connect") send("ready");
  if (event.data.type === "theme") applyColorScheme(event.data.colorScheme);
  if (event.data.type === "focus") mount.focus({ preventScroll: true });
  if (event.data.type === "destroy") active?.destroy();
  if (event.data.type === "mount") start(event.data.project).catch((error) => {
    mount.textContent = `Presentation blocked: ${error.message}`;
    mount.dataset.runtime = "blocked";
    send("blocked", { message: error.message });
  });
});
