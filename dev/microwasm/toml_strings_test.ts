import { parse } from "npm:smol-toml@1.8.0";
import { assemble, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}
function traps(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
    throw e;
  }
  throw new Error("Expected Wasm trap");
}
const encoder = new TextEncoder(), decoder = new TextDecoder();
async function strings() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["s", "transforms/00-toml-strings"],
    ]
  ) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    imports[name] =
      (await WebAssembly.instantiate(b.bytes, imports)).instance.exports;
  }
  const memory = new Uint8Array(
    (imports.n.memory as WebAssembly.Memory).buffer,
  );
  const read = imports.s.read as (
    start: number,
    end: number,
    out: number,
  ) => number[];
  function convert(source: string, output = 65536) {
    const input = encoder.encode(source);
    memory.set(input);
    const [after, end] = read(0, input.length, output);
    equal(toHex(memory.subarray(0, input.length)), toHex(input));
    return { after, text: decoder.decode(memory.subarray(output, end)) };
  }
  return { memory, read, convert };
}

Deno.test("TOML string spans: basic/literal strings, escapes and exclusive boundaries", async () => {
  const c = await strings();
  for (
    const source of [
      '""',
      "''",
      '"hello"',
      "'C:\\Users\\name'",
      "'a\"b'",
      '"a\\"b\\\\c"',
      '"\\b\\t\\n\\f\\r"',
      '"\\u0000\\u007f"',
      '"\\U0001F600"',
      '"\\u0022\\u005c"',
      '"猫😀"',
      "'a\tb'",
      '"a\tb"',
    ]
  ) {
    const expected = parse("x = " + source).x;
    const result = c.convert(source + ", more");
    equal(result.after, encoder.encode(source).length);
    equal(JSON.parse(result.text), expected);
  }
  equal(c.convert('"\\U0001f600"').text, '"😀"');
  equal(c.convert("'a\\b'").text, '"a\\\\b"');
  equal(c.convert('"\\u0000"').text, '"\\u0000"');
  // This operation reads a single token; the caller rejects adjacent tokens.
  equal(c.convert("'one''two'").after, 5);
});

Deno.test("TOML Unicode escapes: scalar boundaries and 2000 generated code points", async () => {
  const c = await strings();
  let seed = 331;
  const points = [
    0,
    9,
    31,
    127,
    128,
    0x7ff,
    0x800,
    0xd7ff,
    0xe000,
    0xffff,
    0x10000,
    0x10ffff,
  ];
  for (let i = 0; i < 2000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const cp = seed % 0x110000;
    if (cp < 0xd800 || cp > 0xdfff) points.push(cp);
  }
  for (const cp of points) {
    const source = '"\\U' + cp.toString(16).padStart(8, "0") + '"';
    const value = String.fromCodePoint(cp);
    equal(JSON.parse(c.convert(source).text), value);
    equal(parse("x=" + source).x, value);
    if (cp <= 65535) {
      equal(
        JSON.parse(
          c.convert('"\\u' + cp.toString(16).padStart(4, "0") + '"').text,
        ),
        value,
      );
    }
  }
});

Deno.test("TOML string errors: non-scalars, invalid escapes/UTF-8 and recovery", async () => {
  const c = await strings();
  for (
    const source of [
      "",
      "bare",
      '"unfinished',
      "'unfinished",
      '"\\x41"',
      '"\\/"',
      '"\\q"',
      '"\\u0"',
      '"\\uGGGG"',
      '"\\U0000000g"',
      '"\\ud800"',
      '"\\udfff"',
      '"\\ud83d\\ude00"',
      '"\\U00110000"',
      '"\\Uffffffff"',
      '"\\U80100000"',
      '"a\nb"',
      "'a\rb'",
      '"a\u0000b"',
      "'\u007f'",
    ]
  ) {
    traps(() => c.convert(source));
    equal(c.convert('"recovered"').text, '"recovered"');
  }
  for (
    const bytes of [
      [0xc0, 0x80],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0xc2],
      [0xff],
    ]
  ) {
    c.memory.set([34, ...bytes, 34]);
    traps(() => c.read(0, bytes.length + 2, 65536));
  }
});

Deno.test("TOML string memory: exact limits, bounded spans, scratch isolation and reuse", async () => {
  const c = await strings();
  const scratch = c.memory.slice(0x30000);
  equal(c.convert('"abc"', 0x30000 - 5).text, '"abc"');
  traps(() => c.convert('"abc"', 0x30000 - 4));
  const source = "'" + "\\".repeat(65534) + "'";
  equal(c.convert(source).text.length, 131070);
  for (
    const [start, end, output] of [
      [0, 0, 65536],
      [2, 1, 65536],
      [-1, 0, 65536],
      [0, 65537, 65536],
      [0, 1, 65535],
      [0, 1, 0x30001],
    ]
  ) {
    traps(() => c.read(start, end, output));
  }
  c.memory.set([34, 34], 65534);
  equal(c.read(65534, 65536, 65536)[0], 65536);
  for (let i = 0; i < 100; i++) equal(c.convert('"ok"').text, '"ok"');
  equal(toHex(c.memory.subarray(0x30000)), toHex(scratch));
});
