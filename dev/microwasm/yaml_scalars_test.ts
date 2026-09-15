// Independent test oracle, never a dependency of the Wasm reader or browser.
import { parse } from "jsr:@std/yaml@1.2.0";
import { assemble, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) {
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
const encoder = new TextEncoder(), decoder = new TextDecoder();
async function scalars() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["p", "transforms/02-json-to-list"],
      ["k", "transforms/00-json-string-keys"],
      ["s", "transforms/00-yaml-scalars"],
    ]
  ) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    const mod = await WebAssembly.compile(built.bytes);
    imports[name] = (await WebAssembly.instantiate(mod, imports)).exports;
  }
  const memory = new Uint8Array(
    (imports.n.memory as WebAssembly.Memory).buffer,
  );
  const scalar = imports.s.scalar as (
    start: number,
    end: number,
    output: number,
    key: number,
  ) => number;
  const analyze = imports.s.analyze as (start: number, end: number) => number[];
  const quoteEnd = imports.s.quoteEnd as (start: number, end: number) => number;
  function convert(input: string, key = 0, output = 65536) {
    const bytes = encoder.encode(input);
    memory.set(bytes);
    const end = scalar(0, bytes.length, output, key);
    equal(toHex(memory.subarray(0, bytes.length)), toHex(bytes));
    return decoder.decode(memory.subarray(output, end));
  }
  function value(input: string) {
    const token = convert(input);
    return JSON.parse(token.startsWith("= ") ? token.slice(2) : token);
  }
  return { memory, scalar, analyze, quoteEnd, convert, value };
}

Deno.test("YAML scalar tokens: quotes, plain text, numbers and empty containers", async () => {
  const c = await scalars();
  const cases = [
    ["", "= null"],
    ["  # empty", "= null"],
    [" null ", "= null"],
    ["false", "= false"],
    ["True", "= true"],
    ["NULL", "= null"],
    ["-0", "= -0"],
    ["1.2300E+40", "= 1.2300E+40"],
    ["9007199254740993", "= 9007199254740993"],
    ["1e9999", "= 1e9999"],
    ["Ben", '"Ben"'],
    ["yes", '"yes"'],
    ["it's fine", '"it\'s fine"'],
    ["foo:bar", '"foo:bar"'],
    ["https://example.com/#part", '"https://example.com/#part"'],
    ["_word", '"_word"'],
    ["a # comment", '"a"'],
    ["a#b", '"a#b"'],
    ["a\tb", '"a\\tb"'],
    ["a\\b", '"a\\\\b"'],
    ["'it''s fine'", '"it\'s fine"'],
    ["''''", '"\'"'],
    ["''", '""'],
    ['"a\\u0062"', '"a\\u0062"'],
    ['"# :" # comment', '"# :"'],
    ["{ }", "{}"],
    ["[ ] # empty", "[]"],
  ];
  for (const [source, expected] of cases) {
    try {
      equal(c.convert(source), expected);
    } catch (cause) {
      throw new Error(`Scalar ${JSON.stringify(source)}`, { cause });
    }
  }
  for (const source of ["Ben", "'name'", '"false"', '"123"', '""', "_word"]) {
    equal(c.convert(source, 1), c.convert(source));
  }
  for (const source of ["", "# comment", "1", "false", "NULL", "{}", "[]"]) {
    traps(() => c.convert(source, 1));
    equal(c.convert("name", 1), '"name"');
  }
});

Deno.test("YAML scalar oracle: every Boolean/null casing and Unicode strings", async () => {
  const c = await scalars();
  for (const word of ["true", "false", "null"]) {
    for (let mask = 0; mask < 2 ** word.length; mask++) {
      const source = [...word].map((ch, i) =>
        mask & (1 << i) ? ch.toUpperCase() : ch
      ).join("");
      equal(c.value(source), parse(source, { schema: "json" }));
    }
  }
  for (
    const text of [
      "😀",
      "猫",
      "é",
      "é",
      "a\u2028b\u2029c",
      String.fromCodePoint(0x10ffff),
    ]
  ) {
    for (const source of [text, JSON.stringify(text), "'" + text + "'"]) {
      equal(c.value(source), parse(source, { schema: "json" }));
    }
  }
  for (let cp = 0; cp < 160; cp++) {
    const source = '"\\u' + cp.toString(16).padStart(4, "0") + '"';
    equal(c.value(source), parse(source, { schema: "json" }));
  }
  for (
    const source of [
      "'it''s fine'",
      "a\tb",
      "yes",
      "foo:bar",
      "'\u0085'",
      "0",
      "12.5e-2",
    ]
  ) {
    equal(c.value(source), parse(source, { schema: "json" }));
  }
  // The independent YAML parser collapses -0 to +0; our lexical path does not.
  equal(c.value("-0"), -0);
});

