import { parse } from "jsr:@std/ini@0.225.2";
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
const fence = (body: string) => "```ini\n" + body + "```\n";
async function converter(write: boolean) {
  const imports: Record<string, WebAssembly.Exports> = {};
  const paths = [
    ["n", "numbers/02-json-number"],
    ...(write ? [["l", "transforms/01-list-to-json"]] : []),
    ["k", "transforms/00-json-string-keys"],
    ["t", "transforms/" + (write ? "21-list-to-ini" : "20-ini-to-list")],
  ];
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
function list(value: unknown, depth = 0, key?: string): string {
  const prefix = "  ".repeat(depth) + "- " +
    (key === undefined ? "" : JSON.stringify(key) + " ");
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

Deno.test("INI writer: named, unnamed and empty sections with literal string values", async () => {
  const w = await converter(true), r = await converter(false);
  const data = {
    "": { name: "Ben" },
    server: { host: "localhost", port: "3030", empty: "" },
    empty: {},
  };
  equal(
    w.convert(list(data)),
    fence(
      "name = Ben\n[server]\nhost = localhost\nport = 3030\nempty = \n[empty]\n",
    ),
  );
  equal(r.convert(w.convert(list(data))), list(data));
  equal(w.convert("- {}"), fence(""));
  equal(w.convert("- {}\n  - empty {}"), fence("[empty]\n"));
  const literal = {
    section: {
      quote: '"hello"',
      slash: "C:\\folder",
      comments: "# text ; more",
      pattern: "%(name)s",
      enabled: "false",
      number: "123",
    },
  };
  equal(r.convert(w.convert(list(literal))), list(literal));
  equal(
    w.convert('- {}\n  - "10" {}\n    - b first\n    - a second\n  - "2" {}'),
    fence("[10]\nb = first\na = second\n[2]\n"),
  );
});

Deno.test("INI pair: 500 generated documents, stable round trips and independent parsing", async () => {
  const w = await converter(true), r = await converter(false);
  const words = [
    "",
    "Ben",
    "猫",
    "😀",
    "a\tb",
    '"quote"',
    "C:\\folder",
    "false",
    "1e99",
    "<b>name</b>",
    "a # b",
    "x=y:z",
  ];
  for (let seed = 0; seed < 500; seed++) {
    const data: Record<string, Record<string, string>> = {};
    for (let s = 0; s < 1 + seed % 7; s++) {
      const entries: Record<string, string> = {};
      for (let k = 0; k < 1 + seed % 13; k++) {
        entries["key-" + k] = words[(seed + s + k) % words.length];
      }
      data["section-" + s] = entries;
    }
    const input = list(data), output = w.convert(input);
    equal(list(parse(output.slice(7, -4))), input);
    equal(r.convert(output), input);
    equal(w.convert(r.convert(output)), output);
  }
  // Comments, colon delimiters and CRLF canonicalize, but the data is stable.
  const source =
    "```ini\r\n# first\r\nx:global\r\n[ server ] ; note\r\nport:3030\r\n```\r\n";
  equal(
    w.convert(r.convert(source)),
    fence("x = global\n[server]\nport = 3030\n"),
  );
});

Deno.test("INI writer: destination restrictions and recovery instead of lossy escaping", async () => {
  const w = await converter(true);
  for (
    const data of [
      { "": {} },
      { s: {}, "": { x: "late" } },
      { s: "not an object" },
      { s: { x: 1 } },
      { s: { x: false } },
      { s: { x: null } },
      { s: { x: {} } },
    ]
  ) traps(() => w.convert(list(data)));
  for (
    const input of [
      "- []",
      "- scalar",
      "- {}\n  - s []",
      "- {}\n  - s {}\n    - x []",
      "- {}\n   - s {}",
      '- {}\n  - s {}\n    - x "\\ud800"',
      '- {}\n  - "\\udc00" {}',
    ]
  ) {
    traps(() => w.convert(input));
  }
  for (const name of ["[s", "s]", " s", "s ", "\ts", "s\t", "s\nx"]) {
    traps(() => w.convert(list({ [name]: {} })));
  }
  for (
    const key of [
      "",
      "key=",
      "key:",
      "[key",
      "#key",
      ";key",
      " key",
      "key ",
      "\tkey",
      "key\t",
    ]
  ) traps(() => w.convert(list({ s: { [key]: "v" } })));
  for (
    const value of [
      " ",
      " value",
      "value ",
      "\tvalue",
      "value\t",
      "line\nline",
      "line\rline",
    ]
  ) traps(() => w.convert(list({ s: { key: value } })));
  for (let point = 0; point <= 127; point++) {
    if (point >= 32 && point !== 127 || point === 9) continue;
    const s = "a" + String.fromCodePoint(point) + "z";
    for (
      const data of [{ [s]: {} }, { section: { [s]: "x" } }, {
        section: { x: s },
      }]
    ) traps(() => w.convert(list(data)));
  }
  equal(
    w.convert(list({ s: { "x#;[]": "[]=: #;", tab: "a\tb" } })),
    fence("[s]\nx#;[] = []=: #;\ntab = a\tb\n"),
  );
  equal(w.convert("- {}\n  - ok {}\n    - x yes"), fence("[ok]\nx = yes\n"));
});

Deno.test("INI writer: duplicate decoded names, sibling scopes and Unicode scalars", async () => {
  const w = await converter(true), r = await converter(false);
  for (
    const input of [
      '- {}\n  - s {}\n  - "\\u0073" {}',
      '- {}\n  - s {}\n    - x first\n    - "\\u0078" second',
      '- {}\n  - "" {}\n    - x a\n  - "" {}\n    - y b',
      '- {}\n  - 😀 {}\n  - "\\ud83d\\ude00" {}',
    ]
  ) traps(() => w.convert(input));
  equal(
    w.convert(
      '- {}\n  - "\\ud83d\\ude00" {}\n    - "\\u732b" "\\uD83D\\uDE00\\/"',
    ),
    fence("[😀]\n猫 = 😀/\n"),
  );
  const distinct = { a: { x: "1", X: "2" }, A: { x: "3", "é": "4", "é": "5" } };
  equal(r.convert(w.convert(list(distinct))), list(distinct));
  for (
    const point of [
      0x80,
      0x85,
      0x7ff,
      0x800,
      0xd7ff,
      0xe000,
      0xffff,
      0x10000,
      0x10ffff,
      0x2028,
      0x2029,
    ]
  ) {
    const s = "a" + String.fromCodePoint(point) + "z";
    const data = { [s]: { [s]: s } };
    equal(r.convert(w.convert(list(data))), list(data));
  }
  const long = "name".repeat(512);
  equal(
    r.convert(w.convert(list({ [long]: { [long]: "long" } }))),
    list({ [long]: { [long]: "long" } }),
  );
});

Deno.test("INI writer: exact source/scratch bounds, malformed UTF-8 and repeated instances", async () => {
  const w = await converter(true);
  const prefix = "- {}\n  - s {}\n    - k ";
  const full = prefix + "a".repeat(65536 - prefix.length);
  equal(encoder.encode(full).length, 65536);
  equal(
    w.convert(full),
    fence("[s]\nk = " + "a".repeat(65536 - prefix.length) + "\n"),
  );
  traps(() => w.run(65537));
  traps(() => w.run(-1));
  const overhead = JSON.stringify({ s: { k: "" } }).length;
  const slashes = "\\".repeat((65536 - overhead) / 2);
  equal(w.convert(prefix + slashes), fence("[s]\nk = " + slashes + "\n"));
  equal(w.memory[0x3ffff], 125);
  traps(() => w.convert(prefix + slashes + "\\"));
  for (
    const invalid of [[0x80], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [
      0xf4,
      0x90,
      0x80,
      0x80,
    ]]
  ) {
    const start = encoder.encode(prefix);
    w.memory.set(start);
    w.memory.set(invalid, start.length);
    traps(() => w.run(start.length + invalid.length));
  }
  for (let i = 0; i < 20; i++) {
    equal(w.convert(prefix + i), fence("[s]\nk = " + i + "\n"));
    traps(() => w.convert(list({ s: { x: "\n" } })));
  }
});
