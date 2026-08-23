import assert from "node:assert/strict";
import test from "node:test";
import { ResourcesProjectResourceDevice } from "../resources-machine-devices.js";

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
