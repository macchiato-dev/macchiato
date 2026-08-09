export function createMemoryStorageAdapter({ config, artifactSet }) {
  const root = `${new URL(config.storageOrigin).pathname.replace(/\/$/, "")}/${config.bucketPrefix}/`;
  const objects = new Map(artifactSet.files);
  objects.set("/manifest.json", new TextEncoder().encode(JSON.stringify(artifactSet.manifest)));

  return async function memoryStorageFetch(request) {
    const url = new URL(request.url);
    if (url.origin !== new URL(config.storageOrigin).origin || !url.pathname.startsWith(root)) return new Response("Wrong storage origin", { status: 502 });
    if (request.headers.get("AccessKey") !== config.storageAccessKey) return new Response("Forbidden", { status: 403 });
    const key = `/${decodeURIComponent(url.pathname.slice(root.length))}`;
    const content = objects.get(key);
    if (!content) return new Response("Not found", { status: 404 });
    return new Response(content, { headers: { "content-length": String(content.byteLength) } });
  };
}
