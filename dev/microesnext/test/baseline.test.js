import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mqjs = join(root, "build", "mqjs");

test("the independent MicroQuickJS baseline builds and executes", () => {
  execFileSync(process.execPath, [join(root, "scripts", "build.js")]);
  const fixtures = join(root, "build", "fixtures");
  mkdirSync(fixtures, { recursive: true });
  const program = join(fixtures, "baseline.js");
  writeFileSync(program, "console.log(6 * 7);\n");
  assert.equal(execFileSync(mqjs, [program], { encoding: "utf8" }).trim(), "42");
});

