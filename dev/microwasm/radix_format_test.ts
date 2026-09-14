import { assemble, toHex } from "./microwasm.ts";

function check(ok: unknown, message: string) {
  if (!ok) throw new Error(message);
}
async function formatter() {
  async function load(name: string, imports: WebAssembly.Imports = {}) {
    const built = assemble(
      await Deno.readTextFile(
        new URL(`numbers/${name}.md`, import.meta.url),
      ),
    );
    check(
      toHex(assemble(built.resolved).bytes) === toHex(built.bytes),
      "Resolved bytes differ",
    );
    return (await WebAssembly.instantiate(built.bytes, imports)).instance
      .exports;
  }
  const n = await load("02-json-number");
  const b = await load("03-multiword", { n });
  const f = await load("04-json-binary64", { n, b });
  const d = await load("05-exact-decimal", { b });
  const s = await load("06-shortest-decimal", { f, d });
  const r = await load("09-radix-format", { b, s });
  const memory = new Uint8Array((r.memory as WebAssembly.Memory).buffer);
  const run = r.format as (value: number, radix: number) => number;
  return {
    memory,
    run,
    format(value: number, radix: number) {
      const length = run(value, radix);
      check(length > 0 && length <= 1077, "Invalid output length");
      return new TextDecoder().decode(memory.subarray(65536, 65536 + length));
    },
  };
}

