export const STORAGE_TYPES = Object.freeze({
  session: { label: "Session Storage", icon: "[S]", persistent: false },
  local: { label: "Local Storage", icon: "[L]", persistent: true },
  memory: { label: "Memory", icon: "[M]", persistent: false },
  library: { label: "Library", icon: "[B]", persistent: true, readOnly: true },
});

const starterDocuments = [
  {
    id: "welcome",
    title: "Welcome to Macchiato",
    summary: "A focused place for small sandboxed apps.",
    body: "This document is running in a focused app workspace. Hide the sidebar to give an app the full viewport.",
    updatedAt: 1785369600000,
    sandbox: { runtime: "QuickJS WASM", capabilities: ["dom-use"], network: "none", shortcuts: { commandK: "host" } },
  },
  {
    id: "storage",
    title: "Storage stays explicit",
    summary: "Every collection names the adapter holding it.",
    body: "Session Storage is the default. Local Storage survives browser restarts. Memory disappears when this page closes.",
    updatedAt: 1785366000000,
    sandbox: { runtime: "document", capabilities: ["collection:read"], network: "none", shortcuts: { commandK: "host" } },
  },
];

export const BUILTIN_COLLECTION = Object.freeze({
  id: "library",
  name: "Secure demo library",
  storage: "library",
  documents: starterDocuments,
});

export function createCollection({ id = crypto.randomUUID(), name, storage }) {
  if (!STORAGE_TYPES[storage] || storage === "library") throw new Error("Choose a writable storage type.");
  const cleanName = String(name || "").trim().slice(0, 80);
  if (!cleanName) throw new Error("Collection name is required.");
  return { id, name: cleanName, storage, documents: [] };
}

export function createDocument({ name, text, sandbox } = {}) {
  const title = String(name || "Untitled").replace(/\.[^.]+$/, "").trim().slice(0, 120) || "Untitled";
  const body = String(text || "").slice(0, 2_000_000);
  const declarativeApp = detectDeclarativeApp({ name, text: body });
  const readable = declarativeApp.kind === "html"
    ? declarativeApp.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : body.trim().split(/\n+/)[0];
  return {
    id: crypto.randomUUID(),
    title,
    summary: readable?.slice(0, 140) || `Empty ${declarativeApp.kind} app`,
    body,
    declarativeApp,
    updatedAt: Date.now(),
    sandbox: sandbox || { runtime: "QuickJS WASM", capabilities: ["dom-use"], network: "none", shortcuts: { commandK: "host" } },
  };
}

function packageReference(specifier, source) {
  const normalized = String(specifier).replace(/^https?:\/\/(?:cdn\.jsdelivr\.net\/npm\/|unpkg\.com\/)/, "");
  if (normalized.startsWith(".") || normalized.startsWith("/") || normalized.startsWith("data:") || normalized.startsWith("blob:")) return null;
  const match = normalized.match(/^(@[^/]+\/[^/@]+|[^/@]+)(?:@([^/]+))?/);
  if (!match) return null;
  return { name: match[1], version: match[2] || "unspecified", source };
}

export function detectDeclarativeApp({ name = "app.html", text = "" } = {}) {
  const filename = String(name || "app.html");
  const extension = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "html";
  const kind = extension === "css" ? "stylesheet" : extension === "js" || extension === "mjs" ? "javascript" : "html";
  const source = String(text);
  const scripts = [];
  const styles = [];
  let html = source;
  if (kind === "html") {
    html = source.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (_tag, attributes, inline) => {
      const src = attributes.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const scriptSource = src?.[1] || src?.[2] || src?.[3];
      scripts.push({ source: scriptSource || `inline-${scripts.length + 1}.js`, code: inline || "", external: Boolean(scriptSource) });
      return "";
    });
    html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (_tag, css) => { styles.push({ source: `inline-${styles.length + 1}.css`, code: css }); return ""; });
    html = html.replace(/<link\b([^>]*)>/gi, (tag, attributes) => {
      const rel = attributes.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      if ((rel?.[1] || rel?.[2] || rel?.[3] || "").toLowerCase() === "stylesheet") {
        styles.push({ source: href?.[1] || href?.[2] || href?.[3] || "external.css", code: "", external: true });
        return "";
      }
      return tag;
    });
  } else if (kind === "css") {
    html = '<main id="app"><h1>Stylesheet preview</h1><p>This file is applied inside the declarative preview.</p><button type="button">Example button</button></main>';
    styles.push({ source: filename, code: source });
  } else {
    html = '<main id="app"><h1>JavaScript app</h1><p id="output">The guest is starting…</p></main>';
    scripts.push({ source: filename, code: source });
  }
  const packages = new Map();
  for (const script of scripts) {
    for (const match of script.code.matchAll(/(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g)) {
      const entry = packageReference(match[1] || match[2], script.source);
      if (entry) packages.set(`${entry.name}@${entry.version}`, entry);
    }
    const entry = script.external ? packageReference(script.source, "script src") : null;
    if (entry) packages.set(`${entry.name}@${entry.version}`, entry);
  }
  return {
    version: 1,
    format: "standard-web-app",
    entry: filename,
    kind,
    html,
    styles,
    scripts,
    packages: [...packages.values()],
    runtimePackages: [
      { name: "@macchiato-dev/declarative-app-server", version: "0.1.0" },
      { name: "@macchiato-dev/browser-use", version: "0.1.0" },
      { name: "@macchiato-dev/quickjs-emscripten-sandbox", version: "0.1.0" },
    ],
  };
}

export function parseStoredActivity(value) {
  if (!value) return [];
  try {
    const entries = JSON.parse(value);
    if (!Array.isArray(entries)) return [];
    return entries
      .filter((entry) => entry && typeof entry.at === "number" && typeof entry.action === "string")
      .map((entry) => ({
        at: entry.at,
        action: String(entry.action).slice(0, 80),
        detail: String(entry.detail || "").slice(0, 160),
      }));
  } catch {
    return [];
  }
}

export function parseStoredCollections(value, storage) {
  if (!value) return [];
  try {
    const collections = JSON.parse(value);
    if (!Array.isArray(collections)) return [];
    return collections
      .filter((collection) => collection && collection.storage === storage && Array.isArray(collection.documents))
      .map((collection) => ({
        ...collection,
        name: String(collection.name).slice(0, 80),
        documents: collection.documents.map((document) => ({
          ...document,
          declarativeApp: document.declarativeApp || detectDeclarativeApp({ name: `${document.title || "app"}.html`, text: document.body }),
        })),
      }));
  } catch {
    return [];
  }
}
