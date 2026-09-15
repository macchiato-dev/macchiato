import { Parser } from "npm:commonmark@0.31.2";
import { SaxesParser } from "npm:saxes@6.0.0";
import { assemble, toHex } from "./microwasm.ts";

type Tree = string | Tree[] | { [key: string]: Tree };
const encoder = new TextEncoder(), decoder = new TextDecoder();
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  }
  return value;
}
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(stable(a)) !== JSON.stringify(stable(b))) {
    throw Error(JSON.stringify(a).slice(0, 1600) + " != " + JSON.stringify(b).slice(0, 1600));
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
function list(tree: unknown, depth = 0, key = ""): string {
  const prefix = "  ".repeat(depth) + "- " + key;
  if (typeof tree === "string") return prefix + JSON.stringify(tree) + "\n";
  if (Array.isArray(tree)) {
    return prefix + "[]\n" + tree.map((v) => list(v, depth + 1)).join("");
  }
  if (tree === null || typeof tree !== "object") {
    return prefix + "= " + JSON.stringify(tree) + "\n";
  }
  return prefix + "{}\n" +
    Object.entries(tree).map(([k, v]) =>
      list(v, depth + 1, JSON.stringify(k) + " ")
    ).join("");
}
const feed = (extra: Record<string, unknown> = {}) => ({
  title: "News",
  link: "https://example.com/",
  description: "Updates",
  ...extra,
});
async function graph(writer: boolean) {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      ["l", "transforms/01-list-to-json"],
      ...(writer
        ? [
          ["o", "transforms/00-xml-output"],
          ["t", "transforms/33-entries-to-rss"],
        ]
        : [
          ["v", "transforms/26-xml-to-list"],
          ["w", "transforms/00-xml-walk"],
          ["t", "transforms/32-rss-to-entries"],
        ]),
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(
        new URL(path + ".md", import.meta.url),
      ),
    );
    equal(toHex(a.bytes), toHex(assemble(a.resolved).bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const m = new Uint8Array((imports.t.memory as WebAssembly.Memory).buffer);
  // The list compiler uses the first 1024 bytes of page four for its stack.
  const literalStart = 197632;
  const literals = m.slice(literalStart);
  const call = (module: WebAssembly.Exports, input: string) => {
    const bytes = encoder.encode(input);
    if (bytes.length > 65536) throw Error("Test source exceeds input page");
    m.set(bytes);
    const n = (module.run as (n: number) => number)(bytes.length);
    equal(toHex(m.subarray(literalStart)), toHex(literals));
    if (n < 0 || n > 131072) throw Error("Bad output length");
    return decoder.decode(m.subarray(65536, 65536 + n));
  };
  return {
    run: (s: string) => call(imports.t, s),
    tree: (s: string) => JSON.parse(call(imports.l, s).slice(8, -5)),
    memory: m,
    raw: imports.t.run as (n: number) => number,
  };
}
function xmlBody(output: string): string {
  const doc = new Parser().parse(output), block = doc.firstChild;
  equal(block?.type, "code_block");
  equal(block?.info, "rss");
  equal(block?.next, null);
  return block!.literal!;
}
type XmlNode = {
  name: string;
  attrs: Record<string, string>;
  text: string;
  children: XmlNode[];
};
// Independent XML parser, not the handwritten XML/RSS reader. Project only
// the documented feed shape, retaining strings and ordered repeated fields.
function fromXml(output: string): Tree {
  const roots: XmlNode[] = [], stack: XmlNode[] = [];
  const p = new SaxesParser({ xmlns: false });
  p.on("opentag", (tag) => {
    const node = {
      name: tag.name,
      attrs: tag.attributes as Record<string, string>,
      text: "",
      children: [],
    };
    (stack.at(-1)?.children ?? roots).push(node);
    stack.push(node);
  });
  p.on("text", (s) => {
    if (stack.length) stack.at(-1)!.text += s;
  });
  p.on("closetag", () => stack.pop());
  p.write(xmlBody(output)).close();
  equal(roots.length, 1);
  equal(roots[0].name, "rss");
  equal(roots[0].attrs, { version: "2.0" });
  equal(roots[0].children.length, 1);
  equal(roots[0].children[0].name, "channel");
  const repeated = new Set(["item", "category", "enclosure", "hour", "day"]);
  const nested = new Set([
    "channel",
    "item",
    "image",
    "textInput",
    "skipHours",
    "skipDays",
  ]);
  function project(node: XmlNode): Tree {
    if (nested.has(node.name)) {
      const out: Record<string, Tree> = {};
      for (const child of node.children) {
        const key = child.name === "item" ? "entries" : child.name;
        if (repeated.has(child.name)) {
          ((out[key] ??= []) as Tree[]).push(project(child));
        } else {
          if (key in out) throw Error("Duplicate XML singleton");
          out[key] = project(child);
        }
      }
      if (node.name === "channel") out.entries ??= [];
      return out;
    }
    equal(node.children.length, 0);
    if (["guid", "source", "category"].includes(node.name)) {
      return { ...node.attrs, value: node.text };
    }
    if (["enclosure", "cloud"].includes(node.name)) return node.attrs;
    equal(node.attrs, {});
    return node.text;
  }
  return project(roots[0].children[0]);
}

Deno.test("RSS writer: all standard structures and independent XML projection", async () => {
  const w = await graph(true), r = await graph(false);
  const input = feed({
    language: "en-US",
    copyright: "2026",
    managingEditor: "ed@example.com",
    webMaster: "web@example.com",
    pubDate: "arbitrary date",
    lastBuildDate: "not interpreted",
    generator: "Microwasm",
    docs: "https://example.com/rss",
    ttl: "0012",
    rating: "PG",
    image: {
      url: "image.png",
      title: "Icon",
      link: "/",
      width: "088",
      height: "31",
      description: "",
    },
    cloud: {
      domain: "example.com",
      port: "080",
      path: "/rpc",
      registerProcedure: "notify",
      protocol: "xml-rpc",
    },
    textInput: {
      title: "Search",
      description: "Find",
      name: "q",
      link: "/search",
    },
    skipHours: { hour: ["0", "23"] },
    skipDays: { day: ["Monday", "Sunday"] },
    category: [{ value: "Feeds", domain: "topics" }],
    entries: [{
      title: "",
      description: "<p>Text & more</p>",
      link: "/post",
      author: "A",
      comments: "/comments",
      pubDate: "yesterday",
      guid: { value: "post:1", isPermaLink: "false" },
      source: { value: "Source", url: "/source" },
      category: [{ domain: "x", value: "C" }, { value: "" }],
      enclosure: [{ length: "0012", type: "audio/ogg", url: "/a" }, {
        url: "/b",
        length: "13",
        type: "image/png",
      }],
    }],
  });
  const output = w.run(list(input));
  equal(fromXml(output), input);
  equal(r.tree(r.run(output)), input);
  equal(fromXml(w.run(r.run(output))), input);
});

Deno.test("RSS writer: generated bidirectional model round trips", async () => {
  const w = await graph(true), r = await graph(false);
  const values = [
    "",
    "A & B",
    "<script>x</script>",
    "é雪😀",
    "\t\n\r",
    "```",
    '"\\',
    "0012",
  ];
  for (let i = 0; i < 300; i++) {
    const entries = Array.from({ length: i % 6 }, (_, j) => ({
      description: values[(i + j) % values.length],
      guid: { value: "id" + j, isPermaLink: i % 2 ? "true" : "false" },
      category: [{
        value: values[(i * 3 + j) % values.length],
        domain: 'x\t\n\r&"',
      }],
    }));
    const model = feed({ title: values[i % values.length], entries });
    const output = w.run(list(model));
    equal(fromXml(output), model);
    const restored = r.run(output);
    equal(r.tree(restored), model);
    equal(w.run(restored), output);
  }
});

Deno.test("RSS writer: context, required fields, types and decoded duplicates", async () => {
  const w = await graph(true);
  const invalid = [
    {},
    { title: "Only" },
    [],
    feed({ author: "wrong parent" }),
    feed({ item: [] }),
    feed({ "x:extension": "not discarded" }),
    feed({ entries: {} }),
    feed({ entries: ["string"] }),
    feed({ entries: [{}] }),
    feed({ title: 123 }),
    feed({ link: null }),
    feed({ category: {} }),
    feed({ category: [{ domain: "missing value" }] }),
    feed({ image: { title: "", link: "" } }),
    feed({ textInput: { title: "", link: "", description: "" } }),
    feed({ cloud: { domain: "x" } }),
    feed({ entries: [{ title: "x", language: "wrong parent" }] }),
    feed({
      entries: [{ title: "x", guid: { value: "x", isPermaLink: true } }],
    }),
    feed({
      entries: [{ title: "x", guid: { value: "x", isPermaLink: "False" } }],
    }),
    feed({ entries: [{ title: "x", source: { value: "missing url" } }] }),
    feed({ entries: [{ title: "x", enclosure: [{ url: "x", length: "1" }] }] }),
    feed({
      entries: [{
        title: "x",
        enclosure: [{ url: "x", length: "1", type: "x", value: "forbidden" }],
      }],
    }),
    feed({ category: [{ value: "x", url: "not a category attribute" }] }),
  ];
  for (const input of invalid) traps(() => w.run(list(input)));
  const base = list(feed());
  for (const key of ["title", "link", "description"]) {
    const escaped = "\\u" + key.charCodeAt(0).toString(16).padStart(4, "0") +
      key.slice(1);
    traps(() => w.run(base + '  - "' + escaped + '" "duplicate"\n'));
  }
  const image = base +
    "  - image {}\n    - url x\n    - title x\n    - link x\n";
  traps(() => w.run(image + '    - "\\u0075rl" duplicate\n'));
  const category = base + "  - category []\n    - {}\n      - value x\n";
  traps(() => w.run(category + '      - "\\u0076alue" duplicate\n'));
  equal(fromXml(w.run(base)), feed({ entries: [] }));
});

Deno.test("RSS writer: escaped names, XML characters and fence isolation", async () => {
  const w = await graph(true);
  const input = list(
    feed({ description: "before\n````\n<script>x</script>\nafter" }),
  )
    .replace('"title"', '"\\u0074itle"');
  const output = w.run(input);
  equal(output.startsWith("`````rss\n"), true);
  equal(
    fromXml(output),
    feed({
      description: "before\n````\n<script>x</script>\nafter",
      entries: [],
    }),
  );
  for (const bad of ["\0", "\u0001", "\ud800", "\udfff", "\ufffe", "\uffff"]) {
    traps(() => w.run(list(feed({ description: bad }))));
  }
  const unicode = feed({
    title: "雪𝄞é",
    category: [{ domain: "a\r\n\tb", value: "A\rB" }],
  });
  equal(fromXml(w.run(list(unicode))), { ...unicode, entries: [] });
});

Deno.test("RSS writer: empty arrays normalize without inventing fields", async () => {
  const w = await graph(true), r = await graph(false);
  const model = feed({
    entries: [],
    category: [],
    skipHours: { hour: [] },
    skipDays: {},
  });
  const expected = feed({ entries: [], skipHours: {}, skipDays: {} });
  const output = w.run(list(model));
  equal(fromXml(output), expected);
  equal(r.tree(r.run(output)), expected);
  equal(
    fromXml(w.run(list(feed({ entries: [{ description: "" }] })))),
    feed({ entries: [{ description: "" }] }),
  );
});

Deno.test("RSS writer: input/output limits, schema sentinels and failure recovery", async () => {
  const w = await graph(true);
  const empty = list(feed({ description: "" }));
  const full = list(
    feed({ description: "a".repeat(65536 - encoder.encode(empty).length) }),
  );
  equal(encoder.encode(full).length, 65536);
  equal(
    (fromXml(w.run(full)) as Record<string, Tree>).description,
    "a".repeat(65536 - encoder.encode(empty).length),
  );
  traps(() => w.raw(65537));
  traps(() => w.raw(-1));
  const baseLength = encoder.encode(w.run(empty)).length;
  const room = 131072 - baseLength;
  const content = "&".repeat(Math.floor(room / 5)) + "a".repeat(room % 5);
  equal(
    encoder.encode(w.run(list(feed({ description: content })))).length,
    131072,
  );
  traps(() => w.run(list(feed({ description: content + "a" }))));
  // Short source, but escaping unquoted control bytes expands compact JSON.
  traps(() =>
    w.run(
      "- {}\n  - title n\n  - link x\n  - description " + "\t".repeat(40000) +
        "x\n",
    )
  );
  equal(fromXml(w.run(empty)), feed({ description: "", entries: [] }));
});
