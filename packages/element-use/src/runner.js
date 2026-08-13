import { mountElementUseRuntime } from "./runtime.js";
import { ELEMENT_USE_PROTOCOL } from "./protocol.js";

const root = document.querySelector("[data-element-use-root]");
let active, channel;
function send(type, detail = {}) {
  parent.postMessage({
    protocol: ELEMENT_USE_PROTOCOL,
    channel,
    type,
    ...detail,
  }, "*");
}
addEventListener("message", async (event) => {
  if (event.data?.protocol !== ELEMENT_USE_PROTOCOL) return;
  channel = event.data.channel;
  if (event.data.type === "connect") return send("ready");
  if (event.data.type === "focus") return root.focus({ preventScroll: true });
  if (event.data.type === "destroy") return active?.destroy();
  if (event.data.type !== "mount") return;
  try {
    active?.destroy();
    active = await mountElementUseRuntime({
      root,
      project: event.data.project,
      onStatus: (status) => send(status.type, status),
    });
  } catch (error) {
    root.textContent = `Game blocked: ${error.message}`;
    send("blocked", { message: error.message });
  }
});
