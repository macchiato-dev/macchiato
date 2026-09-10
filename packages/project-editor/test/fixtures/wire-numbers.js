var values = [0, -0, 1.5, -0.25, 0.1, Number.MIN_VALUE, Number.MAX_VALUE];
var buffer = new Uint8Array(128), writer = new Writer(buffer);
values.forEach(function (value) { writeValue(writer, value); });
var reader = new Reader(buffer, writer.at);
var equal = values.every(function (value) {
  var received = readValue(reader);
  return value === received && (value !== 0 || 1 / value === 1 / received);
});
var denied = [NaN, Infinity, -Infinity].filter(function (value) {
  try { writeValue(new Writer(buffer), value); } catch (error) { return true; }
  return false;
}).length;
__wwcPostMessage(JSON.stringify({ equal: equal, denied: denied }));
