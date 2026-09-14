import { assemble, fromHex, toHex } from "./microwasm.ts";

function same(actual: number, expected: number, input: string) {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${input}: ${actual} [${bits(actual).toString(16)}] != ` +
        `${expected} [${bits(expected).toString(16)}]`,
    );
  }
}

const storage = new DataView(new ArrayBuffer(8));
function bits(value: number): bigint {
  storage.setFloat64(0, value, true);
  return storage.getBigUint64(0, true);
}
function value(raw: bigint): number {
  storage.setBigUint64(0, raw, true);
  return storage.getFloat64(0, true);
}

async function parser() {
  async function load(path: string, imports: WebAssembly.Imports = {}) {
    const built = assemble(
      await Deno.readTextFile(new URL(`numbers/${path}.md`, import.meta.url)),
    );
    if (toHex(assemble(built.resolved).bytes) !== toHex(built.bytes)) {
      throw new Error("Resolved Markdown changed the module");
    }
    return (await WebAssembly.instantiate(fromHex(toHex(built.bytes)), imports))
      .instance.exports;
  }
  const n = await load("02-json-number");
  const b = await load("03-multiword", { n });
  const f = await load("04-json-binary64", { n, b });
  const d = await load("05-exact-decimal", { b });
  const s = await load("06-shortest-decimal", { f, d });
  const memory = new Uint8Array((f.memory as WebAssembly.Memory).buffer);
  const run = f.parse as (start: number, end: number) => number;
  const encoder = new TextEncoder();
  return {
    memory,
    run,
    shortest(value: number) {
      const length = (s.format as (value: number) => number)(value);
      if (length < 1 || length > 25) throw new Error("Invalid output length");
      return new TextDecoder().decode(memory.subarray(65536, 65536 + length));
    },
    format(value: number) {
      const length = (d.format as (value: number) => number)(value);
      if (length < 1 || length > 1077) throw new Error("Invalid output length");
      return new TextDecoder().decode(memory.subarray(65536, 65536 + length));
    },
    parse(text: string, offset = 0) {
      const bytes = encoder.encode(text);
      if (offset + bytes.length > 65536) throw new Error("Test input too long");
      memory.set(bytes, offset);
      return run(offset, offset + bytes.length);
    },
  };
}

// Test-only rational oracle. A finite nonnegative binary64 is coefficient *
// 2^exponent; exact decimal expansion needs only BigInt and powers of five.
// These helpers generate input, never execute inside or assist the Wasm parser.
function parts(raw: bigint): [bigint, number] {
  const exponent = Number(raw >> 52n);
  const fraction = raw & ((1n << 52n) - 1n);
  return exponent
    ? [fraction | (1n << 52n), exponent - 1023 - 52]
    : [fraction, -1074];
}
function decimal(coefficient: bigint, exponent: number): string {
  if (exponent >= 0) return (coefficient << BigInt(exponent)).toString();
  let digits = (coefficient * 5n ** BigInt(-exponent)).toString();
  digits = digits.padStart(1 - exponent, "0");
  return `${digits.slice(0, exponent)}.${digits.slice(exponent)}`;
}
function midpoint(lower: bigint): string {
  const [a, ae] = parts(lower);
  // The successor of maximum finite is the mathematical 2^1024 for this
  // overflow threshold calculation, not the numeric value Infinity.
  const [b, be] = parts(lower + 1n);
  const exponent = Math.min(ae, be);
  return decimal(
    (a << BigInt(ae - exponent)) + (b << BigInt(be - exponent)),
    exponent - 1,
  );
}
function neighbors(text: string, padding: number): [string, string] {
  const [whole, fraction = ""] = text.split(".");
  const places = fraction.length + padding;
  const scaled = BigInt(whole + fraction) * 10n ** BigInt(padding);
  function unscale(n: bigint) {
    const digits = n.toString().padStart(places + 1, "0");
    return digits.slice(0, -places) + "." + digits.slice(-places);
  }
  return [unscale(scaled - 1n), unscale(scaled + 1n)];
}

Deno.test("Binary64 JSON parsing: ordinary values, range boundaries and signed zero", async () => {
  const p = await parser();
  const cases = [
    "0",
    "-0",
    "0.0",
    "-0.000E+99999",
    "0e-99999",
    "1",
    "-1",
    "12.5",
    "0.1",
    "0.10000000000000001",
    "0.1000000000000000055511151231257827021181583404541015625",
    "9007199254740991",
    "9007199254740992",
    "9007199254740993",
    "9007199254740995",
    "18446744073709551615",
    "1000000000000000128",
    "1e308",
    "1e309",
    "-1e309",
    "1e9999999999999999999999999",
    "-1e-9999999999999999999999",
    "1e-323",
    "5e-324",
    "2e-324",
    "3e-324",
    "2.4703282292062327e-324",
    "2.4703282292062328e-324",
    "2.2250738585072011e-308",
    "2.2250738585072012e-308",
    "2.2250738585072013e-308",
    "2.2250738585072014e-308",
    "1.7976931348623157e308",
    "1.7976931348623158e308",
    "1.7976931348623159e308",
    "7.2057594037927933e16",
  ];
  for (const text of cases) {
    same(p.parse(text), JSON.parse(text), text);
    same(p.parse(text, 65536 - text.length), JSON.parse(text), text);
  }
});

Deno.test("Shortest binary64 decimal formatting: notation, carry and native spelling", async () => {
  const p = await parser();
  const cases = [
    0,
    -0,
    0.1,
    -0.1,
    1,
    -1,
    12.5,
    1e-6,
    1e-7,
    1e20,
    1e21,
    1000000000000000128,
    1000000000000000256,
    1000000000000000384,
    1.2345678901234567,
    Number.MIN_VALUE,
    Number.MAX_VALUE,
    Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER + 1,
  ];
  for (const number of cases) {
    const result = p.shortest(number);
    if (result !== String(number)) throw new Error(`${number}: ${result}`);
    same(p.parse(result), number === 0 ? 0 : number, result);
  }
  for (const number of [NaN, Infinity, -Infinity]) {
    let trapped = false;
    try {
      p.shortest(number);
    } catch (error) {
      if (!(error instanceof WebAssembly.RuntimeError)) throw error;
      trapped = true;
    }
    if (!trapped) throw new Error("Expected a nonfinite trap");
    if (p.shortest(-0.125) !== "-0.125") throw new Error("Did not recover");
  }
});

Deno.test("Shortest binary64 decimal formatting: power boundaries and random bit patterns", async () => {
  const p = await parser();
  const cases: bigint[] = [];
  // At binary powers the adjacent rounding intervals are asymmetric.
  for (let exponent = 1n; exponent < 2047n; exponent++) {
    const center = exponent << 52n;
    cases.push(center - 1n, center, center + 1n);
  }
  // Decimal powers exercise carry chains and scientific/ordinary transitions.
  for (let exponent = -323; exponent <= 308; exponent++) {
    const center = bits(Number(`1e${exponent}`));
    cases.push(center - 1n, center, center + 1n);
  }
  for (let raw = 1n; raw < 128n; raw++) cases.push(raw);
  let seed = 0xfacade;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  for (let i = 0; i < 5000; i++) {
    cases.push((BigInt(random()) << 32n) | BigInt(random()));
  }
  for (const raw of cases) {
    const number = value(raw);
    if (!Number.isFinite(number)) continue;
    const result = p.shortest(number);
    if (result !== String(number)) {
      throw new Error(`0x${raw.toString(16)}: ${result} != ${number}`);
    }
    same(p.parse(result), number === 0 ? 0 : number, result);
  }
});

Deno.test("Exact binary64 decimal formatting: rational oracle and Wasm parser round trips", async () => {
  const p = await parser();
  const values = [
    0,
    -0,
    1,
    -1,
    0.1,
    -0.1,
    12.5,
    -12.5,
    1e-6,
    1e-7,
    1e20,
    1e21,
    Number.MIN_VALUE,
    -Number.MIN_VALUE,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    value(0x000fffffffffffffn),
    value(0x0010000000000000n),
    value(0x0010000000000001n),
    Number.MAX_SAFE_INTEGER,
  ];
  let seed = 0x123abc;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  for (let i = 0; i < 1500; i++) {
    const number = value((BigInt(random()) << 32n) | BigInt(random()));
    if (Number.isFinite(number)) values.push(number);
  }
  for (const number of values) {
    const [coefficient, exponent] = parts(bits(Math.abs(number)));
    let expected = decimal(coefficient, exponent);
    if (expected.includes(".")) {
      expected = expected.replace(/0+$/, "").replace(/\.$/, "");
    }
    if (number < 0) expected = "-" + expected;
    const actual = p.format(number);
    if (actual !== expected) {
      throw new Error(`${number}: ${actual} != ${expected}`);
    }
    same(p.parse(actual), number === 0 ? 0 : number, actual);
    same(JSON.parse(actual), number === 0 ? 0 : number, actual);
  }
});

Deno.test("Exact binary64 decimal formatting: scratch boundaries and rejection of nonfinite values", async () => {
  const p = await parser();
  p.memory.fill(0xa5, 0, 65536);
  p.memory.fill(0xa5, 65536 + 1077, 131072);
  p.memory.fill(0xa5, 131072 + 768, 0x31000);
  p.format(-Number.MIN_VALUE);
  p.format(Number.MAX_VALUE);
  for (
    const [start, end] of [[0, 65536], [65536 + 1077, 131072], [
      131072 + 768,
      0x31000,
    ]]
  ) {
    if (!p.memory.subarray(start, end).every((byte) => byte === 0xa5)) {
      throw new Error(`Formatter wrote outside its buffers: ${start}..${end}`);
    }
  }
  for (const number of [NaN, Infinity, -Infinity]) {
    const previous = p.format(12.5);
    let trapped = false;
    try {
      p.format(number);
    } catch (error) {
      if (!(error instanceof WebAssembly.RuntimeError)) throw error;
      trapped = true;
    }
    if (!trapped) throw new Error("Nonfinite values must trap");
    const retained = new TextDecoder().decode(
      p.memory.subarray(65536, 65536 + previous.length),
    );
    if (retained !== previous) {
      throw new Error("A trap overwrote the last output");
    }
    if (p.format(0.5) !== "0.5") {
      throw new Error("Did not recover after a trap");
    }
  }
});

Deno.test("Binary64 JSON parsing: exact halfway values, adjacent decimals and sticky digits", async () => {
  const p = await parser();
  const boundaries = [
    0n,
    1n,
    2n,
    3n,
    0x000ffffffffffffen,
    0x000fffffffffffffn,
    0x0010000000000000n,
    0x0010000000000001n,
    0x3fdfffffffffffffn,
    0x3fefffffffffffffn,
    0x3ff0000000000000n,
    0x3ff0000000000001n,
    0x433fffffffffffffn,
    0x4340000000000000n,
    0x7feffffffffffffen,
    0x7fefffffffffffffn,
  ];
  // Every power-of-two transition, plus an odd significand in its binade.
  for (let exponent = 1n; exponent < 2047n; exponent += 31n) {
    boundaries.push((exponent << 52n) - 1n, (exponent << 52n) + 1n);
  }
  for (const lower of boundaries) {
    const middle = midpoint(lower);
    const rounded = value(lower % 2n ? lower + 1n : lower);
    same(p.parse(middle), rounded, middle);
    same(p.parse("-" + middle), -rounded, "-" + middle);
    for (const padding of [1, 1200]) {
      const [below, above] = neighbors(middle, padding);
      same(p.parse(below), value(lower), below);
      same(p.parse(above), value(lower + 1n), above);
      same(p.parse("-" + below), -value(lower), "-" + below);
      same(p.parse("-" + above), -value(lower + 1n), "-" + above);
    }
  }
});

Deno.test("Binary64 JSON parsing: generated decimals and native shortest round trips", async () => {
  const p = await parser();
  let seed = 0x5eed1234;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  for (let i = 0; i < 2500; i++) {
    const count = i < 2300 ? 1 + random() % 80 : 900 + random() % 1800;
    let digits = String(1 + random() % 9);
    for (let j = 1; j < count; j++) digits += String(random() % 10);
    const split = 1 + random() % count;
    const coefficient = split === count
      ? digits
      : digits.slice(0, split) + "." + digits.slice(split);
    const exponent = (random() % 650) - 325 - split;
    const text = (random() & 1 ? "-" : "") + coefficient + "e" + exponent;
    same(p.parse(text), Number(text), text);
  }
  for (let i = 0; i < 5000; i++) {
    const raw = (BigInt(random()) << 32n) | BigInt(random());
    const original = value(raw);
    if (!Number.isFinite(original)) continue;
    const text = String(original);
    same(p.parse(text), original, text);
  }
});

Deno.test("Binary64 JSON parsing: maximum input, malformed spans and recovery", async () => {
  const p = await parser();
  const text = "1" + "0".repeat(65528) + "e-65528";
  if (text.length !== 65536) throw new Error("Expected exactly 64 KiB");
  same(p.parse(text), 1, "maximum input with cancelling exponent");
  for (
    const text of [
      "0." + "0".repeat(64000) + "1e64001",
      "1." + "0".repeat(64000) + "1",
      "0e" + "9".repeat(65000),
      "-1e-" + "9".repeat(65000),
    ]
  ) same(p.parse(text), Number(text), text.slice(0, 30));
  function trap(fn: () => unknown) {
    try {
      fn();
    } catch (error) {
      if (!(error instanceof WebAssembly.RuntimeError)) throw error;
      same(p.parse("-12.5"), -12.5, "recovery after trap");
      return;
    }
    throw new Error("Expected a Wasm trap");
  }
  for (
    const text of [
      "",
      "-",
      "+1",
      "01",
      "00.1",
      ".5",
      "1.",
      "1e",
      "1e+",
      "1e-",
      "NaN",
      "Infinity",
      "0x10",
      "1_000",
      " 1",
      "1 ",
      "1\u0000",
      "１２",
    ]
  ) trap(() => p.parse(text));
  for (
    const [start, end] of [
      [-1, 1],
      [1, 0],
      [0, 65537],
      [65536, 65536],
      [0x7fffffff, 0xffffffff],
    ]
  ) trap(() => p.run(start, end));
  // Neither the input nor the space reserved for output is scratch storage.
  p.memory.fill(0xa5, 65536, 196608);
  same(p.parse("1.234e-300"), 1.234e-300, "sentinel check");
  if (!p.memory.subarray(65536, 196608).every((byte) => byte === 0xa5)) {
    throw new Error("Parser wrote outside its scratch region");
  }
});
