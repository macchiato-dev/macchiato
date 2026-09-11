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
  }
  return "ok";
}
