function probeStylesheet(json) {
  var request = JSON.parse(json);
  immediate([3, document.reference, stringIndex("installStylesheet"),
    [encode(encodeCss(request.source))]]);
  flush();
}
