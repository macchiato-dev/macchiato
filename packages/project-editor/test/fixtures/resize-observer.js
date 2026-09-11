var resizeObserver;
var retainedResizeEntry;
function describeResize(entry) {
  function sizes(values) {
    return values.map(function (value) { return [value.inlineSize, value.blockSize]; });
  }
  return { target: entry.target.id,
    rect: [entry.contentRect.x, entry.contentRect.y, entry.contentRect.width, entry.contentRect.height],
    content: sizes(entry.contentBoxSize), border: sizes(entry.borderBoxSize),
    device: sizes(entry.devicePixelContentBoxSize) };
}
function resizeReport(value) { __wwcPostMessage(JSON.stringify(value)); flush(); }
function resizeCommand(json) {
  var command = JSON.parse(json);
  if (command.action === "observe") {
    if (!resizeObserver) resizeObserver = new ResizeObserver(function (entries, observer) {
      retainedResizeEntry = entries[0];
      resizeReport({ entries: entries.map(describeResize), identity: observer === resizeObserver,
        receiver: this === resizeObserver });
    });
    resizeObserver.observe(document.getElementById(command.target), { box: command.box || "content-box" });
  } else if (command.action === "unobserve") {
    resizeObserver.unobserve(document.getElementById(command.target));
  } else if (command.action === "disconnect") {
    resizeObserver.disconnect();
  } else if (command.action === "retained") {
    resizeReport({ retained: describeResize(retainedResizeEntry) });
  } else if (command.action === "recycle") {
    var start = callbacks.length;
    var transient = new ResizeObserver(function () { resizeReport({ unexpected: true }); });
    var target = document.getElementById("a");
    for (var index = 0; index < 5000; index++) {
      transient.observe(target);
      transient.unobserve(target);
    }
    resizeReport({ recycled: 5000, growth: callbacks.length - start });
  } else if (command.action === "reflect-id") {
    var element = document.getElementById("a");
    element.id = "renamed";
    resizeReport({ id: element.id, attribute: element.getAttribute("id"),
      identity: document.getElementById("renamed") === element });
    element.id = "a";
    flush();
  }
  return "ok";
}
