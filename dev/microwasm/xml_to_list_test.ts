import { SaxesParser } from "npm:saxes@6.0.0";
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
const fence = (xml: string, ticks = 3) =>
  "`".repeat(ticks) + "xml\n" + xml + "\n" + "`".repeat(ticks) + "\n";

type Tree = string | Tree[] | { [key: string]: Tree };
function markdown(tree: Tree, depth = 0, key = ""): string {
  const prefix = "  ".repeat(depth) + "- " + key;
  if (typeof tree === "string") return prefix + JSON.stringify(tree) + "\n";
  if (Array.isArray(tree)) {
    return prefix + "[]\n" + tree.map((v) => markdown(v, depth + 1)).join("");
  }
  return prefix + "{}\n" +
    Object.entries(tree).map(([k, v]) =>
      markdown(v, depth + 1, JSON.stringify(k) + " ")
    ).join("");
}

// Independent XML parser used only in tests, never in the shipped transform.
function reference(xml: string): Tree[] {
  const root: Tree[] = [], stack = [root];
  const append = (node: Tree) => stack.at(-1)!.push(node);
  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", (tag) => {
    const children: Tree[] = [];
    append({ element: tag.name, attributes: tag.attributes, children });
    stack.push(children);
  });
  parser.on("closetag", () => stack.pop());
  parser.on("text", (text) => append({ text }));
  parser.on("comment", (comment) => append({ comment }));
  parser.on("cdata", (cdata) => append({ cdata }));
  parser.on(
    "processinginstruction",
    ({ target, body }) => append({ pi: target, data: body }),
  );
  parser.on("xmldecl", (fields) => {
    append({
      declaration: Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      ),
    });
  });
  parser.write(xml).close();
  return root;
}

async function reader() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      ["t", "transforms/26-xml-to-list"],
    ]
  ) {
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
  const literals = memory.slice(196608);
  function bytes(input: Uint8Array) {
    memory.set(input);
    try {
      const size = run(input.length);
      return decoder.decode(memory.subarray(65536, 65536 + size));
    } finally {
      equal(toHex(memory.subarray(0, input.length)), toHex(input));
      equal(toHex(memory.subarray(196608)), toHex(literals));
    }
  }
  const convert = (input: string) => bytes(encoder.encode(input));
  return { memory, run, bytes, convert };
}

Deno.test("XML reader: ordered nodes, attributes, mixed content and normalization", async () => {
  const r = await reader();
  for (
    const xml of [
      "<x/>",
      "<x></x>",
      "<r>one<b/>two<b/>three</r>",
      '<note priority="high">Hello <b>Ben</b> &amp; friends.</note>',
      "<!--before--><r/>\t\r<?after?>\n",
      '<r a="\t\r\n\r\n&#9;&#10;&#13;">a\r\nb\rc\n&amp;&lt;&gt;&quot;&apos;</r>',
      "<r a=\"&lt;'\" b='&quot;\"'><![CDATA[<raw>&x;]]><!-- hi --><?go   yes  ?></r>",
      "<r><![CDATA[]]><a/> \n <a/><!-- --><![CDATA[a]]><![CDATA[b]]></r>",
      '<r __proto__="x" constructor="y" A="1" a="2"/>',
      '<é:猫 xmlns:é="urn:example" á="yes"><𐀀>😀\\n</𐀀></é:猫>',
      '<?xml version="1.0"?><r/>',
      '\ufeff<?xml version=\'1.0\' encoding="uTf-8" standalone="yes"?>\n<r/>',
      '<?xml version="1.0" standalone="no"?><r/>',
      '<?xml version="1.0" encoding="UTF-8"?><r>\ufeff</r>',
      '<?xml-stylesheet href="inert"?><r><?XMLish?><?a\r\n  hello\rworld ?></r>',
      "<r>]]&gt; &#x1F600; &#0000065; &#x000041;</r>",
    ]
  ) {
    equal(r.convert(fence(xml)), markdown(reference(xml)));
  }
  // Saxes deliberately discards whitespace before the first markup. This
  // representation retains it, so test that contract without that oracle.
  equal(
    r.convert(fence("\r\n \t<!--before--><r/>")),
    markdown([{ text: "\n \t" }, ...reference("<!--before--><r/>")]),
  );
});

