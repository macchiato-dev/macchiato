import assert from "node:assert/strict";
import test from "node:test";
import MapPonyfill from "../vendor/ungap/map.js";
import SetPonyfill from "../vendor/ungap/set.js";
import WeakMapPonyfill from "../vendor/ungap/weakmap.js";
import WeakSetPonyfill from "../vendor/ungap/weakset.js";

function collect(iterator) {
  const values = [];
  for (let step = iterator.next(); !step.done; step = iterator.next()) {
    values.push(step.value);
  }
  return values;
}

test("Map preserves insertion order and SameValueZero keys", () => {
  const map = new MapPonyfill([[NaN, "first"], ["key", "second"]]);
  map.set(NaN, "updated");
  assert.equal(map.size, 2);
  assert.equal(map.get(NaN), "updated");
  assert.deepEqual(collect(map["@@iterator"]()), [[NaN, "updated"], ["key", "second"]]);
});

test("Set preserves insertion order and SameValueZero values", () => {
  const set = new SetPonyfill([NaN, NaN, "value"]);
  assert.equal(set.size, 2);
  assert.deepEqual(collect(set["@@iterator"]()), [NaN, "value"]);
});

test("weak collections accept object keys without retaining a side list", () => {
  const key = {};
  const map = new WeakMapPonyfill([[key, 42]]);
  const set = new WeakSetPonyfill([key]);
  assert.equal(map.get(key), 42);
  assert.equal(set.has(key), true);
  assert.equal(map.delete(key), true);
  assert.equal(map.has(key), false);
});
