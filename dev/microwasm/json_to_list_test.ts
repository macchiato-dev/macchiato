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
async function converter(name = "02-json-to-list") {
  const numeric = assemble(
    await Deno.readTextFile(
      new URL("numbers/02-json-number.md", import.meta.url),
    ),
  );
  const n = (await WebAssembly.instantiate(numeric.bytes)).instance.exports;
  const built = assemble(
    await Deno.readTextFile(
      new URL(`transforms/${name}.md`, import.meta.url),
    ),
  );
  equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
  const module = await WebAssembly.compile(built.bytes);
  equal(
    JSON.stringify(WebAssembly.Module.imports(module)),
    JSON.stringify([
      { module: "n", name: "valid", kind: "function" },
      { module: "n", name: "memory", kind: "memory" },
    ]),
  );
  const instance = await WebAssembly.instantiate(module, { n });
  equal(instance.exports.memory, n.memory);
  const memory = new Uint8Array((n.memory as WebAssembly.Memory).buffer);
  const run = instance.exports.run as (length: number) => number;
  return {
    memory,
    run,
    transform(input: string) {
      const bytes = new TextEncoder().encode(input);
      memory.set(bytes);
      const length = run(bytes.length);
      return new TextDecoder().decode(memory.subarray(65536, 65536 + length));
    },
  };
}
function fence(json: string) {
  return "```json\n" + json + "\n```\n";
}

Deno.test("JSON to list: all value kinds, exact tokens and duplicate keys", async () => {
  const c = await converter();
  const reverse = await converter("01-list-to-json");
  for (
    const [json, list] of [
      [
        '{"name":"Ben","location":{"city":"Phoenix","state":"AZ"}}',
        '- {}\n  - "name" "Ben"\n  - "location" {}\n    - "city" "Phoenix"\n    - "state" "AZ"\n',
      ],
      [
        '{"":"","spaced key":[true,false,null,-0,1.2300E+40],"empty":{}}',
        '- {}\n  - "" ""\n  - "spaced key" []\n    - = true\n    - = false\n    - = null\n    - = -0\n    - = 1.2300E+40\n  - "empty" {}\n',
      ],
      ['{"x":1,"x":2}', '- {}\n  - "x" = 1\n  - "x" = 2\n'],
      [
        '[{},[],"{}","[]",["猫"]]',
        '- []\n  - {}\n  - []\n  - "{}"\n  - "[]"\n  - []\n    - "猫"\n',
      ],
      [
        '"\\uD800\\udfff\\b\\f\\n\\r\\t\\/\\\\\\""',
        '- "\\uD800\\udfff\\b\\f\\n\\r\\t\\/\\\\\\""\n',
      ],
      ['""', '- ""\n'],
      ["{}", "- {}\n"],
      ["[]", "- []\n"],
      ["null", "- = null\n"],
      ["false", "- = false\n"],
      ["1e9999", "- = 1e9999\n"],
    ]
  ) {
    equal(c.transform(fence(json)), list);
    equal(reverse.transform(list), fence(json));
  }
  equal(
    c.transform('\n\t```json\r\n{ \r\n\t"x" : [ 1, 2 ] }\r\n```\r\n\t '),
    '- {}\n  - "x" []\n    - = 1\n    - = 2\n',
  );
});

