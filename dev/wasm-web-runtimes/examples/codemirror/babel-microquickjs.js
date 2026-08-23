export default function microQuickJSSyntax({ types }) {
  return {
    name: "microquickjs-syntax",
    visitor: {
      RegExpLiteral(path) {
        // MicroQuickJS treats this web-compatible character class as an
        // invalid range. Escaping the hyphen preserves the intended set.
        const pattern = path.node.pattern
          .replaceAll("[\\w-.]", "[\\w.\\-]")
          .replaceAll("[\\w-.:]", "[\\w.:\\-]");
        if (path.node.flags) {
          path.replaceWith(types.newExpression(types.identifier("RegExp"), [
            types.stringLiteral(pattern), types.stringLiteral(path.node.flags),
          ]));
        } else {
          path.node.pattern = pattern;
        }
      },
      CatchClause(path) {
        const name = path.node.param?.name;
        if (!name) return;

        // MicroQuickJS rejects reused or shadowing catch bindings within a
        // function. Give every catch and only its bound references a unique name.
        const replacement = path.scope.generateUidIdentifier(name).name;
        path.scope.rename(name, replacement);
      },
    },
  };
}
