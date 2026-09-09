var map = new Map([["one", 1], ["two", 2], ["three", 3]]);
var set = new Set(["a", "b"]);
var receiver = { factor: 10 };
var entries = [], values = [], copy = new Map();
map.forEach(function (value, key, collection) {
  gc();
  entries.push([value * this.factor, key, collection === map]);
  copy.set(key, value);
}, receiver);
set.forEach(function (value, key, collection) {
  gc();
  values.push([value, key, collection === set, this === receiver]);
}, receiver);
__wwcPostMessage(JSON.stringify({ entries: entries, values: values,
  copied: copy.get("two"), count: copy.size }));
flush();
