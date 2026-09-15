import { Parser } from "npm:commonmark@0.31.2";
import { SaxesParser } from "npm:saxes@6.0.0";
import { assemble, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
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
const encoder = new TextEncoder(), decoder = new TextDecoder();
type Outline = { text: string; url?: string; children: Outline[] };
type Book = { title?: string; outlines: Outline[] };
const node = (text: string, children: Outline[] = [], url?: string): Outline =>
  url === undefined ? { text, children } : { text, url, children };
const fence = (xml: string, ticks = 3) =>
  "`".repeat(ticks) + "opml\n" + xml + "\n" + "`".repeat(ticks) + "\n";
const document = (body: string, head = "", version = "2.0") =>
  `<opml version="${version}"><head>${head}</head><body>${body}</body></opml>`;
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")
    .replaceAll("\r", "&#13;").replaceAll("\n", "&#10;").replaceAll(
      "\t",
      "&#9;",
    );

async function tool(writer = false) {
  // Separate calls create separate memories. The writer's data segment must
  // not overwrite the XML reader's literal table when testing round trips.
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      writer
        ? ["o", "transforms/00-xml-output"]
        : ["v", "transforms/26-xml-to-list"],
      [
        "t",
        `transforms/${writer ? "28-outline-to-opml" : "29-opml-to-outline"}`,
      ],
    ]
  ) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    imports[name] =
      (await WebAssembly.instantiate(built.bytes, imports)).instance.exports;
  }
  const t = imports.t as unknown as {
    memory: WebAssembly.Memory;
    run(n: number): number;
  };
  const memory = new Uint8Array(t.memory.buffer),
    literals = memory.slice(196608);
  function bytes(input: Uint8Array) {
    if (input.length > 65536) throw Error("Input exceeds test helper capacity");
    memory.set(input);
    const n = t.run(input.length);
    equal([...memory.subarray(0, input.length)], [...input]);
    equal([...memory.subarray(196608)], [...literals]);
    return decoder.decode(memory.subarray(65536, 65536 + n));
  }
  return { t, memory, bytes, run: (s: string) => bytes(encoder.encode(s)) };
}

// Independent selected-data oracle, not a second implementation shipped to
// the browser. It intentionally ignores the metadata this conversion omits.
function xmlBook(xml: string): Book {
  const outlines: Outline[] = [], lists = [outlines], tags: string[] = [];
  let title: string | undefined;
  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", ({ name, attributes }) => {
    if (name === "outline" && ["body", "outline"].includes(tags.at(-1)!)) {
      const type = String(attributes.type ?? "").toLowerCase();
      const url = type === "rss"
        ? attributes.xmlUrl
        : ["link", "include"].includes(type)
        ? attributes.url
        : undefined;
      const item = node(String(attributes.text), [], url as string | undefined);
      lists.at(-1)!.push(item);
      lists.push(item.children);
    }
    if (name === "title" && tags.join("/") === "opml/head") title = "";
    tags.push(name);
  });
  parser.on("closetag", () => {
    const name = tags.pop();
    if (name === "outline" && ["body", "outline"].includes(tags.at(-1)!)) {
      lists.pop();
    }
  });
  const text = (s: string) => {
    if (tags.join("/") === "opml/head/title") title += s;
  };
  parser.on("text", text);
  parser.on("cdata", text);
  parser.write(xml).close();
  return { title, outlines };
}
function unfence(text: string) {
  const tree = new Parser().parse(text);
  equal(tree.firstChild?.type, "code_block");
  equal(tree.firstChild?.next, null);
  equal(tree.firstChild?.info, "opml");
  return tree.firstChild!.literal!;
}
function markdownBook(markdown: string): Book {
  const root = new Parser().parse(markdown);
  type MdNode = NonNullable<typeof root.firstChild>;
  function text(parent: MdNode): string {
    let result = "";
    for (let child = parent.firstChild; child; child = child.next) {
      equal(child.type, "text");
      result += child.literal;
    }
    return result;
  }
  function list(parent: MdNode): Outline[] {
    equal(parent.type, "list");
    const result: Outline[] = [];
    for (let item = parent.firstChild; item; item = item.next) {
      equal(item.type, "item");
      let part = item.firstChild;
      const outline = node("");
      if (part?.type === "paragraph") {
        if (part.firstChild?.type === "link") {
          equal(part.firstChild.next, null);
          outline.text = text(part.firstChild);
          outline.url = part.firstChild.destination!;
        } else outline.text = text(part);
        part = part.next;
      }
      if (part) {
        outline.children = list(part);
        equal(part.next, null);
      }
      result.push(node(outline.text, outline.children, outline.url));
    }
    return result;
  }
  let first = root.firstChild, title: string | undefined;
  if (first?.type === "heading") {
    equal(first.level, 1);
    title = text(first);
    first = first.next;
  }
  if (!first) throw Error("Missing outline list");
  const outlines = list(first);
  equal(first.next, null);
  return { title, outlines };
}

