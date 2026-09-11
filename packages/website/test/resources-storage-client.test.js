import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { ResourcesStorageDevice } from "../resources-machine-devices.js";

test("storage subscriptions can release each machine's callbacks independently", () => {
  let changed;
  const window = { localStorage: {}, sessionStorage: {}, addEventListener(type, callback) {
    assert.equal(type, "storage"); changed = callback;
  } };
  const device = new ResourcesStorageDevice(window), seen = [];
  const first = device.listen("local", "settings", () => seen.push("first"));
  const second = device.listen("local", "settings", () => seen.push("second"));
  changed({ storageArea: window.localStorage });
  assert.deepEqual(seen, ["first", "second"]);
  first(); first();
  changed({ storageArea: window.localStorage });
  assert.deepEqual(seen, ["first", "second", "second"]);
  second();
  assert.equal(device.listeners.size, 0, "no disposed machine is retained by the storage device");
  const third = device.listen("local", "settings", () => seen.push("third"));
  first(); second();
  changed({ storageArea: window.localStorage });
  assert.equal(seen.at(-1), "third", "old cleanup cannot remove a replacement subscription group");
  third();
  assert.equal(device.listeners.size, 0);
});

test("storage errors return through the service and are thrown inside the guest", async () => {
  let denied = false, full = false;
  const values = new Map();
  const area = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      if (full) throw new DOMException("Quota exceeded", "QuotaExceededError");
      values.set(key, String(value));
    },
    removeItem: key => values.delete(key),
  };
  const window = { addEventListener() {} };
  for (const name of ["localStorage", "sessionStorage"]) Object.defineProperty(window, name, {
    get() {
      if (denied) throw new DOMException("Storage denied", "SecurityError");
      return area;
    },
  });
  const device = new ResourcesStorageDevice(window);
  const listen = () => {};
  let returned = false;
  const context = {
    localStorage: { listen }, sessionStorage: { listen },
    __wwcServiceCall(name, payload) {
      assert.equal(name, "storage.request");
      const result = device.request(JSON.parse(payload));
      const text = JSON.stringify(result);
      // The real Machine Host enforces this before returning through Wasm.
      if (text.length > 2 * 1024 * 1024) throw new Error("application service result is not bounded text");
      returned = true;
      return text;
    },
  };
  const bundle = await build({ entryPoints: [new URL("../resources-storage-client.js", import.meta.url).pathname],
    bundle: true, write: false, format: "iife", globalName: "Client", platform: "neutral" });
  runInNewContext(bundle.outputFiles[0].text, context);
  assert.equal(context.localStorage.listen, listen);
  assert.equal(context.sessionStorage.listen, listen);
  assert.equal(context.localStorage.getItem("missing"), null);
  assert.equal(context.localStorage.setItem("theme", "dark"), undefined);
  assert.equal(context.localStorage.getItem("theme"), "dark");
  assert.equal(context.Client.storageRequest("has", "session", "theme"), true);
  for (const failure of ["denied", "full"]) {
    denied = failure === "denied";
    full = !denied;
    returned = false;
    const operation = denied ? () => context.localStorage.getItem("theme")
      : () => context.sessionStorage.setItem("theme", "light");
    assert.throws(operation, error => error.name === (denied ? "SecurityError" : "QuotaExceededError"));
    assert.equal(returned, true, "the host returned normally before the guest threw");
    assert.equal(values.get("theme"), "dark");
  }
  denied = full = false;
  for (const oversized of ["x".repeat(3 * 1024 * 1024), "\\".repeat(1100000), "\0".repeat(400000)]) {
    values.set("large", oversized);
    returned = false;
    assert.throws(() => context.localStorage.getItem("large"), error => error.name === "RangeError");
    assert.equal(returned, true, "an oversized reply returns an error before the guest throws");
    assert.equal(values.get("large"), oversized, "reading a large value must not truncate or delete it");
  }
  const largest = "x".repeat(2 * 1024 * 1024 - JSON.stringify({ value: "" }).length);
  values.set("large", largest);
  assert.equal(context.localStorage.getItem("large"), largest, "the exact wire-text limit remains usable");
  values.delete("large");
  for (const oversized of ["x".repeat(3 * 1024 * 1024), "\0".repeat(400000)]) {
    returned = false;
    assert.throws(() => context.sessionStorage.setItem("large", oversized), /Storage request exceeds its text limit/);
    assert.equal(returned, false, "an oversized request never enters the host reader");
  }
  context.localStorage.setItem("theme", "light");
  assert.equal(context.localStorage.getItem("theme"), "light");
  context.localStorage.removeItem("theme");
  assert.equal(context.Client.storageRequest("has", "session", "theme"), false);
  assert.equal(device.request({ operation: "clear", kind: "session" }).error.name, "TypeError");
  assert.equal(device.request({ operation: "get", kind: "other" }).error.name, "TypeError");
});
