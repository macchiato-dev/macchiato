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

function outputNodeMatches(node, value) {
  if (!Array.isArray(value) || (value[0] !== 0 && value[0] !== 1)) return false;
  if (value[0] === 0) return node.nodeType === 3 && node.nodeValue === String(value[1]);
  if (node.nodeType !== 1 || node.localName !== value[1]) return false;
  const attributes = value[3] || [];
  if (node.attributes.length !== attributes.length) return false;
  for (const attribute of attributes) {
    if (node.getAttribute(attribute[0]) !== String(attribute[1])) return false;
  }
  const children = value[4] || [];
  if (node.childNodes.length !== children.length) return false;
  for (let index = 0; index < children.length; index++) {
    if (!outputNodeMatches(node.childNodes[index], children[index])) return false;
  }
  return true;
}

globalThis.__resourcesOutputSetContent = (json) => {
  const nodes = JSON.parse(json);
  const existing = document.body.childNodes;
  if (existing.length === nodes.length &&
      nodes.every((node, index) => outputNodeMatches(existing[index], node))) {
    return JSON.stringify({ mounted: nodes.length, hydrated: true });
  }
  document.body.replaceChildren(...nodes.map(outputNode));
  return JSON.stringify({ mounted: nodes.length, hydrated: false });
};

globalThis.__resourcesOutputLoad = (json) => {
  const project = JSON.parse(json);
  const mounted = JSON.parse(globalThis.__resourcesOutputSetContent(JSON.stringify(project.tree || [])));
  for (const stylesheet of project.stylesheets || []) {
    if (stylesheet && Array.isArray(stylesheet.operations)) {
      document.installStylesheetOperations(new Uint8Array(stylesheet.operations));
    } else {
      document.installStylesheetSource(String(stylesheet && stylesheet.source !== undefined
        ? stylesheet.source : stylesheet));
    }
  }
  return JSON.stringify(mounted);
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