type Rational = { n: bigint; d: bigint };
const rawBuffer = new DataView(new ArrayBuffer(8));
function bits(value: number) {
  rawBuffer.setFloat64(0, value, true);
  return rawBuffer.getBigUint64(0, true);
}
function number(raw: bigint) {
  rawBuffer.setBigUint64(0, raw, true);
  return rawBuffer.getFloat64(0, true);
}
function rational(raw: bigint): Rational {
  const biased = Number(raw >> 52n);
  const significand = (raw & ((1n << 52n) - 1n)) |
    (biased ? 1n << 52n : 0n);
  const exponent = biased ? biased - 1075 : -1074;
  return exponent >= 0
    ? { n: significand << BigInt(exponent), d: 1n }
    : { n: significand, d: 1n << BigInt(-exponent) };
}
function midpoint(a: Rational, b: Rational): Rational {
  return { n: a.n * b.d + b.n * a.d, d: 2n * a.d * b.d };
}
function compare(a: Rational, b: Rational) {
  const difference = a.n * b.d - b.n * a.d;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
function scaled(coefficient: bigint, exponent: number, base: number): Rational {
  return exponent >= 0
    ? { n: coefficient * BigInt(base) ** BigInt(exponent), d: 1n }
    : { n: coefficient, d: BigInt(base) ** BigInt(-exponent) };
}

// Independent oracle: parse the emitted text to a rational, compare it with
// adjacent binary64 midpoints, and search coarser decimal/radix grids. This
// does not run the formatter's digit loop or use its scratch values.
function verify(value: number, base: number, text: string) {
  const label = `${value}, base ${base}: ${text}`;
  if (base === 10 || !Number.isFinite(value) || value === 0) {
    check(text === value.toString(base), label);
    return;
  }
  check(text.startsWith("-") === (value < 0), `Wrong sign: ${label}`);
  const unsigned = value < 0 ? text.slice(1) : text;
  check(
    /^(?:0\.[0-9a-z]+|[1-9a-z][0-9a-z]*(?:\.[0-9a-z]+)?)$/.test(unsigned),
    label,
  );
  check(
    !unsigned.includes(".") || !unsigned.endsWith("0"),
    `Trailing fractional zero: ${label}`,
  );
  const [whole, fraction = ""] = unsigned.split(".");
  const digits = (whole + fraction).replace(/^0+/, "").replace(/0+$/, "");
  let coefficient = 0n;
  for (const char of digits) {
    const digit = "0123456789abcdefghijklmnopqrstuvwxyz".indexOf(char);
    check(digit >= 0 && digit < base, `Invalid digit: ${label}`);
    coefficient = coefficient * BigInt(base) + BigInt(digit);
  }
  const order = whole !== "0" ? whole.length - 1 : -fraction.search(/[^0]/) - 1;
  const exponent = order + 1 - digits.length;
  const result = scaled(coefficient, exponent, base);
  const raw = bits(Math.abs(value));
  const exact = rational(raw);
  const lower = midpoint(rational(raw - 1n), exact);
  // At maximum finite, rational(0x7ff0000000000000) represents 2^1024,
  // the mathematical successor used to find the overflow midpoint.
  const upper = midpoint(exact, rational(raw + 1n));
  const even = !(raw & 1n);
  function inside(candidate: Rational) {
    const lo = compare(candidate, lower);
    const hi = compare(candidate, upper);
    return (lo > 0 || lo === 0 && even) && (hi < 0 || hi === 0 && even);
  }
  check(inside(result), `Outside rounding interval: ${label}`);
  for (let precision = 1; precision <= digits.length; precision++) {
    const unit = scaled(1n, order + 1 - precision, base);
    const numerator = exact.n * unit.d;
    const denominator = exact.d * unit.n;
    const floor = numerator / denominator;
    const a = { n: floor * unit.n, d: unit.d };
    const b = { n: (floor + 1n) * unit.n, d: unit.d };
    const aValid = inside(a), bValid = inside(b);
    if (precision < digits.length) {
      check(
        !aValid && !bValid,
        `Not shortest at ${precision} digits: ${label}`,
      );
    } else {
      const remainder = numerator % denominator;
      const up = remainder * 2n > denominator ||
        remainder * 2n === denominator && !!(floor & 1n);
      const expected = aValid && bValid ? (up ? b : a) : aValid ? a : b;
      check(compare(result, expected) === 0, `Not closest/even: ${label}`);
    }
  }
}

Deno.test("Binary64 radix formatting: exact rounding intervals, shortest grids and random values", async () => {
  const f = await formatter();
  const values = [
    0,
    -0,
    NaN,
    Infinity,
    -Infinity,
    1,
    -1,
    0.1,
    -0.1,
    12.5,
    -255,
    Number.MIN_VALUE,
    -Number.MIN_VALUE,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    Number.MAX_SAFE_INTEGER,
    2 ** 53,
    2 ** 54,
    1e-6,
    1e-7,
    1e20,
    1e21,
    number(0x000fffffffffffffn),
    number(0x0010000000000000n),
  ];
  let seed = 0x87654321;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  for (let i = 0; i < 200; i++) {
    values.push(number((BigInt(random()) << 32n) | BigInt(random())));
  }
  for (const value of values) {
    for (let base = 2; base <= 36; base++) {
      verify(value, base, f.format(value, base));
    }
  }
});

Deno.test("Binary64 radix formatting: asymmetric boundaries, carries and power-of-two native output", async () => {
  const f = await formatter();
  for (let exponent = 1n; exponent < 2047n; exponent += 31n) {
    for (
      const raw of [
        (exponent << 52n) - 1n,
        exponent << 52n,
        (exponent << 52n) + 1n,
      ]
    ) {
      const value = number(raw);
      for (const base of [2, 3, 4, 8, 16, 32, 35, 36]) {
        const text = f.format(value, base);
        verify(value, base, text);
        if ([2, 4, 8, 16, 32].includes(base)) {
          check(
            text === value.toString(base),
            `Power-of-two native mismatch: ${value}, ${base}`,
          );
        }
      }
    }
  }
  for (let base = 2; base <= 36; base++) {
    for (let power = -8; power <= 12; power++) {
      const center = bits(base ** power);
      for (const raw of [center - 1n, center, center + 1n]) {
        const value = number(raw);
        verify(value, base, f.format(value, base));
      }
    }
  }
});

Deno.test("Binary64 radix formatting: output bounds, literals, invalid bases and recovery", async () => {
  const f = await formatter();
  f.memory.fill(0xa5, 65536 + 1077, 131072);
  f.memory.fill(0xa5, 131072 + 64, 196608);
  for (let base = 2; base <= 36; base++) {
    if (base === 10) continue; // Its exact-decimal dependency has other scratch.
    for (
      const value of [Number.MAX_VALUE, -Number.MIN_VALUE, 0.1, NaN, Infinity]
    ) f.format(value, base);
  }
  check(
    f.memory.subarray(65536 + 1077, 131072).every((b) => b === 0xa5),
    "Output overflow",
  );
  check(
    f.memory.subarray(131072 + 64, 196608).every((b) => b === 0xa5),
    "Digit scratch overflow",
  );
  for (const base of [-1, 0, 1, 37, 0x7fffffff]) {
    for (const value of [0.1, NaN, Infinity]) {
      let trapped = false;
      try {
        f.run(value, base);
      } catch (error) {
        if (!(error instanceof WebAssembly.RuntimeError)) throw error;
        trapped = true;
      }
      check(trapped, "Invalid radix did not trap");
      check(f.format(12.5, 16) === "c.8", "Did not recover");
    }
  }
  // Formatting in radix ten must not damage other radix constants or vice versa.
  for (const base of [2, 10, 36, 10, 3]) {
    check(f.format(NaN, base) === "NaN", "NaN literal damaged");
    check(
      f.format(-Infinity, base) === "-Infinity",
      "Infinity literal damaged",
    );
    verify(0.1, base, f.format(0.1, base));
  }
});
