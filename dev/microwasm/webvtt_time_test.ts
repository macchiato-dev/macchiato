import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder();
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(JSON.stringify(a) + " != " + JSON.stringify(b));
  }
}
function traps(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
    throw e;
  }
  throw Error("Expected Wasm trap");
}
async function clock() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["c", "transforms/00-calendar-lines"],
      ["r", "transforms/38-srt-to-cues"],
      ["v", "transforms/00-webvtt-time"],
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
    (imports.v.memory as WebAssembly.Memory).buffer,
  );
  memory.fill(0xa5);
  return {
    memory,
    timestamp: imports.v.timestamp as (a: number, b: number) => number,
    compare: imports.v.compare as (
      a: number,
      b: number,
      c: number,
      d: number,
    ) => number,
    put(s: string, offset = 0) {
      const bytes = encoder.encode(s);
      memory.set(bytes, offset);
      return offset + bytes.length;
    },
  };
}
// Independent grammar and arbitrary-precision arithmetic are test-only.
const grammar = /^(?:([0-9]{2,}):)?([0-5][0-9]):([0-5][0-9])\.([0-9]{3})/;
function millis(s: string) {
  const m = grammar.exec(s);
  if (!m || m[0] !== s) throw Error("Invalid oracle timestamp: " + s);
  return BigInt(m[1] ?? "0") * 3600000n + BigInt(m[2]) * 60000n +
    BigInt(m[3]) * 1000n + BigInt(m[4]);
}

Deno.test("WebVTT time: both forms, exact ends, every minute/second and millisecond", async () => {
  const c = await clock();
  for (
    const t of [
      "03:07.250",
      "12:03:07.250",
      "0000:03:07.250",
      "12345678901234567890:03:07.250",
    ]
  ) {
    const end = c.put(t + " align:end");
    equal(c.timestamp(0, end), t.length);
  }
  for (let minute = 0; minute < 60; minute++) {
    for (let second = 0; second < 60; second++) {
      const tail = String(minute).padStart(2, "0") + ":" +
        String(second).padStart(2, "0") + ".123";
      for (const t of [tail, "00100:" + tail]) {
        const end = c.put(t);
        equal(c.timestamp(0, end), end);
      }
    }
  }
  for (let n = 0; n < 1000; n++) {
    const t = "59:59." + String(n).padStart(3, "0"), end = c.put(t);
    equal(c.timestamp(0, end), end);
  }
});

Deno.test("WebVTT time: mixed forms and very large hours agree with integer arithmetic", async () => {
  const c = await clock();
  const cases = [
    ["59:59.999", "01:00:00.000"],
    ["03:07.250", "00:03:07.250"],
    ["0000:03:07.250", "03:07.250"],
    ["00:00.000", "00:00.001"],
    ["00:59.999", "01:00.000"],
    ["9".repeat(300) + ":59:59.999", "1" + "0".repeat(300) + ":00:00.000"],
  ];
  for (let n = 0; n < 2000; n++) {
    const h = (BigInt(n) ** 11n).toString().padStart(2 + n % 6, "0");
    const tail = `${String(n % 60).padStart(2, "0")}:59.${
      String(n % 1000).padStart(3, "0")
    }`;
    cases.push([
      n % 3 ? h + ":" + tail : tail,
      String((n * 79) % 103).padStart(2, "0") + ":" + tail,
    ]);
  }
  for (const [a, b] of cases) {
    const ae = c.put(a), be = c.put(b, 1000);
    equal(c.timestamp(0, ae), ae);
    equal(c.timestamp(1000, be), be);
    const av = millis(a),
      bv = millis(b),
      order = av < bv ? -1 : av > bv ? 1 : 0;
    equal(c.compare(0, ae, 1000, be), order);
    equal(c.compare(1000, be, 0, ae), -order || 0);
    equal(c.compare(0, ae, 0, ae), 0);
  }
});

Deno.test("WebVTT time: malformed and edited prefixes agree with the grammar", async () => {
  const c = await clock();
  const corpus = [
    "",
    "0:00.000",
    "00:0.000",
    "0:00:00.000",
    "00:00:00,000",
    "60:00.000",
    "00:60.000",
    "00:00.00",
    ":00:00.000",
  ];
  for (const good of ["00:00.000", "02:15:35.999", "00100:59:59.000"]) {
    for (let i = 0; i <= good.length; i++) {
      for (
        const ch of ["", "0", "5", "6", "9", ":", ".", ",", "-", " ", "a", "雪"]
      ) {
        corpus.push(good.slice(0, i) + ch + good.slice(i + 1));
      }
    }
  }
  for (const t of corpus) {
    const end = c.put(t), expected = grammar.exec(t);
    if (expected) equal(c.timestamp(0, end), expected[0].length);
    else traps(() => c.timestamp(0, end));
  }
});

Deno.test("WebVTT time: span limits, truncation, reentrancy and no memory writes", async () => {
  const c = await clock();
  for (
    const text of [
      "03:07.250",
      "0000:03:07.250",
      "9".repeat(1000) + ":03:07.250",
    ]
  ) {
    for (const offset of [0, 65536, 196608 - text.length]) {
      const end = c.put(text, offset), before = c.memory.slice();
      equal(c.timestamp(offset, end), end);
      equal(c.compare(offset, end, offset, end), 0);
      for (let bound = offset; bound < end; bound++) {
        traps(() => c.timestamp(offset, bound));
      }
      equal(toHex(c.memory), toHex(before));
    }
  }
  const before = c.memory.slice();
  for (
    const [a, b] of [[-1, 0], [0, -1], [1, 0], [0, 196609], [196608, 196608], [
      0,
      8,
    ]]
  ) {
    traps(() => c.timestamp(a, b));
    traps(() => c.compare(a, b, 0, 12));
    traps(() => c.compare(0, 12, a, b));
  }
  equal(toHex(c.memory), toHex(before));
  equal(c.memory.subarray(0x30000).every((v) => v === 0xa5), true);
});