Deno.test("XML reader: 600 generated documents agree with an independent parser", async () => {
  const r = await reader();
  let seed = 0x2134abcd;
  function pick<T>(values: T[]): T {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return values[seed % values.length];
  }
  const values = [
    "",
    "Ben",
    "猫😀",
    "&amp;",
    "&lt;",
    "&#13;",
    "\r\n",
    "\\n",
    "a b",
    "&quot;",
  ];
  function element(depth: number): string {
    const name = pick(["r", "cat", "é", "ns:thing", "_x"]);
    const attributes = Array.from(
      { length: pick([0, 1, 2, 5]) },
      (_, i) => ` a${i}="${pick(values)}${pick(values)}"`,
    ).join("");
    if (pick([true, false])) return `<${name}${attributes}/>`;
    const children = Array.from({ length: pick([0, 1, 2, 3]) }, () =>
      pick([
        pick(values) + pick(values),
        "<!--comment-->",
        "<![CDATA[<data>&]]>",
        "<?go data?>",
        depth < 4 ? element(depth + 1) : "<leaf/>",
      ])).join("");
    return `<${name}${attributes}>${children}</${name}>`;
  }
  for (let i = 0; i < 600; i++) {
    const xml = pick(["", "<?xml version='1.0'?>", "<!--start-->\n"]) +
      element(0) + pick(["", "\n", "<?end?>"]);
    equal(r.convert(fence(xml)), markdown(reference(xml)));
  }
});

Deno.test("XML reader: malformed structure, references, declarations and recovery", async () => {
  const r = await reader();
  for (
    const xml of [
      "",
      " ",
      "text",
      "<!-- only -->",
      "<a/><b/>",
      "<a>lost",
      "<a></A>",
      "<a><b></a></b>",
      "</a>",
      "<a/>text",
      "x<a/>",
      "<![CDATA[x]]><a/>",
      "<!DOCTYPE a><a/>",
      '<!DOCTYPE a [<!ENTITY x "y">]><a>&x;</a>',
      "<1a/>",
      "<a! />",
      "<a/ >",
      "<a / >",
      "<a></a x>",
      '<a x="1"x="2"/>',
      '<a x="1" x="2"/>',
      '<a x="1" y="2" x="3"/>',
      '<a é="1" é="2"/>',
      '<a x="a" y/>',
      '<a x "a"/>',
      "<a x=a/>",
      '<a x="a/>',
      '<a x="<"/>',
      "<a>&unknown;</a>",
      "<a>&#0;</a>",
      "<a>&#xD800;</a>",
      "<a>&#1114112;</a>",
      "<a>&#;</a>",
      "<a>&amp</a>",
      "<a>]]></a>",
      "<a><!-- --x --></a>",
      "<a><!--x---></a>",
      "<a><!--x</a>",
      "<a><![CDATA[x</a>",
      "<a><?go x</a>",
      "<a><?go!?></a>",
      "<a><?p?data?></a>",
      "<?XML?><a/>",
      "<?Xml version='1.0'?><a/>",
      "<a><?xml version='1.0'?></a>",
      " <?xml version='1.0'?><a/>",
      "<?xml?><a/>",
      "<?xml version='1.1'?><a/>",
      "<?xml encoding='UTF-8' version='1.0'?><a/>",
      "<?xml version='1.0' encoding='ASCII'?><a/>",
      "<?xml version='1.0' version='1.0'?><a/>",
      "<?xml version='1.0' standalone='yes' encoding='UTF-8'?><a/>",
      "<?xml version='1.0' standalone='YES'?><a/>",
      "<?xml version='1.0' standalone='yes' standalone='no'?><a/>",
      "<?xml version='1.0'encoding='UTF-8'?><a/>",
      "<?xml version='&#49;.0'?><a/>",
      "<?xml version='1.0'?><?xml version='1.0'?><a/>",
    ]
  ) {
    try {
      traps(() => r.convert(fence(xml)));
    } catch (e) {
      throw new Error(`Accepted invalid XML ${JSON.stringify(xml)}`, {
        cause: e,
      });
    }
    equal(r.convert(fence("<ok/>")), markdown(reference("<ok/>")));
  }
});

Deno.test("XML reader: raw forbidden characters and malformed UTF-8 in all node contexts", async () => {
  const r = await reader();
  for (
    const bad of [
      [0],
      [1],
      [0xc0, 0x80],
      [0xe2, 0x28, 0xa1],
      [0xed, 0xa0, 0x80],
      [0xef, 0xbf, 0xbe],
      [0xf4, 0x90, 0x80, 0x80],
    ]
  ) {
    for (
      const [before, after] of [
        ["<r>", "</r>"],
        ['<r a="', '"/>'],
        ["<r><!--", "--></r>"],
        ["<r><![CDATA[", "]]></r>"],
        ["<?go ", "?><r/>"],
        ["<", "/>"],
      ]
    ) {
      const a = encoder.encode("```xml\n" + before),
        b = encoder.encode(after + "\n```\n");
      traps(() => r.bytes(new Uint8Array([...a, ...bad, ...b])));
    }
  }
  equal(r.convert(fence("<ok/>")), markdown(reference("<ok/>")));
});

