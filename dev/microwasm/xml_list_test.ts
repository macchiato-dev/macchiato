import { Parser } from "npm:commonmark@0.31.2";
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
type Node = Record<string, unknown>;
const encoder = new TextEncoder(), decoder = new TextDecoder();
function list(value: unknown, depth = 0, key = ""): string {
  const prefix = "  ".repeat(depth) + "- " + key;
  if (typeof value === "string") return prefix + JSON.stringify(value) + "\n";
  if (Array.isArray(value)) {
    return prefix + "[]\n" + value.map((v) => list(v, depth + 1)).join("");
  }
  if (value === null || typeof value !== "object") {
    return prefix + "= " + JSON.stringify(value) + "\n";
  }
  return prefix + "{}\n" +
    Object.entries(value).map(([k, v]) =>
      list(v, depth + 1, JSON.stringify(k) + " ")
    ).join("");
}
const element = (children: Node[] = [], attributes: Node = {}, name = "r") => ({
  element: name,
  attributes,
  children,
});
const fence = (xml: string, ticks = 3) =>
  "`".repeat(ticks) + "xml\n" + xml + "\n" + "`".repeat(ticks) + "\n";
function body(output: string): string {
  const doc = new Parser().parse(output);
  const block = doc.firstChild;
  equal(block?.type, "code_block");
  equal(block?.info, "xml");
  equal(block?.next, null);
  const literal = block!.literal!;
  equal(literal.endsWith("\n"), true);
  return literal.slice(0, -1); // The framing newline is not XML content.
}
function parse(xml: string): Node[] {
  const root: Node[] = [], stack = [root];
  const append = (node: Node) => stack.at(-1)!.push(node);
  const p = new SaxesParser({ xmlns: false });
  p.on("opentag", (tag) => {
    const children: Node[] = [];
    append({ element: tag.name, attributes: tag.attributes, children });
    stack.push(children);
  });
  p.on("closetag", () => stack.pop());
  p.on("text", (text) => append({ text }));
  p.on("comment", (comment) => append({ comment }));
  p.on("cdata", (cdata) => append({ cdata }));
  p.on(
    "processinginstruction",
    ({ target, body }) => append({ pi: target, data: body }),
  );
  p.on(
    "xmldecl",
    (fields) =>
      append({
        declaration: Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== undefined),
        ),
      }),
  );
  p.write(xml).close();
  return root;
}
function normalized(nodes: Node[]): Node[] {
  const result: Node[] = [];
  for (const n of nodes) {
    if ("text" in n) {
      if (n.text === "") continue;
      const last = result.at(-1);
      if (last && "text" in last) {
        last.text = String(last.text) + n.text;
        continue;
      }
      result.push({ text: n.text });
    } else if ("element" in n) {
      result.push({
        element: n.element,
        attributes: n.attributes,
        children: normalized(n.children as Node[]),
      });
    } else if ("declaration" in n) {
      const d = n.declaration as Node;
      result.push({
        declaration: Object.fromEntries(
          ["version", "encoding", "standalone"].filter((k) => k in d).map(
            (k) => [k, d[k]],
          ),
        ),
      });
    } else if ("pi" in n) result.push({ pi: n.pi, data: n.data });
    else result.push(n);
  }
  return result;
}
async function converter(write: boolean) {
  const imports: Record<string, WebAssembly.Exports> = {};
  const paths = write
    ? [
      ["n", "numbers/02-json-number"],
      ["l", "transforms/01-list-to-json"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      ["o", "transforms/00-xml-output"],
      ["t", "transforms/27-list-to-xml"],
    ]
    : [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      ["t", "transforms/26-xml-to-list"],
    ];
  for (const [n, p] of paths) {
    const built = assemble(
      await Deno.readTextFile(new URL(p + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    imports[n] =
      (await WebAssembly.instantiate(built.bytes, imports)).instance.exports;
  }
  const memory = new Uint8Array(
    (imports.t.memory as WebAssembly.Memory).buffer,
  );
  const run = imports.t.run as (length: number) => number;
  // The writer reclaims page one, but must never alter its literal table.
  const literalStart = write ? 198656 : 196608,
    literals = memory.slice(literalStart);
  function bytes(input: Uint8Array) {
    memory.set(input);
    try {
      const length = run(input.length);
      return decoder.decode(memory.subarray(65536, 65536 + length));
    } finally {
      equal(toHex(memory.subarray(literalStart)), toHex(literals));
    }
  }
  return {
    memory,
    run,
    bytes,
    convert: (input: string) => bytes(encoder.encode(input)),
  };
}

Deno.test("XML writer: all node kinds, escaping, declarations and lexical names", async () => {
  const w = await converter(true), r = await converter(false);
  const fixtures: [Node[], string][] = [
    [[element()], "<r/>"],
    [
      [element([{ text: 'Hello <&> "\r\n' }, {
        element: "b",
        attributes: {},
        children: [{ text: "猫😀" }],
      }], { a: '\t\r\n"<&>' })],
      '<r a="&#9;&#13;&#10;&quot;&lt;&amp;&gt;">Hello &lt;&amp;&gt; "&#13;\n<b>猫😀</b></r>',
    ],
    [
      [
        {
          declaration: { standalone: "yes", encoding: "uTf-8", version: "1.0" },
        },
        { comment: "before" },
        element([
          { cdata: "<x>&" },
          { pi: "go", data: "yes" },
          { comment: "" },
          { cdata: "" },
        ]),
        { pi: "after", data: "" },
      ],
      '<?xml version="1.0" encoding="uTf-8" standalone="yes"?><!--before--><r><![CDATA[<x>&]]><?go yes?><!----><![CDATA[]]></r><?after?>',
    ],
    [
      [element(
        [],
        Object.fromEntries([["__proto__", "x"], ["constructor", "y"], [
          "A",
          "one",
        ], ["a", "two"]]),
        "é:猫",
      )],
      '<é:猫 __proto__="x" constructor="y" A="one" a="two"/>',
    ],
    [
      [element([
        { text: "" },
        { text: "a" },
        { text: "b" },
        { comment: "split" },
        { text: "c" },
        { text: "" },
      ])],
      "<r>ab<!--split-->c</r>",
    ],
    [[{ text: "\n\t " }, element(), { text: "\n" }], "\n\t <r/>\n"],
  ];
  for (const [tree, xml] of fixtures) {
    const output = w.convert(list(tree));
    equal(output, fence(xml));
    equal(r.convert(output), list(normalized(tree)));
    if (!(tree[0] && "text" in tree[0])) {
      equal(parse(body(output)), normalized(tree));
    }
  }
});

Deno.test("XML writer: property permutations and escaped field names keep their meaning", async () => {
  const w = await converter(true);
  const source = element([{ text: "value" }], { x: "y" }, "a");
  for (
    const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [
      2,
      1,
      0,
    ]]
  ) {
    const entries = Object.entries(source);
    const node = Object.fromEntries(order.map((i) => entries[i]));
    equal(w.convert(list([node])), fence('<a x="y">value</a>'));
  }
  equal(
    w.convert(list([{ data: "value", pi: "go" }, element()])),
    fence("<?go value?><r/>"),
  );
  equal(
    w.convert(
      list([source]).replace('"element"', '"\\u0065lement"').replace(
        '"x"',
        '"\\u0078"',
      ),
    ),
    fence('<a x="y">value</a>'),
  );
  equal(
    w.convert(
      list([{ declaration: { encoding: "UTF-8", version: "1.0" } }, element()]),
    ),
    fence('<?xml version="1.0" encoding="UTF-8"?><r/>'),
  );
});

Deno.test("XML pair: 500 generated trees through Wasm and an independent XML parser", async () => {
  const w = await converter(true), r = await converter(false);
  let seed = 0x15aeb678;
  function pick<T>(values: T[]): T {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return values[seed % values.length];
  }
  const text = () =>
    pick(["", "Ben", "&<>", '"\t\r\n', "猫😀", "\\n", "\ufeff", "`"]);
  function elem(depth: number): Node {
    const attrs = Object.fromEntries(
      Array.from({ length: pick([0, 1, 2, 4]) }, (_, i) => ["a" + i, text()]),
    );
    const children: Node[] = [];
    for (let i = 0, n = pick([0, 1, 2, 3]); i < n; i++) {
      switch (pick([0, 1, 2, 3, 4])) {
        case 0:
          children.push(depth < 4 ? elem(depth + 1) : element());
          break;
        case 1:
          children.push({ comment: pick(["", "note", "a-b", "猫😀"]) });
          break;
        case 2:
          children.push({ cdata: pick(["", "<raw>&", "\n data", "é😀"]) });
          break;
        case 3:
          children.push({ data: pick(["", "data", "? >\n"]), pi: "go" });
          break;
        default:
          children.push({ text: text() + text() });
      }
    }
    const e = element(children, attrs, pick(["r", "cat", "é:猫", "_x", "𐀀"]));
    return Object.fromEntries(
      pick([Object.entries(e), Object.entries(e).reverse()]),
    );
  }
  for (let i = 0; i < 500; i++) {
    const tree = [{ comment: "start" }, elem(0), { pi: "end", data: "" }];
    const output = w.convert(list(tree));
    equal(parse(body(output)), normalized(tree));
    equal(r.convert(output), list(normalized(tree)));
  }
});

Deno.test("XML writer: malformed shapes, duplicate decoded fields and attribute types", async () => {
  const w = await converter(true);
  for (
    const tree of [
      {},
      [],
      "text",
      [{}],
      ["text"],
      [element(), element()],
      [{ text: "outside" }, element()],
      [{ cdata: "outside" }, element()],
      [{ element: "r", children: [] }],
      [{ element: "r", attributes: {} }],
      [{ ...element(), extra: "ignored?" }],
      [{ ...element(), text: "mixed" }],
      [{ ...element(), element: 3 }],
      [{ ...element(), attributes: [] }],
      [{ ...element(), children: {} }],
      [element([], { a: 3 })],
      [element([], { a: null })],
      [element([], { a: {} })],
      [element([{ text: [] }])],
      [element([{ text: 3 }])],
      [{ pi: "go" }, element()],
      [{ data: "x" }, element()],
      [{ pi: "go", data: 3 }, element()],
      [{ declaration: {} }, element()],
      [{ declaration: { version: "1.1" } }, element()],
      [{ declaration: { version: 1 } }, element()],
      [{ declaration: { version: "1.0", encoding: "ASCII" } }, element()],
      [{ declaration: { version: "1.0", standalone: "YES" } }, element()],
      [{ declaration: { version: "1.0", extra: "x" } }, element()],
      [element([{ declaration: { version: "1.0" } }])],
      [{ comment: "first" }, { declaration: { version: "1.0" } }, element()],
      [
        { declaration: { version: "1.0" } },
        { declaration: { version: "1.0" } },
        element(),
      ],
    ]
  ) {
    try {
      traps(() => w.convert(list(tree)));
    } catch (e) {
      throw Error("Invalid tree accepted: " + JSON.stringify(tree), {
        cause: e,
      });
    }
  }
  const good = list([element([], { a: "one" })]);
  for (
    const source of [
      good.replace(
        '    - "element" "r"',
        '    - "element" "r"\n    - "\\u0065lement" "r"',
      ),
      good.replace(
        '      - "a" "one"',
        '      - "a" "one"\n      - "\\u0061" "two"',
      ),
      list([{ declaration: { version: "1.0" } }, element()]).replace(
        '      - "version" "1.0"',
        '      - "version" "1.0"\n      - "version" "1.0"',
      ),
    ]
  ) traps(() => w.convert(source));
  equal(w.convert(good), fence('<r a="one"/>'));
});

Deno.test("XML writer: invalid names, literal delimiters and XML characters cannot leak", async () => {
  const w = await converter(true);
  for (const name of ["", "1bad", "a b", "a/b", 'a"', "\ud800"]) {
    traps(() => w.convert(list([element([], {}, name)])));
    traps(() => w.convert(list([element([], { [name]: "x" })])));
  }
  for (
    const node of [
      { comment: "--" },
      { comment: "ends-" },
      { comment: "\r" },
      { cdata: "]]>" },
      { cdata: "\r" },
      { pi: "XML", data: "" },
      { pi: "xml", data: "" },
      { pi: "go", data: "?>" },
      { pi: "go", data: " data" },
      { pi: "go", data: "\r" },
      { text: "\0" },
      { text: "\ufffe" },
      { text: "\udc00" },
    ]
  ) traps(() => w.convert(list([element([node])])));
  traps(() => w.convert(list([{ text: "\r" }, element()])));
  equal(
    w.convert(list([element([{ text: "]]>\r" }])])),
    fence("<r>]]&gt;&#13;</r>"),
  );
});

Deno.test("XML writer: variable fences preserve every backtick in literal content", async () => {
  const w = await converter(true), r = await converter(false);
  for (const count of [0, 1, 2, 3, 4, 7, 128, 256, 2000]) {
    const value = "a\n   " + "`".repeat(count) + "\nend";
    const tree = [element([{ text: value }, { cdata: value }])];
    const output = w.convert(list(tree));
    equal(
      output.startsWith("`".repeat(Math.max(3, count + 1)) + "xml\n"),
      true,
    );
    equal(parse(body(output)), tree);
    equal(r.convert(output), list(tree));
  }
});

Deno.test("XML writer: nesting, input/intermediate/output caps and reclaimed input page", async () => {
  const w = await converter(true);
  function nested(depth: number): Node {
    return depth > 1 ? element([nested(depth - 1)]) : element();
  }
  equal(
    body(w.convert(list([nested(32)]))),
    "<r>".repeat(31) + "<r/>" + "</r>".repeat(31),
  );
  traps(() => w.convert(list([nested(33)])));
  const simple = list([element()]);
  const fullInput = simple + "\n".repeat(65536 - encoder.encode(simple).length);
  equal(w.convert(fullInput), fence("<r/>"));
  equal(decoder.decode(w.memory.subarray(0, 10)), '[{"element');
  traps(() => w.convert(fullInput + "\n"));
  traps(() => w.run(-1));
  // Plain list text fits input, but JSON quoting doubles its backslashes.
  const largeIntermediate = simple.replace(
    '    - "children" []',
    '    - "children" []\n      - {}\n        - "text" ' + "\\".repeat(40000),
  );
  traps(() => w.convert(largeIntermediate));
  const value = "&".repeat(26210) + "aaa";
  const exact = w.convert(list([element([{ text: value }])]));
  equal(encoder.encode(exact).length, 131072);
  equal(body(exact), "<r>" + "&amp;".repeat(26210) + "aaa</r>");
  traps(() => w.convert(list([element([{ text: value + "b" }])])));
  const attrs = Object.fromEntries(
    Array.from({ length: 500 }, (_, i) => ["a" + i, String(i)]),
  );
  equal(parse(body(w.convert(list([element([], attrs)])))), [
    element([], attrs),
  ]);
  equal(w.convert(simple), fence("<r/>"));
});
