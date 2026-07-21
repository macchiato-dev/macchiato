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
  const project = await readFile(join(out, "macchiato", "app", "index.html"), "utf8");
  const manifest = JSON.parse(await readFile(join(out, "manifest.json"), "utf8"));
  const font = await stat(join(out, "-", "fonts", "resourcesco-space-grotesk", "space-grotesk-latin.woff2"));

  assert.equal(result.routes, manifest.routes.length);
  assert.equal(manifest.routes.includes("/macchiato/http-use"), true);
  assert.equal(manifest.routes.includes("/macchiato/sqlite-use"), true);
  assert.match(home, /<title>Resources\.co<\/title>/);
  assert.match(home, /href="\/macchiato\/app"/);
  assert.doesNotMatch(home, /href="#macchiato\/app"/);
  assert.match(project, /<title>App - Resources\.co<\/title>/);
  assert.match(project, /<h1>App<\/h1>/);
  assert.equal(manifest.subdomain, "resources-co");
  assert.equal(manifest.securityProfile, "document-navigation-v1");
  assert.deepEqual(manifest.validatedWith, ["dom-use", "style-use", "html-use", "theme-use"]);
  assert.match(manifest.artifacts["/index.html"].sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.artifacts["/index.html"].bytes, Buffer.byteLength(home));
  assert.doesNotMatch(home, /<script type="module"|<script type="importmap"|src="\/-\/quickjs/);
  assert.match(home, /<script type="application\/json" id="macchiato-site-transitions">/);
  assert.match(home, /class="layout document-runtime"/);
  assert.doesNotMatch(home, /class="box userbar"|class="box menu"/);
  assert.match(home, /"mode":"document"/);
  assert.equal(manifest.routes.includes("/macchiato/app"), true);
  assert.equal(font.isFile(), true);
});
