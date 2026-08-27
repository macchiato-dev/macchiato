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
  const program = join(fixtures, "editor-primitives.js");
  writeFileSync(program, source);
  return execFileSync(mqjs, [program], { encoding: "utf8" }).trim();
}

test("native primitives cover observed editor-library access patterns", () => {
  assert.equal(run(`
    var compartments = new Map();
    var compartment = {};
    compartments.set(compartment, ["language", "theme"]);
    var extensionSet = new Set(compartments.get(compartment));
    var cachedView = new WeakMap();
    var view = {};
    cachedView.set(view, { height: 20 });

    var resolvedPositions = new WeakMap();
    var position = {};
    resolvedPositions.set(position, 42);
    var flushed = false;
    Promise.resolve().then(function() { flushed = true; });

    var validated = new WeakSet();
    validated.add(view);
    var pending = new Map();
    pending.set("transaction", function() {});
    if (pending.keys().next().value !== "transaction") throw Error("listener");
    Promise.all([Promise.resolve("a"), Promise.resolve("b")]).then(function(urls) {
      if (!extensionSet.has("language") || cachedView.get(view).height !== 20 ||
          resolvedPositions.get(position) !== 42 || !validated.has(view) ||
          !flushed || urls.join("") !== "ab") throw Error("editor primitives");
      print("ok");
    });
  `), "ok");
});
