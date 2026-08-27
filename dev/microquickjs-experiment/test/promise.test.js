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
  const program = join(fixtures, "promise.js");
  writeFileSync(program, source);
  return execFileSync(mqjs, [program], { encoding: "utf8" }).trim();
}

test("Promise schedules reactions and chains values, errors, and thenables", () => {
  assert.equal(run(`
    var order = "";
    var thenable = { then: function(resolve) { resolve(6); } };
    order += "a";
    Promise.resolve(thenable)
      .then(function(value) { order += value; return value + 1; })
      .then(function(value) { throw Error(String(value)); })
      .catch(function(error) { order += error.message; print(order); });
    order += "b";
  `), "ab67");
});

test("Promise constructor, all, race, reject, and finally cover editor usage", () => {
  assert.equal(run(`
    var same = Promise.resolve(1);
    if (Promise.resolve(same) !== same) throw Error("resolve identity");
    var output = [];
    var late = new Promise(function(resolve, reject) {
      resolve(3); reject("ignored"); resolve(4);
    });
    Promise.all([Promise.resolve(1), 2, late]).then(function(values) {
      output.push(values.join(""));
    });
    Promise.race([Promise.resolve("first"), Promise.resolve("second")])
      .then(function(value) { output.push(value); });
    Promise.reject("reason").finally(function() { output.push("finally"); })
      .catch(function(reason) { output.push(reason); print(output.join("|")); });
  `), "finally|123|first|reason");
});
