import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { readRepoProjectMetadata } from "../src/repo-metadata-task.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);

test("repo metadata task maps workspace packages to public project paths", () => {
  const metadata = readRepoProjectMetadata({ repoRoot });
  const app = metadata.projects.find((project) => project.npmName === "@macchiato-dev/app");
  const domUse = metadata.projects.find((project) => project.npmName === "@macchiato-dev/dom-use");

  assert.ok(metadata.files > 0);
  assert.ok(app);
  assert.equal(app.id, "macchiato/app");
  assert.equal(app.path, "/macchiato/app");
  assert.equal(app.namespace, "macchiato");
  assert.equal(app.packageDir, "packages/app");
  assert.equal(app.packageJson, "packages/app/package.json");
  assert.equal(app.bins.includes("macchiato-app"), true);
  assert.equal(app.dependencies.includes("@macchiato-dev/dom-use"), true);
  assert.ok(domUse.exports.includes("./bridge"));
  assert.ok(domUse.files > 0);
});
