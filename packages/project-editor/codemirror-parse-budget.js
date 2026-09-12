// Build-only adaptation of CodeMirror language 6.12.4 (MIT, Marijn Haverbeke
// and contributors). The upstream parser and its continuation remain intact.
// Bound foreground work in the interpreter; its ordinary idle worker finishes
// the same tree. Do not shorten explicit caller budgets or idle-worker slices.
export function shortenForegroundParsing(source) {
  for (const context of ["newCx", "parseState"]) {
    const before = `${context}.work(20 /* Work.Apply */,`;
    if (source.split(before).length !== 2) {
      throw new Error(`Review CodeMirror foreground parsing: ${context}`);
    }
    source = source.replace(before, `${context}.work(5 /* Work.Apply */,`);
  }
  return source;
}

// An interpreter needs more slices for the same source. Avoid spending as
// long asleep between slices as it spends parsing. Keep the combined timer
// and idle-callback maximum at 500 ms, including the browser's cancellation.
export function shortenIdleParserPause(source) {
  const before = "100 /* Work.MinPause */";
  if (source.split(before).length !== 3) {
    throw new Error("Review CodeMirror idle parser pause");
  }
  return source.replaceAll(before, "25 /* Work.MinPause */");
}

// Finalizing an in-progress parse can publish newer reusable fragments. Take
// the snapshot afterward, so the next edit doesn't throw that work away. The
// upstream change-range invalidation still decides what is safe to retain.
export function retainFinishedParsing(source) {
  const snapshot = "        let { fragments, tree, treeLen, viewport, skipped } = this;";
  const finish = "        this.takeTree();";
  const before = snapshot + "\n" + finish;
  if (source.split(before).length !== 2) {
    throw new Error("Review CodeMirror parser fragment snapshot");
  }
  return source.replace(before, finish + "\n" + snapshot);
}
