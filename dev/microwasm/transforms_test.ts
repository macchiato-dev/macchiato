import { assemble, fromHex, toHex } from "./microwasm.ts";

async function madlibs() {
  const source = await Deno.readTextFile(
    new URL("transforms/03-mad-libs.md", import.meta.url),
  );
  const built = assemble(source);
  const roundtrip = assemble(built.resolved);
  if (toHex(built.bytes) !== toHex(roundtrip.bytes)) {
    throw new Error("Roundtrip differs");
  }
  const module = await WebAssembly.compile(fromHex(toHex(built.bytes)));
  if (WebAssembly.Module.imports(module).length) {
    throw new Error("Unexpected imports");
  }
  const instance = await WebAssembly.instantiate(module);
  const memory = new Uint8Array(
    (instance.exports.memory as WebAssembly.Memory).buffer,
  );
  const run = instance.exports.run as (length: number) => number;
  return {
    run,
    memory,
    transform(input: string) {
      const bytes = new TextEncoder().encode(input);
      memory.set(bytes);
      const length = run(bytes.length);
      return new TextDecoder().decode(
        memory.subarray(0x10000, 0x10000 + length),
      );
    },
  };
}
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
Deno.test("Mad libs: exact substitution, Unicode, duplicates and retained Markdown", async () => {
  const { transform } = await madlibs();
  for (
    const [input, output] of [
      [
        "My [pet] went to the [place] [time]!\n\n- pet: dog\n- place: park\n- time: yesterday",
        "My dog went to the park yesterday!",
      ],
      ["[time]\n\n- time: yesterdy", "yesterdy"],
      ["[a], [a], [b]\n\n- a: old\n- b: β\n- a: 猫", "猫, 猫, β"],
      ["before [a] after\n\n- a:", "before  after"],
      ["[pet] [unknown]\r\n\r\n- pet:dog\r\n", "dog [unknown]"],
      ["[x]\n\n- x: [y]\n- y: no recursion", "[y]"],
      [
        "[pet] [missing] [empty]\n\n- pet: cat\n- pet: dog\n- empty:",
        "dog [missing] ",
      ],
      ["[outer[pet]\n\n- pet: cat", "[outercat"],
      ["# Heading\n\n**[name]**\n\n- name: Ben", "# Heading\n\n**Ben**"],
      ["ordinary\n\n- list\n", "ordinary\n\n- list\n"],
      ["nothing\n", "nothing\n"],
      ["", ""],
      ["[unterminated\n\n- key: value", "[unterminated"],
      ["- x: unused", ""],
    ]
  ) equal(transform(input), output);
});
Deno.test("Mad libs: record and output limits, malformed bindings, repeat recovery", async () => {
  const { transform, run, memory } = await madlibs();
  for (
    const text of [
      "[x]\n- x: 1\ninvalid",
      "[x]\n- x: 1\n- y: 2\ninvalid",
      "[x]\n- : no name",
      "[x]\n- x: 1\n- bad",
    ]
  ) {
    traps(() => transform(text));
  }
  const bindings = Array.from({ length: 256 }, (_, i) => `- key${i}: value${i}`)
    .join("\n");
  equal(transform("[key0] [key255]\n\n" + bindings), "value0 value255");
  traps(() => transform("[key0]\n\n" + bindings + "\n- extra: no"));
  traps(() => run(0x10001));
  traps(() => run(-1));
  traps(() => transform("[x]".repeat(200) + "\n\n- x: " + "a".repeat(1000)));
  equal(transform("[x]\n\n- x: recovered"), "recovered");
  equal(transform("[".repeat(60000)), "[".repeat(60000));
  memory[0x2ffff] = 0xa5;
  equal(transform("[x]\n\n- x: y"), "y");
  equal(memory[0x2ffff], 0xa5);
});

