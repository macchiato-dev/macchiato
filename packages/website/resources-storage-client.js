// Browser storage can be denied even on an otherwise usable page. Transfer
// failures as data so try/catch runs inside the guest, not across a Wasm trap.
export function storageRequest(operation, kind, key, value) {
  const text = JSON.stringify({ operation, kind, key: String(key), value });
  // Reject before entering the host's bounded text reader, so the application
  // can catch even a request much larger than its storage quota.
  if (text.length > 2 * 1024 * 1024) throw new RangeError("Storage request exceeds its text limit");
  const result = JSON.parse(globalThis.__wwcServiceCall("storage.request", text));
  if (result.error) {
    // Validation errors retain their guest-native prototype as well as name.
    // Browser-only DOMException names still use the runtime's ordinary Error.
    const ErrorType = result.error.name === "RangeError" ? RangeError
      : result.error.name === "TypeError" ? TypeError : Error;
    const error = new ErrorType(result.error.message);
    error.name = result.error.name;
    throw error;
  }
  return result.value;
}

// Keep the runtime's subscription support; only these synchronous operations
// need the application's recoverable-error transport.
for (const [kind, area] of [["local", localStorage], ["session", sessionStorage]]) {
  area.getItem = key => storageRequest("get", kind, key);
  area.setItem = (key, value) => { storageRequest("set", kind, key, String(value)); };
  area.removeItem = key => { storageRequest("delete", kind, key); };
}
