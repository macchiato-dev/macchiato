// Names are reusable protocol vocabulary. Payloads are not: retaining every
// edited source snapshot would outlive both CodeMirror history and guest GC.
__wwcServiceCall("echo", "warmup");
stringIndex("postMessage");
var before = wireStrings.length;
for (var index = 0; index < 24; index++) {
  var payload = ["", "r", "s", "😀 café 中文", "line\nnext\u0000end"][index % 5] + index;
  if (__wwcServiceCall("echo", payload) !== payload) throw new Error("Payload changed");
}
var serviceStrings = wireStrings.length - before;
var beforePost = wireStrings.length;
__wwcPostMessage(JSON.stringify({ requests: 24, serviceStrings: serviceStrings }));
if (wireStrings.length !== beforePost) throw new Error("postMessage retained its payload");
gc();
flush();
