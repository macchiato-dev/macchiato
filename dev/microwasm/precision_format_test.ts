import { assemble, toHex } from "./microwasm.ts";

function check(ok: unknown, message: string) {
  if (!ok) throw new Error(message);
}
type Method = "fixed" | "exponential" | "precision" | "exponentialShortest";
async function formatter() {
  async function load(name: string, imports: WebAssembly.Imports = {}) {
    const built = assemble(
      await Deno.readTextFile(
        new URL(`numbers/${name}.md`, import.meta.url),
      ),
    );
    check(toHex(assemble(built.resolved).bytes) === toHex(built.bytes), name);
    return (await WebAssembly.instantiate(built.bytes, imports)).instance
      .exports;
  }
  const n = await load("02-json-number");
  const b = await load("03-multiword", { n });
  const f = await load("04-json-binary64", { n, b });
  const d = await load("05-exact-decimal", { b });
  const s = await load("06-shortest-decimal", { f, d });
  const r = await load("09-radix-format", { b, s });
  const p = await load("11-precision-format", { d, r });
  const memory = new Uint8Array((p.memory as WebAssembly.Memory).buffer);
  return {
    memory,
    format(method: Method, value: number, digits = 0) {
      const length = (p[method] as (v: number, k: number) => number)(
        value,
        digits,
      );
      check(length > 0 && length <= 123, `Invalid ${method} length ${length}`);
      return new TextDecoder().decode(memory.subarray(65536, 65536 + length));
    },
  };
}
function expected(method: Method, value: number, digits: number) {
  switch (method) {
    case "fixed":
      return value.toFixed(digits);
    case "exponential":
      return value.toExponential(digits);
    case "precision":
      return value.toPrecision(digits);
    case "exponentialShortest":
      return value.toExponential();
  }
}
function compare(
  p: Awaited<ReturnType<typeof formatter>>,
  method: Method,
  value: number,
  digits = 0,
) {
  const actual = p.format(method, value, digits);
  const native = expected(method, value, digits);
  check(
    actual === native,
    `${method}(${value}, ${digits}): ${actual} != ${native}`,
  );
}

Deno.test("precision formatting: all counts, rounding carries and decimal boundaries", async () => {
  const p = await formatter();
  const fixtures = [
    0,
    -0,
    0.005,
    1.005,
    2.55,
    2.5,
    12.5,
    9.99,
    99.999,
    0.00000123,
    0.000000123,
    1e20,
    1e21,
    1e21 - 131072,
    Number.MIN_VALUE,
    2 ** -1022,
    Number.MAX_VALUE,
    Number.MAX_SAFE_INTEGER,
    1000000000000000128,
    0.1,
  ];
  for (const value of fixtures.flatMap((n) => [n, -n])) {
    for (let digits = 0; digits <= 100; digits++) {
      compare(p, "fixed", value, digits);
      compare(p, "exponential", value, digits);
      if (digits) compare(p, "precision", value, digits);
    }
    compare(p, "exponentialShortest", value);
  }
  // Exact dyadic ties differ from shortest formatting's nearest-even rule.
  for (let numerator = -127; numerator <= 127; numerator++) {
    for (let shift = 1; shift <= 8; shift++) {
      compare(p, "fixed", numerator / 2 ** shift, shift - 1);
    }
  }
});

Deno.test("precision formatting: deterministic binary64 differential corpus", async () => {
  const p = await formatter();
  const bits = new DataView(new ArrayBuffer(8));
  let state = 0x712a035b;
  function random() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  }
  for (let i = 0; i < 4000; i++) {
    bits.setUint32(0, random());
    bits.setUint32(4, random());
    const value = bits.getFloat64(0);
    const digits = random() % 101;
    compare(p, "fixed", value, digits);
    compare(p, "exponential", value, digits);
    compare(p, "precision", value, digits || 1);
    compare(p, "exponentialShortest", value);
  }
  for (let exponent = -323; exponent <= 308; exponent++) {
    const value = Number(`1e${exponent}`);
    bits.setFloat64(0, value);
    const raw = bits.getBigUint64(0);
    for (const delta of [-1n, 0n, 1n]) {
      bits.setBigUint64(0, raw + delta);
      compare(p, "exponentialShortest", bits.getFloat64(0));
    }
  }
});

Deno.test("precision formatting: count errors, nonfinite ordering and trap recovery", async () => {
  const p = await formatter();
  for (const method of ["fixed", "exponential", "precision"] as const) {
    for (const digits of [-2147483648, -1, 101, 2147483647]) {
      for (const value of [0, 1, 1e21, NaN, Infinity, -Infinity]) {
        const shouldTrap = method === "fixed" || Number.isFinite(value);
        let trapped = false;
        try {
          compare(p, method, value, digits);
        } catch (error) {
          if (!(error instanceof WebAssembly.RuntimeError)) throw error;
          trapped = true;
        }
        check(trapped === shouldTrap, `${method}(${value}, ${digits}) trap`);
        compare(p, method, 12.5, 2);
      }
    }
  }
  let trapped = false;
  try {
    p.format("precision", 1, 0);
  } catch (error) {
    if (!(error instanceof WebAssembly.RuntimeError)) throw error;
    trapped = true;
  }
  check(trapped, "Zero significant digits must trap");
  for (const value of [NaN, Infinity, -Infinity]) {
    for (
      const method of [
        "fixed",
        "exponential",
        "precision",
        "exponentialShortest",
      ] as const
    ) {
      compare(p, method, value, 2);
    }
  }
});

Deno.test("precision formatting: scratch boundaries and alternating output layouts", async () => {
  const p = await formatter();
  const spans = [
    [65536 + 1077, 131072],
    [0x30300, 0x30400],
    [0x30404, 0x31000],
    [0x33040, 0x40000],
  ];
  for (const [start, end] of spans) p.memory.fill(0xa5, start, end);
  for (let i = 0; i < 12; i++) {
    compare(p, "fixed", -Number.MIN_VALUE, 100);
    compare(p, "precision", Number.MAX_VALUE, 100);
    compare(p, "exponential", Number.MIN_VALUE, 100);
    compare(p, "exponentialShortest", 1e-7);
    compare(p, "fixed", -0, 0);
    compare(p, "precision", 9.99, 2);
  }
  for (const [start, end] of spans) {
    check(
      p.memory.subarray(start, end).every((v) => v === 0xa5),
      `Overwritten sentinel ${start.toString(16)}..${end.toString(16)}`,
    );
  }
});