async function listToJSON() {
  const numericSource = await Deno.readTextFile(
    new URL("numbers/02-json-number.md", import.meta.url),
  );
  const numeric = await WebAssembly.instantiate(assemble(numericSource).bytes);
  const source = await Deno.readTextFile(
    new URL("transforms/01-list-to-json.md", import.meta.url),
  );
  const built = assemble(source);
  equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
  const module = await WebAssembly.compile(fromHex(toHex(built.bytes)));
  equal(
    JSON.stringify(WebAssembly.Module.imports(module)),
    JSON.stringify([
      { module: "n", name: "valid", kind: "function" },
      { module: "n", name: "memory", kind: "memory" },
    ]),
  );
  const instance = await WebAssembly.instantiate(module, {
    n: numeric.instance.exports,
  });
  equal(instance.exports.memory, numeric.instance.exports.memory);
  const memory = new Uint8Array(
    (instance.exports.memory as WebAssembly.Memory).buffer,
  );
  const run = instance.exports.run as (length: number) => number;
  return {
    memory,
    run,
    transform(input: string) {
      const bytes = new TextEncoder().encode(input);
      memory.set(bytes);
      const length = run(bytes.length);
      return new TextDecoder().decode(
        memory.subarray(0x10000, 0x10000 + length),
      );
    },
  };
}

Deno.test("Hierarchical list to JSON: objects, arrays, keys, typed values and exact decimals", async () => {
  const { transform } = await listToJSON();
  for (
    const [source, expected] of [
      [
        "- {}\n  - name Ben\n  - location {}\n    - city Phoenix\n    - state AZ",
        '{"name":"Ben","location":{"city":"Phoenix","state":"AZ"}}',
      ],
      [
        "- []\n  - = true\n  - = false\n  - = null\n  - = -0\n  - = 1.2300E+40",
        "[true,false,null,-0,1.2300E+40]",
      ],
      [
        '- {}\n  - "full name" "Ben Atkin"\n  - "" ""\n  - "x\\ny" "\\uD83D\\uDC08"',
        '{"full name":"Ben Atkin","":"","x\\ny":"\\uD83D\\uDC08"}',
      ],
      [
        '- []\n  - {}\n    - a []\n      - cat\n      - dog\n  - []\n  - "{}"',
        '[{"a":["cat","dog"]},[],"{}"]',
      ],
      ["- {}\n  - x first\n  - x second", '{"x":"first","x":"second"}'],
      ["- = 1e9999", "1e9999"],
      ['- "x\\n\\t\\r\\b\\f\\/\\\\\\""', '"x\\n\\t\\r\\b\\f\\/\\\\\\""'],
      [
        "- {}\r\n  - a hello\r\n\r\n  - b world\r\n",
        '{"a":"hello","b":"world"}',
      ],
      ["- []", "[]"],
      ["- {}", "{}"],
      ["- ", '""'],
    ]
  ) equal(transform(source), "```json\n" + expected + "\n```\n");
});

Deno.test("Data list to JSON: optional object root, genuine nesting and unambiguous scalars", async () => {
  const { transform } = await listToJSON();
  for (
    const [source, body] of [
      ["", "{}"],
      [" \r\n\n  ", "{}"],
      ["- NAME Ben\n- PORT 3030", '{"NAME":"Ben","PORT":"3030"}'],
      ['- "full name" "Ben Atkin"\n- "" ""', '{"full name":"Ben Atkin","":""}'],
      [
        "- location {}\n  - city Phoenix\n- tags []\n  - cat\n  - dog\n- enabled = true",
        '{"location":{"city":"Phoenix"},"tags":["cat","dog"],"enabled":true}',
      ],
      ["- empty \n- other value", '{"empty":"","other":"value"}'],
      ["- name first\n- name second", '{"name":"first","name":"second"}'],
      ['- "two words"', '"two words"'],
      ["- two words", '{"two":"words"}'],
      ["- = false", "false"],
      ["- []\n  - two words", '["two words"]'],
    ]
  ) equal(transform(source), "```json\n" + body + "\n```\n");
  for (
    const source of [
      "  - name value",
      "- name value\n  - impossible child",
      "- parent {}\n    - skipped level",
      "- name value\n- missing",
      '- "key"without-separator',
      '- "bad\\q" value',
    ]
  ) traps(() => transform(source));
  const nested = Array.from(
    { length: 127 },
    (_, i) => "  ".repeat(i) + (i === 0 ? "- key []" : "- []"),
  ).join("\n");
  equal(
    transform(nested),
    '```json\n{"key":' + "[".repeat(127) +
      "]".repeat(127) + "}\n```\n",
  );
  traps(() => transform(nested + "\n" + "  ".repeat(127) + "- []"));
  equal(transform("- recovered yes"), '```json\n{"recovered":"yes"}\n```\n');
});

