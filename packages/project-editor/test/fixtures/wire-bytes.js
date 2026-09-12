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
var copyMilliseconds = performance.now() - start;

// Encoding is checked against explicit bytes, including offset views. A copy
// must neither include the backing buffer's padding nor retain its source.
var backing = new Uint8Array([99, 1, 127, 255, 99]);
var destination = new Uint8Array(12), encoded = new Writer(destination.subarray(2, 11));
writeValue(encoded, backing.subarray(1, 4));
if (encoded.at !== 9 || destination[6] !== 6 || destination[7] !== 3 ||
    destination[8] !== 1 || destination[9] !== 127 || destination[10] !== 255 ||
    destination[11] !== 0) throw Error("Wrong encoded binary payload");
backing[1] = 88;
if (destination[8] !== 1) throw Error("Encoded bytes retain their input");
var writeBounded = 0;
for (var capacity = 4; capacity < 9; capacity++) {
  var shortWriter = new Writer(new Uint8Array(capacity)), denied = false;
  try { writeValue(shortWriter, new Uint8Array([1, 127, 255])); }
  catch (writeError) { denied = writeError instanceof RangeError; }
  if (!denied || shortWriter.at > capacity) throw Error("Binary write was not bounded");
  writeBounded++;
}
var emptyWriter = new Writer(new Uint8Array(6));
writeValue(emptyWriter, new Uint8Array(0));
if (emptyWriter.at !== 6 || emptyWriter.bytes[4] !== 6 || emptyWriter.bytes[5] !== 0)
  throw Error("Empty binary write failed");
var payload = large.subarray(8), output = new Uint8Array(large.length), writeCalls = 0;
var countedWriter = new Writer(output);
countedWriter.byte = function (value) { writeCalls++; Writer.prototype.byte.call(this, value); };
writeValue(countedWriter, payload);
for (var byte = 4; byte < output.length; byte++) {
  if (output[byte] !== large[byte]) throw Error("Large binary write failed");
}
start = performance.now();
for (repeat = 0; repeat < 32; repeat++) writeValue(new Writer(output), payload);
__wwcPostMessage(JSON.stringify({ bounded: bounded, isolated: true, byteCalls: byteCalls,
  copyMilliseconds: copyMilliseconds, writeMilliseconds: performance.now() - start,
  writeBounded: writeBounded, writeCalls: writeCalls }));
flush();
