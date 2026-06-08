import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { exportResourcesSite } from "../../../examples/resources-site/export-static.js";

function tempDir() {
  return mkdtemp(join(tmpdir(), "macchiato-resources-export-"));
}

test("exports resources site as static files", async (t) => {
  const out = await tempDir();
  t.after(async () => {
    await rm(out, { recursive: true, force: true });
  });

  const result = await exportResourcesSite({ out });
  const home = await readFile(join(out, "index.html"), "utf8");
  const collection = await readFile(join(out, "resources", "containers", "index.html"), "utf8");
  const manifest = JSON.parse(await readFile(join(out, "manifest.json"), "utf8"));
  const font = await stat(join(out, "-", "fonts", "resourcesco-space-grotesk", "space-grotesk-latin.woff2"));

  assert.equal(result.routes, 13);
  assert.match(home, /<title>Resources\.co<\/title>/);
  assert.match(home, /href="\/resources\/containers"/);
  assert.doesNotMatch(home, /href="#resources\/containers"/);
  assert.match(collection, /<title>Containers - Resources\.co<\/title>/);
  assert.match(collection, /<h1>Containers<\/h1>/);
  assert.equal(manifest.subdomain, "resources-co");
  assert.equal(manifest.routes.includes("/resources/containers"), true);
  assert.equal(font.isFile(), true);
});
