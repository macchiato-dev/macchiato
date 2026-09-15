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
const fence = (body: string) => "```json\n" + body + "\n```\n";
type Mode = "list" | "pretty" | "compact";

async function formatters() {
  async function module(path: string) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    return await WebAssembly.compile(built.bytes);
  }
  const n = (await WebAssembly.instantiate(
    await module("numbers/02-json-number"),
  )).exports;
  const p = (await WebAssembly.instantiate(
    await module("transforms/02-json-to-list"),
    { n },
  )).exports;
  const runs = { list: p.run } as Record<Mode, (length: number) => number>;
  for (
    const [mode, name] of [
      ["pretty", "12-json-pretty"],
      ["compact", "13-json-compact"],
    ] as const
  ) {
    const adapter = await module(`transforms/${name}`);
    equal(
      JSON.stringify(WebAssembly.Module.imports(adapter)),
      JSON.stringify([
        { module: "p", name: mode, kind: "function" },
        { module: "p", name: "memory", kind: "memory" },
      ]),
    );
    const e = (await WebAssembly.instantiate(adapter, { p })).exports;
    equal(e.run, p[mode]);
    equal(e.memory, n.memory);
    runs[mode] = e.run as (length: number) => number;
  }
  const memory = new Uint8Array((n.memory as WebAssembly.Memory).buffer);
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  return {
    memory,
    runs,
    transform(mode: Mode, input: string) {
      const bytes = encoder.encode(input);
      memory.set(bytes);
      const length = runs[mode](bytes.length);
      return decoder.decode(memory.subarray(0x10000, 0x10000 + length));
    },
  };
}

Deno.test("JSON format: exact lexemes, duplicate keys, scalar and empty roots", async () => {
  const c = await formatters();
  for (
    const [input, compact, pretty] of [
      [
        ' { "x" : -0, "x": 1.2300E+40, "large": 9007199254740993 } ',
        '{"x":-0,"x":1.2300E+40,"large":9007199254740993}',
        '{\n  "x": -0,\n  "x": 1.2300E+40,\n  "large": 9007199254740993\n}',
      ],
      [
        '[true,false,null,{"":[]},{}]',
        '[true,false,null,{"":[]},{}]',
        '[\n  true,\n  false,\n  null,\n  {\n    "": []\n  },\n  {}\n]',
      ],
      [
        ' {"猫" : " spaces  stay ", "escaped" : "\\uD800\\udfff\\b\\f\\n\\r\\t\\/\\\\\\""} ',
        '{"猫":" spaces  stay ","escaped":"\\uD800\\udfff\\b\\f\\n\\r\\t\\/\\\\\\""}',
        '{\n  "猫": " spaces  stay ",\n  "escaped": "\\uD800\\udfff\\b\\f\\n\\r\\t\\/\\\\\\""\n}',
      ],
      [" {} ", "{}", "{}"],
      [" [] ", "[]", "[]"],
      [" true ", "true", "true"],
      ["false", "false", "false"],
      ["null", "null", "null"],
      ["1e9999", "1e9999", "1e9999"],
      ["-0", "-0", "-0"],
      [
        '"```[x](https://example.com/) <b>猫</b>"',
        '"```[x](https://example.com/) <b>猫</b>"',
        '"```[x](https://example.com/) <b>猫</b>"',
      ],
    ]
  ) {
    equal(c.transform("compact", fence(input)), fence(compact));
    equal(c.transform("pretty", fence(input)), fence(pretty));
    equal(c.transform("compact", fence(pretty)), fence(compact));
    equal(c.transform("pretty", fence(compact)), fence(pretty));
  }
  equal(
    c.transform("pretty", '\t\n```json\r\n{\r\n"a"\t:\t1\r\n}\r\n```\r\n '),
    fence('{\n  "a": 1\n}'),
  );
});

Deno.test("JSON format: 800 nested differential cases, idempotence and cross-mode calls", async () => {
  const c = await formatters();
  type Value = null | boolean | number | string | Value[] | {
    [key: string]: Value;
  };
  let seed = 0x4e297351;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  }
  const strings = [
    "",
    '\\"',
    "\ud800",
    "猫",
    "a\nb",
    "  ",
    "```",
    "a\tb",
    "<script>",
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
        return Array.from({ length: random() % 5 }, () => value(depth - 1));
      default:
        return Object.fromEntries(Array.from({ length: random() % 5 }, () => [
          strings[random() % strings.length],
          value(depth - 1),
        ]));
    }
  }
  for (let i = 0; i < 800; i++) {
    const v = value(5);
    const input = fence(JSON.stringify(v, null, i % 6));
    const pretty = fence(JSON.stringify(v, null, 2));
    const compact = fence(JSON.stringify(v));
    equal(c.transform("pretty", input), pretty);
    equal(c.transform("compact", input), compact);
    equal(c.transform("compact", pretty), compact);
    equal(c.transform("pretty", compact), pretty);
    equal(c.transform("pretty", pretty), pretty);
    equal(c.transform("compact", compact), compact);
    equal(c.transform("list", fence('{"x":1}')), '- {}\n  - "x" = 1\n');
  }
});

