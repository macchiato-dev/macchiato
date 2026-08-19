// Project code arrives later through the QuickJS runtime's tagged message.
let nextFetch = 1;
const pendingFetches = new Map();

function outputNode(value) {
  if (!Array.isArray(value) || (value[0] !== 0 && value[0] !== 1)) throw new TypeError("Invalid project output node");
  if (value[0] === 0) return document.createTextNode(String(value[1]));
  const node = value[2] ? document.createElementNS("http://www.w3.org/2000/svg", value[1]) : document.createElement(value[1]);
  for (const attribute of value[3] || []) node.setAttribute(attribute[0], attribute[1]);
  for (const child of value[4] || []) node.append(outputNode(child));
  return node;
}

globalThis.__resourcesOutputSetContent = (json) => {
  const nodes = JSON.parse(json);
  document.body.replaceChildren(...nodes.map(outputNode));
  return JSON.stringify({ mounted: nodes.length });
};

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
    resourceUrl: () => result.resourceUrl,
  });
  return JSON.stringify({ accepted: true });
};
