import { decodeHTML, decodeHTMLAttribute } from "npm:entities@6.0.1";
import { assemble, toHex } from "./microwasm.ts";

function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  }
}
function traps(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) return;
    throw error;
  }
  throw Error("Expected Wasm trap");
}
async function helper() {
  const memory = new WebAssembly.Memory({ initial: 4, maximum: 4 });
  const k = (await WebAssembly.instantiate(
    assemble(
      await Deno.readTextFile(
        new URL("transforms/00-json-string-keys.md", import.meta.url),
      ),
    ).bytes,
    { n: { memory } },
  )).instance.exports;
  const source = await Deno.readTextFile(
    new URL("transforms/00-html-characters.md", import.meta.url),
  );
  const built = assemble(source);
  equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
  const module = await WebAssembly.compile(built.bytes);
  equal(WebAssembly.Module.imports(module), [
    { module: "k", name: "next", kind: "function" },
    { module: "k", name: "memory", kind: "memory" },
  ]);
  const h = (await WebAssembly.instantiate(module, { k }))
    .exports as unknown as {
      next(
        start: number,
        end: number,
        attribute: number,
        pending: number,
      ): number[];
      lookup(start: number, end: number): number;
    };
  const bytes = new Uint8Array(memory.buffer);
  bytes.fill(0xa5, 65536, 196608);
  const untouched = bytes.slice(65536);
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  function decode(input: string, attribute = 0, offset = 0) {
    const b = encoder.encode(input);
    if (offset + b.length > 65536) throw Error("Test input too big");
    bytes.set(b, offset);
    let cursor = offset, pending = 0, output = "", calls = 0;
    for (;;) {
      const [cp, next, later] = h.next(
        cursor,
        offset + b.length,
        attribute,
        pending,
      );
      if (next < cursor || next > offset + b.length) {
        throw Error("Cursor escaped span");
      }
      if (++calls > b.length * 2 + 1) throw Error("No iterator progress");
      cursor = next;
      pending = later;
      if (cp === -1) break;
      output += String.fromCodePoint(cp);
    }
    equal(cursor, offset + b.length);
    equal(pending, 0);
    return output;
  }
  function unchanged() {
    if (bytes.subarray(65536).some((b, i) => b !== untouched[i])) {
      throw Error("Helper wrote memory");
    }
  }
  const view = new DataView(memory.buffer);
  const entries = Array.from({ length: 2231 }, (_, i) => {
    const pointer = 0x33000 + view.getUint16(0x31000 + 2 * i, true);
    const length = bytes[pointer];
    return {
      name: decoder.decode(bytes.subarray(pointer + 1, pointer + 1 + length)),
      pointer,
      cp: view.getUint32(pointer + 1 + length, true),
      pending: view.getUint32(pointer + 5 + length, true),
    };
  });
  return { h, bytes, decode, unchanged, entries, encoder };
}

Deno.test("HTML characters: all standard named references, aliases and pending scalars", async () => {
  const c = await helper();
  let previous = "";
  for (const entry of c.entries) {
    if (entry.name <= previous) {
      throw Error("Reference table is not sorted and unique");
    }
    previous = entry.name;
    c.bytes.set(c.encoder.encode(entry.name));
    equal(c.h.lookup(0, entry.name.length), entry.pointer);
    equal(c.decode("&" + entry.name), decodeHTML("&" + entry.name));
    equal(c.decode("&" + entry.name, 1), decodeHTMLAttribute("&" + entry.name));
    const values = [entry.cp, ...(entry.pending ? [entry.pending] : [])];
    equal(String.fromCodePoint(...values), decodeHTML("&" + entry.name));
  }
  c.unchanged();
});

