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
const encoder = new TextEncoder(), decoder = new TextDecoder();
const fence = (xml: string, ticks = 3) =>
  "`".repeat(ticks) + "rss\n" + xml + "\n" + "`".repeat(ticks) + "\n";
const feed = (
  body = "",
  metadata =
    "<title>News</title><link>https://example.com/</link><description>Updates</description>",
) => `<rss version="2.0"><channel>${metadata}${body}</channel></rss>`;
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
async function reader() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      ["v", "transforms/26-xml-to-list"],
      ["w", "transforms/00-xml-walk"],
      ["t", "transforms/32-rss-to-entries"],
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
    if (input.length > 65536) throw Error("Test input too big");
    memory.set(input);
    const n = t.run(input.length);
    equal(toHex(memory.subarray(0, input.length)), toHex(input));
    equal(toHex(memory.subarray(196608)), toHex(literals));
    return decoder.decode(memory.subarray(65536, 65536 + n));
  }
  return { t, memory, bytes, run: (s: string) => bytes(encoder.encode(s)) };
}

type Node = {
  name: string;
  attrs: Record<string, string>;
  children: (Node | string)[];
};
// Separate XML parser and ordinary objects provide the test oracle. None of
// this projection code is shipped as an implementation of the transformation.
function reference(xml: string): Tree {
  const roots: Node[] = [], stack: Node[] = [];
  const parser = new SaxesParser();
  parser.on("opentag", (t) => {
    const n: Node = {
      name: t.name,
      attrs: t.attributes as Record<string, string>,
      children: [],
    };
    if (stack.length) stack.at(-1)!.children.push(n);
    else roots.push(n);
    stack.push(n);
  });
  parser.on("closetag", () => {
    stack.pop();
  });
  const text = (s: string) => {
    if (stack.length) stack.at(-1)!.children.push(s);
  };
  parser.on("text", text);
  parser.on("cdata", text);
  parser.write(xml).close();
  const attrs: Record<string, string[]> = {
    guid: ["isPermaLink"],
    source: ["url"],
    category: ["domain"],
    enclosure: ["url", "length", "type"],
    cloud: ["domain", "port", "path", "registerProcedure", "protocol"],
  };
  const nested = new Set([
    "channel",
    "item",
    "image",
    "textInput",
    "skipHours",
    "skipDays",
  ]);
  function value(n: Node): Tree {
    if (nested.has(n.name)) return object(n);
    const content = n.children.filter((c) => typeof c === "string").join("");
    if (n.name in attrs) {
      const result: Record<string, Tree> = {};
      for (const [key, val] of Object.entries(n.attrs)) {
        if (attrs[n.name].includes(key)) result[key] = val;
      }
      if (!["enclosure", "cloud"].includes(n.name)) result.value = content;
      return result;
    }
    return content;
  }
  function object(n: Node): Tree {
    const children = n.children.filter((c): c is Node =>
      typeof c !== "string" && !c.name.includes(":")
    );
    const result: Record<string, Tree> = {};
    const repeated = ["enclosure", "category", "hour", "day", "item"];
    for (const child of children) {
      if (!repeated.includes(child.name)) result[child.name] = value(child);
    }
    for (const name of repeated) {
      const matches = children.filter((c) => c.name === name);
      if (matches.length || (name === "item" && n.name === "channel")) {
        result[name === "item" ? "entries" : name] = matches.map(value);
      }
    }
    return result;
  }
  return object(
    roots[0].children.find((n): n is Node =>
      typeof n !== "string" && n.name === "channel"
    )!,
  );
}

Deno.test("RSS reader: metadata, entries, CDATA and repeated attributed fields", async () => {
  const h = await reader();
  const xml = feed(
    '<item><title>First &amp; second</title><description>before<![CDATA[<b>bold</b>]]>after</description><category domain="tags">A</category><category>B</category><guid isPermaLink="false">id:1</guid><source url="https://source.test/feed">Source</source><enclosure url="https://a.test/a.mp3" length="123" type="audio/mpeg"/></item><item><description>Only a description</description></item>',
  );
  equal(h.run(fence(xml)), markdown(reference(xml)));
  equal(
    h.run(fence(feed())),
    markdown({
      title: "News",
      link: "https://example.com/",
      description: "Updates",
      entries: [],
    }),
  );
});

