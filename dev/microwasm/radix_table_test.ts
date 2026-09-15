import { assemble, toHex } from "./microwasm.ts";

const enc = new TextEncoder(), dec = new TextDecoder();
const header =
  "| Input | From base | To base | Result |\n| --- | --- | --- | --- |\n";
type Row = [string, string | number, string | number, string];
function source(rows: Row[]) {
  return rows.map(([n, a, b]) => `- ${n} ${a} ${b}\n`).join("");
}
function table(rows: Row[]) {
  return header + rows.map((r) => `| ${r.join(" | ")} |\n`).join("");
}
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      `${JSON.stringify(a)?.slice(0, 1500)} != ${
        JSON.stringify(b)?.slice(0, 1500)
      }`,
    );
  }
}
function traps(f: () => unknown) {
  try {
    f();
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
    throw e;
  }
  throw Error("Expected Wasm trap");
}
async function tool() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["b", "numbers/03-multiword"],
      ["f", "numbers/04-json-binary64"],
      ["d", "numbers/05-exact-decimal"],
      ["s", "numbers/06-shortest-decimal"],
      ["p", "numbers/07-parse-integer"],
      ["r", "numbers/09-radix-format"],
      ["t", "transforms/48-radix-table"],
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(a.resolved).bytes), toHex(a.bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const memory = new Uint8Array(
    (imports.t.memory as WebAssembly.Memory).buffer,
  );
  const raw = imports.t.run as (n: number) => number;
  const literals = memory.slice(0x33000, 0x34000);
  function run(s: string | Uint8Array) {
    const bytes = typeof s === "string" ? enc.encode(s) : s;
    if (bytes.length > 65536) throw Error("Test input exceeds page");
    memory.set(bytes);
    const prefix = memory.slice(0, 32);
    try {
      const n = raw(bytes.length);
      equal(n >= 0 && n <= 61440, true);
      return dec.decode(memory.subarray(65536, 65536 + n));
    } finally {
      for (let i = 0; i < bytes.length; i++) {
        if (memory[i] !== bytes[i]) throw Error(`Input changed at ${i}`);
      }
      equal(toHex(memory.subarray(0, 32)), toHex(prefix));
      equal(toHex(memory.subarray(0x33000, 0x34000)), toHex(literals));
    }
  }
  return { run, raw };
}

Deno.test("Radix table: documented rows, spelling, signs and physical line endings", async () => {
  const t = await tool();
  const rows: Row[] = [
    ["ff", 16, 2, "11111111"],
    ["-42", 10, 16, "-2a"],
    ["1z", 36, 10, "71"],
    ["9007199254740993", 10, 10, "9007199254740992"],
    ["-0", 10, 10, "0"],
    ["+00FF", "0016", "00010", "255"],
    ["0xff", 36, 10, "43323"],
  ];
  for (const eol of ["\n", "\r\n", "\r"]) {
    equal(t.run(source(rows).replaceAll("\n", eol)), table(rows));
  }
  equal(
    t.run("- \t+000A\t016  \t2\t\n\n \t\n"),
    table([["+000A", "016", 2, "1010"]]),
  );
  equal(t.run(""), header);
  equal(t.run(" \t\r\n\n\r"), header);
  equal(t.run("- 0 2 2"), table([["0", 2, 2, "0"]]));
});

Deno.test("Radix table: every base pair and generated integer batches match native exact-range conversions", async () => {
  const t = await tool();
  let seed = 0x388019ee;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const rows: Row[] = [];
  for (let from = 2; from <= 36; from++) {
    for (let to = 2; to <= 36; to++) {
      const n = (random() % 2 ? -1 : 1) * random();
      let input = n.toString(from);
      if (random() % 2) input = input.toUpperCase();
      rows.push([input, from, to, n.toString(to)]);
    }
  }
  // Many successive calls share the actual formatter and parser scratch.
  for (let i = 0; i < rows.length; i += 75) {
    const batch = rows.slice(i, i + 75);
    equal(t.run(source(batch)), table(batch));
  }
});

