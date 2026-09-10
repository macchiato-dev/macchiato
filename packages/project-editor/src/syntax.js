import { syntaxTree } from "@codemirror/language";

export function hasSyntaxErrors(state, language) {
  if (language === "javascript" || language === "html" || language === "css") {
    // These sources are intentionally parsed by the debounced output pipeline. Its
    // DOM projection, CSS sanitizer, and QuickJS evaluator can report the
    // precise failing layer; Lezer recovery errors must not suppress that
    // process. The editor's MicroQuickJS parser is not a project validator:
    // Function(source) rejects modern JavaScript and modules, and recompiles
    // the whole file on each keystroke. Output preparation keeps the last good
    // application visible if the actual project runtime rejects the new code.
    return false;
  }
  const cursor = syntaxTree(state).cursor();
  do {
    if (cursor.type.isError) return true;
  } while (cursor.next());
  return false;
}
