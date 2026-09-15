import { Parser } from "npm:commonmark@0.31.2";
import { assemble, toHex } from "./microwasm.ts";

const enc = new TextEncoder(), dec = new TextDecoder();
const fence = (s: string) => "```json\n" + s + "\n```\n";
type Member = [string, string]; // Exact JSON key/value spellings.
type Operation = Member[];
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      `${JSON.stringify(a)?.slice(0, 1000)} != ${
        JSON.stringify(b)?.slice(0, 1000)
      }`,
    );
  }
}
function traps(f: () => unknown) {
  try {
    f();
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
    throw e;
  }
  throw Error("Expected Wasm trap");
}
const object = (members: Operation) =>
  "{" + members.map(([k, v]) => k + ":" + v).join(",") + "}";
const patch = (ops: Operation[]) => "[" + ops.map(object).join(",") + "]";
function code(s: string) {
  const width =
    Math.max(0, ...Array.from(s.matchAll(/`+/g), (m) => m[0].length)) + 1;
  return "`".repeat(width) + s + "`".repeat(width);
}
function output(ops: Operation[]) {
  return ops.map((members) => {
    const op = members.find(([k]) => JSON.parse(k) === "op")!;
    return "- " + JSON.parse(op[1]) + "\n" +
      members.filter(([k]) => JSON.parse(k) !== "op").map(([k, v]) =>
        "  - " + code(k + " " + v) + "\n"
      ).join("");
  }).join("");
}
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
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(a.resolved).bytes), toHex(a.bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const r = imports.r as unknown as {
    memory: WebAssembly.Memory;
    run(n: number): number;
    scan(s: number, e: number): number;
    validateCompact(s: number, e: number): void;
  };
  const memory = new Uint8Array(r.memory.buffer);
  const literals = memory.slice(0x2f000, 0x3000c);
  const put = (s: string | Uint8Array, at = 0) => {
    const b = typeof s === "string" ? enc.encode(s) : s;
    memory.set(b, at);
    return at + b.length;
  };
  function run(s: string | Uint8Array) {
    const bytes = typeof s === "string" ? enc.encode(s) : s;
    if (bytes.length > 65536) throw Error("Oversized test source");
    put(bytes);
    try {
      const n = r.run(bytes.length);
      equal(n >= 0 && n <= 126976, true);
      return dec.decode(memory.subarray(65536, 65536 + n));
    } finally {
      equal(toHex(memory.subarray(0, bytes.length)), toHex(bytes));
      equal(toHex(memory.subarray(0x2f000, 0x3000c)), toHex(literals));
    }
  }
  return {
    ...r,
    memory,
    put,
    raw: r.run,
    run,
    json: (s: string) => run(fence(s)),
  };
}

Deno.test("JSON Patch reader: all operations, member order, exact tokens and extra fields", async () => {
  const t = await tool();
  const ops: Operation[] = [
    [['"op"', '"add"'], ['"path"', '"/pets/-"'], [
      '"value"',
      '{"name":"Milo"}',
    ]],
    [['"from"', '"/old"'], ['"path"', '"/new"'], ['"op"', '"move"'], [
      '"note"',
      '"retain me"',
    ]],
    [['"op"', '"remove"'], ['"path"', '""'], ['"value"', "null"], [
      '"value"',
      "false",
    ], ['"from"', "12"]],
    [['"op"', '"copy"'], ['"path"', '"/a/child"'], ['"from"', '"/a"']],
    [['"op"', '"replace"'], ['"path"', '"/00"'], ['"value"', "-0.000E+03"]],
    [['"\\u006fp"', '"te\\u0073t"'], ['"\\u0070ath"', '"/a~1b"'], [
      '"value"',
      '[1e9999,{"x":true,"x":null}]',
    ]],
  ];
  equal(t.json(patch(ops)), output(ops));
  equal(t.json("[]"), "");
  equal(t.run(fence(patch(ops)).replaceAll("\n", "\r\n")), output(ops));
  equal(
    t.json('[ { "path" : "/a" , "op" : "test", "value" : [ 1, 2 ] } ]'),
    '- test\n  - `"path" "/a"`\n  - `"value" [1,2]`\n',
  );
});

Deno.test("JSON Patch reader: generated values and field permutations retain their native JSON meaning", async () => {
  const t = await tool();
  const names = ["add", "remove", "replace", "move", "copy", "test"];
  const values = [
    null,
    true,
    false,
    0,
    -42,
    1.25,
    "雪😀",
    "`**<img>**`",
    [],
    {},
    { x: [1, "a\\b", { n: null }] },
  ];
  for (let i = 0; i < 400; i++) {
    const op = names[i % names.length];
    let members: Operation = [['"op"', JSON.stringify(op)], [
      '"path"',
      JSON.stringify("/target/" + i),
    ]];
    if (["add", "replace", "test"].includes(op)) {
      members.push(['"value"', JSON.stringify(values[i % values.length])]);
    }
    if (["move", "copy"].includes(op)) {
      members.push(['"from"', JSON.stringify("/source/" + i)]);
    }
    members.push(['"extra"', JSON.stringify({ i, text: "a`b``c" })]);
    const split = i % members.length;
    members = members.slice(split).concat(members.slice(0, split));
    const result = t.json(patch([members]));
    equal(result, output([members]));
    const walker = new Parser().parse(result).walker();
    const spans: string[] = [];
    let event;
    while ((event = walker.next())) {
      if (event.entering && event.node.type === "code") {
        spans.push(event.node.literal!);
      }
    }
    equal(
      spans,
      members.filter(([k]) => JSON.parse(k) !== "op").map(([k, v]) =>
        k + " " + v
      ),
    );
    const reconstructed: Record<string, unknown> = { op };
    for (const span of spans) {
      // These generated keys have no escapes: native JSON parses the values.
      const close = span.indexOf('"', 1) + 1;
      reconstructed[JSON.parse(span.slice(0, close))] = JSON.parse(
        span.slice(close),
      );
    }
    for (const [key, value] of Object.entries(JSON.parse(object(members)))) {
      equal(reconstructed[key], value);
    }
  }
});

Deno.test("JSON Patch reader: missing/duplicate required fields, pointer escapes and move ancestry", async () => {
  const t = await tool();
  for (
    const body of [
      "{}",
      "null",
      "[1]",
      "[[]]",
      "[{}]",
      '[{"op":"remove"}]',
      '[{"path":"/a"}]',
      '[{"op":"REMOVE","path":"/a"}]',
      '[{"op":1,"path":"/a"}]',
      '[{"op":"remove","path":0}]',
      '[{"op":"add","path":"/a"}]',
      '[{"op":"test","path":"/a"}]',
      '[{"op":"replace","path":"/a"}]',
      '[{"op":"move","path":"/a"}]',
      '[{"op":"copy","path":"/a","from":null}]',
      '[{"op":"remove","path":"/a","\\u0070ath":"/b"}]',
      '[{"op":"remove","op":"remove","path":"/a"}]',
      '[{"op":"add","path":"/a","value":1,"value":2}]',
      '[{"op":"copy","path":"/b","from":"/a","from":"/a"}]',
      '[{"op":"move","path":"/a/b","from":"/a"}]',
      '[{"op":"move","path":"/a","from":""}]',
      '[{"op":"move","path":"/a~1b/c","from":"/a~1b"}]',
      '[{"op":"move","path":"/a/b","from":"\\u002fa"}]',
      '[{"op":"remove","path":"#/a"}]',
      '[{"op":"remove","path":"/a~2"}]',
      '[{"op":"remove","path":"/a~"}]',
      '[{"op":"remove","path":"/a"},]',
      '[{"op":"remove","path":"/a","x":NaN}]',
    ]
  ) {
    traps(() => t.json(body));
    equal(
      t.json('[{"op":"remove","path":"/a"}]'),
      '- remove\n  - `"path" "/a"`\n',
    );
  }
  for (
    const [from, path] of [["/a", "/ab"], ["/a", "/a"], ["/a", ""], [
      "/a",
      "/a~1b",
    ]]
  ) {
    const op: Operation = [
      ['"op"', '"move"'],
      ['"from"', JSON.stringify(from)],
      ['"path"', JSON.stringify(path)],
    ];
    equal(t.json(patch([op])), output([op]));
  }
});

Deno.test("JSON Patch reader: dynamic code delimiters preserve Markdown punctuation and controls", async () => {
  const t = await tool();
  for (
    const value of [
      "",
      "`",
      "``",
      "a```b",
      "<img src=https://bad.invalid/x>",
      "[click](https://bad.invalid)",
      "\r\n\t\0",
      "\ud800",
      "😀",
    ]
  ) {
    const op: Operation = [['"op"', '"add"'], ['"path"', '""'], [
      JSON.stringify("extra``"),
      JSON.stringify(value),
    ], ['"value"', JSON.stringify(value)]];
    const result = t.json(patch([op]));
    equal(result, output([op]));
    const walker = new Parser().parse(result).walker();
    let event;
    while ((event = walker.next())) {
      if (
        ["html_inline", "html_block", "link", "image"].includes(event.node.type)
      ) throw Error("Data became active Markdown");
    }
  }
  const bytes = enc.encode(fence('[{"op":"remove","path":"/x"}]'));
  bytes[bytes.indexOf(120)] = 255;
  traps(() => t.run(bytes));
});

Deno.test("JSON Patch semantic spans: read-only validation and nested-value end positions", async () => {
  const t = await tool();
  const body =
    '[{"op":"add","path":"/a","value":{"quoted":"\\"},]","items":[1,2]}}]';
  for (const start of [0, 65536, 196700]) {
    const end = t.put(body, start), snapshot = t.memory.slice();
    t.validateCompact(start, end);
    equal(t.scan(start, end), end);
    equal(t.scan(start + 1, end - 1), end - 1);
    equal(toHex(t.memory), toHex(snapshot));
  }
  for (const [s, e] of [[-1, 1], [2, 1], [0, 262145], [0, 0]]) {
    traps(() => t.validateCompact(s, e));
  }
  const end = t.put('[{"op":"move","from":"/a","path":"/a/b"}]'),
    snapshot = t.memory.slice();
  traps(() => t.validateCompact(0, end));
  equal(toHex(t.memory), toHex(snapshot));
});

Deno.test("JSON Patch reader: source/output capacities, nesting and recovery", async () => {
  const t = await tool();
  const make = (
    value: string,
  ): Operation[] => [[['"op"', '"add"'], ['"path"', '""'], [
    '"value"',
    JSON.stringify(value),
  ]]];
  const base = output(make("")).length;
  const n = Math.floor((126976 - base) / 3), rest = 126976 - base - 3 * n;
  const ops = make("`".repeat(n) + "a".repeat(rest));
  equal(output(ops).length, 126976);
  equal(t.json(patch(ops)), output(ops));
  traps(() => t.json(patch(make("`".repeat(n) + "a".repeat(rest + 1)))));
  const simple = fence('[{"op":"remove","path":""}]');
  equal(
    t.run(" ".repeat(65536 - simple.length) + simple),
    '- remove\n  - `"path" ""`\n',
  );
  const prefix = '[{"op":"add","path":"","value":';
  t.json(prefix + "[".repeat(126) + "0" + "]".repeat(126) + "}]");
  traps(() => t.json(prefix + "[".repeat(127) + "0" + "]".repeat(127) + "}]"));
  for (const n of [-1, 65537, 0x7fffffff]) traps(() => t.raw(n));
  equal(t.json("[]"), "");
});
