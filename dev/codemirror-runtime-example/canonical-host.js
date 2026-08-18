import createWasmWebContainer from "./wasm-web-container.js";

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
  const host = createWasmWebContainer(document, {
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : undefined,
    services,
  });
  const instance = new WebAssembly.Instance(module, host.imports);
  await host.connect(instance);
  document.body.dataset.ready = "true";
  document.querySelector(".runtime-status")?.remove();
} catch (error) {
  const status = document.querySelector(".runtime-status");
  status.dataset.error = "";
  status.textContent = `QuickJS CodeMirror could not start: ${error?.message || error}`;
  throw error;
}