Deno.test("RSS reader: complete standard channel structures and preserved lexical values", async () => {
  const h = await reader();
  const extras =
    '<language>es</language><copyright>CC</copyright><managingEditor>editor@example.com</managingEditor><webMaster>web@example.com</webMaster><pubDate>Fri, 12 Sep 2025 00:00:00 GMT</pubDate><lastBuildDate>Fri, 12 Sep 2025 01:00:00 GMT</lastBuildDate><generator>Microwasm</generator><docs>https://www.rssboard.org/rss-specification</docs><ttl>0060</ttl><rating>rating</rating><image><url>https://example.com/a.png</url><title>News</title><link>https://example.com/</link><width>088</width><height>31</height><description>Logo</description></image><cloud domain="example.com" port="080" path="/RPC2" registerProcedure="ping" protocol="xml-rpc"/><textInput><title>Search</title><description>Find</description><name>q</name><link>https://example.com/search</link></textInput><skipHours><hour>0</hour><hour>23</hour></skipHours><skipDays><day>Monday</day><day>Friday</day></skipDays><category>News</category>';
  const xml = feed(
    extras +
      "<item><title/><link>https://example.com/a</link><author>a@example.com</author><comments>https://example.com/a#comments</comments><pubDate>yesterday</pubDate><guid>id:2</guid></item>",
  );
  equal(h.run(fence(xml)), markdown(reference(xml)));
  // Date grammar and numeric normalization are intentionally not part of a
  // structure converter; the strings above are retained, not guessed.
  const empty = feed("<skipHours/><skipDays/><category/><item><title/></item>");
  equal(h.run(fence(empty)), markdown(reference(empty)));
});

Deno.test("RSS reader: singleton duplicates, wrong contexts and missing requirements", async () => {
  const h = await reader();
  const bad = [
    "<rss><channel/></rss>",
    '<rss version="1.0"><channel/></rss>',
    '<rss version="2.0"/>',
    '<rss version="2.0"><channel/><channel/></rss>',
    feed("", "<title>X</title><link>x</link>"),
    feed("<item/>"),
    feed("<item><link>x</link></item>"),
    feed("<image><url>x</url><title>x</title></image>"),
    feed(
      "<textInput><title>x</title><description>x</description><link>x</link></textInput>",
    ),
    feed('<cloud domain="x"/>'),
    feed("<item><title>x</title><source>x</source></item>"),
    feed('<item><title>x</title><enclosure url="x" type="x"/></item>'),
    feed('<item><title>x</title><guid isPermaLink="FALSE">id</guid></item>'),
    feed("<hour>1</hour>"),
    feed("<unknown/>"),
    feed("<item><title><b>x</b></title></item>"),
    feed(
      '<item><title>x</title><enclosure url="x" length="1" type="x">data</enclosure></item>',
    ),
    feed("not structural whitespace"),
  ];
  for (const xml of bad) traps(() => h.run(fence(xml)));
  for (
    const name of [
      "title",
      "link",
      "description",
      "language",
      "copyright",
      "managingEditor",
      "webMaster",
      "pubDate",
      "lastBuildDate",
      "generator",
      "docs",
      "ttl",
      "rating",
    ]
  ) {
    const extra = ["title", "link", "description"].includes(name)
      ? `<${name}>duplicate</${name}>`
      : `<${name}/><${name}/>`;
    traps(() => h.run(fence(feed(extra))));
  }
  for (const name of ["author", "comments", "guid", "pubDate"]) {
    traps(() =>
      h.run(fence(feed(`<item><title>x</title><${name}/><${name}/></item>`)))
    );
  }
  equal(h.run(fence(feed())), markdown(reference(feed())));
});

