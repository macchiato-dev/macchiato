import { syntaxTree } from "@codemirror/language";

export function hasSyntaxErrors(state, language) {
  const source = state.doc.toString();
  if (language === "javascript") {
    try { Function(source); return false; }
    catch (error) { if (error instanceof SyntaxError) return true; throw error; }
  }
  if (language === "html" || language === "css") {
    // HTML and CSS are intentionally parsed again by the output pipeline. Its
    // DOM projection, CSS sanitizer, and QuickJS evaluator can report the
    // precise failing layer; Lezer recovery errors must not suppress that
    // process. This also avoids treating newer, valid CSS as broken merely
    // because the editor parser recovered around syntax it does not know.
    return false;
  }
  const cursor = syntaxTree(state).cursor();
  do {
    if (cursor.type.isError) return true;
  } while (cursor.next());
  return false;
}
