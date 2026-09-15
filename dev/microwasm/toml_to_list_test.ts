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
const fence = (body: string) => "```toml\n" + body + "```\n";
async function load(paths: string[][]) {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (const [name, path] of paths) {
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
  const run = imports.t.run as (length: number) => number;
  function convert(input: string) {
    const bytes = encoder.encode(input);
    memory.set(bytes);
    const length = run(bytes.length);
    equal(toHex(memory.subarray(0, bytes.length)), toHex(bytes));
    return decoder.decode(memory.subarray(65536, 65536 + length));
  }
  return { memory, run, convert };
}
const reader = () =>
  load([
    ["n", "numbers/02-json-number"],
    ["k", "transforms/00-json-string-keys"],
    ["s", "transforms/00-toml-strings"],
    ["t", "transforms/19-toml-to-list"],
  ]);
const writer = () =>
  load([
    ["n", "numbers/02-json-number"],
    ["l", "transforms/01-list-to-json"],
    ["k", "transforms/00-json-string-keys"],
    ["t", "transforms/18-list-to-toml"],
  ]);
function list(value: unknown, depth = 0, key?: string): string {
  const prefix = "  ".repeat(depth) + "- " +
    (key === undefined ? "" : JSON.stringify(key) + " ");
  if (Array.isArray(value)) {
    return prefix + "[]\n" + value.map((v) => list(v, depth + 1)).join("");
  }
  if (value !== null && typeof value === "object") {
    return prefix + "{}\n" +
      Object.entries(value).map(([k, v]) => list(v, depth + 1, k)).join("");
  }
  return prefix +
    (typeof value === "string"
      ? JSON.stringify(value)
      : "= " + JSON.stringify(value)) +
    "\n";
}

Deno.test("TOML to list: keys, strings, inline tables, multiline arrays and comments", async () => {
  const c = await reader();
  for (
    const source of [
      "name = 'Ben'\nlocation = {city = \"Phoenix\"}\ntags = [\n'wasm', # comment\n'Markdown',\n]\n",
      "empty = {}\nxs = [[], {}, [1, false, 'x']]\n",
      '"a.b" = {"x.y" = 2}\n',
      "# 猫 \\ # header\n\nkey = true # after\n",
      "data = {array = [\n1, # inside\n2\n], after = false}\n",
      "'name' = 'C:\\Users\\Ben'\nstr = \"\\U0001F600\"\n",
      "dash-key_0 = false\nempty-key = ''\n",
      "\tname\t=\t'Ben'\t\n",
    ]
  ) {
    equal(c.convert(fence(source)), list(parse(source)));
    equal(
      c.convert(fence(source).replaceAll("\n", "\r\n")),
      list(parse(source)),
    );
  }
  equal(c.convert(fence("")), "- {}\n");
  equal(c.convert(fence("# empty\n\n")), "- {}\n");
  // Preserve source order even where JavaScript object enumeration would not.
  equal(
    c.convert(fence('"" = 1\n123 = 2\n')),
    '- {}\n  - "" = 1\n  - "123" = 2\n',
  );
});

Deno.test("TOML scalar normalization: signed integers, underscores and exact float spelling", async () => {
  const c = await reader();
  for (
    const [source, token] of [
      ["+1_234", "1234"],
      ["-0", "-0"],
      ["+0", "0"],
      ["-1_234", "-1234"],
      ["1.2300E+4_0", "1.2300E+40"],
      ["+1_000.5_0e-0_2", "1000.50e-02"],
      ["9007199254740993", "9007199254740993"],
      ["1e9999", "1e9999"],
      ["1e-9999", "1e-9999"],
    ]
  ) {
    equal(
      c.convert(fence("x = " + source + "\n")),
      '- {}\n  - "x" = ' + token + "\n",
    );
  }
  const bound = 1n << 63n;
  for (let offset = -50n; offset <= 50n; offset++) {
    for (const value of [bound + offset, -bound + offset]) {
      const token = value.toString();
      if (value >= -bound && value < bound) {
        const output = c.convert(fence("x=" + token + "\n"));
        equal(output, '- {}\n  - "x" = ' + token + "\n");
        equal(parse("x=" + token, { integersAsBigInt: true }).x, value);
      } else traps(() => c.convert(fence("x=" + token + "\n")));
    }
  }
  for (
    const token of [
      "+-1",
      "++1",
      "+-1.0",
      "+",
      "+true",
      "1__0",
      "_1",
      "1_",
      "1_.0",
      "1._0",
      "1e_2",
      "1e+_2",
      "0_1",
      "01",
      "0x10",
      ".5",
      "5.",
      "null",
      "True",
      "inf",
      "nan",
      "2026-09-15",
    ]
  ) {
    traps(() => c.convert(fence("x=" + token + "\n")));
    equal(c.convert(fence("x=1\n")), '- {}\n  - "x" = 1\n');
  }
});

Deno.test("TOML pair: 500 generated nested values through both Wasm modules", async () => {
  const r = await reader(), w = await writer();
  let seed = 9876;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const strings = [
    "",
    "null",
    "123",
    "a.b",
    "😀",
    "猫",
    "a\nb",
    "'quote'",
    "x\\y",
    "[x] = 2",
    "\u007f\u0080",
  ];
  function generate(depth: number): unknown {
    const kind = random() % (depth ? 5 : 3);
    if (kind === 0) return !!(random() & 1);
    if (kind === 1) return (random() % 20001 - 10000) / 8;
    if (kind === 2) return strings[random() % strings.length];
    const length = random() % 5;
    if (kind === 3) return Array.from({ length }, () => generate(depth - 1));
    return Object.fromEntries(
      Array.from(
        { length },
        (_, i) => [strings[random() % strings.length] + i, generate(depth - 1)],
      ),
    );
  }
  for (let i = 0; i < 500; i++) {
    const value = { data: generate(5), after: i };
    const toml = w.convert(list(value));
    equal(JSON.stringify(parse(toml.slice(8, -4))), JSON.stringify(value));
    const converted = r.convert(toml);
    equal(w.convert(converted), toml);
    equal(r.convert(w.convert(converted)), converted);
  }
});

Deno.test("TOML numeric syntax: mutated decimal tokens agree with an independent parser", async () => {
  const c = await reader();
  const candidates = new Set<string>();
  for (const base of ["0", "+1", "-12", "1.5", "1e3", "1_000", "-0.25e+2"]) {
    candidates.add(base);
    for (let i = 0; i <= base.length; i++) {
      candidates.add(base.slice(0, i) + base.slice(i + 1));
      for (const ch of "01_+-.eE") {
        candidates.add(base.slice(0, i) + ch + base.slice(i));
        candidates.add(base.slice(0, i) + ch + base.slice(i + 1));
      }
    }
  }
  for (const token of candidates) {
    let accepted = true, expected: unknown;
    try {
      expected = parse("x=" + token).x;
    } catch {
      accepted = false;
    }
    if (!accepted) {
      traps(() => c.convert(fence("x=" + token + "\n")));
      continue;
    }
    equal(typeof expected, "number");
    const output = c.convert(fence("x=" + token + "\n"));
    const actual = JSON.parse(output.slice('- {}\n  - "x" = '.length).trim());
    // TOML integers do not distinguish signed zero; the separate exact-token
    // test verifies that the input spelling -0 nevertheless survives.
    if (actual !== expected) {
      throw new Error(`Numeric mismatch: ${token}`);
    }
  }
});

Deno.test("TOML duplicate keys: decoded equality, scoped tables and long names", async () => {
  const c = await reader();
  for (
    const body of [
      "x=1\nx=2\n",
      'x=1\n"\\u0078"=2\n',
      "'x'=1\nx=2\n",
      "data={x=1, x=2}\n",
      'data=[{x=1, "\\U00000078"=2}]\n',
      '"😀"=1\n"\\U0001f600"=2\n',
    ]
  ) traps(() => c.convert(fence(body)));
  const valid = 'data=[{x=1}, {x=2}]\nx=3\nX=4\n"é"=5\n"é"=6\n';
  equal(c.convert(fence(valid)), list(parse(valid)));
  const key = "猫".repeat(5000);
  equal(
    c.convert(fence(JSON.stringify(key) + '="value"\n')),
    list({ [key]: "value" }),
  );
});

Deno.test("TOML rejected structure: strict inline tables, separators, fences and UTF-8", async () => {
  const c = await reader();
  for (
    const source of [
      "a={x=1,}\n",
      "a={\nx=1}\n",
      "a={x=1\n}\n",
      "a={# comment\nx=1}\n",
      "a=[,]\n",
      "a=[1,,2]\n",
      "a=[1 2]\n",
      "a={x=1 y=2}\n",
      "a=1 b=2\n",
      "a\n=1\n",
      "a=\n1\n",
      "a='x''y'\n",
      'a="""text"""\n',
      "a=1\rb=2\n",
      "[table]\nx=1\n",
      "a.b=1\n",
      "[[tables]]\nx=1\n",
      "a=\n",
      "a=[1\n",
      "a={x=1\n",
      "# invalid\u0000 comment\n",
      "# invalid\u007f comment\n",
    ]
  ) {
    traps(() => c.convert(fence(source)));
    equal(c.convert(fence("name='recovered'\n")), list({ name: "recovered" }));
  }
  for (
    const source of [
      "",
      "```toml\n",
      "```toml\nx=1```",
      "```TOML\nx=1\n```",
      "prose\n```toml\nx=1\n```",
      "```toml\nx=1\n```\nprose",
    ]
  ) traps(() => c.convert(source));
  const bytes = encoder.encode(fence("# bad x\n"));
  c.memory.set(bytes);
  c.memory[14] = 255;
  traps(() => c.run(bytes.length));
});

Deno.test("TOML reader memory: full input, exact output, nested containers and reuse", async () => {
  const c = await reader();
  const scratch = c.memory.slice(0x30000);
  const text = "a".repeat(65519);
  const source = fence("x='" + text + "'\n");
  equal(encoder.encode(source).length, 65536);
  equal(c.convert(source), list({ x: text }));
  traps(() => c.run(65537));
  traps(() => c.run(-1));
  const exact = fence("x=[" + "true,".repeat(10080) + '"xxxxxxx"]\n');
  equal(encoder.encode(c.convert(exact)).length, 131072);
  traps(() => c.convert(exact.replace("xxxxxxx", "xxxxxxxx")));
  equal(toHex(c.memory.subarray(0x30000)), toHex(scratch));
  const nested = (n: number) =>
    fence("x=" + "[".repeat(n) + "0" + "]".repeat(n) + "\n");
  equal(c.convert(nested(127)).endsWith("  ".repeat(128) + "- = 0\n"), true);
  traps(() => c.convert(nested(128)));
  equal(c.convert(fence("x=[]\n")), list({ x: [] }));
  equal(toHex(c.memory.subarray(0x30000)), toHex(scratch));
});
