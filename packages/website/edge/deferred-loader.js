import { rm, writeFile } from "node:fs/promises";

const MAX_DEFERRED_BUNDLE_BYTES = 2 * 1024 * 1024;

async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function evaluationError(error) {
  const name = typeof error?.name === "string" ? error.name : "Error";
  const message = typeof error?.message === "string" ? error.message : String(error);
  const safe = `${name}: ${message}`
    .replace(/(?:blob|data|file):[^\s)]+/gi, "<deferred-module>")
    .replace(/\s+/g, " ")
    .slice(0, 320);
  return new Error(`Deferred module evaluation failed: ${safe}`);
}

export function createDeferredModuleLoader({
  request,
  expectedSha256,
  fetchImpl = fetch,
  importModule = (specifier) => import(specifier),
  maxBytes = MAX_DEFERRED_BUNDLE_BYTES,
} = {}) {
  if (typeof request !== "function") throw new Error("Deferred module request factory is required");
  if (!/^[a-f0-9]{64}$/.test(expectedSha256 || "")) throw new Error("Deferred bundle SHA-256 is invalid");
  let modulePromise;

  async function fetchAndImport() {
    const moduleRequest = request();
    if (!(moduleRequest instanceof Request) || moduleRequest.method !== "GET") {
      throw new Error("Deferred module request factory must return a GET Request");
    }
    const response = await fetchImpl(moduleRequest);
    if (response.status >= 300 && response.status < 400) throw new Error("Deferred module redirects are not allowed");
    if (!response.ok) throw new Error(`Deferred module response: ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) throw new Error("Deferred module exceeds its size limit");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > maxBytes) throw new Error("Deferred module has an invalid size");
    if (await sha256(bytes) !== expectedSha256) throw new Error("Deferred module digest mismatch");
    let loaded;
    const modulePath = `/tmp/resources-application-${expectedSha256.slice(0, 16)}.mjs`;
    const moduleUrl = `file://${modulePath}`;
    try {
      await writeFile(modulePath, bytes);
      loaded = await importModule(moduleUrl);
    } catch (error) {
      // Keep the useful exception category and message, but never log a module
      // URL: alternate runtimes may represent fetched source in the specifier.
      throw evaluationError(error);
    } finally {
      await rm(modulePath, { force: true }).catch(() => {});
    }
    if (typeof loaded.createResourcesDeferredHandler !== "function") {
      throw new Error("Deferred module does not export createResourcesDeferredHandler");
    }
    return loaded;
  }

  return Object.freeze({
    load() {
      if (!modulePromise) modulePromise = fetchAndImport().catch((error) => {
        modulePromise = null;
        throw error;
      });
      return modulePromise;
    },
  });
}
