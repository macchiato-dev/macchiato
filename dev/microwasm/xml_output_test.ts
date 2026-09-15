import { SaxesParser } from "npm:saxes@6.0.0";
import {
  isChar,
  isNameChar,
  isNameStartChar,
} from "npm:xmlchars@2.2.0/xml/1.0/ed5.js";
import { assemble, toHex } from "./microwasm.ts";

function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
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
const encoder = new TextEncoder();
// These are string interiors, not whole XML documents: BOM is ordinary data.
const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
function isName(name: string) {
  const points = [...name].map((c) => c.codePointAt(0)!);
  return points.length > 0 && isNameStartChar(points[0]) &&
    points.slice(1).every(isNameChar);
}
async function helper() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [n, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      ["o", "transforms/00-xml-output"],
    ]
  ) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    imports[n] =
      (await WebAssembly.instantiate(built.bytes, imports)).instance.exports;
  }
  const o = imports.o as unknown as {
    memory: WebAssembly.Memory;
    scalar(start: number, end: number): [number, number];
    string(start: number, end: number, out: number, mode: number): number;
  };
  const memory = new Uint8Array(o.memory.buffer);
  const put = (s: string, offset = 0) => {
    const b = encoder.encode(s);
    memory.set(b, offset);
    return offset + b.length;
  };
  const raw = (s: string, mode: number, out = 65536) => {
    const end = put(s);
    const n = o.string(0, end, out, mode);
    equal(decoder.decode(memory.subarray(0, end)), s);
    return decoder.decode(memory.subarray(out, out + n));
  };
  const string = (s: string, mode: number, out = 65536) =>
    raw(JSON.stringify(s).slice(1, -1), mode, out);
  return { o, memory, put, raw, string };
}

function parsed(xml: string) {
  let text = "", attrs: unknown;
  const p = new SaxesParser({ xmlns: false });
  p.on("text", (t) => text += t);
  p.on("opentag", (t) => attrs = t.attributes);
  p.write(xml).close();
  return { text, attrs };
}

Deno.test("XML output: every BMP unit as raw or escaped JSON, astral pairs and end", async () => {
  const { o, put } = await helper();
  for (let cp = 0; cp <= 0xffff; cp++) {
    for (
      const input of [
        JSON.stringify(String.fromCharCode(cp)).slice(1, -1),
        "\\u" + cp.toString(16).padStart(4, "0"),
      ]
    ) {
      const end = put(input);
      if (isChar(cp)) equal(o.scalar(0, end), [cp, end]);
      else traps(() => o.scalar(0, end));
    }
  }
  for (
    const cp of [
      0x10000,
      0x10001,
      0x1f600,
      0xeffff,
      0xfffff,
      0x100000,
      0x10ffff,
    ]
  ) {
    const s = String.fromCodePoint(cp);
    for (
      const input of [
        s,
        [...Array(2)].map((_, i) => "\\u" + s.charCodeAt(i).toString(16)).join(
          "",
        ),
      ]
    ) {
      const end = put(input);
      equal(o.scalar(0, end), [cp, end]);
    }
  }
  equal(o.scalar(0, 0), [-1, 0]);
  equal(o.scalar(262144, 262144), [-1, 262144]);
  for (
    const s of [
      "\\ud800A",
      "\\ud800\\ud800",
      "\\udc00",
      "\\ud800",
      "\\u12",
      "\\q",
    ]
  ) {
    const end = put(s);
    traps(() => o.scalar(0, end));
  }
});

Deno.test("XML output: text and attribute escaping preserves data through XML parsing", async () => {
  const { string, raw } = await helper();
  equal(string('<&>"\t\n\r', 0), '&lt;&amp;&gt;"\t\n&#13;');
  equal(string('<&>"\t\n\r', 1), "&lt;&amp;&gt;&quot;&#9;&#10;&#13;");
  equal(raw("\\uD83D\\uDE00", 0), "😀");
  const parts = [
    "a",
    " ",
    "&amp;",
    "<script>",
    "]]>",
    "'\"",
    "\t\r\n",
    "é猫😀",
    "\\n",
    "`",
    "\ufeff",
  ];
  let seed = 0xabcdef;
  for (let i = 0; i < 1000; i++) {
    let value = "";
    for (let j = 0; j < i % 23; j++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      value += parts[seed % parts.length];
    }
    equal(parsed("<r>" + string(value, 0) + "</r>").text, value);
    equal(parsed('<r a="' + string(value, 1) + '"/>').attrs, { a: value });
  }
});

