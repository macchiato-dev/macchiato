import { ELEMENT_USE_PROTOCOL } from "./protocol.js";

export function mountElementUse(
  { root, runnerUrl, project, onStatus = () => {} },
) {
  const frame = document.createElement("iframe"), channel = crypto.randomUUID();
  frame.className = "project-editor__presentation-frame";
  frame.title = project.title || "Game";
  // The trusted runner needs same-origin module loading. Untrusted game code is
  // still confined to QuickJS and never receives the iframe's window object.
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.src = runnerUrl;
  root.replaceChildren(frame);
  const receive = (event) => {
    if (
      event.source !== frame.contentWindow ||
      event.data?.protocol !== ELEMENT_USE_PROTOCOL ||
      event.data.channel !== channel
    ) return;
    if (event.data.type === "ready") {
      frame.contentWindow.postMessage({
        protocol: ELEMENT_USE_PROTOCOL,
        channel,
        type: "mount",
        project,
      }, "*");
    } else onStatus(event.data);
  };
  addEventListener("message", receive);
  frame.addEventListener(
    "load",
    () =>
      frame.contentWindow.postMessage({
        protocol: ELEMENT_USE_PROTOCOL,
        channel,
        type: "connect",
      }, "*"),
    { once: true },
  );
  return {
    frame,
    focus() {
      frame.focus();
      frame.contentWindow.postMessage({
        protocol: ELEMENT_USE_PROTOCOL,
        channel,
        type: "focus",
      }, "*");
    },
    destroy() {
      removeEventListener("message", receive);
      frame.contentWindow?.postMessage({
        protocol: ELEMENT_USE_PROTOCOL,
        channel,
        type: "destroy",
      }, "*");
      frame.remove();
    },
  };
}
