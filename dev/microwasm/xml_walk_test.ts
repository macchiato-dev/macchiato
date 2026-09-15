import { SaxesParser } from "npm:saxes@6.0.0";
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
type Token = [number, number, number, number, number, number];
type Attribute = [number, number, number, number, number];
const encoder = new TextEncoder(), decoder = new TextDecoder();
async function helper() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      ["v", "transforms/26-xml-to-list"],
      ["w", "transforms/00-xml-walk"],
    ]
  ) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    imports[name] =
      (await WebAssembly.instantiate(built.bytes, imports)).instance.exports;
  }
  const w = imports.w as unknown as {
    memory: WebAssembly.Memory;
    next(start: number, end: number): Token;
    attribute(start: number, end: number): Attribute;
    skip(start: number, end: number): number;
  };
  const v = imports.v as unknown as {
    readSpan(start: number, end: number): number;
  };
  const x = imports.x as unknown as {
    string(start: number, end: number, output: number, mode: number): number;
  };
  const memory = new Uint8Array(w.memory.buffer);
  function put(source: string, start = 0) {
    const bytes = encoder.encode(source);
    if (start + bytes.length > 65536) throw Error("Test input too long");
    memory.set(bytes, start);
    return start + bytes.length;
  }
  const raw = (s: number, e: number) => decoder.decode(memory.subarray(s, e));
  function value(s: number, e: number, mode: number): string {
    const n = x.string(s, e, 65536, mode);
    return JSON.parse(raw(65536, 65536 + n));
  }
  function attrs(s: number, e: number) {
    const result: Record<string, string> = {};
    while (s < e) {
      const [ns, ne, vs, ve, next] = w.attribute(s, e);
      if (ns === 0 && ne === 0) {
        equal(next, e);
        break;
      }
      if (next <= s || next > e) throw Error("Attribute made no progress");
      result[raw(ns, ne)] = value(vs, ve, 1);
      s = next;
    }
    return result;
  }
  function events(source: string, start = 0) {
    const end = put(source, start);
    v.readSpan(start, end);
    const result: unknown[] = [];
    let cursor = start;
    // A BOM is document framing, not a text node.
    if (source.startsWith("\ufeff")) cursor += 3;
    while (cursor < end) {
      const [kind, ns, ne, vs, ve, next] = w.next(cursor, end);
      if (next <= cursor || next > end) throw Error("Token made no progress");
      const name = raw(ns, ne);
      if (kind === 1 || kind === 3) {
        result.push(["open", name, attrs(vs, ve)]);
        if (kind === 3) result.push(["close", name]);
      } else if (kind === 2) result.push(["close", name]);
      else if (kind === 4) result.push(["text", value(vs, ve, 0)]);
      else if (kind === 5) result.push(["cdata", value(vs, ve, 2)]);
      else if (kind === 6) result.push(["comment", value(vs, ve, 2)]);
      else if (kind === 7 && name !== "xml") {
        result.push(["pi", name, value(vs, ve, 2)]);
      } else if (kind !== 7) throw Error("Unexpected token");
      cursor = next;
    }
    equal(w.next(end, end), [0, 0, 0, 0, 0, end]);
    return result;
  }
  return { w, v, memory, put, raw, value, attrs, events };
}

function oracle(source: string) {
  const result: unknown[] = [];
  const parser = new SaxesParser();
  parser.on(
    "opentag",
    (tag) => result.push(["open", tag.name, tag.attributes]),
  );
  parser.on("closetag", (tag) => result.push(["close", tag.name]));
  parser.on("text", (text) => result.push(["text", text]));
  parser.on("cdata", (text) => result.push(["cdata", text]));
  parser.on("comment", (text) => result.push(["comment", text]));
  parser.on(
    "processinginstruction",
    (pi) => result.push(["pi", pi.target, pi.body]),
  );
  parser.write(source).close();
  return result;
}

Deno.test("XML walk: exact tag, attribute, text and literal-content spans", async () => {
  const h = await helper();
  const source =
    "<a x=\"/>\" y='&amp;'>one<b/>two<![CDATA[</a>]]><!--c--><?p d?></a>";
  const end = h.put(source);
  h.v.readSpan(0, end);
  const first = h.w.next(0, end);
  equal(first, [1, 1, 2, 2, 19, 20]);
  equal(h.w.attribute(first[3], first[4]), [3, 4, 6, 8, 9]);
  equal(h.w.attribute(9, first[4]), [10, 11, 13, 18, 19]);
  equal(h.w.attribute(19, 19), [0, 0, 0, 0, 19]);
  equal(h.w.next(20, end), [4, 0, 0, 20, 23, 23]);
  equal(h.w.next(23, end), [3, 24, 25, 25, 25, 27]);
  equal(h.w.skip(23, end), 27);
  equal(h.w.skip(0, end), end);
  equal(h.events(source), oracle(source));
});

