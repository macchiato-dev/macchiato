import assert from "node:assert/strict";
import test from "node:test";
import { createEditorLanguageLoader, editorLanguageForPath } from "../src/languages.js";

test("file language detection is shared and distinguishes JSX and TypeScript", () => {
  for (const [path, language] of [
    ["config", "json"], ["settings.json", "json"], ["src/Thing.TSX", "tsx"],
    ["src/Thing.jsx", "jsx"], ["types.d.ts", "typescript"], ["main.js", "javascript"],
    ["lib/main.rs", "rust"], ["script.py", "python"], ["query.sql", "sql"],
    ["build.yml", "yaml"], ["lib/libc.h", "cpp"], ["main.cpp", "cpp"],
    ["README.md", "markdown"], ["component.svelte", "svelte"], ["view.vue", "vue"],
    ["icon.svg", "html"], ["no-extension", "plain"], ["file.unknown", "plain"],
  ]) assert.equal(editorLanguageForPath(path), language, path);
});

test("language modules are requested only when needed and once per shared package", () => {
  const requests = [];
  const load = createEditorLanguageLoader((path) => requests.push(path));
  assert.deepEqual(requests, []);
  for (const name of ["html", "plain", "../../untrusted", "html", "typescript", "tsx", "jsx", "python"])
    load(name);
  assert.deepEqual(requests, ["language-html.bin", "language-javascript.bin", "language-python.bin"]);
});

test("concurrent language downloads share a request and failures can retry", async () => {
  let complete, fail, requests = 0;
  const load = createEditorLanguageLoader(() => {
    requests++;
    return new Promise((resolve, reject) => { complete = resolve; fail = reject; });
  });
  const first = load("typescript");
  assert.equal(load("tsx"), first);
  fail(new Error("offline"));
  await assert.rejects(first, /offline/);
  const retry = load("jsx");
  complete();
  await retry;
  assert.equal(load("javascript"), undefined);
  assert.equal(requests, 2);
});
