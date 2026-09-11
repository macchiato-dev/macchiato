import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

test("mutation parent reconciliation preserves order without repeated linear searches", async () => {
  const source = await readFile(new URL("../../../dev/wasm-web-runtimes/examples/codemirror/src/canonical-codemirror-dom.js",
    import.meta.url), "utf8");
  const start = source.indexOf("function readMutationBatch(");
  const end = source.indexOf("function GuestMutationObserver(", start);
  assert.ok(start >= 0 && end > start, "exercise the actual guest adapter");
  const parents = Array.from({ length: 2000 }, (_, reference) => ({ reference }));
  const targets = [...parents, ...parents.toReversed()];
  const synchronized = [], released = [];
  const context = {
    hostGet(reference, name) {
      if (name === "length") return targets.length;
      if (name === "type") return "childList";
      if (name === "target") return ["ref", targets[reference].reference];
      if (name === "addedNodeCount" || name === "removedNodeCount") return 0;
      if (name === "previousSibling" || name === "nextSibling") return null;
      throw new Error("Unexpected property: " + name);
    },
    hostCall(_reference, name, args) {
      assert.equal(name, "item");
      return ["ref", args[0]];
    },
    nodeForReference: reference => parents[reference],
    synchronizeGuestChildren: parent => synchronized.push(parent),
    releaseHostReferenceLease: reference => released.push(reference),
    releaseHostReference: token => released.push(token),
  };
  // Count search work, not elapsed time on a shared CI machine. Returning
  // the same parent in many records must not scan all preceding parents.
  runInNewContext(`var searchWork = 0;
    var originalIndexOf = Array.prototype.indexOf;
    Array.prototype.indexOf = function (value) {
      var found = originalIndexOf.call(this, value);
      searchWork += found < 0 ? this.length : found + 1;
      return found;
    };
    ${source.slice(start, end)}
    var records = readMutationBatch(0, "batch-token");`, context);
  assert.deepEqual(Array.from(context.records, record => record.target), targets);
  assert.deepEqual(synchronized, parents, "reconcile once in first-seen order after reading every record");
  assert.deepEqual(released, [...targets.keys(), "batch-token"]);
  assert.ok(context.searchWork <= targets.length * 2,
    `parent deduplication performed ${context.searchWork} linear-search steps`);
});