Deno.test("JSON format: malformed grammar, truncation and mutation acceptance", async () => {
  const c = await formatters();
  const sources = [
    '{"a":[1,true,null,"x\\u1234"],"b":{}}',
    '[false,-1.25e+30,"x\\\\y"]',
  ];
  const candidates = [
    "",
    " ",
    "{",
    "[",
    "}",
    "]",
    "[1,]",
    '{"a":1,}',
    "[,1]",
    "[1 2]",
    '{"a" 1}',
    "{a:1}",
    '{"a":}',
    "{}{}",
    "null null",
    "True",
    "undefined",
    "NaN",
    "Infinity",
    "+1",
    "01",
    ".1",
    "1.",
    "1e",
    "1e+",
    "0x10",
    "truex",
    "nullx",
    "falsex",
    "// comment\n1",
    '"unterminated',
    '"\\q"',
    '"\\u123"',
    '"\\u12gz"',
    '"x\ny"',
    '"x\ty"',
    "\u00a01",
    "1\u00a0",
    "[1}",
    '{"a":1]',
  ];
  for (const source of sources) {
    for (let i = 0; i < source.length; i++) {
      candidates.push(source.slice(0, i));
      for (const char of ['"', "\\", ":", ",", "0", " ", "\n", "[", "}"]) {
        candidates.push(source.slice(0, i) + char + source.slice(i + 1));
      }
    }
  }
  for (const input of candidates) {
    let valid = true;
    try {
      JSON.parse(input);
    } catch {
      valid = false;
    }
    for (const mode of ["pretty", "compact"] as const) {
      if (valid) {
        equal(
          JSON.stringify(
            JSON.parse(c.transform(mode, fence(input)).slice(8, -5)),
          ),
          JSON.stringify(JSON.parse(input)),
        );
      } else traps(() => c.transform(mode, fence(input)));
      equal(c.transform(mode, fence("[]")), fence("[]"));
    }
  }
  for (let byte = 0; byte < 32; byte++) {
    for (const mode of ["pretty", "compact"] as const) {
      traps(() =>
        c.transform(mode, fence('"a' + String.fromCharCode(byte) + 'b"'))
      );
    }
  }
});

Deno.test("JSON format: fence validation, trap recovery and mode reset", async () => {
  const c = await formatters();
  for (const mode of ["pretty", "compact"] as const) {
    for (
      const input of [
        "",
        "{}",
        "```\n{}\n```",
        "```JSON\n{}\n```",
        "```json {}\n```",
        "```json\n{} ```",
        "```json\n{}\n````",
        "```json\n{}\n```\ntext",
        "```json\n{}\n```\n```json\n{}\n```",
        "```json\n{}\n  ```",
      ]
    ) {
      traps(() => c.transform(mode, input));
      equal(c.transform("list", fence("[1]")), "- []\n  - = 1\n");
      equal(c.transform("compact", fence("[1]")), fence("[1]"));
      equal(c.transform("pretty", fence("[1]")), fence("[\n  1\n]"));
    }
    traps(() => c.runs[mode](-1));
    traps(() => c.runs[mode](65537));
    equal(c.transform("list", fence("true")), "- = true\n");
  }
});

Deno.test("JSON format: maximum input, nesting and output bounds with sentinels", async () => {
  const c = await formatters();
  const maximum = fence('"' + "x".repeat(65521) + '"');
  equal(maximum.length, 65536);
  c.memory.fill(0xa5, 0x3000c);
  for (const mode of ["pretty", "compact"] as const) {
    equal(c.transform(mode, maximum), maximum);
    const saved = c.memory.slice(0, 65536);
    c.runs[mode](65536);
    equal(toHex(c.memory.subarray(0, 65536)), toHex(saved));
    const json = "[".repeat(128) + "0" + "]".repeat(128);
    equal(
      c.transform(mode, fence(json)),
      mode === "compact"
        ? fence(json)
        : fence(JSON.stringify(JSON.parse(json), null, 2)),
    );
    traps(() => c.transform(mode, fence("[" + json + "]")));
  }
  const expanded = fence(
    "[".repeat(128) + Array(600).fill("0").join(",") + "]".repeat(128),
  );
  traps(() => c.transform("pretty", expanded));
  equal(c.transform("compact", expanded), expanded);
  equal(c.transform("pretty", fence("false")), fence("false"));
  equal(c.memory.subarray(0x3000c).every((b) => b === 0xa5), true);
  equal(
    toHex(c.memory.subarray(0x30000, 0x3000c)),
    "07 60 60 60 6a 73 6f 6e 03 60 60 60\n",
  );
});
