import WasmWebMachine from "./wasm-web-machine.js";

const services = {
  route: { get: () => "/", listen() {} },
  storage: { get: () => null, set() {}, delete() {}, listen() {} },
};

const status = document.querySelector(".runtime-status");
const diagnostics = [];
globalThis.__quickjsExample = { diagnostics };
try {
  let guestError = null;
  const name = document.body.dataset.example;
  const trace = location.search === "?instrument" ? [] : null;
  if (trace) globalThis.__quickjsExample.trace = trace;
  const response = await fetch(`/${name}.wasm`, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Wasm response ${response.status}`);
  const module = await WebAssembly.compileStreaming(response);
  const sections = WebAssembly.Module.customSections(module, "wasm-web-machine");
  const machine = new WasmWebMachine(module, document, {
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : undefined,
    services,
    instrument: trace ? entry => trace.push(entry) : undefined,
    onMessage(message) {
      if (!message.startsWith("__wwcError:")) return;
      const detail = message.slice("__wwcError:".length);
      diagnostics.push(detail);
      guestError = guestError ? `${guestError}\n${detail}` : detail;
      status.dataset.error = "";
      status.textContent = guestError;
    },
  });
  await machine.onmsg(0);
  if (guestError) throw new Error(guestError);
  document.body.dataset.ready = "true";
} catch (error) {
  status.dataset.error = "";
  status.textContent = `The QuickJS example could not start: ${error?.message || error}`;
  throw error;
}
