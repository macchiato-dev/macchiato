// Use the ABI directly: containment cannot depend on a friendly DOM facade
// declining to decode records from outside its virtual document.
function reportMutations(batch) {
  var count = hostGet(batch.reference, "length"), values = [];
  for (var index = 0; index < count; index++) {
    var record = hostCall(batch.reference, "item", [index])[1];
    values.push(hostGet(record, "oldValue"));
    releaseHostReferenceLease(record);
  }
  releaseHostReference(batch._hostReference);
  __wwcPostMessage(JSON.stringify({ values: values }));
  flush();
}
var observation = hostCall(document.reference, "mutationObserve", [
  document, 19, allocateCallback(reportMutations, false)
]);
var observationLease = new GuestObject(observation[1]);
function takeScopeRecords() {
  var batch = hostCall(observation[1], "takeRecords", []);
  reportMutations(new GuestObject(batch[1]));
}
function startScopeEvents() {
  hostCall(observation[1], "disconnect", []);
  function reportEvent(event) {
    var type = hostGet(event.reference, "type");
    var value = type === "keydown" ? hostGet(event.reference, "key")
      : type === "beforeinput" ? hostGet(event.reference, "data") : null;
    hostCall(event.reference, "preventDefault", []);
    __wwcPostMessage(JSON.stringify({ type: type, value: value }));
    flush();
  }
  ["keydown", "beforeinput", "change", "copy", "mousedown", "mouseup"].forEach(function (type) {
    pendingOperations.push([4, document.reference, stringIndex(type),
      allocateCallback(reportEvent, false)]);
  });
  hostCall(document.reference, "windowListen", ["keydown", allocateCallback(reportEvent, false)]);
  flush();
}
__wwcPostMessage(JSON.stringify({ ready: true }));
flush();