Deno.test("RSS reader: 500 generated feeds agree with independent XML projections", async () => {
  const h = await reader();
  let state = 0x72737332;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
  const pick = <T>(a: T[]) => a[random() % a.length];
  const values = [
    "",
    "Hello",
    "猫😀",
    "A & B",
    "<b>inert</b>",
    "\r\n\t",
    "[](){}#`",
    '"\\',
    "https://a.test/?x=1&y=2",
    "= 1.0",
  ];
  const escape = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")
      .replaceAll("\r", "&#13;");
  const tag = (name: string, value = pick(values)) =>
    `<${name}>${escape(value)}</${name}>`;
  const shuffle = (a: string[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = random() % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  for (let trial = 0; trial < 500; trial++) {
    const parts = [tag("title"), tag("link"), tag("description")];
    if (random() % 2) parts.push(tag("language"), tag("pubDate"));
    if (random() % 3 === 0) {
      parts.push(
        "<image>" +
          shuffle([tag("title"), tag("link"), tag("url"), tag("width", "88")])
            .join("") +
          "</image>",
      );
    }
    parts.push(
      "<ext:ignored><item><title>Not a real item</title></item></ext:ignored>",
    );
    const items = random() % 9;
    for (let i = 0; i < items; i++) {
      const fields = [tag(random() % 2 ? "title" : "description")];
      if (random() % 2) fields.push(tag("author"), tag("pubDate"));
      if (random() % 2) {
        fields.push(
          '<guid isPermaLink="false">' + escape(pick(values)) + "</guid>",
        );
      }
      for (let c = 0, n = random() % 4; c < n; c++) {
        fields.push(
          `<category domain="${escape(pick(values))}">${
            escape(pick(values))
          }</category>`,
        );
      }
      for (let e = 0, n = random() % 3; e < n; e++) {
        fields.push(
          `<enclosure type="audio/mpeg" length="${random()}" url="https://a.test/${e}.mp3"/>`,
        );
      }
      fields.push("<!--ignored--><?processing ignored?>");
      parts.push("<item>" + shuffle(fields).join("") + "</item>");
    }
    const xml = feed(shuffle(parts).join(""), "").replace(
      '<rss version="2.0">',
      '<rss xmlns:ext="https://extension.test/" version="2.0">',
    );
    equal(h.run(fence(xml)), markdown(reference(xml)));
  }
});

Deno.test("RSS reader: declarations, numeric references, CDATA joining and extension isolation", async () => {
  const h = await reader();
  const xml = '\ufeff<?xml version="1.0" encoding="UTF-8"?>\n' +
    feed(
      '<item><title>A&#13;B<![CDATA[C\r\nD]]><!--split--><?p d?>E&amp;F</title><guid isPermaLink="tr&#117;e">id</guid></item><ext:data xmlns:ext="urn:x"><item><title>Ignored</title></item><![CDATA[<item/>]]></ext:data>',
    ).replace('version="2.0"', 'version="2&#46;0"');
  equal(h.run(fence(xml, 5)), markdown(reference(xml)));
  const bad = [
    feed("<ext:data><bad></ext:data>"),
    feed("<ext:data>&unknown;</ext:data>"),
    feed("<ext:data><!--bad--comment--></ext:data>"),
    feed('<ext:data a="1" a="2"/>'),
    feed('<item><title>A</title><category url="x">B</category></item>'),
    feed('<item><title>A</title><source url="x"><child/></source></item>'),
    feed("<skipHours><hour>1</hour><day>Monday</day></skipHours>"),
    feed(
      "<image><url>x</url><title>x</title><link>x</link><width>1</width><width>2</width></image>",
    ),
  ];
  for (const source of bad) traps(() => h.run(fence(source)));
  const valid = fence(feed("<ext:data>INVALID</ext:data>"));
  const bytes = encoder.encode(valid);
  bytes[valid.indexOf("INVALID")] = 0x80;
  traps(() => h.bytes(bytes));
  equal(h.run(fence(feed())), markdown(reference(feed())));
});

Deno.test("RSS reader: fences, full input, intermediate limits and recovery", async () => {
  const h = await reader();
  const xml = feed("<item><description>one\n```\ntwo</description></item>");
  traps(() => h.run(fence(xml)));
  equal(h.run(fence(xml, 4)), markdown(reference(xml)));
  for (const ending of ["", "``", "``` trailing", "```\nmore", "~~~"]) {
    traps(() => h.run("```rss\n" + feed() + "\n" + ending));
  }
  equal(
    h.run("```rss\r\n" + feed() + "\r\n```\r\n"),
    markdown(reference(feed())),
  );
  const fixed = fence(feed("<item><description></description></item>"));
  const length = 65536 - encoder.encode(fixed).length;
  const big = feed(
    "<item><description>" + "a".repeat(length) + "</description></item>",
  );
  equal(encoder.encode(fence(big)).length, 65536);
  equal(h.run(fence(big)), markdown(reference(big)));
  for (const n of [-1, 0, 9, 65537]) traps(() => h.t.run(n));
  // The XML validation pass has its own tree-output bound. Large escaped
  // values can exhaust that intermediate region before final RSS projection.
  const expanding = feed(
    "<item><description>" + "\\".repeat(length) + "</description></item>",
  );
  traps(() => h.run(fence(expanding)));
  const deep = feed("<ext:x>".repeat(31) + "x" + "</ext:x>".repeat(31));
  traps(() => h.run(fence(deep)));
  equal(h.run(fence(feed())), markdown(reference(feed())));
});

Deno.test("RSS reader: punctuation edits either fail or preserve the independent field data", async () => {
  const h = await reader();
  const value = 'A &amp; B &lt;x&gt; "\\ []()';
  for (let i = 0; i <= value.length; i++) {
    for (
      const char of [
        "<",
        ">",
        "&",
        ";",
        '"',
        "'",
        "\\",
        "[",
        "]",
        "\r",
        "\n",
        "猫",
      ]
    ) {
      const edited = value.slice(0, i) + char + value.slice(i);
      const xml = feed("<item><title>" + edited + "</title></item>");
      let output: string;
      try {
        output = h.run(fence(xml));
      } catch (e) {
        if (e instanceof WebAssembly.RuntimeError) continue;
        throw e;
      }
      equal(output, markdown(reference(xml)));
    }
  }
});
