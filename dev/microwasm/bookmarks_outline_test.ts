import { Parser } from "npm:commonmark@0.31.2";
import { parse } from "npm:parse5@7.3.0";
import { assemble, toHex } from "./microwasm.ts";

function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(JSON.stringify(a) + " != " + JSON.stringify(b));
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
type Outline = { text: string; url?: string; children: Outline[] };
type Book = { title?: string; outlines: Outline[] };
const node = (text: string, children: Outline[] = [], url?: string): Outline =>
  url === undefined ? { text, children } : { text, url, children };
const encoder = new TextEncoder(), decoder = new TextDecoder();
const fence = (html: string, ticks = 3) =>
  "`".repeat(ticks) + "html\n" + html + "\n" + "`".repeat(ticks) + "\n";
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("\r", "&#13;").replaceAll("\n", "&#10;").replaceAll(
      "\t",
      "&#9;",
    );

async function tool(writer = false) {
  const imports: Record<string, WebAssembly.Exports> = {};
  const dependencies = writer
    ? [
      ["x", "transforms/00-xml-strings"],
      ["o", "transforms/00-xml-output"],
      ["t", "transforms/31-outline-to-bookmarks"],
    ]
    : [["h", "transforms/00-html-characters"], [
      "t",
      "transforms/30-bookmarks-to-outline",
    ]];
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ...dependencies,
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
    if (input.length > 65536) {
      throw Error("Use direct run to test invalid length");
    }
    memory.set(input);
    const size = t.run(input.length);
    equal([...memory.subarray(0, input.length)], [...input]);
    if (!writer) equal([...memory.subarray(196608)], [...literals]);
    return decoder.decode(memory.subarray(65536, 65536 + size));
  }
  return { t, memory, bytes, run: (s: string) => bytes(encoder.encode(s)) };
}

type H = {
  nodeName: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: H[];
};
// A separate HTML tree parser supplies decoded values and implied tag endings.
// It is a test oracle, never imported into the shipped transformation.
function htmlBook(source: string): Book {
  const outlines: Outline[] = [], lists: Outline[][] = [];
  let title: string | undefined,
    heading: string | undefined,
    pending: Outline | undefined;
  const text = (n: H): string =>
    n.nodeName === "#text" ? n.value! : (n.childNodes ?? []).map(text).join("");
  function visit(n: H) {
    if (n.nodeName === "title") {
      title = text(n);
      return;
    }
    if (n.nodeName === "h1") {
      heading = text(n);
      return;
    }
    if (n.nodeName === "h3") {
      pending = node(text(n));
      lists.at(-1)!.push(pending);
      return;
    }
    if (n.nodeName === "a") {
      lists.at(-1)!.push(
        node(text(n), [], n.attrs!.find((a) => a.name === "href")!.value),
      );
      return;
    }
    if (n.nodeName === "dl") {
      if (lists.length) {
        if (!pending) throw Error("Oracle folder missing");
        lists.push(pending.children);
        pending = undefined;
      } else lists.push(outlines);
    }
    for (const c of n.childNodes ?? []) visit(c);
    if (n.nodeName === "dl") lists.pop();
  }
  visit(parse(source) as unknown as H);
  return { title: heading ?? title, outlines };
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
  if (!first) return { title, outlines: [] };
  const outlines = list(first);
  equal(first.next, null);
  return { title, outlines };
}

