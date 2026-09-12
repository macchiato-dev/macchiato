var intersectionTarget = document.getElementById("observed");
var intersectionRoot = document.getElementById("scroller");
var retainedIntersectionEntry;
var intersectionObserver = new IntersectionObserver(function (entries, observer) {
  retainedIntersectionEntry = entries[0];
  var description = entries.map(function (entry) {
    return { target: entry.target.id, visible: entry.isIntersecting, ratio: entry.intersectionRatio,
      size: entry.boundingClientRect ? [entry.boundingClientRect.width, entry.boundingClientRect.height] : null };
  });
  __wwcPostMessage(JSON.stringify({ entries: description,
    observerIdentity: observer === intersectionObserver, receiver: this === intersectionObserver,
    root: observer.root === intersectionRoot, margin: observer.rootMargin, thresholds: observer.thresholds }));
}, { root: intersectionRoot, threshold: [0, 0.5, 1] });
intersectionObserver.observe(intersectionTarget);
function intersectionCommand(value) {
  value = JSON.parse(value);
  if (value === "disconnect") intersectionObserver.disconnect();
  else if (value === "unobserve") intersectionObserver.unobserve(intersectionTarget);
  else if (value === "observe") intersectionObserver.observe(intersectionTarget);
  else if (value === "retained") __wwcPostMessage(JSON.stringify({ retained: {
    ratio: retainedIntersectionEntry.intersectionRatio, target: retainedIntersectionEntry.target.id,
    size: [retainedIntersectionEntry.boundingClientRect.width, retainedIntersectionEntry.boundingClientRect.height] } }));
  else if (value === "configuration") {
    var configured = new IntersectionObserver(function () {}, {
      root: intersectionRoot, rootMargin: "1px 2%", threshold: [1, 0.5, 0, 0.5]
    });
    var thresholds = configured.thresholds;
    try { thresholds[0] = 0.25; } catch (error) {}
    __wwcPostMessage(JSON.stringify({ config: { root: configured.root === intersectionRoot,
      margin: configured.rootMargin, thresholds: configured.thresholds,
      empty: configured.takeRecords().length } }));
    configured.disconnect();
  }
}
function temporaryIntersectionObservers() {
  for (var index = 0; index < 25; index++) {
    var observer = new IntersectionObserver(function () {});
    observer.observe(intersectionTarget);
    observer.unobserve(intersectionTarget);
  }
}
function collectIntersectionObservers(value) {
  if (JSON.parse(value)) temporaryIntersectionObservers();
  gc();
  __wwcPostMessage(JSON.stringify({ lifetime: {
    slots: callbacks.filter(Boolean).length, cells: weakIntersectionCallbacks.length,
    active: Object.keys(activeIntersections).length } }));
}
function orphanIntersectionObserver() {
  new IntersectionObserver(function (entries, observer) {
    observer.disconnect();
    __wwcPostMessage(JSON.stringify({ orphanCallback: true, callbackOwner: observer === this }));
  }).observe(intersectionTarget);
  gc();
}
