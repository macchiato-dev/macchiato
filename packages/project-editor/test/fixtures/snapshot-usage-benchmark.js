import { normalizeProjectSnapshot } from "../../../hub/src/project-history.js";

// Force fresh input records for the uncached comparison. This isolates byte
// accounting, not end-to-end editor latency or the history diff algorithm.
const source = "embedded asset café 😀 ".repeat(700);
const assets = Array.from({ length: 8 }, (_, index) => ({ path: `asset-${index}.bin`, content: source }));
function check(value) { if (!value) throw new Error("Snapshot accounting mismatch"); }
function run(cached, steps) {
  let snapshot = normalizeProjectSnapshot({ files: [...assets, { path: "app.js", content: "let count = 0;" }] });
  const started = performance.now();
  for (let index = 0; index < steps; index++) {
    snapshot = normalizeProjectSnapshot({ files: snapshot.files.map(file => file.path === "app.js"
      ? { path: file.path, content: `let count = ${index};` }
      : cached ? file : { path: file.path, content: file.content }), config: snapshot.config });
  }
  const elapsed = performance.now() - started;
  gc();
  const again = normalizeProjectSnapshot(snapshot);
  check(JSON.stringify(again) === JSON.stringify(snapshot));
  check(again.files.length === 9 && again.files[0].content === `let count = ${steps - 1};`);
  check(again.files.slice(1).every(file => file.content === source));
  return elapsed;
}
run(false, 2);
run(true, 2);
const before = [], after = [];
for (let repeat = 0; repeat < 4; repeat++) {
  if (repeat % 2) { after.push(run(true, 20)); before.push(run(false, 20)); }
  else { before.push(run(false, 20)); after.push(run(true, 20)); }
}
globalThis.__wwcPostMessage(JSON.stringify({ benchmark: "snapshot-byte-accounting", assets: 8, edits: 20,
  beforeMs: before, afterMs: after }));
flush();
