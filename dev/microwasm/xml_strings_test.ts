import { SaxesParser } from "npm:saxes@6.0.0";
import {
  isChar,
  isNameChar,
  isNameStartChar,
} from "npm:xmlchars@2.2.0/xml/1.0/ed5.js";
import { assemble, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
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
async function helper() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
    ]
  ) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    imports[name] =
      (await WebAssembly.instantiate(built.bytes, imports)).instance.exports;
  }
  const x = imports.x as unknown as {
    memory: WebAssembly.Memory;
    character(n: number): number;
    nameStart(n: number): number;
    namePart(n: number): number;
    nameEnd(start: number, end: number): number;
    scalar(start: number, end: number): [number, number];
    entity(start: number, end: number): [number, number];
    string(start: number, end: number, output: number, mode: number): number;
  };
  const memory = new Uint8Array(x.memory.buffer);
  function put(s: string, start = 0) {
    const bytes = encoder.encode(s);
    memory.set(bytes, start);
    return start + bytes.length;
  }
  function string(s: string, mode = 0) {
    const end = put(s);
    const length = x.string(0, end, 65536, mode);
    equal(toHex(memory.subarray(0, end)), toHex(encoder.encode(s)));
    return decoder.decode(memory.subarray(65536, 65536 + length));
  }
  return { x, memory, put, string };
}

Deno.test("XML primitives: character and name classes match XML 1.0 across Unicode", async () => {
  const { x } = await helper();
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    equal(Boolean(x.character(cp)), isChar(cp));
    equal(Boolean(x.nameStart(cp)), isNameStartChar(cp));
    equal(Boolean(x.namePart(cp)), isNameChar(cp));
  }
  for (const cp of [-1, 0x110000, 0x7fffffff, 0xffffffff]) {
    equal(x.character(cp), 0);
    equal(x.nameStart(cp), 0);
    equal(x.namePart(cp), 0);
  }
});

Deno.test("XML primitives: raw UTF-8 scalars, boundaries and literal backslashes", async () => {
  const { x, put, memory } = await helper();
  for (
    const cp of [
      9,
      10,
      13,
      32,
      0x5c,
      0x80,
      0x7ff,
      0x800,
      0xd7ff,
      0xe000,
      0xfffd,
      0x10000,
      0x1fffe,
      0xeffff,
      0x10ffff,
    ]
  ) {
    const end = put(String.fromCodePoint(cp));
    equal(x.scalar(0, end), [cp, end]);
  }
  equal(x.scalar(0, put("\\n")), [92, 1]);
  for (
    const bytes of [
      [0],
      [8],
      [0x80],
      [0xc0, 0xaf],
      [0xe0, 0x9f, 0xbf],
      [0xed, 0xa0, 0x80],
      [0xef, 0xbf, 0xbe],
      [0xf4, 0x90, 0x80, 0x80],
      [0xf0, 0x90],
    ]
  ) {
    memory.set(bytes);
    traps(() => x.scalar(0, bytes.length));
  }
  for (const [start, end] of [[0, 0], [1, 0], [-1, 1], [0, 262145]]) {
    traps(() => x.scalar(start, end));
  }
  memory[262143] = 65;
  equal(x.scalar(262143, 262144), [65, 262144]);
});

Deno.test("XML primitives: names stop at delimiters without consuming them", async () => {
  const { x, put } = await helper();
  for (
    const name of [
      "x",
      "_name",
      ":",
      "prefix:local",
      "猫😀",
      "a-0.b",
      "a\u0300",
      "\u200c\u203f",
      "𐀀",
      String.fromCodePoint(0xeffff),
    ]
  ) {
    for (const suffix of ["", " ", "=", "/>", ">", "\t", "\n"]) {
      const end = put(name + suffix);
      equal(x.nameEnd(0, end), encoder.encode(name).length);
      // Namespace interpretation is intentionally disabled in this oracle.
      new SaxesParser({ xmlns: false }).write("<" + name + "/>").close();
    }
  }
  for (
    const name of [
      "",
      "1x",
      "-x",
      ".x",
      "\u0300x",
      "\u037ex",
      String.fromCodePoint(0xf0000),
    ]
  ) {
    traps(() => x.nameEnd(0, put(name)));
  }
  // TextEncoder replaces an isolated JS surrogate before it reaches Wasm.
  // U+FFFD itself is a legal XML name character; invalid UTF-8 is tested above.
  equal(x.nameEnd(0, put("\ud800")), 3);
});