Deno.test("YAML span scanner: separation, comments, quoted delimiters and memory offsets", async () => {
  const c = await scalars();
  for (const offset of [0, 300, 65536, 0x30000 + 12]) {
    for (
      const [source, dataEnd, afterColon] of [
        ["", 0, 0],
        [":", 1, 1],
        ["a: b", 4, 2],
        ["a:b ", 3, 0],
        ["a # x", 1, 0],
        ["a#x", 3, 0],
        ["# x", 0, 0],
        ['"a:b": c', 8, 6],
        ['"a:b" # c', 5, 0],
        ["'it''s': value", 14, 8],
        ["it's fine", 9, 0],
        ["abc\t ", 3, 0],
      ] as const
    ) {
      c.memory.set(encoder.encode(source), offset);
      const result = c.analyze(offset, offset + source.length);
      equal(result[0], offset + dataEnd);
      equal(result[1], afterColon ? offset + afterColon : 0);
    }
    for (
      const [source, end] of [["'a''b' tail", 6], ['"a\\"b": 3', 6], [
        "''",
        2,
      ]] as const
    ) {
      c.memory.set(encoder.encode(source), offset);
      equal(c.quoteEnd(offset, offset + source.length), offset + end);
    }
  }
  for (
    const source of [
      '"x"#comment',
      '"x":value',
      '"x" extra',
      "'unterminated",
      '"escape\\',
    ]
  ) {
    c.memory.set(encoder.encode(source));
    traps(() => c.analyze(0, source.length));
  }
  for (
    const [start, end] of [[-1, 0], [1, 0], [0, 0x40001], [0x40000, 0x40001]]
  ) {
    traps(() => c.analyze(start, end));
    traps(() => c.quoteEnd(start, end));
  }
  equal(c.analyze(0x40000, 0x40000)[0], 0x40000);
  traps(() => c.quoteEnd(0x40000, 0x40000));
});

Deno.test("YAML scalar rejection: unsupported syntax, malformed Unicode and recovery", async () => {
  const c = await scalars();
  for (
    const source of [
      "&anchor",
      "*alias",
      "!tag x",
      "|",
      ">",
      "%YAML",
      "---",
      "...",
      "~",
      "+2",
      "0123",
      "0x10",
      ".inf",
      "[1, 2]",
      '{"x": 1}',
      "a: b",
      "'unfinished",
      '"\\x41"',
      '"\\U00000041"',
      '"\\ud800"',
      '"\\udc00"',
      '"\\ud800x"',
      '"\\ud800\\ud800"',
      "a\u0000b",
      "'a\u0001b'",
      "a\u007fb",
      "'a\u0080b'",
      "a\ufffeb",
    ]
  ) {
    traps(() => c.convert(source));
    equal(c.convert("recovered"), '"recovered"');
  }
  equal(c.value('"\\ud83d\\ude00"'), "😀");
  for (const cp of [0x7f, 0x80, 0x84, 0x86, 0x9f, 0xfffe, 0xffff]) {
    const text = String.fromCodePoint(cp);
    for (const source of ["a" + text, "'" + text + "'", '"' + text + '"']) {
      traps(() => c.convert(source));
    }
    equal(c.value('"\\u' + cp.toString(16).padStart(4, "0") + '"'), text);
  }
  for (
    const bytes of [
      [0xc0, 0x80],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0xff],
      [0xc2],
    ]
  ) {
    c.memory.set(bytes);
    traps(() => c.scalar(0, bytes.length, 65536, 0));
  }
});

Deno.test("YAML scalar boundaries: exact output limit, input spans and repeated use", async () => {
  const c = await scalars();
  const untouched = c.memory.slice(0x30000);
  equal(c.convert("abc", 0, 0x30000 - 5), '"abc"');
  traps(() => c.convert("abc", 0, 0x30000 - 4));
  equal(toHex(c.memory.subarray(0x30000)), toHex(untouched));
  const huge = "a".repeat(65536);
  equal(c.convert(huge), JSON.stringify(huge));
  for (
    const [start, end, out, key] of [
      [-1, 0, 65536, 0],
      [2, 1, 65536, 0],
      [0, 65537, 65536, 0],
      [0, 1, 65535, 0],
      [0, 1, 0x30001, 0],
      [0, 1, 65536, 2],
      [0, 1, 65536, -1],
      [0, 1, -1, 0],
    ]
  ) traps(() => c.scalar(start, end, out, key));
  c.memory[65535] = 97;
  equal(c.scalar(65535, 65536, 65536, 0), 65539);
  equal(decoder.decode(c.memory.subarray(65536, 65539)), '"a"');
  for (let i = 0; i < 100; i++) {
    equal(c.convert("'same''instance'"), '"same\'instance"');
    equal(c.convert('"\\u0061"', 1), '"\\u0061"');
  }
  equal(toHex(c.memory.subarray(0x30000)), toHex(untouched));
});
