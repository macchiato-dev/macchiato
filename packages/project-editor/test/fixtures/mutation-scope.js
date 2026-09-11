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
var observation = hostCall(document.reference, "mutationObserver", [allocateCallback(reportMutations, false)]);
var observationLease = new GuestObject(observation[1]);
hostCall(observation[1], "observe", [document, 19]);
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
    if (type.indexOf("drag") === 0 || type === "drop") {
      var transfer = hostGet(event.reference, "dataTransfer");
      value = hostCall(transfer[1], "getData", ["text/plain"]);
      hostCall(transfer[1], "setData", ["text/plain", "changed-by-guest"]);
    }
    hostCall(event.reference, "preventDefault", []);
    __wwcPostMessage(JSON.stringify({ type: type, value: value }));
    flush();
  }
  ["keydown", "beforeinput", "change", "copy", "mousedown", "mouseup",
    "dragstart", "dragend", "dragenter", "dragleave", "dragover", "drop"].forEach(function (type) {
    pendingOperations.push([4, document.reference, stringIndex(type),
      allocateCallback(reportEvent, false)]);
  });
  hostCall(document.reference, "windowListen", ["keydown", allocateCallback(reportEvent, false)]);
  flush();
}
__wwcPostMessage(JSON.stringify({ ready: true }));
flush();
