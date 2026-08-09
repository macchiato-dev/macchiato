const MAX_DEFERRED_BUNDLE_BYTES = 2 * 1024 * 1024;

function required(value, name) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function moduleOrigin(value) {
  const url = new URL(required(value, "EDGE_MODULE_ORIGIN"));
  const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("EDGE_MODULE_ORIGIN must use HTTPS outside local development");
  }
  if (url.username || url.password || url.hash) throw new Error("EDGE_MODULE_ORIGIN must not contain credentials or a fragment");
  return url.href;
}

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
  origin,
  token,
  expectedSha256,
  fetchImpl = fetch,
  importModule = (specifier) => import(specifier),
  maxBytes = MAX_DEFERRED_BUNDLE_BYTES,
} = {}) {
  const url = moduleOrigin(origin);
  const secret = required(token, "EDGE_MODULE_API_KEY");
  if (!/^[a-f0-9]{64}$/.test(expectedSha256 || "")) throw new Error("Deferred bundle SHA-256 is invalid");
  let modulePromise;

  async function fetchAndImport() {
    const response = await fetchImpl(new Request(url, {
      headers: { authorization: `Bearer ${secret}`, accept: "application/javascript" },
      redirect: "manual",
    }));
    if (response.status >= 300 && response.status < 400) throw new Error("Deferred module redirects are not allowed");
    if (!response.ok) throw new Error(`Deferred module response: ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) throw new Error("Deferred module exceeds its size limit");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > maxBytes) throw new Error("Deferred module has an invalid size");
    if (await sha256(bytes) !== expectedSha256) throw new Error("Deferred module digest mismatch");
    const loaded = await importModule(`data:application/javascript;base64,${base64(bytes)}`);
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
