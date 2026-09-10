import assert from "node:assert/strict";
import test from "node:test";
import {
  applyProjectPatch,
  diffProjectSnapshots,
  emptyProjectSnapshot,
  normalizeProjectSnapshot,
  projectPatchIsEmpty,
  projectSnapshotsEqual,
} from "@macchiato-dev/hub/project-history";

test("snapshot equality agrees with empty patches without needing a text splice", () => {
  const original = { files: [{ path: "b.js", content: "// large\n".repeat(12000) },
    { path: "a.js", content: "one" }], config: { nested: { a: 1, b: [false, null] } } };
  const cases = [original,
    { ...original, files: [...original.files].reverse(), config: { nested: { b: [false, null], a: 1 } } },
    { ...original, files: original.files.map(file => ({ ...file, content: "x" + file.content })) },
    { ...original, files: original.files.slice(1) },
    { ...original, files: [...original.files, { path: "c.js", content: "" }] },
    { ...original, files: original.files.map(file => ({ ...file, path: "src/" + file.path })) },
    { ...original, config: { nested: { a: 1, b: [false, true] } } },
  ];
  for (const candidate of cases) {
    assert.equal(projectSnapshotsEqual(original, candidate),
      projectPatchIsEmpty(diffProjectSnapshots(original, candidate)));
    assert.equal(projectSnapshotsEqual(candidate, original), projectSnapshotsEqual(original, candidate));
  }
  assert.throws(() => projectSnapshotsEqual(original,
    { files: [{ path: "../escape", content: "" }] }), /Invalid project file path/);
});

test("project patches round-trip multiple files and nested configuration", () => {
  const before = normalizeProjectSnapshot({
    files: [
      { path: "index.html", content: "<h1>Hello</h1>\n" },
      { path: "src/main.js", content: "console.log('old');\n" },
      { path: "old.css", content: "body {}\n" },
    ],
    config: { sandbox: { network: false, storage: "session" }, entry: "index.html", tags: ["demo"] },
  });
  const after = normalizeProjectSnapshot({
    files: [
      { path: "index.html", content: "<h1>Hello, world</h1>\n" },
      { path: "src/main.js", content: "console.log('new');\n" },
      { path: "theme.css", content: "body { color: teal; }\n" },
    ],
    config: { sandbox: { network: false, storage: "local", clipboard: "write" }, entry: "index.html", title: "Hello" },
  });
  const patch = diffProjectSnapshots(before, after);
  assert.deepEqual(applyProjectPatch(before, patch), after);
  assert.equal(patch.files.find((operation) => operation.path === "index.html").op, "splice");
  assert.equal(patch.files.find((operation) => operation.path === "old.css").op, "delete");
  assert.equal(patch.files.find((operation) => operation.path === "theme.css").op, "add");
  assert.ok(patch.config.length >= 3);
});

test("project patches are deterministic and minimal for a contiguous text edit", () => {
  const before = { files: [{ path: "note.md", content: "one two three" }], config: {} };
  const after = { files: [{ path: "note.md", content: "one 2 three" }], config: {} };
  const patch = diffProjectSnapshots(before, after);
  assert.deepEqual(patch.files, [{ op: "splice", path: "note.md", start: 4, remove: "two", insert: "2" }]);
  assert.deepEqual(diffProjectSnapshots(before, after), patch);
  assert.equal(projectPatchIsEmpty(diffProjectSnapshots(after, after)), true);
});

test("project patch application rejects the wrong base instead of corrupting content", () => {
  const before = { files: [{ path: "app.js", content: "let value = 1;" }], config: { mode: "safe" } };
  const after = { files: [{ path: "app.js", content: "let value = 2;" }], config: { mode: "strict" } };
  const patch = diffProjectSnapshots(before, after);
  assert.throws(() => applyProjectPatch({ files: [{ path: "app.js", content: "changed elsewhere" }], config: before.config }, patch), /splice mismatch/);
  assert.throws(() => applyProjectPatch({ files: before.files, config: { mode: "other" } }, patch), /set mismatch/);
});

test("an initial version is a patch from the empty project snapshot", () => {
  const snapshot = { files: [{ path: "index.html", content: "<!doctype html>" }], config: { sandbox: { network: false } } };
  assert.deepEqual(applyProjectPatch(emptyProjectSnapshot(), diffProjectSnapshots(emptyProjectSnapshot(), snapshot)), normalizeProjectSnapshot(snapshot));
});

