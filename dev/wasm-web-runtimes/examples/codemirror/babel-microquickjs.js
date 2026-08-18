export default function microQuickJSSyntax() {
  return {
    name: "microquickjs-syntax",
    visitor: {
      RegExpLiteral(path) {
        // MicroQuickJS treats this web-compatible character class as an
        // invalid range. Escaping the hyphen preserves the intended set.
        path.node.pattern = path.node.pattern
          .replaceAll("[\\w-.]", "[\\w.\\-]")
          .replaceAll("[\\w-.:]", "[\\w.:\\-]");
      },
      CatchClause(path) {
        const name = path.node.param?.name;
        if (!name) return;

        // MicroQuickJS rejects reused or shadowing catch bindings within a
        // function. Give every catch and only its bound references a unique name.
        const replacement = path.scope.generateUidIdentifier(name).name;
        const binding = path.scope.getBinding(name);
        path.node.param.name = replacement;
        for (const reference of binding?.referencePaths ?? []) {
          reference.node.name = replacement;
        }
      },
    },
  };
}
