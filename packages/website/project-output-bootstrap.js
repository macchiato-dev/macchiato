// Project code arrives later through the QuickJS runtime's tagged message.
let nextFetch = 1;
const pendingFetches = new Map();

globalThis.__wwcFetchMissing = (url) => new Promise((resolve, reject) => {
  const id = nextFetch++;
  pendingFetches.set(id, { resolve, reject });
  globalThis.__wwcPostMessage(JSON.stringify({ type: "fetch", id, url }));
});

globalThis.__resourcesFetchResolve = (json) => {
  const result = JSON.parse(json);
  const pending = pendingFetches.get(result.id);
  if (!pending) return JSON.stringify({ accepted: false });
  pendingFetches.delete(result.id);
  if (result.error) pending.reject(new Error(result.error));
  else pending.resolve({
    ok: result.status >= 200 && result.status < 300,
    status: result.status,
    text: () => Promise.resolve(result.body),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(result.body)),
  });
  return JSON.stringify({ accepted: true });
};
