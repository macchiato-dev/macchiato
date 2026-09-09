// This literal must remain a value, not a named property in the bytecode's
// pre-interned atom table. Its first property-key use happens at runtime.
var keys = ["rom-key-not-an-identifier", "second-dynamic-roman-key", "third-dynamic-roman-key",
  "fourth-dynamic-roman-key", "fifth-dynamic-roman-key"];
var dictionary = {};
var before = true, after = true, same = true;
for (var i = 0; i < keys.length; i++) {
  var key = keys[i];
  dictionary[key] = i;
  before = before && dictionary[JSON.parse(JSON.stringify(key))] === i;
  // Grow the table between collections, including its unused capacity. Keys
  // first interned into ROM and keys parsed into the heap must keep matching.
  gc();
  for (var j = 0; j <= i; j++) {
    after = after && dictionary[JSON.parse(JSON.stringify(keys[j]))] === j;
  }
  same = same && Object.keys(dictionary).length === i + 1;
}
__wwcPostMessage(JSON.stringify({ before: before, after: after, same: same }));
flush();
