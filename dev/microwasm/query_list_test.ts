import { Parser } from "npm:commonmark@0.31.2";
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
const fence = (query: string) => "```query\n" + query + "\n```\n";
const list = (pairs: Iterable<readonly [string, string]>) =>
  "- []\n" +
  [...pairs].map(([name, value]) =>
    "  - []\n    - " + JSON.stringify(name) + "\n    - " +
    JSON.stringify(value) + "\n"
  ).join("");
const expected = (pairs: [string, string][]) =>
  fence(new URLSearchParams(pairs).toString());

async function converter(write: boolean) {
  const imports: Record<string, WebAssembly.Exports> = {};
  const paths = write
    ? [
      ["n", "numbers/02-json-number"],
      ["l", "transforms/01-list-to-json"],
      ["k", "transforms/00-json-string-keys"],
      ["t", "transforms/25-list-to-query"],
    ]
    : [["t", "transforms/24-query-to-list"]];
  for (const [name, path] of paths) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    imports[name] =
      (await WebAssembly.instantiate(built.bytes, imports)).instance.exports;
  }
  const memory = new Uint8Array(
    (imports.t.memory as WebAssembly.Memory).buffer,
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

Deno.test("Query writer: ordered pairs and exact form-url-encoded spelling", async () => {
  const w = await converter(true), r = await converter(false);
  const pairs: [string, string][] = [
    ["name", "Ben Atkin"],
    ["tag", "wasm"],
    ["tag", "Markdown"],
    ["flag", ""],
    ["", ""],
    ["=+&?#", "~!*'()_- ."],
    ["猫", "😀"],
    ["", "first\nsecond\r\n\0"],
    ["bom", "\ufeff"],
  ];
  equal(w.convert(list(pairs)), expected(pairs));
  equal(r.convert(w.convert(list(pairs))), list(pairs));
  equal(w.convert("- []"), fence(""));
  equal(w.convert('- []\n  - []\n    - ""\n    - ""'), fence("="));
  equal(
    w.convert("- []\n  - []\n    - name\n    - Ben Atkin"),
    fence("name=Ben+Atkin"),
  );
  const ascii = String.fromCharCode(
    ...Array.from({ length: 128 }, (_, n) => n),
  );
  equal(w.convert(list([[ascii, ascii]])), expected([[ascii, ascii]]));
  // Quoted strings resembling typed markers are still strings, not containers.
  equal(
    w.convert(list([["{}", "[]"], ["false", "42"]])),
    fence("%7B%7D=%5B%5D&false=42"),
  );
});

Deno.test("Query pair: 1,000 generated ordered lists round trip and match URLSearchParams", async () => {
  const w = await converter(true), r = await converter(false);
  const values = [
    "",
    "same",
    "猫😀",
    "a&b=c",
    "x y",
    "+%",
    "\0\n\r\t",
    "\ufeff",
    "<b>```</b>",
    "'\"\\",
    "\ud800",
    "\udfff",
    "\ud800x\ud801\udc00",
  ];
  for (let seed = 0; seed < 1000; seed++) {
    const pairs: [string, string][] = Array.from(
      { length: seed % 21 },
      (
        _,
        i,
      ) => [
        values[(seed + i) % values.length],
        values[(seed * 7 + i) % values.length],
      ],
    );
    const output = w.convert(list(pairs));
    equal(output, expected(pairs));
    equal(
      r.convert(output),
      list(pairs.map(([k, v]) => [k.toWellFormed(), v.toWellFormed()])),
    );
    equal(w.convert(r.convert(output)), output);
  }
  for (
    const query of [
      "?name=Ben%20Atkin&flag&flag=&=x&&",
      "a=%&b=%GG&c=%C0%AF",
      "x=%7e%2b%41&x=a=b#c",
      "x=%ED%A0%80&y=%EF%BB%BF",
      "&&&",
    ]
  ) {
    equal(
      w.convert(r.convert(fence(query))),
      fence(new URLSearchParams(query).toString()),
    );
  }
});

Deno.test("Query writer: every UTF-16 unit, surrogate combinations and astral scalars", async () => {
  const w = await converter(true);
  for (let code = 0; code <= 0xffff; code++) {
    const value = String.fromCharCode(code);
    equal(w.convert(list([["x", value]])), expected([["x", value]]));
  }
  // Lone high surrogates must not swallow their non-low successor, including
  // another high surrogate that begins a valid pair. Test all short sequences.
  const units = [0, 65, 0xd800, 0xdbff, 0xdc00, 0xdfff, 0xffff];
  for (let length = 1; length <= 4; length++) {
    for (let bits = 0; bits < units.length ** length; bits++) {
      let n = bits, value = "";
      for (let i = 0; i < length; i++) {
        value += String.fromCharCode(units[n % units.length]);
        n = Math.floor(n / units.length);
      }
      equal(w.convert(list([[value, value]])), expected([[value, value]]));
    }
  }
  for (let i = 0; i < 1000; i++) {
    const scalar = 0x10000 + (i * 104729) % 0x100000;
    const value = String.fromCodePoint(scalar);
    equal(w.convert(list([[value, value]])), expected([[value, value]]));
  }
  equal(
    w.convert('- []\n  - []\n    - "\\ud83d\\ude00"\n    - "😀"'),
    fence("%F0%9F%98%80=%F0%9F%98%80"),
  );
});

Deno.test("Query writer: wrong shapes and malformed input trap, then recover", async () => {
  const w = await converter(true);
  for (
    const input of [
      "",
      "- {}",
      "- value",
      "- = null",
      "- []\n  - {}",
      "- []\n  - []",
      "- []\n  - []\n    - name",
      "- []\n  - []\n    - name\n    - value\n    - extra",
      "- []\n  - []\n    - = 1\n    - value",
      "- []\n  - []\n    - name\n    - = false",
      "- []\n  - []\n    - name\n    - []",
      '- []\n  - []\n    - "open\n    - value',
    ]
  ) {
    traps(() => w.convert(input));
    equal(w.convert(list([["ok", "yes"]])), fence("ok=yes"));
  }
  for (
    const bytes of [[0x80], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [
      0xf4,
      0x90,
      0x80,
      0x80,
    ]]
  ) {
    const before = encoder.encode('- []\n  - []\n    - "'),
      after = encoder.encode('"\n    - value');
    w.memory.set(before);
    w.memory.set(bytes, before.length);
    w.memory.set(after, before.length + bytes.length);
    traps(() => w.run(before.length + bytes.length + after.length));
  }
  equal(w.convert(list([["recovery", "yes"]])), fence("recovery=yes"));
});

Deno.test("Query writer: Markdown cannot be injected by fields or line breaks", async () => {
  const w = await converter(true), parser = new Parser();
  for (
    const value of [
      "```",
      "\n```\n# heading",
      "<script>bad()</script>",
      "&x=1#fragment",
      "\r\n",
    ]
  ) {
    const output = w.convert(list([[value, value]]));
    const ast = parser.parse(output);
    equal(ast.firstChild?.type, "code_block");
    equal(ast.firstChild?.info, "query");
    equal(ast.firstChild?.literal, output.slice(9, -4));
    equal(ast.firstChild?.next, null);
    equal(output, expected([[value, value]]));
  }
});

Deno.test("Query writer: exact input, intermediate and output boundaries", async () => {
  const w = await converter(true);
  const value = "a".repeat(65536 - encoder.encode(list([["", ""]])).length);
  const full = list([["", value]]);
  equal(encoder.encode(full).length, 65536);
  equal(w.convert(full), fence("=" + value));
  traps(() => w.convert(full + " "));
  const prefix = '- []\n  - []\n    - ""\n    - ';
  const slashes = "\\".repeat(32763) + "a";
  equal(encoder.encode(JSON.stringify([["", slashes]])).length, 65536);
  equal(w.convert(prefix + slashes), expected([["", slashes]]));
  traps(() => w.convert(prefix + slashes + "b"));
  const expanding = "~".repeat(43685) + "aa";
  equal(encoder.encode(w.convert(list([["", expanding]]))).length, 131072);
  traps(() => w.convert(list([["", expanding + "a"]])));
  // The output must stop before the JSON scratch page, even on a trapping run.
  equal(w.memory[196608], 0x5b);
  equal(w.convert(list([["after", "ok"]])), fence("after=ok"));
  traps(() => w.run(-1));
});
