import { assemble, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}
function traps(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) return;
    throw error;
  }
  throw new Error("Expected Wasm trap");
}
const json = (body: string) => "```json\n" + body + "\n```\n";
const lines = (records: string[]) =>
  "```jsonl\n" + records.map((v) => v + "\n").join("") + "```\n";

async function converters() {
  async function module(path: string) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    return await WebAssembly.compile(built.bytes);
  }
  const n =
    (await WebAssembly.instantiate(await module("numbers/02-json-number")))
      .exports;
  const p =
    (await WebAssembly.instantiate(await module("transforms/02-json-to-list"), {
      n,
    })).exports;
  const shared = await module("transforms/14-json-lines-to-array");
  equal(
    JSON.stringify(WebAssembly.Module.imports(shared)),
    JSON.stringify([
      { module: "p", name: "compactSpan", kind: "function" },
      { module: "p", name: "memory", kind: "memory" },
    ]),
  );
  const j = (await WebAssembly.instantiate(shared, { p })).exports;
  const a = (await WebAssembly.instantiate(
    await module("transforms/15-array-to-json-lines"),
    { j },
  )).exports;
  equal(a.run, j.array);
  equal(a.memory, j.memory);
  equal(j.memory, n.memory);
  const memory = new Uint8Array((n.memory as WebAssembly.Memory).buffer);
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  const runs = {
    toArray: j.run as (len: number) => number,
    toLines: a.run as (len: number) => number,
  };
  return {
    memory,
    runs,
    span: p.compactSpan as (
      start: number,
      end: number,
      out: number,
      depth: number,
    ) => number,
    list: p.run as (len: number) => number,
    transform(mode: "toArray" | "toLines", text: string) {
      const input = encoder.encode(text);
      memory.set(input);
      const length = runs[mode](input.length);
      return decoder.decode(memory.subarray(0x10000, 0x10000 + length));
    },
    decode(start: number, length: number) {
      return decoder.decode(memory.subarray(start, start + length));
    },
  };
}

Deno.test("JSON Lines to array: each JSON kind, empty stream, CRLF and exact lexemes", async () => {
  const c = await converters();
  const records = [
    '{ "name" : "Ben", "name": "Ada" }',
    ' [1, {"nested": [true,false,null]}] ',
    ' "comma, \\n and  spaces" ',
    "-0",
    "1.2300E+40",
    "1e9999",
    "9007199254740993",
    '"\\uD800\\udfff"',
    "true",
    "false",
    "null",
    "{}",
    "[]",
  ];
  const compact = [
    '{"name":"Ben","name":"Ada"}',
    '[1,{"nested":[true,false,null]}]',
    '"comma, \\n and  spaces"',
    "-0",
    "1.2300E+40",
    "1e9999",
    "9007199254740993",
    '"\\uD800\\udfff"',
    "true",
    "false",
    "null",
    "{}",
    "[]",
  ];
  equal(
    c.transform("toArray", lines(records)),
    json("[" + compact.join(",") + "]"),
  );
  equal(c.transform("toArray", lines([])), json("[]"));
  equal(c.transform("toArray", lines([]).trimEnd()), json("[]"));
  equal(c.transform("toArray", lines(["null"])), json("[null]"));
  equal(
    c.transform("toArray", lines(records).replaceAll("\n", "\r\n") + "\t "),
    json("[" + compact.join(",") + "]"),
  );
  equal(
    c.transform("toArray", lines(['"<b>```</b>猫"'])),
    json('["<b>```</b>猫"]'),
  );
});

Deno.test("Array to JSON Lines: nested delimiters and escaped quotes do not split records", async () => {
  const c = await converters();
  const records = [
    '{"a":[1,2],"a":[3,4]}',
    '[{"x":1},{"y":2}]',
    '"a,b[{c}]"',
    '"\\", comma after escaped quote"',
    '"\\\\",',
  ];
  // The last fixture above is deliberately not a value by itself.
  traps(() => c.transform("toLines", json("[" + records.join(",") + "]")));
  records[4] = '"\\\\"';
  records.push(
    '"\\u0022,\\u005c"',
    '"\\n\\r\\t"',
    "-0",
    "true",
    "null",
    "{}",
    "[]",
  );
  equal(
    c.transform("toLines", json("[ " + records.join(" ,\n ") + " ]")),
    lines(records),
  );
  equal(c.transform("toLines", json("[]")), lines([]));
  equal(c.transform("toLines", json("[]").trimEnd()), lines([]));
  equal(c.transform("toLines", json("[[]]")), lines(["[]"]));
  equal(c.transform("toLines", json("[{}]")), lines(["{}"]));
  equal(
    c.transform("toLines", json('[ "[", "]", "{", "}", ",", "\\\\\\"" ]')),
    lines(['"["', '"]"', '"{"', '"}"', '","', '"\\\\\\""']),
  );
  equal(
    c.transform("toLines", json("[1,2]").replaceAll("\n", "\r\n")),
    lines(["1", "2"]),
  );
});

