// Independent TOML parser used only by the tests, not the browser tool.
import { parse as stdParse } from "jsr:@std/toml@1.0.11";
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
async function converter() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["l", "transforms/01-list-to-json"],
      ["k", "transforms/00-json-string-keys"],
      ["t", "transforms/18-list-to-toml"],
    ]
  ) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    const module = await WebAssembly.compile(b.bytes);
    if (name === "t") {
      equal(
        JSON.stringify(WebAssembly.Module.imports(module)),
        JSON.stringify([
          { module: "l", name: "run", kind: "function" },
          { module: "k", name: "equal", kind: "function" },
          { module: "k", name: "next", kind: "function" },
          { module: "l", name: "memory", kind: "memory" },
        ]),
      );
    }
    imports[name] = (await WebAssembly.instantiate(module, imports)).exports;
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
function read(output: string) {
  equal(output.startsWith("```toml\n"), true);
  equal(output.endsWith("```\n"), true);
  return parse(output.slice(8, -4));
}

Deno.test("List to TOML: root assignments, inline tables, mixed arrays and exact tokens", async () => {
  const c = await converter();
  equal(
    c.convert(
      "- {}\n  - name Ben\n  - active = true\n  - location {}\n    - city Phoenix\n  - tags []\n    - wasm\n    - = 1\n  - empty {}",
    ),
    fence(
      '"name" = "Ben"\n"active" = true\n"location" = {"city" = "Phoenix"}\n"tags" = ["wasm", 1]\n"empty" = {}\n',
    ),
  );
  equal(c.convert("- {}"), fence(""));
  const basic = { name: "Ben", numbers: [1, 2], settings: { active: true } };
  const basicBody = c.convert(list(basic)).slice(8, -4);
  equal(JSON.stringify(stdParse(basicBody)), JSON.stringify(parse(basicBody)));
  const value = {
    "a.b": { "x.y": [true, "false", { nested: [[], {}] }] },
    "": "",
    date: "2026-09-15",
  };
  equal(JSON.stringify(read(c.convert(list(value)))), JSON.stringify(value));
  for (
    const token of [
      "0",
      "-0",
      "1.0",
      "-1.2500E+40",
      "9007199254740993",
      "1e-9999",
      "1e9999",
    ]
  ) {
    equal(c.convert("- {}\n  - x = " + token), fence('"x" = ' + token + "\n"));
  }
  equal(c.convert("\r\n- {}\r\n  - name Ben\r\n"), fence('"name" = "Ben"\n'));
});

Deno.test("TOML integers: exact signed 64-bit endpoints and checked accumulation", async () => {
  const c = await converter();
  const limit = 1n << 63n;
  for (let offset = -100n; offset <= 100n; offset++) {
    for (const value of [limit + offset, -limit + offset]) {
      const token = value.toString();
      const input = "- {}\n  - x = " + token;
      if (value >= -limit && value < limit) {
        const output = c.convert(input);
        equal(output, fence('"x" = ' + token + "\n"));
        equal(parse(output.slice(8, -4), { integersAsBigInt: true }).x, value);
      } else traps(() => c.convert(input));
    }
  }
  // Check spelling and a BigInt oracle: ordinary JS numbers round endpoints.
  for (
    const token of [
      "18446744073709551616",
      "-18446744073709551616",
      "9".repeat(500),
    ]
  ) {
    traps(() => c.convert("- {}\n  - x = " + token));
  }
  equal(c.convert("- {}\n  - x = -12"), fence('"x" = -12\n'));
});

Deno.test("TOML strings: JSON escapes become valid TOML scalar escapes", async () => {
  const c = await converter();
  for (let cp = 0; cp < 160; cp++) {
    const value = String.fromCodePoint(cp);
    equal(read(c.convert(list({ value }))).value, value);
  }
  for (
    const value of [
      "😀",
      "猫",
      "é",
      "é",
      "a\u2028b\u2029c",
      "\ufffe\uffff",
      String.fromCodePoint(0x10ffff),
      "# comment\n[table]\nx = 1",
      'a\\b"c',
      "```",
      "https://example.com/",
    ]
  ) {
    equal(read(c.convert(list({ value }))).value, value);
  }
  equal(c.convert('- {}\n  - x "\\/\\ud83d\\ude00"'), fence('"x" = "/😀"\n'));
  for (
    const key of ["a.b", "", "# key", "\n", "猫".repeat(500), "x".repeat(20000)]
  ) {
    equal(read(c.convert(list({ [key]: "value" })))[key], "value");
  }
});

Deno.test("TOML writer: 500 generated nested datasets checked independently", async () => {
  const c = await converter();
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
    const output = c.convert(list(value));
    try {
      equal(JSON.stringify(read(output)), JSON.stringify(value));
    } catch (cause) {
      throw new Error(`Generated case ${i}: ${output}`, { cause });
    }
  }
});

Deno.test("TOML rejection: unsupported nulls/roots, duplicate keys, malformed input and recovery", async () => {
  const c = await converter();
  for (
    const input of [
      "- []",
      "- scalar",
      "- = 1",
      "- = null",
      "- {}\n  - x = null",
      "- {}\n  - a []\n    - = null",
      "- {}\n  - x a\n  - x b",
      '- {}\n  - x a\n  - "\\u0078" b',
      "- {}\n  - a []\n    - {}\n      - x a\n      - x b",
      '- {}\n  - x "\\ud800"',
      '- {}\n  - "\\udc00" value',
      "- {}\n   - x a",
      "- {}\n  - x = 01",
      "- {}\n  - x = NaN",
    ]
  ) {
    traps(() => c.convert(input));
    equal(c.convert("- {}\n  - x ok"), fence('"x" = "ok"\n'));
  }
  const distinct = { x: [{ same: 1 }, { same: 2 }], X: 2, "é": 3, "é": 4 };
  equal(
    JSON.stringify(read(c.convert(list(distinct)))),
    JSON.stringify(distinct),
  );
  c.memory.set(encoder.encode("- {}\n  - x "));
  c.memory[11] = 255;
  traps(() => c.run(12));
});

Deno.test("TOML memory: exact input, intermediate/output bounds and 128-level nesting", async () => {
  const c = await converter();
  const prefix = "- {}\n  - x ";
  const full = prefix + "a".repeat(65536 - prefix.length);
  equal(encoder.encode(full).length, 65536);
  equal(read(c.convert(full)).x, "a".repeat(65536 - prefix.length));
  traps(() => c.run(65537));
  const slashes = "\\".repeat(32764);
  equal(read(c.convert(prefix + slashes)).x, slashes);
  equal(c.memory[0x3ffff], 125);
  traps(() => c.convert(prefix + slashes + "\\"));
  const expanded = "\x7f".repeat(21841) + "a".repeat(5);
  equal(c.convert(prefix + expanded).length, 131072);
  traps(() => c.convert(prefix + expanded + "a"));
  function nested(count: number) {
    return "- {}\n" +
      Array.from(
        { length: count - 1 },
        (_, i) => "  ".repeat(i + 1) + "- " + (i ? "" : "x ") + "[]\n",
      ).join("") +
      "  ".repeat(count) + "- = 0";
  }
  let value: unknown = read(c.convert(nested(128))).x;
  for (let i = 0; i < 127; i++) {
    equal(Array.isArray(value), true);
    equal((value as unknown[]).length, 1);
    value = (value as unknown[])[0];
  }
  equal(value, 0);
  traps(() => c.convert(nested(129)));
  equal(c.convert("- {}"), fence(""));
});
