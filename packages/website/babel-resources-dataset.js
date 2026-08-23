function dataAttribute(name) {
  return "data-" + name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export default function lowerDatasetAccess({ types: t }) {
  return {
    name: "resources-microquickjs-dataset",
    visitor: {
      MemberExpression(path) {
        if (path.node.computed || !t.isIdentifier(path.node.property)) return;
        const dataset = path.node.object;
        if (!t.isMemberExpression(dataset) || dataset.computed ||
            !t.isIdentifier(dataset.property, { name: "dataset" })) return;
        const element = dataset.object;
        const name = t.stringLiteral(dataAttribute(path.node.property.name));
        if (path.parentPath.isAssignmentExpression() && path.parent.left === path.node) {
          if (path.parent.operator !== "=") throw path.buildCodeFrameError("compound dataset assignment is unsupported");
          path.parentPath.replaceWith(t.callExpression(t.identifier("__resourcesDatasetSet"),
            [element, name, path.parent.right]));
          return;
        }
        if (path.parentPath.isUnaryExpression({ operator: "delete" }) && path.parent.argument === path.node) {
          path.parentPath.replaceWith(t.callExpression(t.identifier("__resourcesDatasetDelete"), [element, name]));
          return;
        }
        path.replaceWith(t.callExpression(t.identifier("__resourcesDatasetGet"), [element, name]));
      },
    },
  };
}