Deno.test("JSON Lines pair: 600 generated round trips against independent native encoding", async () => {
  const c = await converters();
  type Value = null | boolean | number | string | Value[] | {
    [key: string]: Value;
  };
  let seed = 0x48213d7b;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  }
  const strings = [
    "",
    "a,b",
    "[x]",
    "{x}",
    '"\\',
    "\n\r\t",
    "猫",
    "\ud800",
    "<script>",
    "```",
  ];
  function value(depth: number): Value {
    switch (random() % (depth ? 6 : 4)) {
      case 0:
        return null;
      case 1:
        return !!(random() & 1);
      case 2:
        return (random() - 2 ** 31) / 100;
      case 3:
        return strings[random() % strings.length];
      case 4:
        return Array.from({ length: random() % 4 }, () => value(depth - 1));
      default:
        return Object.fromEntries(Array.from({ length: random() % 4 }, () => [
          strings[random() % strings.length],
          value(depth - 1),
        ]));
    }
  }
  for (let i = 0; i < 600; i++) {
    const array = Array.from({ length: random() % 8 }, () => value(5));
    const expectedLines = lines(array.map((v) => JSON.stringify(v)));
    const expectedArray = json(JSON.stringify(array));
    equal(
      c.transform("toLines", json(JSON.stringify(array, null, i % 4))),
      expectedLines,
    );
    equal(c.transform("toArray", expectedLines), expectedArray);
    equal(c.transform("toLines", expectedArray), expectedLines);
    equal(
      c.transform(
        "toArray",
        lines(array.map((v) => "\t " + JSON.stringify(v) + " \r")),
      ),
      expectedArray,
    );
  }
});

Deno.test("JSON Lines pair: malformed records, non-array roots, fences and recovery", async () => {
  const c = await converters();
  for (
    const record of [
      "",
      " ",
      "\t",
      "\r",
      "null true",
      "[1,]",
      '{"a":1,}',
      '"\\q"',
      '"x\ny"',
      "[1,\n2]",
      "{\n}",
      "01",
      "NaN",
      "Infinity",
      "// x",
      "\ufeffnull",
    ]
  ) {
    traps(() => c.transform("toArray", lines([record])));
    traps(() => c.transform("toArray", lines(["0", record, "1"])));
    equal(c.transform("toArray", lines(["0"])), json("[0]"));
  }
  for (
    const value of [
      "null",
      "true",
      '"[]"',
      "{}",
      "0",
      "[1,]",
      "[1] null",
      "[[1]",
      '["\\u12gz"]',
    ]
  ) {
    traps(() => c.transform("toLines", json(value)));
    equal(c.transform("toLines", json("[0]")), lines(["0"]));
  }
  for (
    const [mode, correct] of [["toArray", lines(["0"])], [
      "toLines",
      json("[0]"),
    ]] as const
  ) {
    for (
      const bad of [
        "",
        "{}",
        " " + correct,
        "\ufeff" + correct,
        correct.replace("```", "````"),
        correct.replace("json", "JSON"),
        correct.replace("\n", " "),
        correct.slice(0, -4),
        correct.slice(0, -4) + " ````",
        correct + "x",
        correct + correct,
        correct.slice(0, -4) + "```oops",
        correct.replaceAll("\n", "\r"),
      ]
    ) traps(() => c.transform(mode, bad));
    traps(() => c.runs[mode](-1));
    traps(() => c.runs[mode](65537));
    c.transform(mode, correct);
  }
  // Mutate records to cover punctuation state transitions, not just a fixture list.
  const source = '{"a":[1,true,null,"x\\u1234"]}';
  for (let i = 0; i < source.length; i++) {
    for (const ch of ['"', "\\", ":", ",", "0", " ", "[", "}"]) {
      const record = source.slice(0, i) + ch + source.slice(i + 1);
      let valid = true;
      try {
        JSON.parse(record);
      } catch {
        valid = false;
      }
      if (valid) {
        equal(
          JSON.stringify(
            JSON.parse(c.transform("toArray", lines([record])).slice(8, -5)),
          ),
          JSON.stringify([JSON.parse(record)]),
        );
      } else traps(() => c.transform("toArray", lines([record])));
    }
  }
});

