// Storage failures are ordinary guest exceptions, not traps crossing Wasm.
// Dispatch explicitly: guest input never selects arbitrary device methods.
export function storageResponse(storage, request) {
  try {
    if (!storage) throw new Error("Storage is not available");
    const { operation, kind, key, value } = request;
    if (kind !== "session" && kind !== "local") throw new TypeError("Unknown storage area");
    switch (operation) {
      case "has": return { value: storage.has(kind, key) };
      case "get": return { value: storage.get(kind, key) };
      case "set": storage.set(kind, key, value); return { value: null };
      case "delete": storage.delete(kind, key); return { value: null };
      default: throw new TypeError("Unknown storage operation");
    }
  } catch (error) {
    return { error: { name: error.name || "Error", message: error.message || String(error) } };
  }
}
