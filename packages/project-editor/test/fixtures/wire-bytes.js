// Independent wire bytes, not a matching encoder/decoder round trip.
var buffer = new Uint8Array([99, 99, 99, 99, 6, 3, 1, 127, 255, 99]);
var reader = new Reader(buffer, 9), decoded = readValue(reader);
if (reader.at !== 9 || decoded.length !== 3 || decoded[0] !== 1 ||
    decoded[1] !== 127 || decoded[2] !== 255) throw Error("Wrong binary payload");
buffer[6] = 42;
decoded[1] = 42;
if (decoded[0] !== 1 || buffer[7] !== 127) throw Error("Decoded bytes alias the reusable wire buffer");

var bounded = 0;
for (var end = 4; end < 9; end++) {
  var truncated = new Reader(buffer, end), failed = false;
  try { readValue(truncated); } catch (error) { failed = error instanceof RangeError; }
  if (!failed || truncated.at !== end) throw Error("Truncated binary read was not bounded");
  bounded++;
}
var empty = new Reader(new Uint8Array([0, 0, 0, 0, 6, 0]), 6);
if (readValue(empty).length !== 0 || empty.at !== 6) throw Error("Empty binary payload failed");
// A view may start in the middle of its backing buffer.
var padded = new Uint8Array([0, 0, 0, 0, 0, 0, 6, 1, 255, 0]);
var offset = new Reader(padded.subarray(2, 9), 7);
if (readValue(offset)[0] !== 255 || offset.at !== 7) throw Error("Offset binary payload failed");

var large = new Uint8Array(8 + 65536);
large[4] = 6; large[5] = 128; large[6] = 128; large[7] = 4;
for (var index = 8; index < large.length; index++) large[index] = index % 251;
var counted = new Reader(large, large.length), byteCalls = 0;
counted.byte = function () { byteCalls++; return Reader.prototype.byte.call(this); };
var result = readValue(counted);
if (result[1234] !== large[1242] || result[65535] !== large[65543]) throw Error("Large binary payload failed");
var start = performance.now();
for (var repeat = 0; repeat < 32; repeat++) readValue(new Reader(large, large.length));
__wwcPostMessage(JSON.stringify({ bounded: bounded, isolated: true, byteCalls: byteCalls,
  copyMilliseconds: performance.now() - start }));
flush();
