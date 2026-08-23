import { EditorState } from "@codemirror/state";

const isSafeInteger = (value) => typeof value === "number" && value >= -2147483648 &&
  value <= 2147483647 && (value | 0) === value;

export const SOURCE_LIMITS = Object.freeze({
  maxCodePoints: 500 * 80 * 2,
  maxLineCodePoints: 256,
  maxLines: 500,
});

export function countCodePoints(value) {
  return [...value].length;
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
  const lines = value.split("\n");
  return {
    codePoints: countCodePoints(value),
    lines: lines.length,
    longestLineCodePoints: Math.max(...lines.map(countCodePoints)),
  };
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
    const usage = sourceUsage(transaction.newDoc.toString());
    const budget = limitsForTransaction();
    if (!budget) return true;
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
