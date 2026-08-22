import assert from "node:assert/strict";
import test from "node:test";
import { compileSingleFileProject } from "../../../packages/project-editor/src/single-file-compiler.js";
import { representativeProjectSource as valid } from "./fixtures.js";

test("compiles inert HTML, constrained CSS, and classic JavaScript", () => {
  const result = compileSingleFileProject(valid);
  assert.equal(result.usage.lines, 10);
  assert.equal(result.tree.find((node) => node[0] === 1)[1], "article");
  assert.equal(result.scripts.length, 2);
  assert.match(result.scripts[0].code, /createElement\("style"\)/);
  assert.match(result.scripts[1].code, /querySelector/);
});

for (const [name, source, pattern] of [
  ["active HTML", "<iframe></iframe>", /iframe/],
  ["remote CSS", "<style>p{background:url(https://example.test/x)}</style>", /url/i],
  ["CSS imports", "<style>@import 'https://example.test/x';</style>", /import/i],
  ["external scripts", "<script src=\"https://example.test/x.js\"></script>", /external scripts/i],
  ["remote links", "<a href=\"https://example.test/\">leave</a>", /navigation was blocked/i],
  ["overlong lines", `<p>${"x".repeat(257)}</p>`, /budget/i],
  ["too many lines", Array.from({ length: 501 }, () => "<br>").join("\n"), /budget/i],
]) {
  test(`rejects ${name}`, () => assert.throws(() => compileSingleFileProject(source), pattern));
}
