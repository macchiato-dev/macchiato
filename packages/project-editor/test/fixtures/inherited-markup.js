// Raw calls: inherited native nodes must not bypass the structured CSS path.
function probeMarkup(json) {
  var request = JSON.parse(json);
  var found = hostCall(document.reference, "getElementById", ["inherited"]);
  var target = new GuestObject(found[1]);
  var text = "body { background-image: url(/unexpected-style.png); }";
  if (request.operation === "attribute") {
    if (request.path === "dom") {
      var element = hostCall(document.reference, "createElement", [request.tag]);
      hostCall(element[1], "setAttribute", [request.name, request.value]);
    } else {
      var html = "<" + request.tag + " " + request.name + '=\"' + request.value + '\"></' + request.tag + ">";
      if (request.path === "nested") html = "<template>" + html + "</template>";
      immediate([2, target.reference, stringIndex("innerHTML"), html]);
    }
  } else if (request.operation === "read") {
    __wwcPostMessage(hostGet(target.reference, "textContent"));
    flush();
    return;
  } else if (request.operation === "remove") {
    hostCall(target.reference, "remove", []);
  } else if (request.operation === "type") {
    hostCall(target.reference, "setAttribute", ["type", "text/javascript"]);
  } else if (request.operation === "text") {
    immediate([2, target.reference, stringIndex("textContent"), text]);
  } else if (request.operation === "childText" || request.operation === "childData" ||
      request.operation === "childContent" || request.operation === "childRemove" || request.operation === "moveChild") {
    var children = hostCall(target.reference, "childNodes", []);
    var first = hostCall(children[1], "item", [0]);
    if (request.operation === "childText") immediate([2, first[1], stringIndex("nodeValue"), text]);
    else if (request.operation === "childData") immediate([2, first[1], stringIndex("data"), text]);
    else if (request.operation === "childContent") immediate([2, first[1], stringIndex("textContent"), text]);
    else if (request.operation === "childRemove") hostCall(first[1], "remove", []);
    else hostCall(hostGet(document.reference, "body")[1], "appendChild", [new GuestObject(first[1])]);
  } else if (request.operation === "nestedImage" || request.operation === "nestedScript") {
    var markup = request.operation === "nestedImage"
      ? '<img src="http://markup.test/unexpected-template.png">'
      : '<script>window.__escapedMarkup = true</script>';
    immediate([2, target.reference, stringIndex("innerHTML"), "<template>" + markup + "</template>"]);
    var template = hostCall(target.reference, "querySelector", [encodeSelector("template")]);
    var content = hostGet(template[1], "content");
    hostCall(hostGet(document.reference, "body")[1], "appendChild", [new GuestObject(content[1])]);
  } else if (request.operation === "resolvedImage") {
    immediate([2, target.reference, stringIndex("innerHTML"), '<img src="/unexpected-resolved.png">']);
    var contents = hostGet(target.reference, "content");
    hostCall(hostGet(document.reference, "body")[1], "appendChild", [new GuestObject(contents[1])]);
  } else if (request.operation === "innerHTML") {
    immediate([2, target.reference, stringIndex("innerHTML"), text]);
  } else if (request.operation === "appendText" || request.operation === "replaceText") {
    var child = hostCall(document.reference, "createTextNode", [text]);
    hostCall(target.reference, request.operation === "appendText" ? "appendChild" : "replaceChildren",
      [new GuestObject(child[1])]);
  } else if (request.operation === "clone" || request.operation === "move") {
    if (request.operation === "clone") target = new GuestObject(hostCall(target.reference, "cloneNode", [true])[1]);
    var body = hostGet(document.reference, "body");
    hostCall(body[1], "appendChild", [target]);
  } else throw Error("Unknown markup probe");
  __wwcPostMessage("finished");
  flush();
}
__wwcPostMessage("ready");
flush();
