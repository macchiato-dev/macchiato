function makeRemovedNodes() {
  for (var index = 0; index < 100; index++) {
    var node = document.createElement("div");
    document.body.appendChild(node);
    node.remove();
  }
}
function churnNodes(value) {
  if (value) makeRemovedNodes();
  gc();
  flush();
  __wwcPostMessage("collected");
}
