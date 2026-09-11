function probeStylesheet(json) {
  var request = JSON.parse(json);
  immediate([3, document.reference, stringIndex("installStylesheet"),
    [encode(encodeCss(request.source))]]);
  flush();
}

function probeSelector(json) {
  var request = JSON.parse(json);
  var root = hostGet(document.reference, "body");
  var child = hostCall(root[1], "querySelector", [encodeSelector("p")]);
  var receiver = request.method === "querySelector" ? root : child;
  var result = hostCall(receiver[1], request.method, [encodeSelector(request.selector)]);
  __wwcPostMessage(Boolean(result));
  flush();
}

function probeOwnedQueries(json) {
  var request = JSON.parse(json);
  var container = document.createElement("div");
  container.className = "group";
  container.innerHTML = '<p class="first">One</p><p class="last">Two</p>';
  if (request.attached || request.removed) document.body.appendChild(container);
  if (request.removed) document.body.removeChild(container);
  flush();
  var first = hostCall(container.reference, "querySelector", [encodeSelector(".first")]);
  var last = hostCall(container.reference, "querySelector", [encodeSelector(".first + .last")]);
  var matches = hostCall(last[1], "matches", [encodeSelector(".group > .last:nth-child(2)")]);
  var closest = hostCall(last[1], "closest", [encodeSelector(".group")]);
  var before = hostCall(first[1], "matches", [encodeSelector(":has(+ .last)")]);
  __wwcPostMessage(JSON.stringify({ first: Boolean(first), last: Boolean(last), matches: matches,
    closest: closest && closest[1] === container.reference, before: before }));
}

function probeRawSelector(json) {
  var request = JSON.parse(json);
  var root = hostGet(document.reference, "body");
  // Old string inputs must not provide an alternative path around the byte
  // renderer, even when a guest deliberately bypasses its own facade.
  hostCall(root[1], request.method, ["p"]);
}