Deno.test("JSON compactSpan: bounded input/output, starting depth and shared state recovery", async () => {
  const c = await converters();
  const bytes = new TextEncoder().encode(
    'padding { "x" : -0, "x": 1e9999 } trailing',
  );
  c.memory.set(bytes);
  const end = bytes.length - 9;
  const length = c.span(8, end, 0x12345, 1);
  equal(c.decode(0x12345, length), '{"x":-0,"x":1e9999}');
  equal(toHex(c.memory.subarray(0, bytes.length)), toHex(bytes));
  for (
    const args of [
      [-1, end, 65536, 0],
      [9, 8, 65536, 0],
      [0, 65537, 65536, 0],
      [8, end, 65535, 0],
      [8, end, 0x30001, 0],
      [8, end, -1, 0],
      [8, end, 65536, -1],
      [8, end, 65536, 129],
      [8, end, 65536, 128],
    ]
  ) traps(() => c.span(...args as [number, number, number, number]));
  c.memory.set(new TextEncoder().encode("true"));
  equal(c.span(0, 4, 0x2fffc, 128), 4);
  equal(c.decode(0x2fffc, 4), "true");
  traps(() => c.span(0, 4, 0x2fffd, 0));
  traps(() => c.span(0, 4, 0x30000, 0));
  traps(() => c.span(0, 0, 65536, 0));
  equal(c.transform("toArray", lines(["true"])), json("[true]"));
  const fenced = new TextEncoder().encode(json("[1]"));
  c.memory.set(fenced);
  equal(c.decode(65536, c.list(fenced.length)), "- []\n  - = 1\n");
});

Deno.test("JSON Lines pair: full input, many records, depth parity and memory isolation", async () => {
  const c = await converters();
  c.memory.fill(0xa5, 0x30108);
  const maximumLines = lines(['"' + "x".repeat(65520) + '"']);
  const maximumArray = json('["' + "x".repeat(65519) + '"]');
  equal(maximumLines.length, 65536);
  equal(maximumArray.length, 65536);
  equal(
    c.transform("toArray", maximumLines),
    json('["' + "x".repeat(65520) + '"]'),
  );
  equal(
    toHex(c.memory.subarray(0, 65536)),
    toHex(new TextEncoder().encode(maximumLines)),
  );
  equal(
    c.transform("toLines", maximumArray),
    lines(['"' + "x".repeat(65519) + '"']),
  );
  equal(
    toHex(c.memory.subarray(0, 65536)),
    toHex(new TextEncoder().encode(maximumArray)),
  );
  const many = Array(32761).fill("0");
  equal((lines(many) + " ").length, 65536);
  const packed = json("[" + many.join(",") + "]");
  equal(c.transform("toArray", lines(many) + " "), packed);
  equal(packed.length, 65536);
  equal(c.transform("toLines", packed), lines(many));
  const record = "[".repeat(127) + "0" + "]".repeat(127);
  equal(c.transform("toArray", lines([record])), json("[" + record + "]"));
  equal(c.transform("toLines", json("[" + record + "]")), lines([record]));
  traps(() => c.transform("toArray", lines(["[" + record + "]"])));
  traps(() => c.transform("toLines", json("[[" + record + "]]")));
  equal(c.transform("toArray", lines([])), json("[]"));
  equal(c.memory.subarray(0x30108).every((b) => b === 0xa5), true);
  equal(
    toHex(c.memory.subarray(0x30000, 0x3000c)),
    "07 60 60 60 6a 73 6f 6e 03 60 60 60\n",
  );
  equal(
    toHex(c.memory.subarray(0x30100, 0x30108)),
    "07 60 60 60 6a 73 6f 6e\n",
  );
});