Deno.test("Radix table: exact accumulation rounds once and decimal candidates preserve later rows", async () => {
  const t = await tool();
  const rows: Row[] = [];
  const values = [
    0n,
    1n,
    (1n << 53n) - 1n,
    1n << 53n,
    (1n << 53n) + 1n,
    (1n << 53n) + 3n,
    (1n << 64n) - 1n,
    10n ** 21n,
    10n ** 100n,
    (1n << 1024n) - 1n,
  ];
  for (const v of values) {
    for (const sign of [1n, -1n]) {
      for (const from of [2, 3, 7, 10, 16, 36]) {
        for (const to of [2, 8, 10, 16]) {
          const n = v * sign;
          rows.push([n.toString(from), from, to, Number(n).toString(to)]);
        }
      }
    }
  }
  for (let i = 0; i < rows.length; i += 8) {
    const batch = rows.slice(i, i + 8);
    equal(t.run(source(batch)), table(batch));
  }
  for (
    const n of [
      1e-0,
      9999999999999999,
      1e20,
      1e21,
      1e22,
      1e100,
      Number.MAX_VALUE,
    ]
  ) {
    const integer = BigInt(n);
    const batch: Row[] = [[integer.toString(), 10, 10, n.toString()], [
      "123456789",
      10,
      10,
      "123456789",
    ]];
    equal(t.run(source(batch)), table(batch));
  }
  equal(
    t.run(`- ${"9".repeat(4000)} 10 36\n`),
    table([["9".repeat(4000), 10, 36, "Infinity"]]),
  );
});

Deno.test("Radix table: malformed fields never become parseInt prefixes or Markdown markup", async () => {
  const t = await tool();
  for (
    const s of [
      "0 10 2",
      " - 0 10 2",
      "-\t0 10 2",
      "- 1",
      "- 1 10",
      "- 1 10 2 extra",
      "- 2 2 10",
      "- 1g 16 10",
      "- 0xff 16 10",
      "- 1.0 10 2",
      "- 1e3 10 2",
      "- 1_000 10 2",
      "- + 10 2",
      "- - 10 2",
      "- ++1 10 2",
      "- 1 0 2",
      "- 1 1 2",
      "- 1 37 2",
      "- 1 10 0",
      "- 1 10 -2",
      "- 1 +10 2",
      "- 1 4294967298 2",
      "- 1 10 2.0",
      "- 1 10 2\0",
      "- １ 10 2",
      "- 1\u00a010 2",
      "- <img> 36 2",
      "- 1|2 36 10",
      "- `1` 10 2",
    ]
  ) {
    traps(() => t.run("- 123456789 10 10\n" + s));
    equal(t.run("- 10 10 2"), table([["10", 10, 2, "1010"]]));
  }
  for (let base = 2; base <= 36; base++) {
    for (let ch = 0; ch < 128; ch++) {
      const digit = /[0-9a-z]/i.test(String.fromCharCode(ch))
        ? parseInt(String.fromCharCode(ch), 36)
        : -1;
      if (digit >= 0 && digit < base) continue;
      // Whitespace ends the numeral; it is tested separately as field syntax.
      if ([9, 10, 13, 32].includes(ch)) continue;
      traps(() => t.run(`- 1${String.fromCharCode(ch)} ${base} 10`));
    }
  }
});

Deno.test("Radix table: exactly 64 KiB input, 60 KiB table, overflow and subsequent reuse", async () => {
  const t = await tool();
  const small = "- 1 2 10\n";
  equal(
    t.run(small + " ".repeat(65536 - small.length)),
    table([["1", 2, 10, "1"]]),
  );
  const count = Math.floor((61440 - header.length) / 18);
  const extra = 61440 - header.length - count * 18;
  const rows: Row[] = Array.from({ length: count }, () => ["0", 2, 2, "0"]);
  rows[rows.length - 1][0] += "0".repeat(extra);
  const expected = table(rows);
  equal(enc.encode(expected).length, 61440);
  equal(t.run(source(rows)), expected);
  rows[rows.length - 1][0] += "0";
  traps(() => t.run(source(rows)));
  const fullNumeral = "- " + "0".repeat(65529) + " 2 2\n";
  equal(enc.encode(fullNumeral).length, 65536);
  traps(() => t.run(fullNumeral));
  for (const n of [-1, 65537, 262144, 0x7fffffff]) traps(() => t.raw(n));
  equal(t.run("- 123 10 10"), table([["123", 10, 10, "123"]]));
});
