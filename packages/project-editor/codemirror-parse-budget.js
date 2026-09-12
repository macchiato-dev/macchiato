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
