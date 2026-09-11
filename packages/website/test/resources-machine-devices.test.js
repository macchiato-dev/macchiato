import assert from "node:assert/strict";
import test from "node:test";
import { ResourcesProjectResourceDevice, ResourcesStorageDevice } from "../resources-machine-devices.js";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";
import { DRAFT_KEY, pendingProjectSnapshotKey } from "../project-session.js";
import { applyProjectPatch, diffProjectSnapshots, emptyProjectSnapshot } from "../../hub/src/project-history.js";

function storageWindow() {
  const area = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key) };
  };
  return { sessionStorage: area(), localStorage: area(), addEventListener() {} };
}

test("pending snapshots retain resource bytes across a new page's resource table", () => {
  const window = storageWindow();
  const resources = new ResourcesProjectResourceDevice();
  const storage = new ResourcesStorageDevice(window, resources);
  const key = pendingProjectSnapshotKey("fixture");
  const snapshot = { files: [
    { path: "index.html", content: "<h1>Pending edit</h1>" },
    { path: "tile.svg", content: "old tile" },
    { path: "data.txt", content: "book text ".repeat(8000) },
  ], config: {} };
  const compact = resources.compactSnapshot(snapshot);
  storage.set("session", key, JSON.stringify(compact));
  const reloaded = new ResourcesProjectResourceDevice();
  reloaded.compactSnapshot({ files: [{ path: "tile.svg", content: "different tile" }] });
  const nextStorage = new ResourcesStorageDevice(window, reloaded);
  const restored = JSON.parse(nextStorage.get("session", key));
  assert.deepEqual(reloaded.hydrateSnapshot(restored), snapshot);
  assert.deepEqual(restored, compact, "guest references and history splice positions stay unchanged");
  nextStorage.delete("session", key);
  assert.equal(window.sessionStorage.getItem(key), null);
});

test("session history preserves resource handles and their splice patches", () => {
  const window = storageWindow(), resources = new ResourcesProjectResourceDevice();
  const snapshot = content => ({ files: [{ path: "tile.svg", content }], config: {} });
  const first = resources.compactSnapshot(snapshot("first tile"));
  const second = resources.compactSnapshot(snapshot("second tile"));
  resources.compactSnapshot(snapshot("unreferenced tile"));
  const history = { snapshot: second, checkpoint: first, snapshots: [first, second],
    patches: [diffProjectSnapshots(emptyProjectSnapshot(), first), diffProjectSnapshots(first, second)] };
  new ResourcesStorageDevice(window, resources).set("session", DRAFT_KEY, JSON.stringify(history));
  const stored = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY));
  assert.equal(stored.resources.length, 2, "persist only the referenced bytes, not the whole table");
  const next = new ResourcesProjectResourceDevice();
  const recovered = JSON.parse(new ResourcesStorageDevice(window, next).get("session", DRAFT_KEY));
  assert.deepEqual(recovered, history);
  let current = emptyProjectSnapshot();
  for (const [index, patch] of recovered.patches.entries()) {
    current = applyProjectPatch(current, patch);
    assert.deepEqual(next.hydrateSnapshot(current), snapshot(index ? "second tile" : "first tile"));
  }
});

test("resource session writes are atomic and leave ordinary storage alone", () => {
  const window = storageWindow(), resources = new ResourcesProjectResourceDevice();
  const storage = new ResourcesStorageDevice(window, resources), key = pendingProjectSnapshotKey("fixture");
  const plain = JSON.stringify({ files: [{ path: "index.html", content: "<p>plain</p>" }], config: {} });
  storage.set("session", key, plain);
  assert.equal(window.sessionStorage.getItem(key), plain);
  assert.equal(storage.get("session", key), plain);
  for (const [kind, name] of [["local", key], ["session", "theme"]]) {
    storage.set(kind, name, "not JSON");
    assert.equal(storage.get(kind, name), "not JSON");
  }
  window.sessionStorage.setItem = () => { throw new Error("Quota exceeded"); };
  const compact = resources.compactSnapshot({ files: [{ path: "tile.svg", content: "tile" }] });
  assert.throws(() => storage.set("session", key, JSON.stringify(compact)), /Quota exceeded/);
  assert.equal(storage.get("session", key), plain, "a failed write does not delete previous recovery data");
});