test("project snapshots reject duplicate and escaping file paths", () => {
  assert.throws(() => normalizeProjectSnapshot({ files: [{ path: "../secret", content: "x" }] }), /Invalid project file path/);
  assert.throws(() => normalizeProjectSnapshot({ files: [{ path: "a.js", content: "1" }, { path: "a.js", content: "2" }] }), /Duplicate/);
});

test("snapshot normalization copies records and rechecks mutable input and configuration", () => {
  const input = { path: "notes.txt", content: 'café 😀\n"quoted"\\\ud800' };
  const first = normalizeProjectSnapshot({ files: [input], config: { nested: { value: "small" } } });
  const second = normalizeProjectSnapshot(first);
  assert.notEqual(second.files[0], first.files[0]);
  assert.deepEqual(second.files[0], first.files[0]);
  assert.throws(() => normalizeProjectSnapshot({ files: [first.files[0], first.files[0]] }), /Duplicate/);
  input.path = "../escape";
  assert.throws(() => normalizeProjectSnapshot({ files: [input] }), /Invalid project file path/);
  assert.throws(() => normalizeProjectSnapshot({ files: [Object.freeze({ path: "../escape", content: "" })] }), /Invalid project file path/);
  first.config.nested.value = "x".repeat(64_001);
  assert.throws(() => normalizeProjectSnapshot(first), /configuration is too large/);
  assert.equal(second.config.nested.value, "small", "configuration is still copied, not cached");
});

test("unchanged asset content is not encoded again during normalization or diffing", () => {
  const first = normalizeProjectSnapshot({ files: [
    { path: "asset.bin", content: "immutable asset ".repeat(10_000) },
    { path: "app.js", content: "let x = 1;" },
  ] });
  const NativeEncoder = globalThis.TextEncoder, lengths = [];
  globalThis.TextEncoder = class extends NativeEncoder {
    encode(text) { lengths.push(text.length); return super.encode(text); }
  };
  try {
    const next = normalizeProjectSnapshot({ files: first.files.map(file => file.path === "app.js"
      ? { path: file.path, content: "let x = 2;" } : file), config: first.config });
    assert.deepEqual(diffProjectSnapshots(first, next).files,
      [{ op: "splice", path: "app.js", start: 8, remove: "1", insert: "2" }]);
    assert.ok(lengths.length > 0 && Math.max(...lengths) < 100, JSON.stringify(lengths));
  } finally { globalThis.TextEncoder = NativeEncoder; }
});

test("cached file accounting enforces the exact serialized snapshot byte limit", () => {
  const files = [{ path: "a.txt", content: 'café 😀\n"\\\ud800' }, { path: "b.txt", content: "" }];
  const config = { title: "Unicode 中文" }, encoder = new TextEncoder();
  const remaining = 70 * 1024 * 1024 - encoder.encode(JSON.stringify({ files, config })).byteLength;
  files[1].content = "x".repeat(remaining);
  const exact = normalizeProjectSnapshot({ files, config });
  assert.equal(encoder.encode(JSON.stringify(exact)).byteLength, 70 * 1024 * 1024);
  assert.equal(normalizeProjectSnapshot(exact).files[1].content, exact.files[1].content);
  assert.throws(() => normalizeProjectSnapshot({ files: exact.files, config: { title: config.title + "x" } }), /snapshot is too large/);
});

test("file accounting does not assume a guest's Object.freeze actually freezes", () => {
  const freeze = Object.freeze;
  Object.freeze = value => value;
  try {
    const first = normalizeProjectSnapshot({ files: [{ path: "a.txt", content: "small" }] });
    first.files[0].path = "../escape";
    assert.throws(() => normalizeProjectSnapshot(first), /Invalid project file path/);
    first.files[0].path = "a.txt";
    first.files[0].content = "changed 😀";
    const second = normalizeProjectSnapshot(first);
    assert.equal(second.files[0].content, "changed 😀");
    first.files[0].content = "another change";
    assert.equal(second.files[0].content, "changed 😀", "records do not become aliases");
    first.files[0].content = "x".repeat(70 * 1024 * 1024 + 1);
    assert.throws(() => normalizeProjectSnapshot(first), /Project file exceeds/);
  } finally { Object.freeze = freeze; }
});
