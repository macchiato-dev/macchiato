import assert from "node:assert/strict";
import test from "node:test";
import { ProjectOutputStorage } from "../project-output-storage.js";

function browserStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

test("project output storage isolates keys, enforces byte quotas and cleans up listeners", () => {
  const events = new Set();
  const window = {
    localStorage: browserStorage(), sessionStorage: browserStorage(),
    addEventListener(type, callback) { assert.equal(type, "storage"); events.add(callback); },
    removeEventListener(type, callback) { assert.equal(type, "storage"); events.delete(callback); },
  };
  window.localStorage.setItem("resources_session", "website secret");
  const first = new ProjectOutputStorage(window, "first"), second = new ProjectOutputStorage(window, "second");
  first.set("session", "notes", "Saved notes");
  assert.equal(first.get("session", "notes"), "Saved notes");
  assert.equal(second.get("session", "notes"), null);
  assert.equal(first.get("local", "resources_session"), null);
  first.delete("local", "resources_session");
  assert.equal(window.localStorage.getItem("resources_session"), "website secret");
  first.set("local", "", "é".repeat(4096));
  assert.throws(() => first.set("local", "extra", "x"), /quota/);
  assert.throws(() => first.set("local", "", "é".repeat(4097)), /quota/);
  assert.equal(first.get("local", "").length, 4096);
  first.set("local", "", "shorter");
  first.set("local", "extra", "x");
  first.delete("local", "extra");
  assert.equal(first.get("local", "extra"), null);
  assert.throws(() => first.set("session", "notes", "x".repeat(128 * 1024)), /quota/);
  assert.equal(first.get("session", "notes"), "Saved notes");
  assert.throws(() => first.set("constructor", "x", "x"), /area/);
  assert.throws(() => first.get("local", 0), /key/);
  assert.throws(() => first.set("session", "notes", {}), /strings/);
  let notified = 0;
  first.listen("local", "settings", () => notified++);
  const emit = event => { for (const callback of events) callback(event); };
  emit({ storageArea: window.localStorage, key: second.key("settings") });
  assert.equal(notified, 0);
  emit({ storageArea: window.sessionStorage, key: first.key("settings") });
  assert.equal(notified, 0);
  emit({ storageArea: window.localStorage, key: first.key("settings") });
  assert.equal(notified, 1);
  first.destroy(); second.destroy();
  assert.equal(events.size, 0);
  const reopened = new ProjectOutputStorage(window, "first");
  assert.equal(reopened.get("session", "notes"), "Saved notes");
  reopened.destroy();
});
