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
async function converters() {
  async function module(path: string) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    return await WebAssembly.compile(b.bytes);
  }
  const n =
    (await WebAssembly.instantiate(await module("numbers/02-json-number")))
      .exports;
  const p =
    (await WebAssembly.instantiate(await module("transforms/02-json-to-list"), {
      n,
    })).exports;
  const r = (await WebAssembly.instantiate(
    await module("transforms/10-json-rows-to-table"),
    { p },
  )).exports;
  const m = await module("transforms/11-table-to-json-rows");
  equal(
    JSON.stringify(WebAssembly.Module.imports(m)),
    JSON.stringify([
      { module: "p", name: "compactSpan", kind: "function" },
      { module: "p", name: "memory", kind: "memory" },
    ]),
  );
  const t = (await WebAssembly.instantiate(m, { p })).exports;
  equal(t.memory, r.memory);
  equal(t.memory, n.memory);
  const memory = new Uint8Array((t.memory as WebAssembly.Memory).buffer);
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  function transform(e: WebAssembly.Exports, input: string) {
    const bytes = encoder.encode(input);
    memory.set(bytes);
    const length = (e.run as (len: number) => number)(bytes.length);
    return decoder.decode(memory.subarray(65536, 65536 + length));
  }
  return {
    memory,
    n,
    p,
    run: t.run as (len: number) => number,
    toJSON: (input: string) => transform(t, input),
    toTable: (input: string) => transform(r, input),
  };
}

Deno.test("Typed table to JSON rows: exact types, tokens, headers and empty input", async () => {
  const c = await converters();
  for (
    const [input, output] of [
      [
        '|"name"|"score"|\n|---|---|\n|"Ben"|12.50|\n|"Ada"|null|',
        '[["name","score"],["Ben",12.50],["Ada",null]]',
      ],
      ['|"12"|12|"null"|null|\n|---|---|---|---|', '[["12",12,"null",null]]'],
      [
        "| -0 | 1.2300E+40 | 1e9999 | 9007199254740993 |\n|---|---|---|---|",
        "[[-0,1.2300E+40,1e9999,9007199254740993]]",
      ],
      [
        '| { "x":1, "x":2 } | &#91; true, false, null &#93; |\n|:---|---:|',
        '[[{"x":1,"x":2},[true,false,null]]]',
      ],
      ['|""|{}|[]|\n|:---:|----|---|', '[["",{},[]]]'],
      ["", "[]"],
      [" \n\t\r ", "[]"],
      ["| true |\r\n| :---: |\r\n| false |\r\n\t ", "[[true],[false]]"],
    ]
  ) equal(c.toJSON(input), fence(output));
});

Deno.test("Typed table: decimal Unicode references and punctuation decode only once", async () => {
  const c = await converters();
  const source =
    '|"a\\|b"|"&#92;n"|"&#38;#124;"|"&#128512;"|"&#29483;"|\n|---|---|---|---|---|';
  equal(c.toJSON(source), fence('[["a|b","\\n","&#124;","😀","猫"]]'));
  for (
    const scalar of [
      0x20,
      0x7f,
      0x80,
      0x7ff,
      0x800,
      0xd7ff,
      0xe000,
      0xffff,
      0x10000,
      0x10ffff,
    ]
  ) {
    equal(
      c.toJSON(`|"&#${scalar};"|\n|---|`),
      fence('[["' + String.fromCodePoint(scalar) + '"]]'),
    );
  }
  for (
    const literal of [
      "&#0;",
      "&#;",
      "&#99999999;",
      "&#1114112;",
      "&#55296;",
      "&#x41;",
      "&amp;",
      "&#12x;",
      "&#12",
    ]
  ) {
    equal(
      c.toJSON(`|"${literal}"|\n|---|`),
      fence(JSON.stringify([[literal]])),
    );
  }
  for (const scalar of [1, 8, 9, 10, 13, 31]) {
    traps(() => c.toJSON(`|"&#${scalar};"|\n|---|`));
  }
  equal(c.toJSON("|&#9;1&#10;|\n|---|"), fence("[[1]]"));
});

Deno.test("Typed table pair: 600 generated round trips with shared scratch and native encoding", async () => {
  const c = await converters();
  type Value = null | boolean | number | string | Value[] | {
    [key: string]: Value;
  };
  let seed = 0x583cab91;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  }
  const strings = [
    "",
    "null",
    "1,2",
    "[,]",
    "a|b",
    '"\\',
    "\n\r\t",
    "猫",
    "\ud800",
    "&#124;",
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
        return Array.from({ length: random() % 4 }, () => value(depth - 1));
      default:
        return Object.fromEntries(Array.from({ length: random() % 4 }, () => [
          strings[random() % strings.length],
          value(depth - 1),
        ]));
    }
  }
  for (let i = 0; i < 600; i++) {
    const width = random() % 5 + 1;
    const rows = Array.from(
      { length: random() % 6 },
      () => Array.from({ length: width }, () => value(4)),
    );
    const input = fence(JSON.stringify(rows, null, i % 4));
    const table = c.toTable(input);
    const json = c.toJSON(table);
    equal(json, fence(JSON.stringify(rows)));
    equal(c.toTable(json), table);
  }
  const exact = fence('[["x",-0,1.2300E+40,{"x":1,"x":2},"\\uD800"]]');
  equal(c.toJSON(c.toTable(exact)), exact);
});

