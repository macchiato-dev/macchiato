var cases = [
  ["", []],
  ["a\u0000z", [97, 0, 122]],
  ["caf\u00e9", [99, 97, 102, 195, 169]],
  ["\u4e2d", [228, 184, 173]],
  ["\ud83d\ude00", [240, 159, 152, 128]],
  ["\ud800", [239, 191, 189]],
  ["\udc00", [239, 191, 189]],
  ["\ud800x", [239, 191, 189, 120]],
];
var nativeWrite = globalThis.__wwcWriteText;
if (typeof nativeWrite !== "function") throw new Error("native wire text is missing");
function check(condition, message) { if (!condition) throw new Error(message); }
// Compare both runtime paths with known UTF-8 bytes, not a matching decoder
// which could hide the same encoding bug on both sides.
[true, false].forEach(function (native) {
  globalThis.__wwcWriteText = native ? nativeWrite : undefined;
  check((typeof __wwcWriteText === "function") === native, "writer path was not switched");
  cases.forEach(function (entry) {
    var bytes = new Uint8Array(4 + 1 + entry[1].length);
    var writer = new Writer(bytes);
    writer.text(entry[0]);
    check(writer.at === bytes.length, "encoded length");
    check(bytes[4] === entry[1].length, "length prefix");
    entry[1].forEach(function (byte, index) {
      check(bytes[5 + index] === byte, "UTF-8 byte " + index);
    });
  });
  [127, 128, 16383, 16384].forEach(function (length) {
    var text = new Array(length + 1).join("x"), bytes = new Uint8Array(length + 16);
    var writer = new Writer(bytes);
    writer.text(text);
    check(new Reader(bytes, writer.at).text() === text, "multi-byte length prefix");
  });
});
globalThis.__wwcWriteText = nativeWrite;
var denied = 0;
[-1, 0.5, NaN, Infinity, 8].forEach(function (offset) {
  var bytes = new Uint8Array(8);
  try { nativeWrite(bytes, offset, "x"); } catch (error) { denied++; }
  for (var index = 0; index < bytes.length; index++)
    check(bytes[index] === 0, "rejected write changed the buffer");
});
var backing = new Uint8Array(12), view = backing.subarray(3, 9);
check(nativeWrite(view, 1, "test") === 6, "subarray offset");
check(backing[3] === 0 && backing[4] === 4 && backing[8] === 116 && backing[9] === 0,
  "write escaped the subarray");
__wwcPostMessage(JSON.stringify({ cases: cases.length, denied: denied, subarray: true }));
