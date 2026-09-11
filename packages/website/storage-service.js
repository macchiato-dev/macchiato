// Storage failures are ordinary guest exceptions, not traps crossing Wasm.
// Dispatch explicitly: guest input never selects arbitrary device methods.
const replyLimit = 2 * 1024 * 1024;
const smallValueLimit = (replyLimit - JSON.stringify({ value: "", error: null }).length) / 6;

// Used by ordinary reads and draft recovery. The latter includes error:null,
// so measure the actual envelope near the limit rather than just the value.
export function boundedStorageReply(reply) {
  const value = reply.value;
  // Older apps may have stored larger values. Escaping grows a UTF-16 unit
  // at most sixfold; small replies need no second serialization.
  if (typeof value === "string" && (value.length > replyLimit ||
      value.length > smallValueLimit && JSON.stringify(reply).length > replyLimit)) {
    throw new RangeError("Storage response exceeds its text limit");
  }
  return reply;
}

export function storageResponse(storage, request) {
  try {
    if (!storage) throw new Error("Storage is not available");
    const { operation, kind, key, value } = request;
    if (kind !== "session" && kind !== "local") throw new TypeError("Unknown storage area");
    switch (operation) {
      case "has": return { value: storage.has(kind, key) };
      case "get": return boundedStorageReply({ value: storage.get(kind, key) });
      case "set": storage.set(kind, key, value); return { value: null };
      case "delete": storage.delete(kind, key); return { value: null };
      default: throw new TypeError("Unknown storage operation");
    }
  } catch (error) {
    return { error: { name: error.name || "Error", message: error.message || String(error) } };
  }
}
