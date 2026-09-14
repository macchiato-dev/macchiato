import assert from "node:assert/strict";
import test from "node:test";
import { ResourcesProjectResourceDevice, ResourcesStorageDevice, ResourcesFetchDevice, ResourcesArchiveDevice, ResourcesOutputDevice, ResourcesEditorDevice } from "../resources-machine-devices.js";
import { encodeProjectArchive } from "../../hub/src/project-archive.js";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";
import { DRAFT_KEY, pendingProjectSnapshotKey } from "../project-session.js";
import { applyProjectPatch, diffProjectSnapshots, emptyProjectSnapshot } from "../../hub/src/project-history.js";

test("saved output retains its own resource bytes independently of newer source", () => {
  const resources = new ResourcesProjectResourceDevice();
  const snapshot = { files: [{ path: "tile.png", content: "data:image/png;base64,NEW" }], config: {} };
  const project = { files: [{ path: "tile.png", content: "data:image/png;base64,OLD" }], config: {} };
  const savedOutput = { format: "resources-project-output-v1", project,
    compiled: { tree: [], scripts: [], stylesheets: [] } };
  const compact = JSON.parse(resources.compactText(JSON.stringify({ snapshot, savedOutput })));
  assert.notEqual(compact.snapshot.files[0].content, compact.savedOutput.project.files[0].content);
  assert.deepEqual(JSON.parse(resources.hydrateText(JSON.stringify({ snapshot: compact.snapshot,
    output: compact.savedOutput }))), { snapshot, output: savedOutput });
});

test("editor startup coalesces callers and rejects a late workspace after disposal", async () => {
  let release, requests = 0;
  const reply = new Promise(resolve => { release = resolve; });
  const field = { value: "original snapshot" };
  const root = { querySelector: selector => selector === "[data-project-snapshot]" ? field
    : { dataset: { projectSnapshotUrl: "/api/projects/fixture/workspace" } } };
  const document = { querySelector: () => ({ closest: () => root }) };
  const device = new ResourcesEditorDevice(document, () => assert.fail("no notifications after close"),
    { destroyOutput() { assert.fail("no output was created"); } }, {}, {},
    new ResourcesProjectResourceDevice(), () => { requests++; return reply; });
  const first = device.mount({ deferOutput: true });
  assert.equal(device.mount({ deferOutput: true }), first);
  assert.equal(requests, 1);
  device.destroy();
  release({ status: 200, body: JSON.stringify({ snapshot: { files: [], config: {} } }) });
  await assert.rejects(first, /closed during startup/);
  assert.equal(field.value, "original snapshot");
  assert.equal(device.editor, null);
  assert.equal(device.initialSnapshot, null);
});

function storageWindow() {
  const area = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key) };
  };
  return { sessionStorage: area(), localStorage: area(), addEventListener() {} };
}

test("editor preload overlaps output startup and preserves an early download failure", async t => {
  let requests = 0, releaseOutput;
  const output = new Promise(resolve => { releaseOutput = resolve; });
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return new Response("unavailable", { status: 503 });
  });
  const previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = callback => queueMicrotask(callback);
  t.after(() => {
    if (previous) globalThis.requestAnimationFrame = previous;
    else delete globalThis.requestAnimationFrame;
  });
  const field = { value: JSON.stringify({ files: [], config: {} }) };
  const root = { querySelector: selector => selector === "[data-project-snapshot]" ? field : null };
  const document = { querySelector: () => ({ closest: () => root }) };
  const device = new ResourcesEditorDevice(document, () => {}, {}, {}, {},
    new ResourcesProjectResourceDevice());
  device.mountInitialOutput = async (_root, _check, onCompiled) => {
    assert.equal(requests, 0, "builder gets the connection first");
    onCompiled();
    onCompiled();
    assert.equal(requests, 1, "only one module download per mount");
    await output;
  };
  const mounting = device.mount();
  let finished = false;
  const rejected = assert.rejects(mounting, /Project runtime response 503/).then(() => { finished = true; });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(finished, false, "a failed preload does not interrupt output startup");
  releaseOutput();
  await rejected;
  assert.equal(device.editor, null);
  assert.equal(device.mounting, null);
});

test("output trees accept bounded inline operation bytes, not coercible values", () => {
  const output = new ResourcesOutputDevice(null, () => {}, null);
  const tree = compileProjectFiles([{ path: "index.html", content: '<p style="color:red">Text</p>' }]).tree;
  assert.doesNotThrow(() => output.validateTree(tree));
  for (const bytes of ["color:red", [-1], [256], [1.5], [null], [true], new Array(128 * 1024 + 1).fill(0)]) {
    assert.throws(() => output.validateTree([[...tree[0].slice(0, 5), bytes]]), /inline style bytes/);
  }
});

test("output loads forward compiled document attributes as well as body content", async () => {
  const resources = new ResourcesProjectResourceDevice();
  const device = new ResourcesOutputDevice(null, () => {}, resources);
  const files = [{ path: "index.html", content:
    '<html lang="es" class="game"><body class="board" style="margin:0"><h1>Juego</h1></body></html>' }];
  const compiled = compileProjectFiles(files);
  let loaded;
  device.outputs.set(1, { load(project) { loaded = project; } });
  await device.load({ id: 1, project: { ...compiled, files } });
  assert.deepEqual(loaded.document, compiled.document);
  assert.deepEqual(loaded.tree, compiled.tree);
});

