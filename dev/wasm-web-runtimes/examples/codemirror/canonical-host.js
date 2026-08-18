import WasmWebMachine from "./wasm-web-machine.js";

const services = {
  route: { get: () => "/", listen() {} },
  storage: { get: () => null, set() {}, delete() {}, listen() {} },
};
try {
  const guestUrl = document.querySelector("[data-wasm]")?.dataset.wasm ||
    "./generated/codemirror-canonical.wasm";
  const response = await fetch(new URL(guestUrl, import.meta.url),
    { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Wasm response ${response.status}`);
  const module = await WebAssembly.compileStreaming(response);
  const sections = WebAssembly.Module.customSections(module, "wasm-web-container");
  const machine = new WasmWebMachine(module, document, {
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : undefined,
    services,
  });
  await machine.onmsg(0);
  document.body.dataset.ready = "true";
  document.querySelector(".runtime-status")?.remove();
} catch (error) {
  const status = document.querySelector(".runtime-status");
  status.dataset.error = "";
  status.textContent = `QuickJS CodeMirror could not start: ${error?.message || error}`;
  throw error;
}
