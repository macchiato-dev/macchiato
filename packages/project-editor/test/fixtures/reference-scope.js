// Deliberately bypass the DOM facade. Merely possessing a reference must not
// grant permission to read or mutate the referenced host node.
var capturedTarget;
pendingOperations.push([4, document.reference, stringIndex("mousedown"),
  allocateCallback(function (event) {
    capturedTarget = new GuestObject(hostGet(event.reference, "target")[1]);
    __wwcPostMessage("captured");
    flush();
  }, false)]);

function probeReference(json) {
  var request = JSON.parse(json), result;
  gc();
  var root = new GuestObject(hostGet(document.reference, "body")[1]);
  if (request.operation === "value") result = hostGet(capturedTarget.reference, "value");
  else if (request.operation === "setValue") {
    immediate([2, capturedTarget.reference, stringIndex("value"), "changed"]);
    result = "set";
  } else if (request.operation === "attribute") {
    result = hostCall(capturedTarget.reference, "getAttribute", ["data-secret"]);
  } else if (request.operation === "style") result = hostGet(capturedTarget.reference, "style");
  else if (request.operation === "append") {
    hostCall(root.reference, "appendChild", [capturedTarget]);
    result = "moved";
  } else if (request.operation === "documentChildren") {
    result = hostCall(document.reference, "childNodeReferences", []);
  } else if (request.operation === "selectionText" || request.operation === "selectionGeometry") {
    var selection = hostCall(document.reference, "getSelection", []);
    var range = hostCall(selection[1], "getRangeAt", [0]);
    if (request.operation === "selectionGeometry") result = hostCall(range[1], "getBoundingClientRect", []);
    else {
      var node = hostGet(range[1], "startContainer");
      result = hostGet(node[1], "textContent");
    }
  } else if (request.operation === "detachedChild") {
    var child = hostCall(capturedTarget.reference, "querySelector", ["input"]);
    result = hostGet(child[1], "value");
  } else if (request.operation === "removeDocumentRoot") {
    result = hostCall(document.reference, "removeChild", [capturedTarget]);
  } else if (request.operation === "parent") {
    result = hostGet(capturedTarget.reference, "parentNode");
  } else if (request.operation === "closest") {
    result = hostCall(capturedTarget.reference, "closest", ["#own"]);
  } else if (request.operation === "type") result = hostGet(capturedTarget.reference, "nodeType");
  else throw Error("Unknown reference probe");
  __wwcPostMessage(JSON.stringify({ result: result }));
  flush();
}
__wwcPostMessage("ready");
flush();
