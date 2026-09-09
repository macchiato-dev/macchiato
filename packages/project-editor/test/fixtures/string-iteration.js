var samples = ["", "abc", "😀", "A😀e\u0301文"];
var counts = samples.map(function (text) { return Array.from(text).length; });
var iterator = "😀x"[Symbol.iterator]();
var first = iterator.next(), second = iterator.next(), end = iterator.next();
var mapped = Array.from({ 0: 2, 1: 3, length: 2 }, function (value, index) {
  return value * this.factor + index;
}, { factor: 4 });
var closed = false;
var source = {};
source[Symbol.iterator] = function () {
  return { next: function () { return { value: 1, done: false }; },
    return: function () { closed = true; return { done: true }; } };
};
try { Array.from(source, function () { throw new Error("stop"); }); } catch (error) {}
__wwcPostMessage(JSON.stringify({ counts: counts, first: first.value,
  second: second.value, done: end.done, mapped: mapped, closed: closed,
  set: Array.from(new Set(["a", "b", "a"])),
  map: Array.from(new Map([["a", 1], ["b", 2]])) }));
flush();
