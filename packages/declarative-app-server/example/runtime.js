import { browserUseQuickJsDomGuestSource } from "@macchiato-dev/browser-use/quickjs-dom-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { BrowserDomHost } from "/browser-host.js";

const root = document.getElementById("app");
const policy = {
  tags: ["p", "h1", "section", "output", "div", "button"],
  events: ["click"],
  attributes: {
    id: "^[a-z][a-z0-9-]{0,40}$",
    class: "^[a-z][a-z0-9 -]{0,80}$",
    type: "^button$",
    "aria-label": "^[A-Za-z ]{1,80}$",
    "aria-live": "^polite$"
  },
  classNames: ["^(?:eyebrow|intro|counter|actions|activity)$"],
  maxElements: 20,
  maxDepth: 4,
  maxTextLength: 1000
};

let sandbox;
const host = new BrowserDomHost(root, policy, {
  onViolation(error) {
    root.replaceChildren(Object.assign(document.createElement("p"), { textContent: `App stopped: ${error.message}` }));
  },
  onEvent(listenerId, event, nativeEvent) {
    const result = sandbox.callJsonFunction("__browserUseDispatchEvent", { listenerId, event });
    if (result.preventDefault) nativeEvent.preventDefault();
    if (result.stopPropagation) nativeEvent.stopPropagation();
  }
});

sandbox = await createSandbox();
sandbox.installJsonHostFunction("__browserUseHost", (message) => host.dispatch(message));
sandbox.evalGlobal(browserUseQuickJsDomGuestSource, "browser-use-dom-guest.js");
const manifest = await (await fetch("/-/app-manifest.json")).json();
for (const script of manifest.scripts) {
  sandbox.evalGlobal(await (await fetch(script.url)).text(), script.source);
}
host.start();
document.body.dataset.ready = "true";
