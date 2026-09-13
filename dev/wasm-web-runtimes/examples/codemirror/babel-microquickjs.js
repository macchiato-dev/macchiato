export default function microQuickJSSyntax({ types }) {
  return {
    name: "microquickjs-syntax",
    visitor: {
      Program: {
        exit(path, state) {
          // Babel's regenerator helper keeps finally state in slots 4 and 5
          // of each four-slot try record. Its right-to-left assignment writes
          // slot 5 first, which MicroQuickJS rejects as a sparse-array write.
          // Allocate those private slots up front; do not rewrite guest arrays
          // or weaken the interpreter's dense-array semantics. The helper
          // registry identifies Babel's binding even when its name is renamed.
          const helper = state.file.declarations.regenerator;
          if (!helper) return;
          path.traverse({
            CallExpression(call) {
              const callee = call.node.callee;
              if (!types.isMemberExpression(callee) || callee.computed ||
                  !types.isIdentifier(callee.property, { name: "w" }) ||
                  !types.isCallExpression(callee.object) ||
                  !types.isIdentifier(callee.object.callee, { name: helper.name })) return;
              if (call.scope.getBinding(helper.name) !== path.scope.getBinding(helper.name)) return;
              const table = call.node.arguments[3];
              if (!types.isArrayExpression(table)) return;
              for (const entry of table.elements) {
                if (!types.isArrayExpression(entry) || entry.elements.length < 3) continue;
                while (entry.elements.length < 6) entry.elements.push(null);
                entry.elements = entry.elements.map(value => value ||
                  types.unaryExpression("void", types.numericLiteral(0)));
              }
            },
          });
        },
      },
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
