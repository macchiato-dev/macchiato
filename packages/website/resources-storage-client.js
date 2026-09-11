// Browser storage can be denied even on an otherwise usable page. Transfer
// failures as data so try/catch runs inside the guest, not across a Wasm trap.
export function storageRequest(operation, kind, key, value) {
  const result = JSON.parse(globalThis.__wwcServiceCall("storage.request",
    JSON.stringify({ operation, kind, key: String(key), value })));
  if (result.error) {
    const error = new Error(result.error.message);
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
