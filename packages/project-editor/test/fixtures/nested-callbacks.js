// Native Array.map calls back into JavaScript at every tree level. Ordinary
// JS recursion alone would not exercise MicroQuickJS's separate C-call guard.
function nativeVisit(depth) {
  return depth === 0 || [depth].map(function (value) { return nativeVisit(value - 1); })[0];
}

function bytecodeVisit(depth) {
  return depth === 0 || [depth].some(function (value) { return bytecodeVisit(value - 1); });
}

var result = { normal: nativeVisit(32), overflow: false, recovered: false, deep: bytecodeVisit(256) };
// Sparse arrays are outside MicroQuickJS's subset. An array-like object lets
// us exercise deleted properties and length capture without pretending otherwise.
var values = { 0: 1, 1: 2, 2: 3, length: 3 };
var visited = [];
Array.prototype.some.call(values, function (value, index, array) {
  visited.push(index + ":" + value);
  if (index === 0) { delete array[1]; array[3] = 4; array.length = 4; }
  return false;
});
var receiver = {};
result.semantics = visited.join(",") === "0:1,2:3" &&
  Array.prototype.some.call({ 0: "a", length: 1 }, function (value, index, object) {
    return this === receiver && value === "a" && index === 0 && object.length === 1;
  }, receiver) && ![].some(function () { throw new Error("empty callback"); });
try {
  nativeVisit(256);
} catch (error) {
  result.overflow = String(error).indexOf("C stack overflow") >= 0;
}
result.recovered = nativeVisit(32);
__wwcPostMessage(JSON.stringify(result));
