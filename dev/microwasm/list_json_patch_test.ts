import { assemble, toHex } from "./microwasm.ts";
import { Parser } from "npm:commonmark@0.31.2";

function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  }
}
function trap(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
    throw e;
  }
  throw Error("Expected a Wasm trap");
}
const enc = new TextEncoder(), dec = new TextDecoder();
const fence = (s: string) => "```json\n" + s + "\n```\n";
const code = (s: string) => {
  const n = Math.max(0, ...Array.from(s.matchAll(/`+/g), (m) => m[0].length)) +
    1;
  const ticks = "`".repeat(n);
  return ticks + s + ticks;
};
const records = (ops: Record<string, unknown>[]) =>
  ops.map((o) =>
    "- " + o.op + "\n" + Object.entries(o).filter(([k]) => k !== "op")
      .map(([k, v]) =>
        "  - " + code(JSON.stringify(k) + " " + JSON.stringify(v)) + "\n"
      ).join("")
  ).join("");

async function tool() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["p", "transforms/02-json-to-list"],
      ["k", "transforms/00-json-string-keys"],
      ["q", "transforms/00-json-pointer"],
      ["c", "transforms/00-calendar-lines"],
      ["r", "transforms/49-json-patch-to-list"],
      ["w", "transforms/50-list-to-json-patch"],
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
    (imports.w.memory as WebAssembly.Memory).buffer,
  );
  const literals = memory.slice(0x2f000, 0x3000c);
  function run(s: string | Uint8Array, name = "w") {
    const input = typeof s === "string" ? enc.encode(s) : s;
    if (input.length > 65536) throw Error("Oversized test input");
    memory.set(input);
    try {
      const n = (imports[name].run as (n: number) => number)(input.length);
      equal(n >= 0 && n <= 126976, true);
      return dec.decode(memory.subarray(65536, 65536 + n));
    } finally {
      equal(toHex(memory.subarray(0, input.length)), toHex(input));
      equal(toHex(memory.subarray(0x2f000, 0x3000c)), toHex(literals));
    }
  }
  return {
    run,
    read: (s: string) => run(s, "r"),
    memory,
    raw: imports.w.run as (n: number) => number,
  };
}

Deno.test("JSON Patch writer: all operations, exact spelling, extra members and blank rows", async () => {
  const t = await tool();
  const ops = [
    { op: "add", path: "/pets/-", value: { name: "Milo" } },
    { op: "move", from: "/old", path: "/new", note: "retain me" },
    { op: "copy", path: "", from: "/a" },
    { op: "remove", path: "/a~1b", from: 23 },
    { op: "replace", path: "/00", value: null },
    { op: "test", path: "/雪😀", value: [false, 1.25] },
  ];
  equal(t.run(records(ops)), fence(JSON.stringify(ops)));
  equal(
    t.run(records(ops).replaceAll("\n", " \t\r\n\t\r\n")),
    fence(JSON.stringify(ops)),
  );
  equal(t.run(" \t\r\n"), fence("[]"));
  equal(t.run(""), fence("[]"));
  const source =
    '- test\n  - `"\\u0070ath" ""`\n  - `"value" [ -0.00E+03, 1e9999, { "a":true,"a":null } ]`\n';
  equal(
    t.run(source),
    fence(
      '[{"op":"test","\\u0070ath":"","value":[-0.00E+03,1e9999,{"a":true,"a":null}]}]',
    ),
  );
  equal(
    t.run('- remove\n  - `"path" "/a"`\n  - `"value" 1`\n  - `"value" 2`\n'),
    fence('[{"op":"remove","path":"/a","value":1,"value":2}]'),
  );
});

Deno.test("JSON Patch pair: generated records and independent JSON/CommonMark checks", async () => {
  const t = await tool();
  const values = [
    null,
    true,
    false,
    0,
    -7,
    1.25,
    "雪😀",
    "`<img> & [link](x)`",
    [1, 2],
    { x: "\\\n\t" },
  ];
  const kinds = ["add", "remove", "replace", "move", "copy", "test"];
  for (let i = 0; i < 500; i++) {
    const op = kinds[i % kinds.length];
    const ops = [{
      op,
      path: "/item/" + i,
      from: "/origin",
      value: values[i % values.length],
      ["note" + "`".repeat(i % 13)]: "a" + "`".repeat(i % 19) + "b",
    }];
    const markdown = records(ops);
    const result = t.run(markdown);
    equal(JSON.parse(result.slice(8, -5)), ops);
    equal(result, fence(JSON.stringify(ops)));
    equal(t.read(result), markdown);
    equal(t.run(t.read(result)), result);
    const walk = new Parser().parse(markdown).walker();
    const spans: string[] = [];
    let event;
    while ((event = walk.next())) {
      if (event.entering && event.node.type === "code") {
        spans.push(event.node.literal!);
      }
      if (
        event.node.type === "html_inline" || event.node.type === "image" ||
        event.node.type === "link"
      ) {
        throw Error("Record escaped its literal code span");
      }
    }
    equal(
      spans,
      Object.entries(ops[0]).filter(([k]) => k !== "op").map(([k, v]) =>
        JSON.stringify(k) + " " + JSON.stringify(v)
      ),
    );
  }
});

Deno.test("JSON Patch writer: invalid Markdown, JSON injection and semantic errors recover", async () => {
  const t = await tool();
  const good = '- remove\n  - `"path" "/a"`\n';
  const bad = [
    '- unknown\n  - `"path" ""`',
    '- Remove\n  - `"path" ""`',
    "- remove",
    '  - `"path" ""`',
    "- remove\n- remove",
    '- remove\n - `"path" ""`',
    '- remove\n    - `"path" ""`',
    '- remove\n  - "path" ""',
    '- remove\n  - `"path" ""``',
    '- remove\n  - ``"path" ""`',
    '- remove\n  - `"path" "/a`b"`',
    '- remove\n  - `"path"""`',
    '- remove\n  - `"path" `',
    '- remove\n  - `"path" "", "value":true`',
    '- remove\n  - `"path": ""`',
    '- remove\n  - `12 ""`',
    '- remove\n  - `"pa\\qth" ""`',
    '- remove\n  - `"path" "unterminated`',
    '- remove\n  - `"path" "/bad~2"`',
    '- remove\n  - `"path" 0`',
    good + '  - `"\\u0070ath" "/b"`',
    good + '  - `"op" "remove"`',
    good + '  - `"\\u006fp" "remove"`',
    '- add\n  - `"path" ""`',
    '- test\n  - `"path" ""`\n  - `"value" NaN`',
    '- move\n  - `"path" "/a/b"`\n  - `"from" "/a"`',
    '- copy\n  - `"path" "/b"`',
    good + "tail",
  ];
  for (const s of bad) {
    trap(() => t.run(s));
    equal(t.run(good), fence('[{"op":"remove","path":"/a"}]'));
  }
});

Deno.test("JSON Patch writer: Unicode, controls, canonical code spans and inert resources", async () => {
  const t = await tool();
  for (
    const value of [
      '<img src="https://patch.invalid/">',
      "[link](javascript:evil)",
      "&amp;",
      "😀雪",
      "\u0000\n\t",
      "\ud800",
      "\udfff",
      "a`b``c```d",
    ]
  ) {
    const ops = [{ op: "add", path: "", value }];
    equal(t.run(records(ops)), fence(JSON.stringify(ops)));
  }
  for (
    const bytes of [[0x80], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [
      0xf4,
      0x90,
      0x80,
      0x80,
    ], [0xf0, 0x90]]
  ) {
    const a = enc.encode('- add\n  - `"path" ""`\n  - `"value" "');
    const b = enc.encode('"`\n');
    trap(() => t.run(new Uint8Array([...a, ...bytes, ...b])));
  }
  const hugeTicks = '"value" "a' + "`".repeat(10000) + 'b"';
  const source = '- add\n  - `"path" ""`\n  - ' + code(hugeTicks) + "\n";
  equal(
    t.run(source),
    fence('[{"op":"add","path":"","value":"a' + "`".repeat(10000) + 'b"}]'),
  );
});

Deno.test("JSON Patch writer: source/depth bounds, unchanged memory and repeated recovery", async () => {
  const t = await tool();
  const good = '- remove\n  - `"path" ""`\n';
  equal(
    t.run(good + "\n".repeat(65536 - enc.encode(good).length)),
    fence('[{"op":"remove","path":""}]'),
  );
  const value = (depth: number) =>
    '- add\n  - `"path" ""`\n  - `"value" ' + "[".repeat(depth) + "0" +
    "]".repeat(depth) + "`\n";
  equal(JSON.parse(t.run(value(126)).slice(8, -5))[0].op, "add");
  trap(() => t.run(value(127)));
  for (const n of [-1, 65537, 0x7fffffff]) trap(() => t.raw(n));
  trap(() => t.run("- a\n".repeat(16384)));
  equal(t.run(good), fence('[{"op":"remove","path":""}]'));
  const prefix = '- add\n  - `"path" ""`\n  - `"value" "';
  const suffix = '"`\n';
  const s = prefix + "x".repeat(65536 - enc.encode(prefix + suffix).length) +
    suffix;
  equal(
    t.run(s),
    fence(
      '[{"op":"add","path":"","value":' +
        JSON.stringify("x".repeat(65536 - enc.encode(prefix + suffix).length)) +
        "}]",
    ),
  );
});

Deno.test("JSON Patch writer: punctuation edits reject or remain valid round-trippable data", async () => {
  const t = await tool();
  const source = records([
    { op: "move", path: "/b", from: "/a" },
    { op: "add", path: "/x", value: { text: 'a`b"c', number: 42 } },
  ]);
  for (let at = 0; at < source.length; at++) {
    for (
      const ch of [
        '"',
        "`",
        ":",
        ",",
        "{",
        "}",
        "[",
        "]",
        "~",
        "/",
        "\\",
        "\n",
        " ",
        "",
      ]
    ) {
      const changed = source.slice(0, at) + ch + source.slice(at + 1);
      let result: string;
      try {
        result = t.run(changed);
      } catch (e) {
        if (!(e instanceof WebAssembly.RuntimeError)) throw e;
        continue;
      }
      const ops = JSON.parse(result.slice(8, -5));
      equal(Array.isArray(ops), true);
      for (const op of ops) {
        equal(
          ["add", "remove", "replace", "move", "copy", "test"].includes(op.op),
          true,
        );
        equal(typeof op.path, "string");
        equal(op.path === "" || op.path.startsWith("/"), true);
        equal(/~(?![01])/.test(op.path), false);
        if (["add", "replace", "test"].includes(op.op)) {
          equal(Object.hasOwn(op, "value"), true);
        }
        if (["move", "copy"].includes(op.op)) {
          equal(typeof op.from, "string");
          equal(op.from === "" || op.from.startsWith("/"), true);
          equal(/~(?![01])/.test(op.from), false);
        }
        if (op.op === "move") equal(op.path.startsWith(op.from + "/"), false);
      }
      equal(t.run(t.read(result)), result);
    }
  }
});
