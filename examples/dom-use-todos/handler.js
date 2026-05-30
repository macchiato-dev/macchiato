import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DomUse } from "@macchiato-dev/dom-use";
import { StyleUse } from "@macchiato-dev/style-use";
import { Sandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const DEFAULT_STORAGE_LIMIT = 10000;
const DEFAULT_LOCAL_STORAGE = {
  mode: "passthrough",
  keys: ["guest-todos"],
  limit: DEFAULT_STORAGE_LIMIT,
};

let assetsPromise = null;
let sessionPromise = null;
let handlerOptions = {
  localStorage: DEFAULT_LOCAL_STORAGE,
};

async function readJson(path) {
  return JSON.parse(await readFile(join(__dirname, path), "utf8"));
}

function extractStyle(source) {
  return source.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || "";
}

async function assets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      readFile(join(__dirname, "guest.js"), "utf8"),
      readFile(join(repoRoot, "examples", "todo", "index.html"), "utf8"),
      readJson("dom.schema.json"),
      readJson("css.schema.json"),
    ]).then(([runtimeCode, sourceHtml, domSchema, cssSchema]) => ({
      runtimeCode,
      sourceHtml,
      css: extractStyle(sourceHtml),
      domSchema,
      cssSchema,
    }));
  }
  return assetsPromise;
}

class LocalStorageBackend {
  constructor(config = {}) {
    this.mode = config.mode || "disabled";
    this.allowedKeys = config.keys ? new Set(config.keys) : null;
    this.limit = config.limit ?? DEFAULT_STORAGE_LIMIT;
    this.store = config.store || new Map();
  }

  assertEnabled(key, value = "") {
    if (this.mode !== "passthrough") throw new Error("localStorage is not enabled");
    if (this.allowedKeys && !this.allowedKeys.has(String(key))) {
      throw new Error(`localStorage key not allowed: ${key}`);
    }
    if (String(value).length > this.limit) {
      throw new Error(`localStorage value exceeds limit ${this.limit}`);
    }
  }

  getItem(key) {
    this.assertEnabled(key);
    return this.store.has(String(key)) ? this.store.get(String(key)) : null;
  }

  setItem(key, value) {
    this.assertEnabled(key, value);
    this.store.set(String(key), String(value));
  }
}

class DomUseCapability {
  constructor(domSchema, styleUse, storage) {
    this.domUse = new DomUse(domSchema, styleUse);
    this.document = this.domUse.createDocument();
    this.storage = storage;
    this.nodes = new Map();
    this.appRootId = null;
    this.nextId = 1;
  }

  resetDom() {
    this.nodes = new Map();
    this.appRootId = null;
    this.nextId = 1;
    this.document = this.domUse.createDocument();
    return {};
  }

  register(node) {
    const id = String(this.nextId++);
    this.nodes.set(id, node);
    return id;
  }

  node(id) {
    const node = this.nodes.get(String(id));
    if (!node) throw new Error(`DOM node not found: ${id}`);
    return node;
  }

  createElement(tagName) {
    const node = this.document.createElement(tagName);
    return { id: this.register(node) };
  }

  createTextNode(text) {
    const node = this.document.createTextNode(text);
    return { id: this.register(node) };
  }

  appendChild(parentId, childId) {
    this.node(parentId).appendChild(this.node(childId));
    return {};
  }

  removeChild(parentId, childId) {
    this.node(parentId).removeChild(this.node(childId));
    return {};
  }

  insertBefore(parentId, childId, referenceId) {
    this.node(parentId).insertBefore(this.node(childId), referenceId ? this.node(referenceId) : null);
    return {};
  }

  setTextContent(id, value) {
    this.node(id).textContent = value;
    return {};
  }

  setInnerHTML(id, html) {
    if (html === "") this.node(id).replaceChildren();
    else this.domUse.setInnerHTML(this.node(id), html);
    return {};
  }

  setAttribute(id, name, value) {
    this.node(id).setAttribute(name, value);
    return {};
  }

  removeAttribute(id, name) {
    this.node(id).removeAttribute(name);
    return {};
  }

  setStyle(id, property, value) {
    this.node(id).style[property] = value;
    return {};
  }

  addEventListener(id) {
    this.node(id).setAttribute("data-node-id", String(id));
    return {};
  }

  setAppRoot(id) {
    this.appRootId = String(id);
    return {};
  }

  serializeApp() {
    if (!this.appRootId) return { html: "" };
    return { html: this.domUse.getInnerHTML(this.node(this.appRootId)) };
  }

  nodeTag(id) {
    return { tagName: this.node(id).tagName };
  }

  storageGet(key) {
    return { value: this.storage.getItem(key) };
  }

  storageSet(key, value) {
    this.storage.setItem(key, value);
    return {};
  }

