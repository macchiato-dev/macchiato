// Golden LEB128 bytes: a matching reader/writer bug must not pass a round trip.
var cases = [
  [0, [0]], [1, [1]], [127, [127]], [128, [128, 1]],
  [16383, [255, 127]], [16384, [128, 128, 1]],
  [4294967295, [255, 255, 255, 255, 15]],
  [9007199254740991, [255, 255, 255, 255, 255, 255, 255, 15]]
];
var bounded = 0;
cases.forEach(function (entry) {
  var value = entry[0], expected = entry[1];
  var bytes = new Uint8Array(4 + expected.length), writer = new Writer(bytes);
  writer.uint(value);
  if (writer.at !== bytes.length) throw Error("Wrong encoded length");
  expected.forEach(function (byte, index) {
    if (bytes[index + 4] !== byte) throw Error("Wrong encoded byte");
  });
  var reader = new Reader(bytes, bytes.length);
  if (reader.uint() !== value || reader.at !== bytes.length) throw Error("Wrong decoded value");
  for (var length = 0; length < expected.length; length++) {
    var truncated = new Reader(bytes, 4 + length), failed = false;
    try { truncated.uint(); } catch (error) { failed = error instanceof RangeError; }
    if (!failed || truncated.at !== 4 + length) throw Error("Truncated read was not bounded");
    var short = new Uint8Array(4 + length), limited = new Writer(short);
    failed = false;
    try { limited.uint(value); } catch (error) { failed = error instanceof RangeError; }
    if (!failed || limited.at !== short.length) throw Error("Short write was not bounded");
    for (var index = 0; index < length; index++) {
      if (short[index + 4] !== expected[index]) throw Error("Wrong partial write");
    }
    bounded++;
  }
});
__wwcPostMessage(JSON.stringify({ cases: cases.length, bounded: bounded }));