Deno.test("OPML reader: titles, nesting, link types, attribute order and empty labels", async () => {
  const { run } = await tool();
  for (const version of ["1.0", "1.1", "2.0"]) {
    const xml = document(
      '<outline text="Web"><outline url="https://example.com" type="LiNk" text="One"/></outline><outline text=""/>',
      "<title>Reading</title>",
      version,
    );
    equal(
      run(fence(xml)),
      "# Reading\n\n- Web\n  - [One](<https://example.com>)\n\n- \n",
    );
    equal(markdownBook(run(fence(xml))), xmlBook(xml));
  }
  for (const [type, attribute] of [["INCLUDE", "url"], ["RsS", "xmlUrl"]]) {
    const xml = document(
      `<outline text="feed" type="${type}" ${attribute}="https://example.com/feed" urlIgnored="no"/>`,
    );
    equal(markdownBook(run(fence(xml))), xmlBook(xml));
  }
  equal(
    run(fence(document('<outline text="plain" type="custom" url="ignored"/>'))),
    "- plain\n",
  );
});

Deno.test("OPML reader: normalization, comments, CDATA and ignored metadata", async () => {
  const { run } = await tool();
  const xml = '\ufeff<?xml version="1.0" encoding="UTF-8"?>\n<!--before-->' +
    document(
      '<![CDATA[\r\n ]]><?item yes?><outline ignored="&amp;" text=" &#9;one\t&amp;\r\ntwo&#13; "/>',
      "<ownerName>ignored<extension>also ignored</extension></ownerName><title> A<!--gap--> &amp; <![CDATA[<B>\r\n]]><?x yes?>C </title>",
    ) + "<!--after-->\n";
  equal(markdownBook(run(fence(xml))), xmlBook(xml));
  equal(run(fence(document('<outline text="x"/>', "<title/>"))), "# \n\n- x\n");
  const special = " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~\t\n\r 猫😀";
  const source = document(
    `<outline text="${escape(special)}"/>`,
    `<title>${escape(special)}</title>`,
  );
  equal(markdownBook(run(fence(source))), xmlBook(source));
});

Deno.test("OPML reader: 500 generated XML trees through both Wasm directions", async () => {
  const reader = await tool(), writer = await tool(true);
  let seed = 0x9d53711;
  function random(n: number) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  }
  const parts = [
    "",
    "a",
    "猫",
    "😀",
    " ",
    "\n",
    "\t",
    "\r",
    "[x]",
    "<b>",
    "&amp;",
    "`",
    "\\",
    '"',
    "#",
    "*_",
  ];
  const label = () =>
    Array.from({ length: random(5) }, () => parts[random(parts.length)]).join(
      "",
    );
  function outline(depth: number): string {
    const text = `text="${escape(label())}"`;
    const link = random(2)
      ? `type="link" url="https://example.com/a(b)?n=${random(100)}&amp;x=1"`
      : "";
    const attributes = random(2) ? `${text} ${link}` : `${link} ${text}`;
    return `<outline ${attributes}>` +
      (depth
        ? Array.from({ length: random(3) }, () => outline(depth - 1)).join("")
        : "") +
      "</outline>";
  }
  for (let i = 0; i < 500; i++) {
    const source = document(
      Array.from({ length: 1 + random(3) }, () => outline(3)).join(""),
      random(2) ? `<title>${escape(label())}</title>` : "",
    );
    const expected = xmlBook(source), markdown = reader.run(fence(source));
    try {
      equal(markdownBook(markdown), expected);
    } catch (error) {
      throw Error(`Case ${i}\n${source}\n${markdown}`, { cause: error });
    }
    equal(xmlBook(unfence(writer.run(markdown))), expected);
  }
});

Deno.test("OPML reader: malformed structure, selected URLs and recovery", async () => {
  const { run } = await tool();
  const good = document('<outline text="ok"/>');
  const bad = [
    "",
    "<opml/>",
    good.replace('version="2.0"', ""),
    good.replace("2.0", "3.0"),
    good.replace("<head></head>", ""),
    good.replace("<head></head>", "<body/>"),
    good.replace("<body>", "<head/> <body>"),
    document(""),
    document('<other text="x"/>'),
    document("<outline/>"),
    document('<outline text="x">text</outline>'),
    document('<outline text="x"><other/></outline>'),
    document('<outline text="x"/>', "<title>a</title><title>b</title>"),
    document('<outline text="x"/>', "<title><b>x</b></title>"),
    document('<outline text="x" type="link"/>'),
    document('<outline text="x" type="rss" url="https://example.com"/>'),
    good.replace('text="ok"', 'text="a" text="b"'),
    good.replace('text="ok"', 'text="&unknown;"'),
    good.replace("</body>", "</head>"),
    good + good,
    '<!DOCTYPE opml SYSTEM "https://example.com/dtd">' + good,
    document('<outline text="x"/>', "<ignored><bad></ignored>"),
  ];
  for (
    const url of [
      "",
      "https://",
      "javascript:alert(1)",
      "//example.com",
      "https://a b",
      "https://a\t",
      'https://a"',
      "https://a<",
      "https://a>",
      "https://a\\",
      "https://a\x7f",
    ]
  ) {
    bad.push(document(`<outline text="x" type="link" url="${escape(url)}"/>`));
  }
  for (const source of bad) {
    try {
      traps(() => run(fence(source)));
    } catch (e) {
      throw Error(source, { cause: e });
    }
    equal(run(fence(good)), "- ok\n");
  }
  const url = "HTTPS://example.com/a(b)?literal=&amp;&real=1";
  const source = document(
    `<outline text="x" type="link" url="${escape(url)}"/>`,
  );
  equal(markdownBook(run(fence(source))), xmlBook(source));
});

