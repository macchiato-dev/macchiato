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
__wwcPostMessage(JSON.stringify({ ready: true }));
flush();
