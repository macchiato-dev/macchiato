import createWasmWebContainer from "./wasm-web-container.js";

const services = {
  route: { get: () => "/", listen() {} },
  storage: { get: () => null, set() {}, delete() {}, listen() {} },
};

try {
  const host = createWasmWebContainer(document, {
    services,
    development: true,
    onDebug(message) { console.error(`QuickJS guest: ${message}`); },
    onReferenceCreate(id, value) {
      const detail = value instanceof Element ? `.${value.className || value.localName}` : "";
      console.debug(`host reference ${id}: ${value?.constructor?.name}${detail}`);
    },
    onReferenceRelease(id, value) { console.debug(`released reference ${id}: ${value?.constructor?.name}`); },
  });
  const response = await fetch("../generated/codemirror-canonical.wasm", { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Wasm response ${response.status}`);
  const { instance } = await WebAssembly.instantiateStreaming(response, host.imports);
  await host.connect(instance);
  document.body.dataset.ready = "true";
} catch (error) {
  const status = document.querySelector(".runtime-status");
  status.dataset.error = "";
  status.textContent = `QuickJS CodeMirror could not start: ${error?.message || error}`;
  throw error;
}
