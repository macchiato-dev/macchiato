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
  return {
    id: crypto.randomUUID(),
    title,
    summary: body.trim().split(/\n+/)[0]?.slice(0, 140) || "Empty document",
    body,
    updatedAt: Date.now(),
    sandbox: sandbox || { runtime: "QuickJS WASM", capabilities: ["dom-use"], network: "none", shortcuts: { commandK: "host" } },
  };
}

export function parseStoredCollections(value, storage) {
  if (!value) return [];
  try {
    const collections = JSON.parse(value);
    if (!Array.isArray(collections)) return [];
    return collections
      .filter((collection) => collection && collection.storage === storage && Array.isArray(collection.documents))
      .map((collection) => ({ ...collection, name: String(collection.name).slice(0, 80) }));
  } catch {
    return [];
  }
}
