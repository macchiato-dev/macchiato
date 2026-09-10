function probeStylesheet(json) {
  var request = JSON.parse(json);
  immediate([3, document.reference, stringIndex("installStylesheet"),
    [encode(encodeCss(request.source))]]);
  flush();
}

function probeSelector(json) {
  var request = JSON.parse(json);
  var root = hostGet(document.reference, "body");
  var child = hostCall(root[1], "querySelector", ["p"]);
  var receiver = request.method === "querySelector" ? root : child;
  var result = hostCall(receiver[1], request.method, [request.selector]);
  __wwcPostMessage(Boolean(result));
  flush();
}
