import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import microQuickJSSyntax from "../babel-microquickjs.js";

const mqjs = fileURLToPath(new URL(
  "../../microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs", import.meta.url));
async function lower(source, fixed) {
  return (await transformAsync(source, {
    // Keep the existing catch-binding/regexp adaptations in the failing
    // control, isolating just the new finally-record transformation.
    plugins: [fixed ? microQuickJSSyntax : api => {
      const plugin = microQuickJSSyntax(api);
      delete plugin.visitor.Program;
      return plugin;
    }],
    presets: [[presetEnv, { bugfixes: true, loose: true, modules: false,
      targets: { ie: "11" }, useBuiltIns: false }]],
  })).code;
}
function execute(source) {
  return spawnSync(mqjs, ["-e", source], { encoding: "utf8", timeout: 5000 });
}

const normalFinally = `function* example() { try { yield 1; } finally { print("cleanup"); } }`;

test("unadapted Babel finally writes a sparse slot in MicroQuickJS", async () => {
  const result = execute(await lower(`
function* example() {
  try { yield 1; } catch (error) { throw error; } finally { print("cleanup"); }
}
var iterator = example(); iterator.next(); iterator.next();`, false));
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /invalid array subscript/);
});

const cases = [
  ["normal completion", normalFinally],
  ["return from try", `function* example() {
    try { yield 1; return 2; } finally { print("cleanup"); }
  }`],
  ["finally overrides return", `function* example() {
    try { yield 1; return 2; } finally { return 3; }
  }`],
  ["caught exception", `function* example() {
    try { yield 1; throw "caught"; } catch (error) { print(error); }
    finally { print("cleanup"); }
  }`],
  ["throw from finally", `function* example() {
    try { yield 1; } finally { throw "cleanup error"; }
  }`],
  ["nested finally with suspension", `function* example() {
    try { try { yield 1; } finally { yield 2; print("inner"); } }
    finally { print("outer"); }
  }`],
  ["helper name collision", `function _regenerator() { return "user function"; }
    print(_regenerator());
    function* example() { try { yield 1; } finally { print("cleanup"); } }`],
];
for (const [name, definition] of cases) {
  for (const operation of ["next()", "return(7)", 'throw("injected")']) {
    test(`dense finally records preserve ${name}, ${operation}`, async () => {
      const source = definition + `
var iterator = example();
try {
  print(JSON.stringify(iterator.next()));
  print(JSON.stringify(iterator.${operation}));
  print(JSON.stringify(iterator.next()));
} catch (error) { print(String(error)); }`;
      const expected = [];
      runInNewContext(source, { print: value => expected.push(String(value)) });
      const result = execute(await lower(source, true));
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.deepEqual(result.stdout.trim().split("\n"), expected);
    });
  }
}
