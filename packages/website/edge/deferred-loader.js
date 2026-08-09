const MAX_DEFERRED_BUNDLE_BYTES = 2 * 1024 * 1024;

function base64(bytes) {
  let result = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(result);
}

async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
    try {
      loaded = await importModule(`data:application/javascript;base64,${base64(bytes)}`);
    } catch {
      // Import stacks may contain the complete data URL. Do not let bundle source
      // escape into platform logs through an exception message or stack.
      throw new Error("Deferred module evaluation failed");
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
