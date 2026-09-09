import { Text } from "@codemirror/state";
import { documentSourceUsage, sourceUsage } from "../../src/source-envelope.js";

// Benchmark-only guest. None of this timing or baseline code ships in the
// editor. Both counters receive the same immutable document/edit sequence.
function original(doc) {
  const text = doc.toString();
  const lines = text.split("\n");
  return { codePoints: Array.from(text).length, lines: lines.length,
    longestLineCodePoints: Math.max(...lines.map(line => Array.from(line).length)) };
}
function check(actual, expected) {
  if (actual.codePoints !== expected.codePoints || actual.lines !== expected.lines ||
      actual.longestLineCodePoints !== expected.longestLineCodePoints)
    throw new Error("Source accounting disagrees with the reference");
}
function run(counter, steps) {
  let doc = Text.of(Array.from({ length: 1000 }, (_, index) =>
    `function item${index}() { return "😀 café 中文"; } // unchanged text`));
  counter(doc);
  const start = performance.now();
  for (let index = 0; index < steps; index++) {
    const position = index * 1703 % doc.length;
    doc = doc.replace(position, Math.min(doc.length, position + 2), Text.of(["x😀"]));
    const result = counter(doc);
    if (index === steps - 1) check(result, sourceUsage(doc.toString()));
  }
  const elapsed = performance.now() - start;
  gc();
  check(counter(doc), sourceUsage(doc.toString()));
  return elapsed;
}
run(original, 2);
run(documentSourceUsage, 2);
const before = [], after = [];
for (let repeat = 0; repeat < 4; repeat++) {
  if (repeat % 2) {
    after.push(run(documentSourceUsage, 20));
    before.push(run(original, 20));
  } else {
    before.push(run(original, 20));
    after.push(run(documentSourceUsage, 20));
  }
}
globalThis.__wwcPostMessage(JSON.stringify({ lines: 1000, edits: 20,
  beforeMs: before, afterMs: after }));
flush();