Deno.test("XML primitives: predefined and numeric references with overflow rejection", async () => {
  const { x, put } = await helper();
  for (
    const [source, cp] of [
      ["&amp;", 38],
      ["&lt;", 60],
      ["&gt;", 62],
      ["&quot;", 34],
      ["&apos;", 39],
      ["&#09;", 9],
      ["&#x0a;", 10],
      ["&#xD;", 13],
      ["&#x1f600;", 0x1f600],
      ["&#1114111;", 0x10ffff],
    ] as const
  ) {
    const end = put(source + "tail");
    equal(x.entity(0, end), [cp, source.length]);
  }
  for (let i = 0; i < 10000; i++) {
    const cp = (i * 104729) % 0x110000;
    for (
      const spelling of [
        "&#" + cp + ";",
        "&#x" + cp.toString(16).toUpperCase() + ";",
      ]
    ) {
      const end = put(spelling);
      if (isChar(cp)) equal(x.entity(0, end), [cp, end]);
      else traps(() => x.entity(0, end));
    }
  }
  for (
    const bad of [
      "",
      "&",
      "&#",
      "&#x;",
      "&#;",
      "&#X41;",
      "&#-1;",
      "&#0;",
      "&#55296;",
      "&#xFFFE;",
      "&#x110000;",
      "&#4294967361;",
      "&#x100000041;",
      "&AMP;",
      "&unknown;",
      "&amp",
      "&ltx;",
      "&#12a;",
      "&;",
      "x&amp;",
    ]
  ) {
    traps(() => x.entity(0, put(bad)));
  }
  const zeros = "&#" + "0".repeat(65000) + "65;";
  equal(x.entity(0, put(zeros)), [65, zeros.length]);
});

Deno.test("XML strings: entity and whitespace semantics against the independent saxes parser", async () => {
  const h = await helper();
  const chunks = [
    "text",
    "猫😀",
    "&amp;",
    "&lt;",
    "&gt;",
    "&quot;",
    "&apos;",
    "&#x9;",
    "&#10;",
    "&#13;",
    "\r\n",
    "\r",
    "\n",
    "\t",
    " ",
    "\\n",
    "&#x1F600;",
  ];
  for (let seed = 0; seed < 1000; seed++) {
    const source = Array.from(
      { length: 1 + seed % 30 },
      (_, i) => chunks[(seed * 7 + i) % chunks.length],
    ).join("");
    let attribute = "", text = "";
    const parser = new SaxesParser({ xmlns: false });
    parser.on("opentag", (tag) => attribute = tag.attributes.a as string);
    parser.on("text", (s) => text += s);
    parser.write('<x a="' + source + '">' + source + "</x>").close();
    equal(h.string(source, 0), JSON.stringify(text));
    equal(h.string(source, 1), JSON.stringify(attribute));
    equal(h.string(source, 2), JSON.stringify(source.replace(/\r\n?/g, "\n")));
  }
  equal(h.string("&#13;\r\n&#9;\t", 1), '"\\r \\t "');
  equal(h.string("a]]&gt;b", 0), '"a]]>b"');
  equal(h.string("< &unknown; ]]>", 2), '"< &unknown; ]]>"');
});

Deno.test("XML strings: syntax, spans, output bounds and recovery", async () => {
  const h = await helper();
  for (
    const [source, mode] of [
      ["<", 0],
      ["<", 1],
      ["]]>", 0],
      ["&no;", 0],
      ["&no;", 1],
      ["\0", 2],
      ["\u000b", 1],
      ["&#0;", 0],
    ] as const
  ) {
    traps(() => h.string(source, mode));
    equal(h.string("ok", mode), '"ok"');
  }
  for (
    const args of [
      [-1, 0, 65536, 0],
      [2, 1, 65536, 0],
      [0, 262145, 65536, 0],
      [0, 0, 65535, 0],
      [0, 0, 196609, 0],
      [0, 0, 65536, 3],
    ]
  ) {
    traps(() => h.x.string(...args as [number, number, number, number]));
  }
  const full = "\\".repeat(65535);
  equal(encoder.encode(h.string(full, 2)).length, 131072);
  h.memory[196608] = 0x5a;
  traps(() => h.string(full + "\\", 2));
  equal(h.memory[196608], 0x5a);
  equal(h.string("", 0), '""');
  h.put("猫", 262141);
  const n = h.x.string(262141, 262144, 65536, 2);
  equal(decoder.decode(h.memory.subarray(65536, 65536 + n)), '"猫"');
});