test("expired, missing, conflicting, and malformed session resources never change the live table", () => {
  const resources = new ResourcesProjectResourceDevice();
  const compact = resources.compactSnapshot({ files: [{ path: "tile.svg", content: "tile" }] });
  const stored = JSON.parse(resources.packSession(JSON.stringify(compact)));
  for (const mutate of [
    value => { value.resources = []; },
    value => { value.resources[0][1] = "different tile"; },
    value => { value.resources.push(value.resources[0]); },
    value => { value.value = "{"; },
  ]) {
    const bad = structuredClone(stored);
    mutate(bad);
    const before = [...resources.resources];
    assert.throws(() => resources.unpackSession(JSON.stringify(bad)));
    assert.deepEqual([...resources.resources], before);
  }
  const expired = JSON.stringify({ files: [{ path: "tile.svg", content: "\0resources-project-resource:1" }] });
  assert.throws(() => resources.unpackSession(expired), /unavailable/);
  assert.equal(resources.unpackSession("{"), "{", "ordinary invalid JSON belongs to editor validation");
});

test("project resources stay opaque until a host device hydrates them", () => {
  const resources = new ResourcesProjectResourceDevice();
  const snapshot = {
    files: [
      { path: "index.html", content: "<h1>Hello</h1>" },
      { path: "tiles/one.svg", content: "<svg>tile</svg>" },
      { path: "data.txt", content: "x".repeat(70 * 1024) },
    ],
    config: { entry: "index.html" },
  };

  const compact = resources.compactSnapshot(snapshot);
  assert.equal(compact.files[0].content, snapshot.files[0].content);
  assert.match(compact.files[1].content, /^\0resources-project-resource:/);
  assert.match(compact.files[2].content, /^\0resources-project-resource:/);
  assert.deepEqual(resources.hydrateSnapshot(compact), snapshot);
});

test("workspace transport compacts and restores project resources", () => {
  const resources = new ResourcesProjectResourceDevice();
  const workspace = { snapshot: {
    files: [{ path: "image.png", content: "data:image/png;base64,AAAA" }],
    config: { entry: "index.html" },
  } };

  const compact = resources.compactText(JSON.stringify(workspace));
  assert.match(JSON.parse(compact).snapshot.files[0].content,
    /^\0resources-project-resource:/);
  assert.deepEqual(JSON.parse(resources.hydrateText(compact)), workspace);
});

test("SVG entry markup is compiled rather than discarded as an image asset", () => {
  const resources = new ResourcesProjectResourceDevice();
  const source = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';
  const compact = resources.compactSnapshot({ files: [
    { path: "image.svg", content: source },
    { path: "other.svg", content: source },
  ] });
  for (const entry of ["image.svg", "./image.svg"]) {
    const files = resources.compilationFiles(compact.files, entry);
    assert.equal(files[0].content, source);
    assert.equal(files[1].content, "");
    const compiled = compileProjectFiles(files, { entry });
    assert.equal(compiled.tree[0][1], "svg");
    assert.equal(compiled.tree[0][4][0][1], "circle");
  }
});

test("compilation restores large source files but keeps image bytes out of the build guest", () => {
  const resources = new ResourcesProjectResourceDevice();
  const source = 'var book = "' + "paragraph ".repeat(8_000) + '";\n';
  const snapshot = { files: [
    { path: "index.html", content: '<main id="book"></main><script src="book.js">\n</script>' },
    { path: "book.js", content: source },
    { path: "tile.png", content: "data:image/png;base64,AAAA" },
  ], config: {} };
  const compact = resources.compactSnapshot(snapshot);
  const files = resources.compilationFiles(compact.files);
  assert.equal(files[1].content, source);
  assert.equal(files[2].content, "");
  const compiled = compileProjectFiles(files);
  assert.deepEqual(compiled.scripts, [{ source: "book.js", code: source }]);
  assert.deepEqual(resources.hydrateSnapshot(compact), snapshot);
});
