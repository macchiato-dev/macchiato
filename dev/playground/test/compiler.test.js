import assert from "node:assert/strict";
import test from "node:test";
import { compileSingleFileProject } from "../../../packages/project-editor/src/single-file-compiler.js";
import { representativeProjectSource as valid } from "./fixtures.js";

test("compiles inert HTML, constrained CSS, and classic JavaScript", () => {
  const result = compileSingleFileProject(valid);
  assert.equal(result.usage.lines, 10);
  assert.equal(result.tree.find((node) => node[0] === 1)[1], "article");
  assert.equal(result.stylesheets.length, 1);
  assert.equal(result.scripts.length, 1);
  assert.ok(result.stylesheets[0].operations.length > 4);
  assert.match(result.scripts[0].code, /querySelector/);
});

for (const [name, source, pattern] of [
  ["active HTML", "<iframe></iframe>", /iframe/],
  ["external scripts", "<script src=\"https://example.test/x.js\"></script>", /external scripts/i],
  ["remote links", "<a href=\"https://example.test/\">leave</a>", /navigation was blocked/i],
  ["overlong lines", `<p>${"x".repeat(257)}</p>`, /budget/i],
  ["too many lines", Array.from({ length: 501 }, () => "<br>").join("\n"), /budget/i],
]) {
  test(`rejects ${name}`, () => assert.throws(() => compileSingleFileProject(source), pattern));
}

test("uses the constrained machine CSS grammar during compilation", () => {
  const result = compileSingleFileProject("<style>p{color:rebeccapurple}</style><p>x</p>");
  assert.ok(result.stylesheets[0].operations.length > 4);
  assert.throws(
    () => compileSingleFileProject("<style>p{background:url(https://example.test/x)}</style><p>x</p>"),
    /CSS value token is not understood/,
  );
  assert.throws(
    () => compileSingleFileProject('<style>p{background:url("https://example.test/x")}</style><p>x</p>'),
    /CSS function url is not allowed/,
  );
  assert.throws(
    () => compileSingleFileProject("<style>p{behavior:none}</style><p>x</p>"),
    /CSS property behavior is not allowed/,
  );
});
