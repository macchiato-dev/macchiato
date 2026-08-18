import createWasmWebContainer from "./wasm-web-container.js";

const services = {
  route: { get: () => "/", listen() {} },
  storage: { get: () => null, set() {}, delete() {}, listen() {} },
};
const profiling = new URL(location.href).searchParams.has("profile");
const references = new Map();
const referenceLeases = new Map();
let runtimeMetrics = () => null;
if (profiling) {
  globalThis.__wwcReferenceMetrics = () => ({
    active: references.size,
    nodes: Array.from(references.values()).filter(value => value instanceof Node).length,
    leases: Array.from(referenceLeases.values()).reduce((sum, count) => sum + count, 0),
    maximumLease: Math.max(0, ...referenceLeases.values()),
    detachedLeases: Array.from(references).reduce((sum, [id, value]) =>
      sum + (value instanceof Node && !value.isConnected ? referenceLeases.get(id) || 0 : 0), 0),
    attachedLeases: Array.from(references).reduce((sum, [id, value]) =>
      sum + (value instanceof Node && value.isConnected ? referenceLeases.get(id) || 0 : 0), 0),
    detached: Object.entries(Object.groupBy(
      Array.from(references.values()).filter(value => value instanceof Node && !value.isConnected),
      value => value.nodeType === Node.TEXT_NODE ? "#text" :
        `${value.nodeName.toLowerCase()}.${String(value.className || "").split(/\s+/, 1)[0] || "-"}`,
    )).map(([kind, values]) => [kind, values.length]).sort((left, right) => right[1] - left[1]),
    types: Object.entries(Object.groupBy(Array.from(references.values()),
      value => value?.constructor?.name || typeof value))
      .map(([kind, values]) => [kind, values.length])
      .sort((left, right) => right[1] - left[1]),
    guest: globalThis.__wwcGuestOwnership || null,
    runtime: runtimeMetrics(),
  });
}

try {
  const host = createWasmWebContainer(document, {
    services,
    development: true,
    profiling,
    onDebug(message) {
      if (profiling && message.startsWith("OWNERSHIP:")) {
        globalThis.__wwcGuestOwnership = JSON.parse(message.slice(10));
        return;
      }
      console.error(`QuickJS guest: ${message}`);
    },
    onReferenceCreate: profiling ? (id, value) => references.set(id, value) : undefined,
    onReferenceRelease: profiling ? id => references.delete(id) : undefined,
    onReferenceLease: profiling ? (id, count) => {
      if (count) referenceLeases.set(id, count);
      else referenceLeases.delete(id);
    } : undefined,
  });
  runtimeMetrics = () => host.metrics();
  const response = await fetch(new URL("./generated/codemirror-canonical.wasm", import.meta.url),
    { credentials: "same-origin" });
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
