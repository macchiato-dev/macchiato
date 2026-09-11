// Storage failures are ordinary guest exceptions, not traps crossing Wasm.
// Dispatch explicitly: guest input never selects arbitrary device methods.
const replyLimit = 2 * 1024 * 1024;
const valueEnvelopeLength = JSON.stringify({ value: "" }).length;

export function storageResponse(storage, request) {
  try {
    if (!storage) throw new Error("Storage is not available");
    const { operation, kind, key, value } = request;
    if (kind !== "session" && kind !== "local") throw new TypeError("Unknown storage area");
    switch (operation) {
      case "has": return { value: storage.has(kind, key) };
      case "get": {
        const value = storage.get(kind, key), result = { value };
        // Browser storage or an older app may contain values larger than the
        // service transport. JSON escaping can grow each UTF-16 unit sixfold.
        // Small replies need no second serialization; check larger ones exactly
        // so the error is returned as data, without truncating the stored value.
        if (typeof value === "string" && (value.length > replyLimit - valueEnvelopeLength ||
            value.length > (replyLimit - valueEnvelopeLength) / 6 && JSON.stringify(result).length > replyLimit)) {
          throw new RangeError("Storage response exceeds its text limit");
        }
        return result;
      }
      case "set": storage.set(kind, key, value); return { value: null };
      case "delete": storage.delete(kind, key); return { value: null };
      default: throw new TypeError("Unknown storage operation");
    }
  } catch (error) {
    return { error: { name: error.name || "Error", message: error.message || String(error) } };
  }
}
