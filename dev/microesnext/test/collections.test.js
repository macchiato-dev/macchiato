import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mqjs = join(root, "build", "mqjs");

function run(source) {
  execFileSync(process.execPath, [join(root, "scripts", "build.js")], {
    stdio: "ignore",
  });
  const fixtures = join(root, "build", "fixtures");
  mkdirSync(fixtures, { recursive: true });
  const program = join(fixtures, "collections.js");
  writeFileSync(program, source);
  return execFileSync(mqjs, [program], { encoding: "utf8" }).trim();
}

test("Map implements ordered SameValueZero storage and live iterators", () => {
  assert.equal(run(`
    var map = new Map([[NaN, "first"], ["a", 1], ["b", 2]]);
    map.set(NaN, "updated");
    if (map.size !== 3 || map.get(NaN) !== "updated") throw Error("map key");
    var keys = map.keys();
    if (!isNaN(keys.next().value)) throw Error("first key");
    map.delete("a");
    if (keys.next().value !== "b") throw Error("delete during iteration");
    map.set("c", 3);
    if (keys.next().value !== "c" || !keys.next().done) throw Error("live append");
    var seen = "";
    map.forEach(function(value, key, owner) {
      if (owner !== map) throw Error("owner");
      seen += String(key) + ":" + String(value) + ";";
    });
    if (seen !== "NaN:updated;b:2;c:3;") throw Error(seen);
    print("ok");
  `), "ok");
});

test("Set and weak collections provide their commonly used native surface", () => {
  assert.equal(run(`
    var set = new Set([0, -0, NaN, NaN, "x"]);
    if (set.size !== 3 || !set.has(-0) || !set.has(NaN)) throw Error("set");
    if (set.add("y") !== set || !set.delete("x")) throw Error("set mutation");
    var entries = set.entries().next().value;
    if (entries[0] !== entries[1]) throw Error("set entry");
    var key = {}, value = {};
    var weakMap = new WeakMap([[key, value]]);
    var weakSet = new WeakSet([key]);
    if (weakMap.get(key) !== value || !weakMap.has(key) || !weakSet.has(key))
      throw Error("weak lookup");
    gc();
    if (weakMap.get(key) !== value || !weakSet.delete(key)) throw Error("weak gc");
    var threw = false;
    try { weakMap.set(1, value); } catch (error) { threw = error instanceof TypeError; }
    if (!threw) throw Error("weak primitive");
    print("ok");
  `), "ok");
});
