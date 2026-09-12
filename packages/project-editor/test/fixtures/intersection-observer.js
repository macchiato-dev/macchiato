var intersectionTarget = document.getElementById("observed");
var intersectionRoot = document.getElementById("scroller");
var intersectionObserver = new IntersectionObserver(function (entries, observer) {
  var description = entries.map(function (entry) {
    return { target: entry.target.id, visible: entry.isIntersecting, ratio: entry.intersectionRatio,
      size: entry.boundingClientRect ? [entry.boundingClientRect.width, entry.boundingClientRect.height] : null };
  });
  __wwcPostMessage(JSON.stringify({ entries: description,
    observerIdentity: observer === intersectionObserver, receiver: this === intersectionObserver }));
}, { root: intersectionRoot, threshold: [0, 0.5, 1] });
intersectionObserver.observe(intersectionTarget);
function intersectionCommand(value) {
  if (value === "disconnect") intersectionObserver.disconnect();
  else if (value === "unobserve") intersectionObserver.unobserve(intersectionTarget);
  else if (value === "observe") intersectionObserver.observe(intersectionTarget);
}