Deno.test("OPML reader: empty outline combinations remain lists in CommonMark", async () => {
  const reader = await tool(), writer = await tool(true);
  // Every label-emptiness combination in a seven-node, three-level tree.
  // Separate a paragraph from an empty item without detaching descendants
  // of consecutive empty items.
  for (let mask = 0; mask < 128; mask++) {
    function subtree(index: number): string {
      const text = mask & (1 << index) ? `item${index}` : "";
      return `<outline text="${text}">` +
        (index < 3 ? subtree(index * 2 + 1) + subtree(index * 2 + 2) : "") +
        "</outline>";
    }
    const xml = document(subtree(0)), expected = xmlBook(xml);
    const markdown = reader.run(fence(xml));
    equal(markdownBook(markdown), expected);
    equal(xmlBook(unfence(writer.run(markdown))), expected);
  }
});

Deno.test("OPML reader: punctuation edits either trap or preserve independently parsed data", async () => {
  const { run } = await tool();
  const source = document(
    '<outline text="A &amp; B" type="link" url="https://example.com/?a=1&amp;b=2"><outline text="child"/></outline>',
    "<title>Book</title><ignored>metadata</ignored>",
  );
  let accepted = 0, rejected = 0;
  for (let i = 0; i < source.length; i++) {
    for (const replacement of ["<", ">", '"', "&", "/", " ", "="]) {
      const edited = source.slice(0, i) + replacement + source.slice(i + 1);
      let output: string;
      try {
        output = run(fence(edited));
      } catch (error) {
        if (!(error instanceof WebAssembly.RuntimeError)) throw error;
        rejected++;
        continue;
      }
      equal(markdownBook(output), xmlBook(edited));
      accepted++;
    }
  }
  if (accepted < 50 || rejected < 50) throw Error("Insufficient edit coverage");
  equal(markdownBook(run(fence(source))), xmlBook(source));
});

Deno.test("OPML reader: fences, forbidden XML bytes and exact input/output bounds", async () => {
  const { run, bytes, t, memory } = await tool();
  const source = document('<outline text="ok"/>');
  equal(run(fence(source, 5).replaceAll("\n", "\r\n")), "- ok\n");
  equal(run(fence(source).trimEnd() + "`\n"), "- ok\n");
  const backticks = document('<outline text="ok"/>', "<!--\n```\n-->");
  equal(run(fence(backticks, 4)), "- ok\n");
  traps(() => run(fence(backticks)));
  for (
    const bad of [
      fence(source).replace("opml", "xml"),
      fence(source).slice(1),
      fence(source).slice(0, -3),
      fence(source) + "junk",
      "```opml\n```\n" + source + "\n```\n",
    ]
  ) traps(() => run(bad));
  for (const content of ["\0", "\x01", "\x0b", "\ufffe"]) {
    traps(() =>
      run(
        fence(
          document('<outline text="ok"/>', `<ignored>${content}</ignored>`),
        ),
      )
    );
  }
  const encoded = encoder.encode(fence(source));
  for (
    const invalid of [[0xc0, 0x80], [0xed, 0xa0, 0x80], [
      0xf4,
      0x90,
      0x80,
      0x80,
    ], [0xff]]
  ) {
    const at = encoder.encode("```opml\n").length;
    const input = new Uint8Array(encoded.length + invalid.length);
    input.set(encoded.subarray(0, at));
    input.set(invalid, at);
    input.set(encoded.subarray(at), at + invalid.length);
    traps(() => bytes(input));
  }
  const base = fence(document('<outline text="ok"/>', "<!--fill-->"));
  const full = base.replace(
    "fill",
    "x".repeat(65536 - encoder.encode(base).length + 4),
  );
  equal(encoder.encode(full).length, 65536);
  equal(run(full), "- ok\n");
  traps(() => t.run(65537));
  traps(() => t.run(-1));
  const label = " ".repeat(26213) + "xxxx";
  equal(
    encoder.encode(run(fence(document(`<outline text="${label}"/>`)))).length,
    131072,
  );
  traps(() => run(fence(document(`<outline text="${label}x"/>`))));
  // The intermediate validated XML tree has its own output cap, even when
  // the selected outline would be much smaller.
  traps(() => run(fence(document('<outline text="x"/>'.repeat(1000)))));
  for (const depth of [30, 31]) {
    const deep = fence(
      document('<outline text="x">'.repeat(depth) + "</outline>".repeat(depth)),
    );
    if (depth === 30) equal(run(deep).split("\n").length, 31);
    else traps(() => run(deep));
  }
  equal(run(fence(source)), "- ok\n");
  equal(memory.length, 262144);
});
