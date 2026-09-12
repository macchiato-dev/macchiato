function makeRemovedNodes() {
  for (var index = 0; index < 100; index++) {
    var node = document.createElement("div");
    document.body.appendChild(node);
    node.remove();
  }
}
function churnNodes(value) {
  if (JSON.parse(value)) makeRemovedNodes();
  gc();
  flush();
  __wwcPostMessage(JSON.stringify({ cached: Object.keys(guestNodes).length }));
}

var retainedNodes, liveCell, deadCell;
function prepareRetainedNodes() {
  var parent = document.createElement("div");
  var child = document.createElement("span");
  child.id = "retained-child";
  child.note = { value: "guest property" };
  parent.appendChild(child);
  document.body.appendChild(parent);
  parent.remove();
  retainedNodes = { parent: parent, child: child, note: child.note };
  liveCell = __wwcWeakCell(child);
  var cycle = {};
  cycle.self = cycle;
  deadCell = __wwcWeakCell(cycle);
}
function checkNodeCache(operation) {
  operation = JSON.parse(operation);
  if (operation === "hold") prepareRetainedNodes();
  if (operation === "release") retainedNodes = null;
  gc();
  if (operation === "verify") {
    var parent = retainedNodes.parent, child = retainedNodes.child;
    if (__wwcWeakDeref(liveCell) !== child || __wwcWeakDeref(deadCell) !== undefined)
      throw new Error("weak cells did not preserve live targets and collect cycles");
    if (parent.firstChild !== child || child.parentNode !== parent || child.note !== retainedNodes.note)
      throw new Error("detached wrapper identity changed");
    document.body.appendChild(parent);
    if (document.getElementById("retained-child") !== child)
      throw new Error("host lookup lost the retained wrapper");
    parent.remove();
  }
  if (operation === "released" && __wwcWeakDeref(liveCell) !== undefined)
    throw new Error("released subtree is still retained");
  if (operation === "invalid") {
    [undefined, null, true, 5, "text"].forEach(function (value) {
      var rejected = 0;
      try { __wwcWeakCell(value); } catch (error) { if (error instanceof TypeError) rejected++; }
      try { __wwcWeakDeref(value); } catch (derefError) { if (derefError instanceof TypeError) rejected++; }
      if (rejected !== 2) throw new Error("invalid weak cell argument was accepted");
    });
  }
  flush();
  __wwcPostMessage(JSON.stringify({ checked: operation, cached: Object.keys(guestNodes).length }));
}

var reconciliationLeft, reconciliationRight, reconciliationNodes;
function reconcileNodeCache(json) {
  var request = JSON.parse(json);
  if (request.action === "prime") {
    reconciliationLeft = document.getElementById("reconcile-left");
    reconciliationRight = document.getElementById("reconcile-right");
    synchronizeGuestChildren(reconciliationLeft);
    synchronizeGuestChildren(reconciliationRight);
    reconciliationNodes = childrenOf(reconciliationLeft).slice();
  } else if (request.action === "measure") {
    var start = performance.now();
    for (var repeat = 0; repeat < 5; repeat++) synchronizeGuestChildren(reconciliationLeft);
    __wwcPostMessage(JSON.stringify({ reconciliation: request.count, milliseconds: performance.now() - start }));
  } else if (request.action === "verify") {
    synchronizeGuestChildren(reconciliationLeft);
    synchronizeGuestChildren(reconciliationRight);
    var children = childrenOf(reconciliationLeft);
    if (children.length !== request.count - 2 || children[0] !== reconciliationNodes[request.count - 1])
      throw new Error("reordered child mirror is wrong");
    if (parentOf(reconciliationNodes[0]) !== reconciliationRight ||
        parentOf(reconciliationNodes[1]) !== null)
      throw new Error("moved or removed child parent is wrong");
    if (childrenOf(reconciliationRight)[0] !== reconciliationNodes[0])
      throw new Error("moving a node changed its wrapper identity");
    __wwcPostMessage(JSON.stringify({ reconciliationVerified: request.count }));
  } else if (request.action === "release") {
    reconciliationLeft.remove(); reconciliationRight.remove();
    reconciliationLeft = reconciliationRight = reconciliationNodes = null;
  }
  flush();
}