Deno.test("HTML characters: longest names and attribute ambiguity", async () => {
  const c = await helper();
  const sources = [
    "&notin;",
    "&notit;",
    "&notin",
    "&AMP;",
    "&Amp;",
    "&amp=1",
    "&amp;=1",
    "&copyword",
    "&copy;word",
    "&copy!",
    "&no-such;",
    "&",
    "&&amp;",
    "&#",
    "&#x",
    "&CounterClockwiseContourIntegral;",
    "&CounterClockwiseContourIntegralx;",
    "&" + "a".repeat(100),
    "&NotEqualTilde;&fjlig;",
    "&amp;&amp&notin;",
  ];
  for (const { name } of c.entries.filter((e) => !e.name.endsWith(";"))) {
    for (const suffix of ["=value", "x", "7", "!", "&amp;"]) {
      sources.push("&" + name + suffix);
    }
  }
  for (const source of sources) {
    for (const attribute of [0, 1]) {
      equal(
        c.decode(source, attribute, 17),
        (attribute ? decodeHTMLAttribute : decodeHTML)(source),
      );
    }
  }
  c.bytes.set(c.encoder.encode("&fjlig;"));
  equal(c.h.next(0, 7, 0, 0), [102, 7, 106]);
  equal(c.h.next(7, 7, 0, 106), [106, 7, 0]);
  equal(c.h.next(7, 7, 0, 0), [-1, 7, 0]);
  c.unchanged();
});

Deno.test("HTML numeric references: every BMP value, C1 mapping, overflow and malformed digits", async () => {
  const c = await helper();
  for (let cp = 0; cp <= 65535; cp++) {
    const source = `&#${cp};`;
    equal(c.decode(source), decodeHTML(source));
  }
  for (
    const cp of [0x10000, 0x1f600, 0x10ffff, 0x110000, 0xffffffff, 4294967361]
  ) {
    for (const prefix of ["", "x", "X"]) {
      const source = "&#" + prefix + cp.toString(prefix ? 16 : 10) + ";";
      equal(c.decode(source), decodeHTML(source));
    }
  }
  for (let byte = 0; byte < 128; byte++) {
    for (const prefix of ["&#", "&#x", "&#X", "&#12", "&#x12"]) {
      const source = prefix + String.fromCharCode(byte) + ";Z";
      // Normalize raw input, not a CR produced by a numeric reference.
      equal(
        c.decode(source),
        decodeHTML(source.replace(/\r\n?/g, "\n")),
      );
    }
  }
  for (
    const source of [
      "&#00000000000000065;",
      "&#999999999999999999999999999999999999;",
      "&#xFFFFFFFFFFFFFFFFFFFFFFFFFFF;",
      "&#12no;",
      "&#x;",
      "&#;",
      "&#-1;",
      "&#x1g;",
    ]
  ) {
    equal(c.decode(source), decodeHTML(source));
  }
  c.unchanged();
});

Deno.test("HTML raw characters: UTF-8, line endings and references do not share normalization", async () => {
  const c = await helper();
  for (const mode of [0, 1]) {
    equal(
      c.decode("A\r\nB\rC\tD\0猫😀", mode),
      "A\nB\nC\tD" + (mode ? "\ufffd" : "\0") + "猫😀",
    );
    equal(c.decode("&#13;\r&#10;\t&#9;", mode), "\r\n\n\t\t");
    equal(c.decode("\\u1234 <tag> \ufffe", mode), "\\u1234 <tag> \ufffe");
  }
  for (
    const invalid of [
      [0x80],
      [0xc0, 0x80],
      [0xe0, 0x80, 0x80],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0xf0, 0x90],
    ]
  ) {
    c.bytes.set(invalid);
    traps(() => c.h.next(0, invalid.length, 0, 0));
  }
  equal(c.decode("Recovered &amp; ready"), "Recovered & ready");
  c.unchanged();
});

Deno.test("HTML character spans: exact limits, malformed public calls and no writes", async () => {
  const c = await helper();
  equal(c.decode("x".repeat(65536)).length, 65536);
  equal(c.decode("&amp;", 1, 65531), "&");
  equal(c.h.next(65536, 65536, 0, 0), [-1, 65536, 0]);
  for (
    const [start, end, mode, pending] of [
      [-1, 1, 0, 0],
      [1, 0, 0, 0],
      [0, 65537, 0, 0],
      [0, 0, 2, 0],
      [0, 0, 0, -1],
      [0, 0, 0, 0xd800],
      [0, 0, 0, 0x110000],
    ]
  ) {
    traps(() => c.h.next(start, end, mode, pending));
  }
  for (const [start, end] of [[-1, 0], [1, 0], [0, 65537]]) {
    traps(() => c.h.lookup(start, end));
  }
  equal(c.h.lookup(0, 0), 0);
  equal(c.decode("&amp;"), "&");
  c.unchanged();
});