Deno.test("JSON to list: nested differential corpus and round trips", async () => {
  const c = await converter();
  const reverse = await converter("01-list-to-json");
  type Value = null | boolean | number | string | Value[] | {
    [key: string]: Value;
  };
  function expected(value: Value, depth = 0, key?: string): string {
    const prefix = "  ".repeat(depth) + "- " +
      (key === undefined ? "" : JSON.stringify(key) + " ");
    if (Array.isArray(value)) {
      return prefix + "[]\n" +
        value.map((v) => expected(v, depth + 1)).join("");
    }
    if (value !== null && typeof value === "object") {
      return prefix + "{}\n" +
        Object.entries(value).map(([k, v]) => expected(v, depth + 1, k)).join(
          "",
        );
    }
    return prefix + (typeof value === "string" ? "" : "= ") +
      JSON.stringify(value) + "\n";
  }
  let seed = 0x49283571;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  }
  const strings = [
    "",
    "{}",
    "[]",
    "猫",
    "a\nb\t",
    '"\\/',
    "<>&",
    "a key",
    "\ud800",
  ];
  function value(depth: number): Value {
    switch (random() % (depth ? 6 : 4)) {
      case 0:
        return null;
      case 1:
        return !!(random() & 1);
      case 2:
        return (random() - 2 ** 31) / 1000;
      case 3:
        return strings[random() % strings.length];
      case 4:
        return Array.from({ length: random() % 5 }, () => value(depth - 1));
      default:
        return Object.fromEntries(
          Array.from(
            { length: random() % 5 },
            () => [strings[random() % strings.length], value(depth - 1)],
          ),
        );
    }
  }
  for (let i = 0; i < 600; i++) {
    const item = value(5);
    const json = JSON.stringify(item);
    const list = c.transform(fence(JSON.stringify(item, null, i % 5)));
    equal(list, expected(item));
    equal(reverse.transform(list), fence(json));
  }
  for (let byte = 0; byte < 128; byte++) {
    const json = JSON.stringify("a" + String.fromCharCode(byte) + "b");
    equal(c.transform(fence(json)), "- " + json + "\n");
  }
});

Deno.test("JSON to list: invalid fences, grammar, escapes and native acceptance", async () => {
  const c = await converter();
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
  ) traps(() => c.transform(input));
  for (
    const json of [
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
    ]
  ) traps(() => c.transform(fence(json)));
  // Systematically truncate and perturb valid documents, using the native
  // parser solely as an acceptance oracle (not as the transformation).
  const sources = [
    '{"a":[1,true,null,"x\\u1234"],"b":{}}',
    '[false,-1.25e+30,"x\\\\y"]',
  ];
  for (const source of sources) {
    const candidates = Array.from(
      { length: source.length },
      (_, i) => source.slice(0, i),
    );
    for (let i = 0; i < source.length; i++) {
      for (const char of ['"', "\\", ":", ",", "0", " ", "\n", "[", "}"]) {
        candidates.push(source.slice(0, i) + char + source.slice(i + 1));
      }
    }
    for (const json of candidates) {
      let valid = true;
      try {
        JSON.parse(json);
      } catch {
        valid = false;
      }
      if (valid) c.transform(fence(json));
      else traps(() => c.transform(fence(json)));
    }
  }
  equal(c.transform(fence("0")), "- = 0\n");
});

Deno.test("JSON to list: input, output and depth bounds with recovery", async () => {
  const c = await converter();
  const maximum = fence('"' + "x".repeat(65521) + '"');
  equal(maximum.length, 65536);
  equal(c.transform(maximum), '- "' + "x".repeat(65521) + '"\n');
  const saved = c.memory.slice(0, 65536);
  c.run(65536);
  equal(toHex(c.memory.subarray(0, 65536)), toHex(saved));
  traps(() => c.run(-1));
  traps(() => c.run(65537));
  const nested = "[".repeat(128) + "]".repeat(128);
  const expected = Array.from(
    { length: 128 },
    (_, i) => "  ".repeat(i) + "- []\n",
  ).join("");
  equal(c.transform(fence(nested)), expected);
  equal(
    c.transform(fence("[".repeat(128) + "0" + "]".repeat(128))),
    expected + "  ".repeat(128) + "- = 0\n",
  );
  traps(() => c.transform(fence("[" + nested + "]")));
  c.memory.fill(0xa5, 0x3000c);
  traps(() =>
    c.transform(
      fence("[".repeat(128) + Array(600).fill("0").join(",") + "]".repeat(128)),
    )
  );
  equal(c.transform(fence("true")), "- = true\n");
  equal(c.memory.subarray(0x3000c).every((v) => v === 0xa5), true);
  // Overflow must not corrupt the adjacent length-prefixed fence literals.
  equal(
    toHex(c.memory.subarray(0x30000, 0x3000c)),
    "07 60 60 60 6a 73 6f 6e 03 60 60 60\n",
  );
});