Deno.test("Bookmark reader: browser export vocabulary, implied endings, title preference and folders", async () => {
  const { run } = await tool();
  const source =
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>\r\n<!-- generated -->\r\n" +
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\r\n' +
    "<TITLE>Bookmarks</TITLE><H1>Reading &amp; links</H1><DL><p>" +
    '<DT><H3 PERSONAL_TOOLBAR_FOLDER ADD_DATE="1" HREF="ignored">Web</H3><DD>folder description<DL><p>' +
    '<DT><A ICON="data:image/png;base64,unused>bytes" HREF="https://a.test/?x=1&amp;y=2" ADD_DATE="0">A</A>' +
    "<DD>link description<DT><H3></H3><DL></DL><p></DL><p>" +
    "<DT><A HREF=mailto:a@example.com>A &amp; B</A><HR></DL><p><!-- end -->";
  equal(markdownBook(run(fence(source))), htmlBook(source));
  equal(run(fence("<DL></DL>")), "");
  equal(run(fence("<TITLE>Fallback</TITLE><DL></DL>")), "# Fallback\n\n");
  equal(run(fence("<H1></H1><DL></DL>")), "# \n\n");
  const wrapped =
    "<html><head><title>T</title></head><body><h1>H</h1><dl><dt><h3>X</h3><dl></dl></dt></dl></body></html>";
  equal(markdownBook(run(fence(wrapped))), htmlBook(wrapped));
});

Deno.test("Bookmark reader: HTML references, quote boundaries and duplicate attributes", async () => {
  const { run } = await tool();
  const source = "<H1> A\r\nB\0C </H1><TITLE>unused</TITLE><DL>" +
    '<DT><A HrEf="https://a.test/?x=1&copy=2&notit;=3" HREF="https://ignored.test/"> &notin; &fjlig; &NotEqualTilde; &#128; &#0; \0 </A>' +
    "<DT><A HREF=https://a.test/?x=1&y=2>raw query</A>" +
    "<DT><A href='about:blank' data-note='x > y'>single quote</A>" +
    "<DT><H3>raw\r\nline&#13;\ttab</H3><DL></DL></DL>";
  equal(markdownBook(run(fence(source))), htmlBook(source));
  equal(run(fence("<TITLE>a\0b</TITLE><DL></DL>")), "# a�b\n\n");
  equal(run(fence("<DL><H3>\0</H3><DL></DL></DL>")), "- \n");
  const all = " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~\t\n\r 猫😀";
  const raw = "<H1>" + escape(all) + "</H1><DL><H3>" + escape(all) +
    "</H3><DL></DL></DL>";
  equal(markdownBook(run(fence(raw, 4))), htmlBook(raw));
});

Deno.test("Bookmark pair: 500 generated documents, HTML oracle and Wasm round trips", async () => {
  const reader = await tool(), writer = await tool(true);
  let seed = 0x721def;
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
    Array.from({ length: random(6) }, () => parts[random(parts.length)]).join(
      "",
    );
  function children(depth = 0): string {
    return Array.from({ length: random(4) }, () => {
      const s = escape(label());
      if (depth < 4 && random(2)) {
        return "<DT><H3>" + s + "</H3><DD>ignored<DL>" + children(depth + 1) +
          "</DL><p>";
      }
      const url = escape(
        [
          "https://example.com/a(b)?x=1&y=2",
          "mailto:a@example.com",
          "file:///a",
          "about:blank",
        ][random(4)],
      );
      return '<DT><A HREF="' + url + '">' + s + "</A><DD>ignored";
    }).join("");
  }
  for (let i = 0; i < 500; i++) {
    const source = "<H1>" + escape(label()) + "</H1><DL>" + children() +
      "</DL>";
    const expected = htmlBook(source), markdown = reader.run(fence(source, 4));
    equal(markdownBook(markdown), expected);
    equal(markdownBook(reader.run(writer.run(markdown))), expected);
  }
});

Deno.test("Bookmark reader: every empty-label combination retains Markdown hierarchy", async () => {
  const { run } = await tool();
  for (let mask = 0; mask < 128; mask++) {
    let i = 0;
    const label = () => mask & (1 << i++) ? "nonempty" : "";
    const folder = (s: string, content = "") =>
      "<DT><H3>" + s + "</H3><DL>" + content + "</DL>";
    const source = "<DL>" +
      folder(label(), folder(label(), folder(label())) + folder(label())) +
      folder(label(), folder(label())) + folder(label()) + "</DL>";
    equal(markdownBook(run(fence(source))), htmlBook(source));
  }
});