test("resource reads are bounded chunks with catchable errors and unchanged bytes", () => {
  const device = new ResourcesProjectResourceDevice();
  const source = "\0\n\"\\😀".repeat(400000);
  const compact = device.compactSnapshot({ files: [{ path: "large.txt", content: source }] });
  const reference = compact.files[0].content;
  const parts = [];
  let offset = 0;
  do {
    const chunk = device.readChunk(reference, offset);
    assert.equal(chunk.error, null);
    assert.equal(chunk.length, source.length);
    assert.ok(chunk.content.length <= 64 * 1024);
    assert.ok(JSON.stringify(chunk).length < 2 * 1024 * 1024);
    assert.equal(chunk.lines, offset === 0 ? 400001 : undefined);
    parts.push(chunk.content);
    offset += chunk.content.length;
  } while (offset < source.length);
  assert.equal(parts.join(""), source);
  assert.equal(device.readChunk(reference, source.length).content, "");
  for (const offset of [-1, 0.5, source.length + 1]) assert.ok(device.readChunk(reference, offset).error);
  assert.match(device.readChunk("\0resources-project-resource:missing").error, /unavailable/);
});

test("archive import awaits decoding before compacting resource files", async () => {
  const snapshot = { files: [{ path: "index.html", content: "<h1>Game</h1>" },
    { path: "tile.svg", content: "tile bytes" }], config: {} };
  const file = new Blob([encodeProjectArchive(snapshot)]);
  const resources = new ResourcesProjectResourceDevice();
  const device = new ResourcesArchiveDevice({ querySelector: () => ({ files: [file] }) }, resources);
  const compact = await device.import();
  assert.notEqual(compact.files.find(file => file.path === "tile.svg").content, "tile bytes");
  assert.deepEqual(resources.hydrateSnapshot(compact), snapshot);
});

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

test("recovery presence does not decode assets and recovery errors cross as data", () => {
  const window = storageWindow();
  const storage = new ResourcesStorageDevice(window, new ResourcesProjectResourceDevice());
  const key = pendingProjectSnapshotKey("expired");
  assert.equal(storage.has("session", key), false);
  assert.deepEqual(storage.readRecovery(key), { value: null, error: null });
  const expired = JSON.stringify({ files: [{ path: "tile.svg", content: "\0resources-project-resource:1" }] });
  window.sessionStorage.setItem(key, expired);
  assert.equal(storage.has("session", key), true);
  assert.deepEqual(storage.readRecovery(key), { value: null, error: "Project recovery resource is unavailable" });
  assert.equal(window.sessionStorage.getItem(key), expired);
});

test("oversized recovery replies leave the saved record intact and return an error", () => {
  const window = storageWindow();
  const storage = new ResourcesStorageDevice(window, new ResourcesProjectResourceDevice());
  const key = pendingProjectSnapshotKey("large");
  const limit = 2 * 1024 * 1024;
  const overhead = JSON.stringify({ value: "", error: null }).length;
  // Simulate records from a previous app. Both plain size and JSON escaping
  // can exceed the transport, even when native browser storage accepts them.
  for (const value of ["x".repeat(limit), "\\".repeat(1100000), "\0".repeat(400000)]) {
    window.sessionStorage.setItem(key, value);
    const reply = storage.readRecovery(key);
    assert.ok(JSON.stringify(reply).length <= limit, "the host must return before the guest handles the error");
    assert.deepEqual(reply, { value: null, error: "Storage response exceeds its text limit" });
    assert.equal(window.sessionStorage.getItem(key), value, "never delete or truncate an unreadable recovery record");
  }
  const largest = "x".repeat(limit - overhead);
  window.sessionStorage.setItem(key, largest);
  assert.deepEqual(storage.readRecovery(key), { value: largest, error: null });
  window.sessionStorage.setItem(key, largest + "x");
  assert.equal(storage.readRecovery(key).value, null, "include the recovery envelope in the limit");
  const repaired = JSON.stringify({ files: [{ path: "index.html", content: "<p>Recovered</p>" }] });
  window.sessionStorage.setItem(key, repaired);
  assert.deepEqual(storage.readRecovery(key), { value: repaired, error: null });
});

test("current project API reads compact resources and writes their bytes, never handles", async () => {
  const resources = new ResourcesProjectResourceDevice();
  const snapshot = { files: [{ path: "tile.svg", content: "tile bytes" },
    { path: "book.bin", content: "x".repeat(3 * 1024 * 1024) }], config: {} };
  const requests = [];
  const device = new ResourcesFetchDevice({ location: { href: "http://site.test/project", origin: "http://site.test" },
    async fetch(url, options) {
      requests.push({ path: url.pathname, ...options });
      return Response.json({ snapshot });
    } }, resources);
  for (const prefix of ["/api/projects/fixture", "/-/projects/fixture"]) {
    const response = await device.request({ url: `${prefix}/workspace` });
    const compact = JSON.parse(response.body);
    assert.notEqual(compact.snapshot.files[0].content, "tile bytes");
    assert.equal(resources.read(compact.snapshot.files[0].content), "tile bytes");
    await device.request({ url: `${prefix}/snapshot`, method: "POST",
      headers: { "content-type": "application/json" }, body: response.body });
    assert.deepEqual(JSON.parse(requests.at(-1).body), { snapshot });
  }
  await assert.rejects(device.request({ url: "/api/other", method: "POST",
    body: snapshot.files[1].content }), /Frontend fetch body is too large/);
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
  assert.deepEqual(storage.writeRecovery(key, plain), { error: null });
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
  window.sessionStorage.setItem = () => { throw new DOMException("full", "QuotaExceededError"); };
  assert.deepEqual(storage.writeRecovery(key, JSON.stringify(compact)), { error: "Browser session storage is full" });
  assert.equal(storage.get("session", key), plain, "the application service also preserves the previous record");
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
