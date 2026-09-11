import "./resources-storage-client.js";

// Project code arrives later through the QuickJS runtime's tagged message.
let nextFetch = 1;
const pendingFetches = new Map();

// The iframe can receive focus with its native body active, outside our grant.
// Enter the application surface without replacing an existing input selection.
globalThis.__resourcesOutputFocus = () => {
  if (!document.activeElement) document.body.focus({ preventScroll: true });
  return "null";
};

// Each session has its own native module cache. The prefix separates project
// resources from runtime code, not one source edit from the next.
globalThis.__wwcModuleSource = name => {
  const prefix = "project/";
  if (!name.startsWith(prefix)) throw new Error(`Module is outside the active project: ${name}`);
  const source = JSON.parse(globalThis.__wwcServiceCall("module.source", name.slice(prefix.length)));
  if (typeof source !== "string") throw new ReferenceError(`Project module is unavailable: ${name}`);
  return source;
};
globalThis.__resourcesOutputRunModule = json => {
  const request = JSON.parse(json);
  const name = `project/${request.source}`;
  Promise.resolve().then(() => globalThis.__wwcEvaluateModule(request.code, name)).then(
    () => globalThis.__wwcPostMessage("__wwcModule:" + JSON.stringify({ id: request.id })),
    error => globalThis.__wwcPostMessage("__wwcModule:" + JSON.stringify({ id: request.id,
      error: String(error) + (error?.stack ? "\n" + error.stack : "") })),
  );
  return JSON.stringify({ started: true });
};

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
  if (!value[5] && node.getAttribute("style") !== null) return false;
  // Inline declarations are checked and replaced after structural matching.
  // Their native serialized spelling need not match the original HTML.
  const existingAttributes = node.attributes.filter(attribute => !value[5] || attribute.name !== "style");
  if (existingAttributes.length !== attributes.length) return false;
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

function outputInlineStyles(node, value) {
  if (value[0] !== 1) return;
  if (value[5]) node.style.installDeclarationOperations(new Uint8Array(value[5]));
  for (let index = 0; index < value[4].length; index++) {
    outputInlineStyles(node.childNodes[index], value[4][index]);
  }
}

let installedDocument = {};
function setOutputDocument(parts, inline) {
  if (!parts) return;
  if (document.documentElement === document.body || document.head === document.body) {
    throw new Error("Project documents require distinct HTML, head, and body elements");
  }
  for (const name of ["html", "head", "body"]) {
    const node = name === "html" ? document.documentElement : document[name];
    const value = parts[name];
    if (!value || value[0] !== 1 || value[1] !== name || value[2] !== 0 || value[4].length) {
      throw new TypeError("Invalid project document part");
    }
    if (!inline) {
      const previous = installedDocument[name];
      for (const [key] of previous?.[3] || []) {
        if (!value[3].some(attribute => attribute[0] === key)) node.removeAttribute(key);
      }
      for (const [key, data] of value[3]) {
        if (node.getAttribute(key) !== data) node.setAttribute(key, data);
      }
      if (previous?.[5] && !value[5]) node.removeAttribute("style");
    } else if (value[5]) node.style.installDeclarationOperations(new Uint8Array(value[5]));
  }
  if (inline) installedDocument = parts;
}

function setOutputContent(nodes, inline = true) {
  // In container mode the machine's logical head shares the root. Preserve
  // its rendered styles without copying or moving those protected nodes.
  const all = document.body.childNodes;
  const existing = all.filter(node => node.nodeType !== 1 || node.localName !== "style");
  const hydrated = existing.length === nodes.length &&
    nodes.every((node, index) => outputNodeMatches(existing[index], node));
  let mounted = existing;
  if (!hydrated) {
    mounted = nodes.map(outputNode);
    if (existing.length === all.length) document.body.replaceChildren(...mounted);
    else {
      existing.forEach(node => document.body.removeChild(node));
      document.body.append(...mounted);
    }
  }
  if (inline) nodes.forEach((node, index) => outputInlineStyles(mounted[index], node));
  return { mounted: nodes.length, hydrated, nodes: mounted };
}

globalThis.__resourcesOutputSetContent = json => {
  const project = JSON.parse(json);
  // A tree-only edit leaves document metadata unchanged.
  const tree = Array.isArray(project) ? project : project.tree;
  setOutputDocument(project.document, false);
  const result = setOutputContent(tree);
  setOutputDocument(project.document, true);
  return JSON.stringify({ mounted: result.mounted, hydrated: result.hydrated });
};

globalThis.__resourcesOutputLoad = (json) => {
  const project = JSON.parse(json);
  const tree = project.tree || [];
  setOutputDocument(project.document, false);
  const result = setOutputContent(tree, false);
  // Establish scoped keyframe names before applying inline animation values.
  for (const stylesheet of project.stylesheets || []) {
    if (stylesheet && Array.isArray(stylesheet.operations)) {
      document.installStylesheetOperations(new Uint8Array(stylesheet.operations));
    } else {
      document.installStylesheetSource(String(stylesheet && stylesheet.source !== undefined
        ? stylesheet.source : stylesheet));
    }
  }
  tree.forEach((node, index) => outputInlineStyles(result.nodes[index], node));
  setOutputDocument(project.document, true);
  return JSON.stringify({ mounted: result.mounted, hydrated: result.hydrated });
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
