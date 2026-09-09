import assert from "node:assert/strict";
import test from "node:test";
import { compileProjectFiles, compileSingleFileProject, PROJECT_SOURCE_LIMITS } from "../src/single-file-compiler.js";

const compile = (source) => compileProjectFiles([{ path: "index.html", content: source }], {},
  { limits: PROJECT_SOURCE_LIMITS });

test("project compilation does not inherit playground authoring budgets", () => {
  const source = `${"\n".repeat(600)}<p>${"x".repeat(400)}</p>`;
  assert.throws(() => compileSingleFileProject(source), /budget/);
  assert.equal(compile(source).usage.longestLineCodePoints, 407);
  assert.throws(() => compile("x".repeat(PROJECT_SOURCE_LIMITS.maxCodePoints + 1)), /budget/);
});

test("inline SVG retains its namespace, viewBox, and drawing attributes", () => {
  const result = compile('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 2 L3 4" fill="#abc"/></svg>');
  assert.deepEqual(result.tree[0], [1, "svg", 1, [["viewBox", "0 0 24 24"], ["aria-hidden", "true"]],
    [[1, "path", 1, [["d", "M1 2 L3 4"], ["fill", "#abc"]], []]]]);
});

test("embedded CSS SVG becomes semantic image data, not a forwarded URL", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="#abc"/></svg>';
  const source = `<style>.card{background-image:url("data:image/svg+xml,${encodeURIComponent(svg)}")}</style><div class="card"></div>`;
  const bytes = new Uint8Array(compile(source).stylesheets[0].operations);
  assert.ok(bytes.length > 0);
  assert.doesNotMatch(new TextDecoder().decode(bytes), /data:image|xmlns|http/);
  for (const url of ["https://example.test/tile.svg", "//example.test/tile.svg", "/tile.svg"]) {
    assert.throws(() => compile(`<style>.card{background-image:url("${url}")}</style>`), /external URLs/);
  }
  assert.throws(() => compile(`<style>.card{background-image:url("data:image/svg+xml,${encodeURIComponent('<svg><script>bad()</script></svg>')}")}</style>`), /SVG element/);
});