Deno.test("Typed table: reject cross-cell JSON injection, malformed cells and malformed rows", async () => {
  const c = await converters();
  for (
    const value of [
      "",
      "Ben",
      "undefined",
      "NaN",
      "Infinity",
      "01",
      "1.",
      "1e+",
      "1,2",
      "1&#44;2",
      "0],[1",
      "true false",
      "[1,]",
      '{"x":}',
      '"\\q"',
      '"&#10;"',
      "[",
      "]",
      "{}[]",
    ]
  ) {
    traps(() => c.toJSON(`|${value}|\n|---|`));
    equal(c.toJSON("|1|\n|---|"), fence("[[1]]"));
  }
  // These pairs could become valid JSON if validation happened only after
  // joining all cells, rather than checking the complete individual span.
  for (
    const input of [
      "|[1|2]|\n|---|---|",
      "|1,2|3|\n|---|---|",
      '|"a|b"|\n|---|---|',
    ]
  ) {
    traps(() => c.toJSON(input));
  }
  for (
    const input of [
      "|1|",
      "|1|\n|--|",
      "|1|2|\n|---|",
      "|1|\n|---|\n|2|3|",
      "|1|\n|---|\n\n|2|",
      "|1|\n|---|\ntext",
      " |1|\n|---|",
      "|1\n|---|",
      "|1|\n|x---|",
      '|1|\n|---|\n|"x\\|',
      "|1|\n|---|\n|2|junk",
    ]
  ) traps(() => c.toJSON(input));
  traps(() => c.run(-1));
  traps(() => c.run(65537));
  equal(c.toJSON(""), fence("[]"));
});

Deno.test("Typed table: exact input/scratch bounds, depth limits and untouched input", async () => {
  const c = await converters();
  const token = '"' + "x".repeat(65522) + '"';
  const input = "|" + token + "|\n|---|    ";
  equal(input.length, 65536);
  equal(c.toJSON(input), fence("[[" + token + "]]"));
  equal(c.memory[0x3ffff], 0x22);
  equal(
    toHex(c.memory.subarray(0, 65536)),
    toHex(new TextEncoder().encode(input)),
  );
  const tooLarge = '|"' + "x".repeat(65523) + '"|\n|---|';
  traps(() => c.toJSON(tooLarge));
  c.memory.fill(0xa5, 0x3000c);
  equal(c.toJSON('|"x"|\n|---|'), fence('[["x"]]'));
  equal(c.memory.subarray(0x3000f).every((b) => b === 0xa5), true);
  const cell = "[".repeat(126) + "0" + "]".repeat(126);
  equal(c.toJSON("|" + cell + "|\n|---|"), fence("[[" + cell + "]]"));
  traps(() => c.toJSON("|[" + cell + "]|\n|---|"));
  equal(c.toJSON("|1|\n|---|"), fence("[[1]]"));
  equal(
    toHex(c.memory.subarray(0x30000, 0x3000c)),
    "07 60 60 60 6a 73 6f 6e 03 60 60 60\n",
  );
});

Deno.test("Scratch parsing: expanded memory scanner keeps old API and disjoint span checks", async () => {
  const c = await converters();
  const valid = c.n.valid as (a: number, b: number) => number;
  const validMemory = c.n.validMemory as (a: number, b: number) => number;
  const span = c.p.compactSpan as (
    a: number,
    b: number,
    out: number,
    depth: number,
  ) => number;
  const bytes = new TextEncoder().encode("-1.2300e+40");
  for (const start of [0, 65536, 0x3000c, 0x40000 - bytes.length]) {
    c.memory.set(bytes, start);
    equal(validMemory(start, start + bytes.length), 1);
    equal(valid(start, start + bytes.length), start === 0 ? 1 : 0);
  }
  for (
    const [a, b] of [[-1, 1], [1, 0], [0x40000, 0x40000], [0x3ffff, 0x40001]]
  ) equal(validMemory(a, b), 0);
  c.memory[0x3ffff] = 0x30;
  equal(span(0x3ffff, 0x40000, 65536, 2), 1);
  equal(c.memory[65536], 0x30);
  for (
    const [a, b] of [[65536, 65537], [65535, 65537], [0x30000, 0x30001], [
      0x3000b,
      0x3000d,
    ], [0x3000c, 0x40001]]
  ) {
    traps(() => span(a, b, 65536, 0));
  }
  equal(c.toJSON("|12|\n|---|"), fence("[[12]]"));
  equal(c.toTable(fence("[[12]]")), "| 12 |\n| --- |\n");
});
