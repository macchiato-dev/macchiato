import assert from "node:assert/strict";
import test from "node:test";
import { compileProjectFiles } from "../src/single-file-compiler.js";

const compile = content => compileProjectFiles([{ path: "index.html", content }]);

test("document attributes and inline styles remain separate from body content", () => {
  const result = compile(`<html lang="es" class="page" style="color:purple">
    <head data-note="A &amp; B"><title>Example</title></head>
    <body class="app" dir="rtl" style="color:green"><p>Text</p></body>
  </html>`);
  assert.deepEqual(result.document.html.slice(0, 5),
    [1, "html", 0, [["lang", "es"], ["class", "page"]], []]);
  assert.deepEqual(result.document.head, [1, "head", 0, [["data-note", "A & B"]], []]);
  assert.deepEqual(result.document.body.slice(0, 5),
    [1, "body", 0, [["class", "app"], ["dir", "rtl"]], []]);
  assert.ok(result.document.html[5].length && result.document.body[5].length);
  assert.notDeepEqual(result.document.html[5], result.document.body[5]);
  assert.deepEqual(result.tree.filter(node => node[0] === 1),
    [[1, "p", 0, [], [[0, "Text"]]]]);
});

test("fragments and omitted wrappers still have three distinct document descriptions", () => {
  for (const source of ["<p>Text</p>", "<body><p>Text</p></body>",
    "<head><title>Example</title></head><p>Text</p>"]) {
    const result = compile(source);
    for (const name of ["html", "head", "body"]) {
      assert.deepEqual(result.document[name], [1, name, 0, [], []]);
    }
    assert.deepEqual(result.tree, [[1, "p", 0, [], [[0, "Text"]]]]);
  }
});

test("document wrappers do not bypass inline CSS checks or admit event handlers", () => {
  for (const name of ["html", "head", "body"]) {
    assert.throws(() => compile(`<${name} style='background:url("https://outside.test/pixel")'></${name}>`));
    const result = compile(`<${name} onload="fetch('/leak')" data-label="kept"></${name}>`);
    assert.deepEqual(result.document[name][3], [["data-label", "kept"]]);
  }
  for (const source of ["<body></body><body></body>", "<head></head><head></head>",
    "<div><body></body></div>", "<html></html><p>Outside</p>",
    "<head><p>Not metadata</p></head>"]) {
    assert.throws(() => compile(source), SyntaxError, source);
  }
});