Deno.test("Bookmark reader: malformed structure, URL values and unsupported markup recover", async () => {
  const { run, bytes } = await tool();
  for (
    const source of [
      "",
      "<DL>",
      "</DL>",
      "<DL></DL><DL></DL>",
      "<DL><DL></DL></DL>",
      "<DL><H3>missing list</H3></DL>",
      "<DL><H3>A</H3><H3>B</H3><DL></DL></DL>",
      '<DL><A HREF="x">parent</A><DL></DL></DL>',
      "<DL><A>x</A></DL>",
      '<DL><A HREF="">x</A></DL>',
      '<DL><A HREF="a b">x</A></DL>',
      '<DL><A HREF="a&#10;b">x</A></DL>',
      '<DL><A HREF="a&lt;b">x</A></DL>',
      '<DL><A HREF="a\\b">x</A></DL>',
      "<DL><H3>X</A><DL></DL></DL>",
      "<DL><H3><b>nested</b></H3><DL></DL></DL>",
      "<DL><script>bad</script></DL>",
      '<!DOCTYPE html SYSTEM "http://example.com/x"><DL></DL>',
      "<!DOCTYPE html [subset]><DL></DL>",
      "<!-- unclosed<DL></DL>",
      "<DL data='unclosed></DL>",
      "<DL></DL>unexpected",
      "<TITLE>A</TITLE><TITLE>B</TITLE><DL></DL>",
      "<H1>A</H1><H1>B</H1><DL></DL>",
      "<DL><H1>late</H1></DL>",
    ]
  ) {
    traps(() => run(fence(source)));
    equal(run(fence("<DL><H3>after</H3><DL></DL></DL>")), "- after\n");
  }
  for (const prefix of ["<!--", '<DL ICON="', "<DL><H3>"]) {
    const start = encoder.encode("```html\n" + prefix),
      end = encoder.encode('-->"></DL>\n```');
    const invalid = new Uint8Array(start.length + 1 + end.length);
    invalid.set(start);
    invalid[start.length] = 0x80;
    invalid.set(end, start.length + 1);
    traps(() => bytes(invalid));
  }
});

Deno.test("Bookmark reader: fence integrity, bounds, depth and immutable tables", async () => {
  const { run, t } = await tool();
  const body = "<DL></DL>";
  const base = fence(body).length;
  equal(run(fence(" ".repeat(65536 - base) + body)), "");
  traps(() => t.run(65537));
  traps(() => t.run(-1));
  for (
    const input of [
      fence(body).replace("html", "xml"),
      "```html\n" + body + "\n",
      "````html\n" + body + "\n```",
      fence("<!--\n```\n-->" + body),
      fence(body) + "outside",
    ]
  ) traps(() => run(input));
  equal(run(fence("<!--\n```\n-->" + body, 4)), "");
  run(fence("<DL>" + "<H3>x</H3><DL>".repeat(128) + "</DL>".repeat(129)));
  traps(() =>
    run(fence("<DL>" + "<H3>x</H3><DL>".repeat(129) + "</DL>".repeat(130)))
  );
  traps(() =>
    run(fence("<DL><H3>" + " ".repeat(30000) + "</H3><DL></DL></DL>"))
  );
  const fixed = run(fence("<DL><H3></H3><DL></DL></DL>")).length;
  const remaining = 131072 - fixed;
  const label = " ".repeat(Math.floor(remaining / 5)) +
    "x".repeat(remaining % 5);
  equal(
    encoder.encode(run(fence("<DL><H3>" + label + "</H3><DL></DL></DL>")))
      .length,
    131072,
  );
  traps(() => run(fence("<DL><H3>" + label + "x</H3><DL></DL></DL>")));
  equal(run(fence(body)), "");
});
