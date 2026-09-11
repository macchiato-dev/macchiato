import assert from "node:assert/strict";
import test from "node:test";
import { compileProjectFiles, compileSingleFileProject, PROJECT_SOURCE_LIMITS } from "../src/single-file-compiler.js";

const compile = (source) => compileProjectFiles([{ path: "index.html", content: source }], {},
  { limits: PROJECT_SOURCE_LIMITS });

test("module scripts retain their source and distinct identities for native evaluation", () => {
  const files = [
    { path: "index.html", content: '<script>var classic = 1;</script><script type="module" src="./app.js"></script><script type="module">let x = 1;</script><script type="module">let x = 2;</script>' },
    { path: "app.js", content: 'import { value } from "./data.js"; export { value };' },
    { path: "data.js", content: "export const value = 42;" },
  ];
  const result = compileProjectFiles(files);
  assert.deepEqual(result.scripts[0], { source: "index.html", code: "var classic = 1;" });
  assert.deepEqual(result.scripts[1], { source: "app.js", code: files[1].content, module: true });
  assert.equal(result.scripts[2].module, true);
  assert.notEqual(result.scripts[2].source, result.scripts[3].source);
});

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

test("SVG accessible titles survive without retaining HTML page metadata", () => {
  const result = compile('<head><title>Page title</title></head>' +
    '<svg role="img" aria-labelledby="mark-name"><title id="mark-name">Cat mark</title>' +
    '<circle cx="12" cy="12" r="4"/></svg>');
  assert.equal(result.tree.length, 1);
  assert.deepEqual(result.tree[0][4][0],
    [1, "title", 1, [["id", "mark-name"]], [[0, "Cat mark"]]]);
  assert.throws(() => compile('<svg><foreignObject><div>HTML</div></foreignObject></svg>'),
    /not available/);
  const styled = compile('<svg><title>Styled mark</title>' +
    '<style>circle { fill: #abc; }</style><circle r="4"/></svg>');
  assert.equal(styled.stylesheets.length, 1, "SVG styles still use semantic CSS operations");
  assert.deepEqual(styled.tree[0][4].map(node => node[1]), ["title", "circle"]);
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
