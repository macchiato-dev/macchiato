import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { shortenForegroundParsing } from "../codemirror-parse-budget.js";

test("foreground parsing adaptation changes only the two installed allowances", async () => {
  const source = await readFile(new URL(import.meta.resolve("@codemirror/language")), "utf8");
  const adapted = shortenForegroundParsing(source);
  assert.notEqual(adapted, source);
  assert.equal(adapted.replace("newCx.work(5 /* Work.Apply */,", "newCx.work(20 /* Work.Apply */,")
    .replace("parseState.work(5 /* Work.Apply */,", "parseState.work(20 /* Work.Apply */,"), source,
    "idle parsing, explicit budgets, parse algorithms, and tree publication are unchanged");
  assert.throws(() => shortenForegroundParsing(adapted), /Review CodeMirror/);
  assert.throws(() => shortenForegroundParsing(source.replace("newCx.work(20", "newCx.work(25")), /Review CodeMirror/);
  assert.throws(() => shortenForegroundParsing(source + "\nparseState.work(20 /* Work.Apply */, 1)"), /Review CodeMirror/);
});