  dispatch(message) {
    switch (message.op) {
      case "resetDom": return this.resetDom();
      case "createElement": return this.createElement(message.tagName);
      case "createTextNode": return this.createTextNode(message.text);
      case "appendChild": return this.appendChild(message.parentId, message.childId);
      case "removeChild": return this.removeChild(message.parentId, message.childId);
      case "insertBefore": return this.insertBefore(message.parentId, message.childId, message.referenceId);
      case "setTextContent": return this.setTextContent(message.id, message.value);
      case "setInnerHTML": return this.setInnerHTML(message.id, message.html);
      case "setAttribute": return this.setAttribute(message.id, message.name, message.value);
      case "removeAttribute": return this.removeAttribute(message.id, message.name);
      case "setStyle": return this.setStyle(message.id, message.property, message.value);
      case "addEventListener": return this.addEventListener(message.id, message.event);
      case "setAppRoot": return this.setAppRoot(message.id);
      case "serializeApp": return this.serializeApp();
      case "nodeTag": return this.nodeTag(message.id);
      case "storageGet": return this.storageGet(message.key);
      case "storageSet": return this.storageSet(message.key, message.value);
      default: throw new Error(`Unsupported host operation: ${message.op}`);
    }
  }
}

function installHostCapability(sandbox, capability) {
  const context = sandbox.context;
  const hostFunction = context.newFunction("__macchiatoHost", (messageHandle) => {
    try {
      const message = JSON.parse(context.getString(messageHandle));
      return context.newString(JSON.stringify(capability.dispatch(message)));
    } catch (err) {
      return context.newString(JSON.stringify({ __error: err.message }));
    }
  });
  context.setProp(context.global, "__macchiatoHost", hostFunction);
  hostFunction.dispose();
}

function runModule(sandbox, code, filename) {
  const result = sandbox.context.evalCode(code, filename, { type: "module" });
  if (result.error) {
    const err = sandbox.context.dump(result.error);
    result.error.dispose();
    throw new Error(String(err));
  }
  result.value.dispose();
}

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const loaded = await assets();
      const styleUse = new StyleUse(loaded.cssSchema);
      styleUse.validateStylesheet(loaded.css);

      const storage = new LocalStorageBackend(handlerOptions.localStorage);
      const capability = new DomUseCapability(loaded.domSchema, styleUse, storage);
      const sandbox = new Sandbox();
      await sandbox.init();
      installHostCapability(sandbox, capability);

      const runtime = sandbox.run(loaded.runtimeCode);
      if (!runtime.ok) throw new Error(`Todo runtime failed to boot: ${runtime.error}`);

      const boot = sandbox.run(`__macchiatoBoot(${JSON.stringify(loaded.sourceHtml)})`);
      if (!boot.ok) throw new Error(`Todo source failed to parse: ${boot.error}`);
      const scripts = JSON.parse(String(boot.value));
      if (scripts.error) throw new Error(scripts.error);
      scripts.forEach((script, index) => {
        runModule(sandbox, script.code, `todo-inline-${index}.js`);
      });

      return { ...loaded, sandbox, capability };
    })();
  }
  return sessionPromise;
}

async function renderGuest() {
  const session = await getSession();
  return session.capability.serializeApp().html;
}

async function dispatchGuest(event) {
  const session = await getSession();
  const result = session.sandbox.run(`__macchiatoDispatch(${JSON.stringify(JSON.stringify(event))})`);
  if (!result.ok) throw new Error(`Todo guest event failed: ${result.error}`);
  const html = String(result.value);
  if (html.startsWith("__MACCHIATO_ERROR__")) {
    throw new Error(html.slice("__MACCHIATO_ERROR__".length));
  }
  return html;
}

function page(html, css) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Todos</title>
<style>
${css}
</style>
</head>
<body>
<div id="app">${html}</div>
<script>
const app = document.getElementById("app");
function sourceValue(target) {
  if (target.matches(".add-btn")) return app.querySelector(".new-todo")?.value || "";
  return target.value || "";
}
async function sendEvent(target, type, payload = {}) {
  const node = target.closest("[data-node-id]");
  if (!node) return;
  const response = await fetch("/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nodeId: node.getAttribute("data-node-id"),
      type,
      payload: {
        value: sourceValue(target),
        checked: Boolean(target.checked),
        key: payload.key || ""
      }
    })
  });
  const data = await response.json();
  app.innerHTML = data.html;
}
app.addEventListener("click", (event) => sendEvent(event.target, "click"));
app.addEventListener("change", (event) => sendEvent(event.target, "change"));
app.addEventListener("dblclick", (event) => sendEvent(event.target, "dblclick"));
app.addEventListener("blur", (event) => sendEvent(event.target, "blur"), true);
app.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === "Escape") sendEvent(event.target, "keydown", { key: event.key });
});
</script>
</body>
</html>`;
}

export async function domUseTodosHandler(request) {
  try {
    const url = new URL(request.url);
    const session = await getSession();

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = await renderGuest();
      return new Response(page(html, session.css), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/event" && request.method === "POST") {
      const event = await request.json();
      const html = await dispatchGuest(event);
      return Response.json({ html });
    }

    return new Response("Not found", { status: 404 });
  } catch (err) {
    return new Response(`Sandbox error: ${err.message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

export async function configureDomUseTodosForTest(options = {}) {
  await resetDomUseTodosForTest();
  handlerOptions = {
    localStorage: { mode: "disabled" },
    ...options,
  };
}

export async function resetDomUseTodosForTest() {
  if (!sessionPromise) return;
  try {
    const session = await sessionPromise;
    session.sandbox.dispose();
  } catch {
    // Rejected boot sessions are still cleared for the next test/configuration.
  }
  sessionPromise = null;
}
