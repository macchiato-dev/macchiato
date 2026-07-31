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
  const home = await readFile(join(out, "locales", "en", "index.html"), "utf8");
  const spanishHome = await readFile(join(out, "locales", "es", "index.html"), "utf8");
  const spanishProject = await readFile(join(out, "locales", "es", "macchiato", "app", "index.html"), "utf8");
  const project = await readFile(join(out, "locales", "en", "macchiato", "app", "index.html"), "utf8");
  const blog = await readFile(join(out, "locales", "en", "blog", "index.html"), "utf8");
  const archivedPost = await readFile(join(out, "locales", "en", "blog", "a-markdown-based-code-playground", "index.html"), "utf8");
  const visualEditorPost = await readFile(join(out, "locales", "en", "blog", "building-a-visual-json-editor-part-3", "index.html"), "utf8");
  const manifest = JSON.parse(await readFile(join(out, "manifest.json"), "utf8"));
  const font = await stat(join(out, "-", "fonts", "resourcesco-space-grotesk", "space-grotesk-latin.woff2"));

  assert.equal(result.routes, manifest.routes.length);
  assert.equal(manifest.routes.includes("/macchiato/http-use"), true);
  assert.equal(manifest.routes.includes("/macchiato/sqlite-use"), true);
  assert.equal(manifest.routes.includes("/blog/a-markdown-based-code-playground"), true);
  assert.match(blog, /A Markdown-based Code Playground/);
  assert.match(archivedPost, /<iframe class="blog-example"[^>]+sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"/);
  assert.match(archivedPost, /src="https:\/\/codesandbox\.io\/embed\/markdown-based-code-playground/);
  assert.match(visualEditorPost, /src="\/-\/blog-examples\/vtv\/index\.html\?preset=types"/);
  assert.match(visualEditorPost, /sandbox="allow-scripts"/);
  assert.doesNotMatch(visualEditorPost, /allow-same-origin/);
  assert.equal(manifest.files.includes("/-/blog-examples/vtv/app.js"), true);
  assert.equal(manifest.files.includes("/-/blog-examples/vtv/app.css"), true);
  assert.match(home, /<title>Resources\.co<\/title>/);
  assert.match(home, /<html lang="en">/);
  assert.match(spanishHome, /<html lang="es">/);
  assert.match(spanishHome, /Infraestructura tuya, compuesta por partes\./);
  assert.match(spanishHome, /Servidor HTTP multiplataforma y registro declarativo/);
  assert.match(spanishProject, /Servidor HTTP multiplataforma y registro declarativo/);
  assert.match(spanishProject, /Se publica como @macchiato-dev\/app/);
  assert.doesNotMatch(spanishHome, /<footer[\s\S]*class="language-switcher"/);
  assert.match(home, /href="\/macchiato\/app"/);
  assert.doesNotMatch(home, /href="#macchiato\/app"/);
  assert.match(project, /<title>App - Resources\.co<\/title>/);
  assert.match(project, /<h1>App<\/h1>/);
  assert.equal(manifest.subdomain, "resources-co");
  assert.equal(manifest.securityProfile, "document-navigation-v1");
  assert.deepEqual(manifest.validatedWith, ["dom-use", "style-use", "html-use", "theme-use"]);
  assert.deepEqual(manifest.locales, ["en", "es"]);
  assert.equal(manifest.defaultLocale, "en");
  assert.match(manifest.artifacts["/locales/en/index.html"].sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.artifacts["/locales/en/index.html"].bytes, Buffer.byteLength(home));
  assert.doesNotMatch(home, /<script type="module"|<script type="importmap"|src="\/-\/quickjs/);
  assert.match(home, /<script type="application\/json" id="macchiato-site-transitions">/);
  assert.match(home, /class="layout document-runtime"/);
  assert.doesNotMatch(home, /class="box userbar"|class="box menu"/);
  assert.match(home, /"mode":"document"/);
  assert.equal(manifest.routes.includes("/macchiato/app"), true);
  assert.equal(font.isFile(), true);
});
