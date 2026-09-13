// MicroQuickJS serializes JSON correctly but ignores stringify's indentation
// argument. Format its serialized output, leaving values and key order intact.
// This is display-only: persistence continues to use ordinary compact JSON.
export function formatProjectJson(value) {
  const source = JSON.stringify(value);
  if (source === undefined) return source;
  const parts = [];
  let depth = 0, quoted = false, escaped = false;
  const newline = () => parts.push("\n", "  ".repeat(depth));
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      parts.push(char);
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') {
      quoted = true;
      parts.push(char);
    } else if (char === "{" || char === "[") {
      parts.push(char);
      const closing = char === "{" ? "}" : "]";
      if (source[i + 1] === closing) parts.push(source[++i]);
      else { depth++; newline(); }
    } else if (char === "}" || char === "]") {
      depth--;
      newline();
      parts.push(char);
    } else if (char === ",") {
      parts.push(char);
      newline();
    } else {
      parts.push(char === ":" ? ": " : char);
    }
  }
  return parts.join("");
}
