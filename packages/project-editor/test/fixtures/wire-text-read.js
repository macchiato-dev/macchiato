// Independent UTF-8 cases, not an encoder/decoder pair hiding matching errors.
var cases = [
  [[], ""], [[65, 0, 66], "A\0B"], [[195, 169], "é"],
  [[206, 169, 228, 184, 173], "Ω中"], [[240, 159, 152, 128], "😀"],
  [[239, 187, 191, 65], "\ufeffA"], [[101, 204, 129], "e\u0301"],
  [[65, 240, 159, 152, 128, 66], "A😀B"]
];
for (var index = 0; index < cases.length; index++) {
  var source = new Uint8Array([99].concat(cases[index][0], [99]));
  var view = source.subarray(1, source.length - 1);
  var actual = __wwcReadText(view, 0, view.length), expected = cases[index][1];
  if (actual !== expected || actual.length !== expected.length) throw Error("UTF-8 case failed");
  for (var unit = 0; unit < actual.length; unit++) {
    if (actual.charCodeAt(unit) !== expected.charCodeAt(unit)) throw Error("UTF-16 indexing failed");
  }
  if (__wwcReadText(source, 1, view.length) !== cases[index][1]) throw Error("UTF-8 offset failed");
}
var malformed = [[128], [192, 128], [224, 128, 128], [240, 128, 128, 128],
  [237, 160, 128], [244, 144, 128, 128], [245, 128, 128, 128], [255],
  [195], [226, 130], [240, 159, 152], [195, 65]];
for (index = 0; index < malformed.length; index++) {
  var denied = false, input = new Uint8Array(malformed[index]);
  try { __wwcReadText(input, 0, input.length); }
  catch (badUtf8) { denied = badUtf8 instanceof TypeError; }
  if (!denied) throw Error("Malformed UTF-8 accepted");
}
var ranges = [[-1, 1], [0, -1], [0.5, 1], [0, 0.5], [NaN, 1], [0, Infinity],
  [4, 0], [1, 3], [4294967296, 0]];
for (index = 0; index < ranges.length; index++) {
  var bounded = false;
  try { __wwcReadText(new Uint8Array([65, 66, 67]), ranges[index][0], ranges[index][1]); }
  catch (badRange) { bounded = badRange instanceof RangeError; }
  if (!bounded) throw Error("Invalid UTF-8 range accepted");
}
var wrongTypes = [null, {}, [], "abc", new Int8Array(1)];
for (index = 0; index < wrongTypes.length; index++) {
  var typed = false;
  try { __wwcReadText(wrongTypes[index], 0, 0); }
  catch (badType) { typed = badType instanceof TypeError; }
  if (!typed) throw Error("Non-Uint8Array accepted");
}
var wire = new Uint8Array([0, 0, 0, 0, 7, 4, 240, 159, 152, 128, 99]);
var reader = new Reader(wire, 10), text = readValue(reader);
if (text !== "😀" || reader.at !== 10) throw Error("Wire reader did not consume exactly its string");
wire[6] = 65;
if (text !== "😀") throw Error("String aliases wire memory");
var truncated = false;
try { readValue(new Reader(wire, 9)); }
catch (shortWire) { truncated = shortWire instanceof RangeError; }
if (!truncated) throw Error("Wire length was not enforced");

// Allocate more string data than the 32 MiB arena, retaining only a rotating
// window. Leave a dead buffer before the source so compaction has a hole to
// close; preserving an unchanged pointer by accident is not a useful test.
var ballast = new Uint8Array(1024 * 1024);
if (ballast.length !== 1024 * 1024) throw Error("Compaction ballast failed");
var bytes = new Uint8Array(32768), retained = [];
ballast = null;
for (index = 0; index < bytes.length; index++) bytes[index] = 97;
var started = performance.now();
for (var round = 0; round < 2048; round++) {
  bytes[0] = 65 + round % 26;
  var decoded = __wwcReadText(bytes, 0, bytes.length);
  if (decoded.length !== bytes.length || decoded.charCodeAt(0) !== bytes[0] ||
      decoded.charCodeAt(32767) !== 97) throw Error("Compaction corrupted decoded text");
  retained[round % 16] = decoded;
}
gc();
for (index = 0; index < retained.length; index++) {
  if (retained[index].length !== 32768 || retained[index].charCodeAt(32767) !== 97)
    throw Error("Retained decoded string was collected");
}
__wwcPostMessage(JSON.stringify({ cases: cases.length, malformed: malformed.length,
  bounded: ranges.length, types: wrongTypes.length, compacted: true,
  readMilliseconds: performance.now() - started }));
flush();
