import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = new URL("../../..", import.meta.url).pathname;
const cli = join(root, "packages/macchiato/src/macchiato.js");

test("declarative apps list and run their declared CLI interface", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "macchiato-command-data-"));
  const output = mkdtempSync(join(tmpdir(), "macchiato-command-output-"));
  const run = (...args) => execFileSync(process.execPath, [cli, "--data-dir", dataDir, ...args], { cwd: root, encoding: "utf8" });
  try {
    run("app", "install", "focused-app");
    assert.match(run("app", "run", "app"), /export\s+Export the app as a static directory/);
    assert.equal(run("app", "run", "app", "export", output).trim(), output);
    assert.match(readFileSync(join(output, "index.html"), "utf8"), /<!doctype html>/i);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});
