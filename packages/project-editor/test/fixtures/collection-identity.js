// SameValueZero for primitives, identity for objects, across moving GC.
var garbage = new Uint8Array(200000);
var keys = [{}, {}, [], function () {}, Math.max, null, undefined, true, false,
  "", "01", 1, 0, NaN, Infinity, -Infinity, 1.5, "shared string"];
var map = new Map(), set = new Set(), weak = new WeakMap();
function check(value) { if (!value) throw new Error("collection identity mismatch"); }
for (var i = 0; i < keys.length; i++) { map.set(keys[i], i); set.add(keys[i]); }
for (var i = 0; i < 3; i++) weak.set(keys[i], i);
garbage = null;
gc();
for (var i = 0; i < keys.length; i++) {
  check(map.has(keys[i]) && map.get(keys[i]) === i && set.has(keys[i]));
}
for (var i = 0; i < 3; i++) check(weak.get(keys[i]) === i);
check(!map.has({}) && !map.has([]) && !map.has(function () {}));
check(!map.has("1") && !map.has(-1) && !map.has(false + ""));
check(map.get(["shared", "string"].join(" ")) === 17);
map.set(-0, 123); map.set(0 / 0, 456);
check(map.size === keys.length && map.get(0) === 123 && map.get(NaN) === 456);
check(map.delete(keys[0]) && !map.has(keys[0]) && !map.delete(keys[0]));
check(set.delete(keys[1]) && !set.has(keys[1]) && set.has(keys[0]));
map.clear(); set.clear();
check(map.size === 0 && set.size === 0 && !map.has(keys[1]));

// CodeMirror's tile cache uses thousands of object keys. Retain them through
// compaction, then reverse lookup order and delete alternating entries.
var objects = [];
for (var i = 0; i < 2000; i++) { var key = { index: i }; objects.push(key); map.set(key, i); }
var started = performance.now();
for (var pass = 0; pass < 3; pass++) {
  for (var i = objects.length - 1; i >= 0; i--) {
    check(map.has(objects[i]) && map.get(objects[i]) === i);
  }
}
var milliseconds = performance.now() - started;
gc();
for (var i = 0; i < objects.length; i += 2) check(map.delete(objects[i]));
for (var i = 0; i < objects.length; i++) {
  check(map.has(objects[i]) === !!(i % 2));
  check(map.get(objects[i]) === (i % 2 ? i : undefined));
}
__wwcPostMessage(JSON.stringify({ keys: keys.length, compacted: true, lookups: 12000, milliseconds: milliseconds }));
flush();
