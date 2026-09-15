import { assemble, toHex } from "./microwasm.ts";

function assert(condition: boolean, message = "Assertion failed") {
  if (!condition) throw new Error(message);
}
async function comparator() {
  const built = assemble(
    await Deno.readTextFile(
      new URL("transforms/00-json-string-keys.md", import.meta.url),
    ),
  );
  assert(toHex(assemble(built.resolved).bytes) === toHex(built.bytes));
  const module = await WebAssembly.compile(built.bytes);
  assert(
    JSON.stringify(WebAssembly.Module.imports(module)) === JSON.stringify([
      { module: "n", name: "memory", kind: "memory" },
    ]),
  );
  const memory = new WebAssembly.Memory({ initial: 4, maximum: 4 });
  const instance = await WebAssembly.instantiate(module, { n: { memory } });
  const bytes = new Uint8Array(memory.buffer);
  const run = instance.exports.equal as (...spans: number[]) => number;
  const encoder = new TextEncoder();
  function compare(a: string, b: string) {
    const x = encoder.encode(a), y = encoder.encode(b);
    bytes.set(x, 0);
    bytes.set(y, 131072);
    return run(0, x.length, 131072, 131072 + y.length);
  }
  return { bytes, run, compare };
}
function escaped(text: string) {
  let result = '"';
  for (let i = 0; i < text.length; i++) {
    result += "\\u" + text.charCodeAt(i).toString(16).padStart(4, "0");
  }
  return result + '"';
}
function trap(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) return;
    throw error;
  }
  throw new Error("Expected Wasm trap");
}

Deno.test("JSON keys: decoded code units, not spelling or normalization", async () => {
  const c = await comparator();
  const keys = [
    "",
    "name",
    "a/b",
    '"\\\b\f\n\r\t',
    "\0",
    "😀",
    "猫",
    "é",
    "e\u0301",
    "\ud800",
    "\udfff",
    "😀\ud800",
    "\udc00😀",
  ];
  for (const a of keys) {
    assert(c.compare(JSON.stringify(a), escaped(a)) === 1, JSON.stringify(a));
    assert(c.compare(escaped(a), JSON.stringify(a)) === 1);
    for (const b of keys) {
      assert(c.compare(JSON.stringify(a), escaped(b)) === Number(a === b));
    }
  }
  assert(c.compare('"a/b"', '"a\\/b"') === 1);
  assert(c.compare('"A"', '"a"') === 0);
  assert(c.compare('"\\uD800"', '"\\ud800"') === 1);
  // Decoding stops at a differing prefix; validation belongs to the parser.
  assert(c.compare('"a\\q"', '"b"') === 0);
});

Deno.test("JSON keys: generated UTF-16 strings and scalar boundaries", async () => {
  const c = await comparator();
  let seed = 9321;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  }
  for (let n = 0; n < 2000; n++) {
    let a = "";
    const length = random() % 32;
    for (let i = 0; i < length; i++) a += String.fromCharCode(random() >>> 16);
    assert(c.compare(JSON.stringify(a), escaped(a)) === 1);
    const b = n % 3 ? a + String.fromCharCode(random() >>> 16) : a;
    const left = JSON.stringify(a), right = escaped(b);
    const expected = Number(JSON.parse(left) === JSON.parse(right));
    assert(c.compare(left, right) === expected);
    assert(c.compare(right, left) === expected);
  }
  for (
    const cp of [
      0,
      31,
      32,
      127,
      128,
      2047,
      2048,
      0xd7ff,
      0xe000,
      0xffff,
      0x10000,
      0x103ff,
      0x10400,
      0x10ffff,
    ]
  ) {
    const text = String.fromCodePoint(cp);
    assert(
      c.compare(JSON.stringify(text), escaped(text)) === 1,
      cp.toString(16),
    );
  }
});

Deno.test("JSON keys: encountered invalid escapes and UTF-8 trap, then recover", async () => {
  const c = await comparator();
  for (
    const source of [
      '"\\q"',
      '"\\u12"',
      '"\\u12x4"',
      '"\\"',
      '"\n"',
      '""x"',
      '"\\u/000"',
      '"\\u000:"',
    ]
  ) {
    trap(() => c.compare(source, source));
    assert(c.compare('"ok"', '"\\u006fk"') === 1);
  }
  for (
    const content of [
      [0x80],
      [0xc0, 0x80],
      [0xc1, 0xbf],
      [0xc2],
      [0xc2, 0x20],
      [0xe0, 0x80, 0x80],
      [0xed, 0xa0, 0x80],
      [0xef, 0xbf],
      [0xf0, 0x80, 0x80, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0xf5, 0x80, 0x80, 0x80],
      [0xff],
    ]
  ) {
    c.bytes.set([34, ...content, 34]);
    trap(() => c.run(0, content.length + 2, 0, content.length + 2));
  }
});

Deno.test("JSON keys: full memory spans, no writes, no retained state", async () => {
  const c = await comparator();
  c.bytes.fill(0x5a);
  c.bytes.set([34, 97, 34], c.bytes.length - 3);
  const end = c.bytes.length;
  const before = c.bytes.slice();
  assert(c.run(end - 3, end, end - 3, end) === 1);
  assert(c.bytes.every((byte, i) => byte === before[i]));
  for (
    const [start, stop] of [
      [0, 0],
      [2, 1],
      [-1, 2],
      [0, -1],
      [0, end + 1],
      [end, end + 1],
      [0, 1],
      [0, 2],
    ]
  ) {
    trap(() => c.run(start, stop, end - 3, end));
    assert(c.run(end - 3, end, end - 3, end) === 1);
  }
  const long = '"' + "a".repeat(65530) + '"';
  assert(c.compare(long, long) === 1);
  assert(c.compare(long, long.slice(0, -2) + 'b"') === 0);
  assert(c.compare('"\\u0000"', '""') === 0);
});