Deno.test("XML output: names validate decoded scalars rather than escape spelling", async () => {
  const { string, raw } = await helper();
  for (
    const name of [
      "a",
      "é:猫",
      "_",
      ":",
      "a-b.c",
      "á",
      "𐀀",
      "",
      "1a",
      "a b",
      "a/b",
      "<a",
      "😀",
      "\u{f0000}",
      "\ud800",
    ]
  ) {
    if (isName(name)) equal(string(name, 3), name);
    else traps(() => string(name, 3));
  }
  equal(raw("\\u0061\\u003a猫", 3), "a:猫");
});

Deno.test("XML output: literal contexts reject unrepresentable delimiters and normalization", async () => {
  const { string } = await helper();
  for (const mode of [2, 4, 5, 6]) {
    for (const s of ["", "a & b < c", "😀é", "one\n two"]) {
      equal(string(s, mode), s);
    }
    traps(() => string("a\rb", mode));
  }
  for (const s of ["--", "a--b", "ends-", "---"]) traps(() => string(s, 4));
  equal(string("-a-b", 4), "-a-b");
  for (const s of ["]]>", "a]]>b", "]]]>"]) traps(() => string(s, 5));
  equal(string("] >?", 5), "] >?");
  equal(string("]]> is okay in a comment", 4), "]]> is okay in a comment");
  for (const s of ["?>", "a?>b", " data", "\tdata", "\ndata"]) {
    traps(() => string(s, 6));
  }
  equal(string("? >\n", 6), "? >\n");
  equal(string("--?>]]>", 2), "--?>]]>");
});

Deno.test("XML output: forbidden characters fail in every mode, malformed encoding and recovery", async () => {
  const { string, raw, memory, o } = await helper();
  for (let mode = 0; mode <= 6; mode++) {
    for (
      const s of ["\0", "\x01", "\x0b", "\ufffe", "\uffff", "\ud800", "\udfff"]
    ) {
      traps(() => string(s, mode));
      equal(string("ok", mode), "ok");
    }
  }
  for (
    const bad of [[0xc0, 0x80], [0xe2, 0x28, 0xa1], [0xed, 0xa0, 0x80], [
      0xf4,
      0x90,
      0x80,
      0x80,
    ], [0x80]]
  ) {
    memory.set(bad);
    traps(() => o.string(0, bad.length, 65536, 0));
  }
  for (const mode of [-1, 7, 999]) traps(() => raw("ok", mode));
  equal(string("recovered", 0), "recovered");
});

Deno.test("XML output: exact output boundary, arbitrary source page and no scratch writes", async () => {
  const { string, memory, o, put } = await helper();
  memory.fill(0xa5, 196608);
  const value = '"'.repeat(21845) + "aa";
  const out = string(value, 1);
  equal(out.length, 131072);
  equal(out, "&quot;".repeat(21845) + "aa");
  traps(() => string(value + "b", 1));
  equal(memory.subarray(196608).every((b) => b === 0xa5), true);
  const start = 262144 - 6;
  const end = put("\\u0061", start);
  equal(o.string(start, end, 65536, 3), 1);
  equal(memory[65536], 97);
  equal(o.string(0, 0, 196608, 0), 0);
  traps(() => o.string(start, end, 196608, 0));
  for (
    const [start, end, out] of [
      [-1, 1, 65536],
      [2, 1, 65536],
      [0, 262145, 65536],
      [0, 0, 65535],
      [0, 0, 196609],
    ]
  ) {
    traps(() => o.string(start, end, out, 0));
  }
  equal(string("final", 0), "final");
});