Deno.test("XML reader: single-character edits agree on structure and rejection", async () => {
  const r = await reader();
  const source =
    '<r a="1" b="&amp;"><x/>text<!--ok--><![CDATA[x]]><?p data?></r>';
  const replacements = [
    "<",
    ">",
    "/",
    "?",
    "!",
    "=",
    '"',
    "'",
    "&",
    ";",
    "-",
    " ",
    "\n",
    "a",
    "0",
  ];
  for (let position = 1; position < source.length; position++) {
    for (const replacement of replacements) {
      const xml = source.slice(0, position) + replacement +
        source.slice(position + 1);
      // Saxes 6 accepts this missing PI separator. XML production 16 requires
      // whitespace before data; Chromium rejects it too. Keep this explicit
      // counterexample rather than copying the oracle's acceptance bug.
      // https://www.w3.org/TR/xml/#sec-pi
      if (xml.includes("<?p?data?>")) {
        reference(xml); // Confirm this remains the known oracle disagreement.
        traps(() => r.convert(fence(xml)));
        continue;
      }
      let expected: Tree[];
      try {
        expected = reference(xml);
      } catch {
        traps(() => r.convert(fence(xml)));
        continue;
      }
      try {
        equal(r.convert(fence(xml)), markdown(expected));
      } catch (e) {
        throw new Error(`XML edit disagrees: ${JSON.stringify(xml)}`, {
          cause: e,
        });
      }
    }
  }
});

Deno.test("XML reader: Markdown fences cannot hide an earlier closing line", async () => {
  const r = await reader();
  for (const ticks of [3, 4, 7, 128, 256]) {
    const xml = "<r>\n<![CDATA[\n" + "`".repeat(ticks - 1) + "\n]]></r>";
    equal(r.convert(fence(xml, ticks)), markdown(reference(xml)));
    equal(
      r.convert(fence(xml, ticks).replaceAll("\n", "\r\n")),
      markdown(reference(xml)),
    );
    equal(
      r.convert(fence("<r/>", ticks) + " \t\r\n"),
      markdown(reference("<r/>")),
    );
    for (const indentation of ["", " ", "  ", "   "]) {
      const close = indentation + "`".repeat(ticks) + " \t";
      traps(() =>
        r.convert(fence("<r><![CDATA[\n" + close + "\n]]></r>", ticks))
      );
    }
  }
  for (
    const input of [
      "```XML\n<r/>\n```",
      "``xml\n<r/>\n```",
      "```xml <r/>\n```",
      "```xml\n<r/>```",
      "````xml\n<r/>\n```",
      "```xml\n<r/>\n``` suffix",
    ]
  ) {
    traps(() => r.convert(input));
  }
});

Deno.test("XML reader: exact input cap, bounded output, nesting and trap recovery", async () => {
  const r = await reader();
  const depth = (n: number) => "<a>".repeat(n) + "</a>".repeat(n);
  equal(r.convert(fence(depth(32))), markdown(reference(depth(32))));
  traps(() => r.convert(fence(depth(33))));
  const base = fence("<r></r>");
  const text = "a".repeat(65536 - encoder.encode(base).length);
  const exact = fence("<r>" + text + "</r>");
  equal(encoder.encode(exact).length, 65536);
  equal(r.convert(exact), markdown(reference("<r>" + text + "</r>")));
  traps(() => r.convert(exact + " "));
  traps(() => r.run(-1));
  const emptyTextSize = markdown([{
    element: "r",
    attributes: {},
    children: [{ text: "" }],
  }]).length;
  const room = 131072 - emptyTextSize;
  const expanded = "\\".repeat(Math.floor(room / 2)) + "a".repeat(room % 2);
  const fullOutput = r.convert(fence("<r>" + expanded + "</r>"));
  equal(encoder.encode(fullOutput).length, 131072);
  equal(fullOutput, markdown(reference("<r>" + expanded + "</r>")));
  traps(() => r.convert(fence("<r>" + expanded + "b</r>")));
  // Many tiny nodes expand much more than their source. The output limit must
  // fail before a write reaches the literals in the fourth page.
  traps(() => r.convert(fence("<r>" + "<x/>".repeat(5000) + "</r>")));
  const siblings = "<r>" + "<x/>".repeat(1000) + "</r>";
  equal(r.convert(fence(siblings)), markdown(reference(siblings)));
  const wide = "<r" +
    Array.from({ length: 500 }, (_, i) => ` a${i}="${i}"`).join("") +
    "/>";
  equal(r.convert(fence(wide)), markdown(reference(wide)));
  equal(r.convert(fence("<ok/>")), markdown(reference("<ok/>")));
});
