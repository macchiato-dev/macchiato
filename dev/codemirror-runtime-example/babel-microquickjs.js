export default function microQuickJSSyntax() {
  return {
    name: "microquickjs-syntax",
    visitor: {
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
