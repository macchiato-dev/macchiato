import {
  DomUseHostCapability,
  StyleUse,
} from "https://cdn.jsdelivr.net/npm/@macchiato-dev/dom-use@0.1.0/lib/host.js";
import { getQuickJS } from "https://cdn.jsdelivr.net/npm/quickjs-emscripten@0.32.0/+esm";

const guestRuntimeUrl = "https://cdn.jsdelivr.net/npm/@macchiato-dev/dom-use@0.1.0/lib/guest-runtime.js";
const source = `<main id="app"><h1>Constrained view</h1><p>Rendered by a QuickJS WebAssembly guest.</p></main>`;
const schema = {
  nodes: {
    body: { attrs: [], children: ["main"] },
    main: { attrs: ["id"], children: ["h1", "p"] },
    h1: { attrs: [], children: ["#text"] },
    p: { attrs: [], children: ["#text"] },
  },
  urls: false,
  maxDepth: 4,
  maxNodes: 12,
};

const app = document.querySelector("#app");
const capability = new DomUseHostCapability(schema, new StyleUse({ properties: {} }));
const QuickJS = await getQuickJS();
const vm = QuickJS.newContext();

try {
  const hostFunction = vm.newFunction("__macchiatoHost", (messageHandle) => {
    return vm.newString(capability.dispatch(vm.getString(messageHandle)));
  });
  vm.setProp(vm.global, "__macchiatoHost", hostFunction);
  hostFunction.dispose();

  const runtime = await fetch(guestRuntimeUrl).then((response) => {
    if (!response.ok) throw new Error(`Guest runtime response: ${response.status}`);
    return response.text();
  });
  const installed = vm.evalCode(await runtime, "dom-use-guest-runtime.js");
  if (installed.error) throw vm.dump(installed.error);
  installed.value.dispose();

  const booted = vm.evalCode(`__macchiatoBoot(${JSON.stringify(source)})`, "boot.js");
  if (booted.error) throw vm.dump(booted.error);
  booted.value.dispose();
  app.outerHTML = capability.serializeApp().html;
  capability.finishInit();
} finally {
  vm.dispose();
}
