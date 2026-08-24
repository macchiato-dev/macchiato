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
  const program = join(fixtures, "syntax.js");
  writeFileSync(program, source);
  return execFileSync(mqjs, [program], { encoding: "utf8" }).trim();
}

test("untagged template literals use existing constants and addition", () => {
  assert.equal(run(`
    var value = 4;
    print(\`sum: \${value + 1}; value: \${value}\`);
    print(\`line one
line two\`);
  `), "sum: 5; value: 4\nline one\nline two");
});

test("arrow functions support expression and block bodies with lexical state", () => {
  assert.equal(run(`
    var add = (a, b) => a + b;
    var nested = x => y => x + y;
    function make(value) {
      return () => this.base + arguments[0] + value;
    }
    var lexical = make.call({ base: 10 }, 2);
    var blocked = x => { return x * 3; };
    var constructorRejected = false;
    try { new add(); } catch (error) {
      constructorRejected = error instanceof TypeError;
    }
    print(add(2, 3), nested(4)(5), lexical.call({ base: 100 }),
          blocked(4), constructorRejected);
  `), "5 9 14 12 true");
});
