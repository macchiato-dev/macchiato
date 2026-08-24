import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mqjs = join(root, "build", "mqjs");
const fixtures = join(root, "build", "fixtures");

function build() {
  execFileSync(process.execPath, [join(root, "scripts", "build.js")], {
    stdio: "ignore",
  });
  mkdirSync(fixtures, { recursive: true });
}

function runFile(file) {
  return execFileSync(mqjs, [file], { encoding: "utf8" }).trim();
}

function runBytecode(file) {
  return execFileSync(mqjs, ["-b", file], { encoding: "utf8" }).trim();
}

test("async functions suspend, resume, reject, and preserve captured locals", () => {
  build();
  const program = join(fixtures, "async.js");
  writeFileSync(program, `
    var release;
    var peek;
    var pending = new Promise(function(resolve) { release = resolve; });
    async function work(start) {
      var value = start;
      peek = function() { return value; };
      value += await pending;
      value += await Promise.resolve(2);
      return value;
    }
    var result = work(3);
    print("sync", result instanceof Promise, peek());
    gc();
    release(4);
    result.then(function(value) { print("result", value, peek()); });

    async function caught() {
      try { await Promise.reject("reason"); }
      catch (error) { return "caught:" + error; }
    }
    caught().then(function(value) { print(value); });

    async function failed() { throw "failure"; }
    failed().then(null, function(error) { print("rejected", error); });

    var receiver = {
      base: 10,
      make: function() { return async value => this.base + await value; }
    };
    receiver.make()(Promise.resolve(5)).then(function(value) {
      print("arrow", value);
    });

    var expression = async function(value) {
      return Promise.resolve(await value + 1);
    };
    expression({ then: function(resolve) { resolve(20); } })
      .then(function(value) { print("expression", value); });

    async function finalized() {
      try { return await 6; }
      finally { print("finally"); }
    }
    finalized().then(function(value) { print("finalized", value); });
  `);
  assert.equal(runFile(program), [
    "sync true 3",
    "rejected failure",
    "finally",
    "caught:reason",
    "arrow 15",
    "expression 21",
    "finalized 6",
    "result 9 9",
  ].join("\n"));
});

test("async bytecode survives compilation, loading, and 32-bit conversion", () => {
  build();
  const source = join(fixtures, "async-bytecode.js");
  const bytecode = join(fixtures, "async-bytecode.mqbc");
  const bytecode32 = join(fixtures, "async-bytecode-32.mqbc");
  writeFileSync(source, `
    async function calculate(value) {
      return \`answer: \${await Promise.resolve(value + 1)}\`;
    }
    calculate(41).then(value => print(value));
  `);
  execFileSync(mqjs, ["-o", bytecode, source]);
  execFileSync(mqjs, ["-m32", "-o", bytecode32, source]);
  assert.equal(runBytecode(bytecode), "answer: 42");
  assert.equal(readFileSync(bytecode).readUInt16LE(2) & 0xfff, 2);
  assert.equal(readFileSync(bytecode32).readUInt16LE(2) & 0xfff, 2);
});
