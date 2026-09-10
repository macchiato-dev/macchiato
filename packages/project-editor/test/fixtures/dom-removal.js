// Exercise the guest mirror without a MutationObserver repairing its cache.
var container = document.createElement("div");
var first = document.createElement("span");
var text = document.createTextNode("text");
var last = document.createElement("span");
first.textContent = "first";
last.textContent = "last";
document.body.appendChild(container);
container.appendChild(first);
container.appendChild(text);
container.appendChild(last);
var before = container.childNodes.length;
// A layout read flushes the append, like CodeMirror measuring a dummy line.
first.getBoundingClientRect();
first.remove();
var afterElement = [container.childNodes.length, first.parentNode === null,
  container.firstChild === text, text.previousSibling === null];
text.remove();
var afterText = [container.childNodes.length, text.parentNode === null,
  container.firstChild === last, last.previousSibling === null];
first.remove();
container.insertBefore(first, last);
var reinserted = [container.childNodes.length, first.nextSibling === last,
  last.previousSibling === first];
container.removeChild(first);
last.remove();
__wwcPostMessage(JSON.stringify({ before: before, afterElement: afterElement,
  afterText: afterText, reinserted: reinserted, remaining: container.childNodes.length }));