Deno.test("Hierarchical list to JSON: native differential, escaping and repeated trees", async () => {
  const { transform } = await listToJSON();
  type JSONValue = null | boolean | number | string | JSONValue[] | {
    [key: string]: JSONValue;
  };
  function list(value: JSONValue, indent = 0, key?: string): string {
    const prefix = " ".repeat(indent) + "- " +
      (key === undefined ? "" : JSON.stringify(key) + " ");
    if (Array.isArray(value)) {
      return prefix + "[]\n" + value.map((v) => list(v, indent + 2)).join("");
    }
    if (value && typeof value === "object") {
      return prefix + "{}\n" +
        Object.entries(value).map(([k, v]) => list(v, indent + 2, k)).join("");
    }
    return prefix +
      (typeof value === "string"
        ? JSON.stringify(value)
        : "= " + JSON.stringify(value)) +
      "\n";
  }
  for (let i = 0; i < 100; i++) {
    const value: JSONValue = {
      index: i,
      "spaced key": ["猫", i / 10, null, false, { 'q"\\': "a\nb\t" }],
      empty: [],
      nested: { a: { b: [true, ""] } },
    };
    equal(
      JSON.stringify(JSON.parse(transform(list(value)).slice(8, -5))),
      JSON.stringify(value),
    );
    // Omit the object marker and its indentation, without changing the data.
    const implicit = list(value).slice(5).split("\n").map((line) =>
      line.startsWith("  ") ? line.slice(2) : line
    ).join("\n");
    equal(transform(implicit), transform(list(value)));
  }
  for (let byte = 0; byte < 32; byte++) {
    if (byte === 10 || byte === 13) continue; // Record delimiters require quoted escapes.
    const text = "x" + String.fromCharCode(byte) + '"\\y';
    equal(
      transform("- " + text),
      "```json\n" + JSON.stringify(text) + "\n```\n",
    );
  }
  equal(transform("- = -0"), "```json\n-0\n```\n");
});

Deno.test("Hierarchical list to JSON: malformed structure, escapes, stack and output bounds", async () => {
  const { transform, run, memory } = await listToJSON();
  for (
    const text of [
      "plain",
      "- {}\n- {}",
      "- {}\n    - x skip",
      "- {}\n - x odd",
      "- {}\n  - missing",
      "- {}\n  -  empty key",
      '- {}\n  - "key"value',
      '- "unterminated',
      '- "bad\\q"',
      '- "bad\\u12"',
      '- "bad\\u12gz"',
      '- "x"extra',
      '- "tab\t"',
      "- = truex",
      "- = 01",
      "- = .5",
      "- = 1.",
      "- = +1",
      "- = NaN",
      "- = 1e",
      "- = ",
      "- value\n  - child impossible",
    ]
  ) traps(() => transform(text));
  const nested = Array.from(
    { length: 128 },
    (_, i) => " ".repeat(i * 2) + "- []",
  ).join("\n");
  equal(
    transform(nested),
    "```json\n" + "[".repeat(128) + "]".repeat(128) + "\n```\n",
  );
  traps(() => transform(nested + "\n" + " ".repeat(256) + "- []"));
  traps(() => transform("- x" + "\0".repeat(24000)));
  traps(() => run(0x10001));
  traps(() => run(-1));
  memory[0x2ffff] = 0xa5;
  equal(transform("- recovered"), '```json\n"recovered"\n```\n');
  equal(memory[0x2ffff], 0xa5);
  // The lookup table directly follows the deepest allowed stack frame.
  equal(transform("- x\ty"), '```json\n"x\\ty"\n```\n');
});
