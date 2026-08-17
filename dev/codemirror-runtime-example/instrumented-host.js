import createWasmWebContainer from "./wasm-web-container.js";

const endpoint = "/-/writable-files/interaction-trace.ndjson";
const encoder = new TextEncoder();
const maxBytes = 900 * 1024;
const session = crypto.randomUUID();
const records = [];
let bytes = 0;
let flushTimer;
let flushing = Promise.resolve();

function append(record) {
  const line = `${JSON.stringify({ wallTime: new Date().toISOString(), session, ...record })}\n`;
  const size = encoder.encode(line).byteLength;
  records.push({ line, size });
  bytes += size;
  while (bytes > maxBytes && records.length > 1) bytes -= records.shift().size;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 200);
}

function appendLine(line) {
  const normalized = line.endsWith("\n") ? line : `${line}\n`;
  const size = encoder.encode(normalized).byteLength;
  records.push({ line: normalized, size });
  bytes += size;
  while (bytes > maxBytes && records.length > 1) bytes -= records.shift().size;
}

function flush() {
  clearTimeout(flushTimer);
  const body = records.map((record) => record.line).join("");
  flushing = flushing.catch(() => {}).then(async () => {
    const response = await fetch(endpoint, { method: "PUT", body });
    if (!response.ok) throw new Error(`Trace write failed: ${response.status}`);
  });
  return flushing;
}

const services = {
  route: { get: () => "/", listen() {} },
  storage: { get: () => null, set() {}, delete() {}, listen() {} },
};

const previous = await fetch(endpoint, { cache: "no-store" });
if (previous.ok) {
  for (const line of (await previous.text()).split("\n")) if (line) appendLine(line);
}

append({
  type: "session-start",
  url: location.href,
  viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
  userAgent: navigator.userAgent,
});

try {
  const host = createWasmWebContainer(document, {
    services,
    development: true,
    instrument: append,
    onDebug(message) { append({ type: "guest-debug", message }); },
  });
  const response = await fetch("../generated/codemirror-canonical.wasm", { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Wasm response ${response.status}`);
  const { instance } = await WebAssembly.instantiateStreaming(response, host.imports);
  await host.connect(instance);
  document.body.dataset.ready = "true";
} catch (error) {
  append({ type: "startup-error", message: error?.stack || String(error) });
  await flush().catch(() => {});
  const status = document.querySelector(".runtime-status");
  status.dataset.error = "";
  status.textContent = `Instrumented QuickJS CodeMirror could not start: ${error?.message || error}`;
  throw error;
}

addEventListener("pagehide", () => {
  clearTimeout(flushTimer);
  const body = records.map((record) => record.line).join("");
  fetch(endpoint, { method: "PUT", body, keepalive: true }).catch(() => {});
});