Deno.test("XML walk: 500 generated trees agree with independent XML events", async () => {
  const h = await helper();
  let state = 0x61747472;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
  const pick = <T>(a: T[]) => a[random() % a.length];
  const pieces = [
    "text",
    "&lt;&amp;&gt;",
    "猫😀",
    "&#13;&#10;",
    "\r\n",
    "",
    "&quot;'\\n",
  ];
  function tree(depth: number): string {
    const name = pick(["a", "b", "rss", "item", "猫", "p:element"]);
    const attrs = ` x="${pick(pieces)}" y='value &quot; /&gt;'`;
    if (random() % 5 === 0) return `<${name}${attrs}/>`;
    const children: string[] = [];
    const count = random() % 5;
    for (let i = 0; i < count; i++) {
      const choice = random() % 6;
      if (choice === 0 && depth < 5) children.push(tree(depth + 1));
      else if (choice === 1) children.push("<![CDATA[<fake/> &amp; 猫\r\n]]>");
      else if (choice === 2) children.push("<!-- inert <item> -->");
      else if (choice === 3) children.push("<?instruction some data ?>");
      else children.push(pick(pieces));
    }
    return `<${name}${attrs}>${children.join("")}</${name}>`;
  }
  for (let i = 0; i < 500; i++) {
    const xml = tree(0);
    equal(h.events(xml, i % 31), oracle(xml));
  }
});

Deno.test("XML walk: skip returns after the subtree, not after its sibling", async () => {
  const h = await helper();
  const source =
    '<r><a><b x="/>"/><c><![CDATA[</a>]]></c></a><s/><!--tail--></r>';
  const end = h.put(source);
  h.v.readSpan(0, end);
  equal(h.w.skip(3, end), source.indexOf("<s/>"));
  equal(h.w.skip(source.indexOf("<s/>"), end), source.indexOf("<!--tail-->"));
  equal(h.w.skip(0, end), end);
  for (let depth = 1; depth <= 31; depth++) {
    const xml = "<a>".repeat(depth) + "<e/>" + "</a>".repeat(depth);
    const n = h.put(xml);
    h.v.readSpan(0, n);
    equal(h.w.skip(0, n), n);
  }
  const fullDepth = h.put("<a>".repeat(32) + "text" + "</a>".repeat(32));
  h.v.readSpan(0, fullDepth);
  equal(h.w.skip(0, fullDepth), fullDepth);
  const tooDeepEmpty = h.put("<a>".repeat(32) + "<e/>" + "</a>".repeat(32));
  traps(() => h.w.skip(0, tooDeepEmpty));
  traps(() => h.v.readSpan(0, tooDeepEmpty));
  const n = h.put("<a>".repeat(33) + "</a>".repeat(33));
  traps(() => h.w.skip(0, n));
  traps(() => h.v.readSpan(0, n));
});

Deno.test("XML walk: normalization is deferred until the caller decodes a span", async () => {
  const h = await helper();
  const xml =
    '\ufeff<?xml version="1.0"?><r x="a\r\nb&#9;c">a\r\nb&#13;<![CDATA[c\r\nd]]></r>';
  equal(h.events(xml, 127), oracle(xml));
  const n = h.put('<r x="a&#10;b">x&amp;y</r>');
  const token = h.w.next(0, n);
  const attribute = h.w.attribute(token[3], token[4]);
  equal(h.raw(attribute[2], attribute[3]), "a&#10;b");
  equal(h.value(attribute[2], attribute[3], 1), "a\nb");
  const text = h.w.next(token[5], n);
  equal(h.raw(text[3], text[4]), "x&amp;y");
  equal(h.value(text[3], text[4], 0), "x&y");
});

Deno.test("XML walk: bad intervals and incomplete delimiters trap, then recover", async () => {
  const h = await helper();
  for (const [start, end] of [[-1, 5], [5, 4], [0, 65537], [65537, 65537]]) {
    traps(() => h.w.next(start, end));
    traps(() => h.w.attribute(start, end));
    traps(() => h.w.skip(start, end));
  }
  for (
    const s of [
      "<",
      "</",
      "<a",
      "<a/",
      "<a x=",
      '<a x="',
      "<!",
      "<!--",
      "<![CDATA[",
      "<?p",
      "<!DOCTYPE r>",
    ]
  ) {
    traps(() => h.w.next(0, h.put(s)));
  }
  for (const s of ["=x", "x", "x=", "x=no", 'x="unterminated']) {
    traps(() => h.w.attribute(0, h.put(s)));
  }
  for (const s of ["", "text", "</r>", "<!--c-->", "<r>", "<r><s/>"]) {
    traps(() => h.w.skip(0, h.put(s)));
  }
  // Validation is required, not claimed as part of this low-level cursor.
  for (
    const s of [
      '<r x="1" x="2"/>',
      "<r></s>",
      "<r>&unknown;</r>",
      '<r x="1"y="2"/>',
    ]
  ) {
    traps(() => h.v.readSpan(0, h.put(s)));
  }
  equal(
    h.events("<r><item>recovered</item></r>"),
    oracle("<r><item>recovered</item></r>"),
  );
});

Deno.test("XML walk: exact source boundary, reentrancy and no memory writes", async () => {
  const h = await helper();
  const xml = '<r a="' + "x".repeat(65536 - 13) + '">y</r>';
  equal(encoder.encode(xml).length, 65536);
  const end = h.put(xml);
  h.v.readSpan(0, end);
  const before = h.memory.slice();
  const root = h.w.next(0, end);
  const attribute = h.w.attribute(root[3], root[4]);
  equal(attribute[3] - attribute[2], 65536 - 13);
  equal(h.w.skip(0, end), end);
  equal(h.w.next(root[5], end)[0], 4);
  equal(h.w.next(0, end), root);
  equal(h.w.attribute(root[3], root[4]), attribute);
  equal(toHex(h.memory), toHex(before));
  equal(h.w.next(65536, 65536), [0, 0, 0, 0, 0, 65536]);
  equal(h.w.attribute(65536, 65536), [0, 0, 0, 0, 65536]);
});
