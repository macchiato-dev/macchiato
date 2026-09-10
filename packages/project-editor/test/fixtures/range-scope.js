// Use the raw host interface: the JavaScript DOM facade cannot enforce the
// permission boundary for a guest that sends its own protocol operations.
function probeRange(json) {
  var request = JSON.parse(json);
  var first = hostCall(document.reference, "getElementById", ["first"]);
  var last = hostCall(document.reference, "getElementById", ["last"]);
  var firstChildren = hostCall(first[1], "childNodes", []);
  var lastChildren = hostCall(last[1], "childNodes", []);
  var start = new GuestObject(hostCall(firstChildren[1], "item", [0])[1]);
  var end = new GuestObject(hostCall(lastChildren[1], "item", [0])[1]);
  var range = new GuestObject(hostCall(document.reference, "createRange", [])[1]);
  hostCall(range.reference, "setStart", [start, 0]);
  hostCall(range.reference, "setEnd", [end, 3]);
  if (request.operation === "extend" || request.operation === "extendBackwards") {
    var backwards = request.operation === "extendBackwards";
    var active = hostCall(document.reference, "getSelection", []);
    hostCall(active[1], "collapse", [backwards ? end : start, backwards ? 3 : 0]);
    hostCall(active[1], "extend", [backwards ? end : start, backwards ? 0 : 3]);
    hostCall(active[1], "extend", [backwards ? start : end, backwards ? 0 : 3]);
  } else if (request.operation === "addRange") {
    var selection = hostCall(document.reference, "getSelection", []);
    hostCall(selection[1], "addRange", [range]);
  } else if (request.operation === "measureRect" || request.operation === "measureClientRects") {
    hostCall(document.reference, request.operation, [range]);
  } else hostCall(range.reference, request.operation, []);
  __wwcPostMessage("accepted");
  flush();
}
