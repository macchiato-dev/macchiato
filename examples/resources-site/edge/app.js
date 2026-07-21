import {
  normalizeExportManifest,
  pathToObjectKey,
  publicResponseHeaders,
  storageRequest,
} from "./models.js";

const MANIFEST_KEY = "manifest.json";

async function fetchStorage(fetchImpl, request) {
  const response = await fetchImpl(request);
  if (response.status >= 300 && response.status < 400) throw new Error("Storage redirects are not allowed");
  return response;
}

export function createResourcesEdgeHandler({ config, fetchImpl = fetch, now = Date.now, logger = console } = {}) {
  if (!config) throw new Error("Edge handler requires config");
  let cachedManifest = null;
  let manifestExpiresAt = 0;
  let manifestPromise = null;

  async function loadManifest() {
    if (cachedManifest && now() < manifestExpiresAt) return cachedManifest;
    if (!manifestPromise) {
      manifestPromise = (async () => {
        const response = await fetchStorage(fetchImpl, storageRequest(config, MANIFEST_KEY));
        if (!response.ok) throw new Error(`Manifest storage response: ${response.status}`);
        const contentLength = Number(response.headers.get("content-length") || 0);
        if (contentLength > 256_000) throw new Error("Export manifest is too large");
        const manifest = normalizeExportManifest(await response.json());
        cachedManifest = manifest;
        manifestExpiresAt = now() + config.manifestTtlMs;
        return manifest;
      })().finally(() => { manifestPromise = null; });
    }
    return manifestPromise;
  }

  return async function resourcesEdgeHandler(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    const key = pathToObjectKey(new URL(request.url).pathname);
    if (!key || key === MANIFEST_KEY) return new Response("Not found", { status: 404 });

    try {
      const manifest = await loadManifest();
      if (!manifest.files.has(key)) return new Response("Not found", { status: 404 });
      const upstream = await fetchStorage(fetchImpl, storageRequest(config, key));
      if (upstream.status === 404) return new Response("Not found", { status: 404 });
      if (!upstream.ok) return new Response("Storage unavailable", { status: 502 });
      const expected = manifest.artifacts.get(key);
      const receivedLength = Number(upstream.headers.get("content-length") || 0);
      if (receivedLength && receivedLength !== expected.bytes) {
        throw new Error(`Storage length mismatch for ${key}`);
      }
      return new Response(request.method === "HEAD" ? null : upstream.body, {
        status: 200,
        headers: publicResponseHeaders(key, upstream.headers),
      });
    } catch (error) {
      logger.error("resources-edge", error?.message || String(error));
      return new Response("Edge content unavailable", { status: 503, headers: { "cache-control": "no-store" } });
    }
  };
}
