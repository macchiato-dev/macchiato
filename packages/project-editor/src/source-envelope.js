import { EditorState } from "@codemirror/state";

const isSafeInteger = (value) => typeof value === "number" && value >= -2147483648 &&
  value <= 2147483647 && (value | 0) === value;

export const SOURCE_LIMITS = Object.freeze({
  maxCodePoints: 500 * 80 * 2,
  maxLineCodePoints: 256,
  maxLines: 500,
});

export function countCodePoints(value) {
  let count = value.length;
  for (let index = 0; index < value.length; index++) {
    const first = value.charCodeAt(index);
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (second >= 0xdc00 && second <= 0xdfff) { index++; count--; }
    }
  }
  return count;
}

export function hardWrapSource(value, width = SOURCE_LIMITS.maxLineCodePoints) {
  if (!isSafeInteger(width) || width < 1) throw new RangeError("width must be a positive integer");
  let output = "";
  let column = 0;
  for (const character of value) {
    if (character === "\n") {
      output += character;
      column = 0;
      continue;
    }
    if (column === width) {
      output += "\n";
      column = 0;
    }
    output += character;
    column++;
  }
  return output;
}

function hardBreakChanges(value, width) {
  const changes = [];
  let column = 0;
  let offset = 0;
  for (const character of value) {
    if (character === "\n") {
      column = 0;
    } else {
      if (column === width) {
        changes.push({ from: offset, insert: "\n" });
        column = 0;
      }
      column++;
    }
    offset += character.length;
  }
  return changes;
}

export function sourceUsage(value) {
  let codePoints = 0, lines = 1, column = 0, longestLineCodePoints = 0;
  for (let index = 0; index < value.length; index++) {
    const first = value.charCodeAt(index);
    codePoints++;
    if (first === 10) {
      longestLineCodePoints = Math.max(longestLineCodePoints, column);
      column = 0;
      lines++;
    } else {
      column++;
      if (first >= 0xd800 && first <= 0xdbff) {
        const second = value.charCodeAt(index + 1);
        if (second >= 0xdc00 && second <= 0xdfff) index++;
      }
    }
  }
  return { codePoints, lines, longestLineCodePoints: Math.max(longestLineCodePoints, column) };
}

// CodeMirror Text nodes are immutable and share unchanged subtrees between
// edits. Cache only aggregate counts, with weak keys so history disposal can
// release old documents. Never cache mutable DOM or selection information.
const documentUsageCache = new WeakMap();
export function documentSourceUsage(doc) {
  const cached = documentUsageCache.get(doc);
  if (cached) return cached;
  let codePoints = 0, longestLineCodePoints = 0;
  if (doc.children) {
    codePoints = doc.children.length - 1;
    for (const child of doc.children) {
      const usage = documentSourceUsage(child);
      codePoints += usage.codePoints;
      longestLineCodePoints = Math.max(longestLineCodePoints, usage.longestLineCodePoints);
    }
  } else {
    codePoints = doc.lines - 1;
    const iterator = doc.iterLines();
    while (!iterator.next().done) {
      const length = countCodePoints(iterator.value);
      codePoints += length;
      longestLineCodePoints = Math.max(longestLineCodePoints, length);
    }
  }
  const usage = { codePoints, lines: doc.lines, longestLineCodePoints };
  documentUsageCache.set(doc, usage);
  return usage;
}

export function createSourceEnvelopeExtension(options = {}) {
  if (typeof options === "function") options = { onLimit: options };
  const limitsForTransaction = typeof options.limits === "function"
    ? options.limits : () => options.limits || SOURCE_LIMITS;
  const onLimit = options.onLimit || (() => {});
  const hardWrap = EditorState.transactionFilter.of((transaction) => {
    if (!transaction.docChanged || transaction.isUserEvent("input.paste") ||
        transaction.isUserEvent("input.drop")) return transaction;
    const budget = limitsForTransaction();
    if (!budget) return transaction;
    const width = budget.maxLineCodePoints;
    if (!isSafeInteger(width)) return transaction;
    const changes = hardBreakChanges(transaction.newDoc.toString(), width);
    return changes.length ? [transaction, { changes, sequential: true }] : transaction;
  });
  const limits = EditorState.changeFilter.of((transaction) => {
    if (!transaction.docChanged) return true;
    const budget = limitsForTransaction();
    if (!budget) return true;
    const usage = documentSourceUsage(transaction.newDoc);
    const atomicInput = transaction.isUserEvent("input.paste") || transaction.isUserEvent("input.drop");
    const accepted = usage.lines <= budget.maxLines &&
      usage.codePoints <= budget.maxCodePoints &&
      (!atomicInput || !isSafeInteger(budget.maxLineCodePoints) ||
        usage.longestLineCodePoints <= budget.maxLineCodePoints);
    if (!accepted) onLimit({
      ...usage,
      input: atomicInput ? transaction.isUserEvent("input.paste") ? "paste" : "drop" : "change",
      limits: budget,
    });
    return accepted;
  });
  return [hardWrap, limits];
}
