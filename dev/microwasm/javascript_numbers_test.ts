import { assemble, toHex } from "./microwasm.ts";

function same(actual: number, expected: number, label: string) {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: ${actual} != ${expected}`);
  }
}
async function numbers() {
  async function load(name: string, imports: WebAssembly.Imports = {}) {
    const built = assemble(
      await Deno.readTextFile(
        new URL(`numbers/${name}.md`, import.meta.url),
      ),
    );
    if (toHex(assemble(built.resolved).bytes) !== toHex(built.bytes)) {
      throw new Error("Resolved Markdown differs");
    }
    return (await WebAssembly.instantiate(built.bytes, imports)).instance
      .exports;
  }
  const n = await load("02-json-number");
  const b = await load("03-multiword", { n });
  const f = await load("04-json-binary64", { n, b });
  const p = await load("07-parse-integer", { f, b });
  const d = await load("08-parse-float", { f, p, n });
  const memory = new Uint8Array((p.memory as WebAssembly.Memory).buffer);
  const encoder = new TextEncoder();
  function put(text: string, offset = 0) {
    const bytes = encoder.encode(text);
    if (offset + bytes.length > 65536) throw new Error("Test input too large");
    memory.set(bytes, offset);
    return offset + bytes.length;
  }
  const parse = p.parse as (
    start: number,
    end: number,
    radix: number,
  ) => number;
  const skip = p.skip as (start: number, end: number) => number;
  const parseFloat = d.parse as (start: number, end: number) => number;
  return {
    memory,
    put,
    parse,
    skip,
    integer(text: string, radix = 0, offset = 0) {
      return parse(offset, put(text, offset), radix);
    },
    float(text: string, offset = 0) {
      return parseFloat(offset, put(text, offset));
    },
    parseFloat,
  };
}

Deno.test("JavaScript parseInt: signs, prefixes, stopping and all digit bytes", async () => {
  const p = await numbers();
  for (
    const text of [
      "",
      " ",
      "+",
      "-",
      "0",
      "-0",
      "+0",
      "123",
      "12.5",
      "1e3",
      "1_000",
      "-0x10",
      "+0Xff",
      "0x",
      "0Xz",
      "00x12",
      "0b11",
      "0o10",
      "077",
      "Infinity",
      "NaN",
      "zebra",
      "123 cat",
      "1\0more",
      "1猫",
      "\t\n-42.3",
    ]
  ) {
    for (const radix of [0, 2, 3, 8, 10, 16, 32, 34, 36, -1, 1, 37]) {
      same(p.integer(text, radix), parseInt(text, radix), `${text}, ${radix}`);
    }
  }
  for (let radix = 2; radix <= 36; radix++) {
    for (let byte = 0; byte < 256; byte++) {
      p.memory[0] = 49;
      p.memory[1] = byte;
      same(
        p.parse(0, 2, radix),
        parseInt("1" + String.fromCharCode(byte), radix),
        `${byte}, ${radix}`,
      );
    }
  }
  // The numeric ABI takes the result of ToInt32, not a generic JS value.
  same(p.integer("ff", 16 + 2 ** 32), 255, "i32 radix wrapping");
});

Deno.test("JavaScript parseFloat: decimal prefixes, signs, Infinity and incomplete exponents", async () => {
  const p = await numbers();
  for (
    const text of [
      "",
      " ",
      "+",
      "-",
      ".",
      "+.",
      "-.",
      "-.0",
      "+.5",
      "00012.500",
      "1.",
      "1.e2",
      "1e",
      "1e+",
      "1e-",
      "1e-+2",
      "1.e+oops",
      "-01e+2tail",
      "0x10",
      "0b11",
      "0o10",
      "1_000",
      "1.2.3",
      "1.2e3e4",
      "\ufeff\u2000-.5e-2",
      "Infinity",
      "-Infinity",
      "+Infinity!",
      "infinity",
      "INFINITY",
      "Infinit",
      "NaN",
      "1\0tail",
      "１２",
      "5e-324",
      "2.2250738585072014e-308",
      "1.7976931348623159e308",
      "-0e99999",
      "-.000e-99999",
      "1e9999999999999",
    ]
  ) {
    same(p.float(text), parseFloat(text), text);
    const length = new TextEncoder().encode(text).length;
    same(
      p.float(text, 65536 - length),
      parseFloat(text),
      "at boundary: " + text,
    );
  }
  const inf = new TextEncoder().encode("Infinity");
  for (let length = 0; length < inf.length; length++) {
    const start = 65536 - length;
    p.memory.set(inf.subarray(0, length), start);
    same(p.parseFloat(start, 65536), NaN, "partial Infinity");
  }
});

Deno.test("JavaScript parseFloat: generated syntax and complete numeric prefixes", async () => {
  const p = await numbers();
  let seed = 0x98765432;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const alphabet = "0123456789.eE+-x_ Infinity\t\n";
  for (let i = 0; i < 10000; i++) {
    let text = "";
    const length = random() % 40;
    for (let j = 0; j < length; j++) {
      text += alphabet[random() % alphabet.length];
    }
    same(p.float(text), parseFloat(text), text);
  }
  for (let i = 0; i < 2500; i++) {
    const text = (random() & 1 ? "\u3000-" : "+") +
      "0".repeat(random() % 5) + String(random()) + "." + String(random()) +
      "e" + ((random() % 800) - 400) + "suffix";
    same(p.float(text), parseFloat(text), text);
  }
});

Deno.test("JavaScript parseFloat: full-size tokens without normalization copies and recovery", async () => {
  const p = await numbers();
  for (
    const text of [
      ".1" + "0".repeat(65534),
      "-.5" + "0".repeat(65533),
      "1" + "0".repeat(65534) + ".",
      "0".repeat(65536),
      "0." + "0".repeat(64000) + "1e64001",
    ]
  ) same(p.float(text), parseFloat(text), text.slice(0, 20));
  for (const [start, end] of [[-1, 0], [2, 1], [0, 65537]]) {
    let trapped = false;
    try {
      p.parseFloat(start, end);
    } catch (error) {
      if (!(error instanceof WebAssembly.RuntimeError)) throw error;
      trapped = true;
    }
    if (!trapped) throw new Error("Expected span trap");
    same(p.float("-0.125"), -0.125, "recovery after invalid span");
  }
  p.memory.fill(0xa5, 65536, 196608);
  const text = "+00.12345e-300junk";
  const end = p.put(text);
  p.parseFloat(0, end);
  if (
    new TextDecoder().decode(p.memory.subarray(0, end)) !== text ||
    !p.memory.subarray(65536, 196608).every((byte) => byte === 0xa5)
  ) {
    throw new Error("parseFloat modified input or output space");
  }
});

Deno.test("JavaScript numeric whitespace: Unicode classification and bounded UTF-8 reads", async () => {
  const p = await numbers();
  for (let cp = 0; cp < 65536; cp++) {
    const char = String.fromCharCode(cp);
    const end = p.put(char + "1");
    const expected = /^\s$/u.test(char) ? end - 1 : 0;
    same(p.skip(0, end), expected, `U+${cp.toString(16)}`);
  }
  const spaces =
    "\t\n\v\f\r \u00a0\u1680\u2000\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";
  same(p.integer(spaces + "-0xabc"), -2748, "combined whitespace");
  for (const char of ["\u00a0", "\u1680", "\u2000", "\ufeff"]) {
    const bytes = new TextEncoder().encode(char);
    for (let length = 1; length < bytes.length; length++) {
      const start = 65536 - length;
      p.memory.set(bytes.subarray(0, length), start);
      same(p.skip(start, 65536), start, "truncated whitespace at boundary");
      same(
        p.parse(start, 65536, 10),
        NaN,
        "truncated whitespace is not a digit",
      );
    }
  }
  for (
    const bytes of [[0xe0, 0x80, 0xa0], [0xe2, 0x00, 0x80], [0xf0, 0x80, 0x80]]
  ) {
    p.memory.set(bytes);
    same(
      p.skip(0, bytes.length),
      0,
      "invalid UTF-8 must not become whitespace",
    );
  }
});

Deno.test("JavaScript parseInt: exact large-radix rounding, overflow and span recovery", async () => {
  const p = await numbers();
  const values = [
    0n,
    1n,
    (1n << 53n) - 1n,
    (1n << 53n) + 1n,
    (1n << 53n) + 3n,
    (1n << 64n) - 1n,
    (1n << 1024n) - (1n << 970n) - 1n,
    (1n << 1024n) - (1n << 970n),
    1n << 1024n,
    1n << 4096n,
  ];
  let seed = 0x123cafe;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  for (let i = 0; i < 100; i++) {
    let integer = 0n;
    for (let word = 0; word <= i % 33; word++) {
      integer = (integer << 32n) | BigInt(random());
    }
    values.push(integer);
  }
  for (let radix = 2; radix <= 36; radix++) {
    for (const value of values) {
      const text = value.toString(radix);
      same(p.integer(text, radix), Number(value), `${radix}: ${text}`);
      same(p.integer("-" + text, radix), -Number(value), `${radix}: -${text}`);
    }
  }
  same(p.integer("9".repeat(65536)), Infinity, "maximum input overflow");
  same(
    p.integer("0".repeat(65535) + "1"),
    1,
    "maximum input with leading zeros",
  );
  same(p.integer("-0", 0, 65534), -0, "end-of-memory negative zero");
  for (const [start, end] of [[-1, 1], [1, 0], [0, 65537]]) {
    let trapped = false;
    try {
      p.parse(start, end, 10);
    } catch (error) {
      if (!(error instanceof WebAssembly.RuntimeError)) throw error;
      trapped = true;
    }
    if (!trapped) throw new Error("Expected span trap");
    same(p.integer("42"), 42, "recovery");
  }
  const text = "abc123xyz";
  const end = p.put(text);
  p.memory.fill(0xa5, 65536, 196608);
  p.parse(0, end, 36);
  if (
    new TextDecoder().decode(p.memory.subarray(0, end)) !== text ||
    !p.memory.subarray(65536, 196608).every((byte) => byte === 0xa5)
  ) {
    throw new Error("Parser modified input or output space");
  }
});
