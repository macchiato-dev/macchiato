import assert from "node:assert/strict";
import test from "node:test";
import {
  applyProjectPatch,
  diffProjectSnapshots,
  emptyProjectSnapshot,
  normalizeProjectSnapshot,
  projectPatchIsEmpty,
} from "@macchiato-dev/hub/project-history";

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
