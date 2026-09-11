import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { ResourcesStorageDevice } from "../resources-machine-devices.js";

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
      returned = true;
      return JSON.stringify(result);
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
  context.localStorage.setItem("theme", "light");
  assert.equal(context.localStorage.getItem("theme"), "light");
  context.localStorage.removeItem("theme");
  assert.equal(context.Client.storageRequest("has", "session", "theme"), false);
  assert.equal(device.request({ operation: "clear", kind: "session" }).error.name, "TypeError");
  assert.equal(device.request({ operation: "get", kind: "other" }).error.name, "TypeError");
});
