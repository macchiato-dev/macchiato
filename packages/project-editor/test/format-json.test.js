import assert from "node:assert/strict";
import test from "node:test";
import { formatProjectJson } from "../src/format-json.js";

test("configuration formatting matches indented JSON without modifying values", () => {
  const cases = [
    null, true, false, 0, -1, 1.25, "", undefined, [], {},
    { container: "page", entry: "index.html", sandbox: { network: false } },
    { quotes: '\\"{[,:]}', newline: "a\nb\tc", unicode: "猫 🀄", slash: "\\\\" },
    { empty: [[], {}, ""], nested: [{ a: [1, null, { b: "c" }] }] },
    [Infinity, NaN, undefined, -0],
  ];
  for (const value of cases) {
    assert.equal(formatProjectJson(value), JSON.stringify(value, null, 2));
  }
});

test("configuration formatting does not require runtime indentation support", () => {
  const stringify = JSON.stringify;
  try {
    JSON.stringify = value => stringify(value);
    assert.equal(formatProjectJson({ a: [1, 2], b: {} }),
      '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {}\n}');
  } finally {
    JSON.stringify = stringify;
  }
});
