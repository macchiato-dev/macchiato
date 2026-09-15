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
const encoder = new TextEncoder(), decoder = new TextDecoder();
async function converters() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["p", "transforms/02-json-to-list"],
      ["k", "transforms/00-json-string-keys"],
      ["d", "transforms/11-table-to-json-rows"],
      ["r", "transforms/08-json-objects-to-table"],
      ["o", "transforms/09-table-to-json-objects"],
    ]
  ) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    const module = await WebAssembly.compile(b.bytes);
    if (name === "o") {
      equal(
        JSON.stringify(WebAssembly.Module.imports(module)),
        JSON.stringify([
          { module: "p", name: "compactSpan", kind: "function" },
          { module: "d", name: "decode", kind: "function" },
          { module: "k", name: "equal", kind: "function" },
          { module: "p", name: "memory", kind: "memory" },
        ]),
      );
    }
    imports[name] = (await WebAssembly.instantiate(module, imports)).exports;
  }
  const memory = new Uint8Array(
    (imports.n.memory as WebAssembly.Memory).buffer,
  );
  function run(name: string, input: string) {
    const bytes = encoder.encode(input);
    memory.set(bytes);
    const length = (imports[name].run as (n: number) => number)(bytes.length);
    equal(toHex(memory.subarray(0, bytes.length)), toHex(bytes));
    return decoder.decode(memory.subarray(65536, 65536 + length));
  }
  return {
    memory,
    imports,
    toJSON: (input: string) => run("o", input),
    toTable: (input: string) => run("r", input),
    toRows: (input: string) => run("d", input),
  };
}

Deno.test("Table to objects: missing cells, nulls, exact tokens and empty rows", async () => {
  const c = await converters();
  for (
    const [input, output] of [
      [
        '|"name"|"score"|\n|---|---|\n|"Ben"|12.50|\n||null|\n|||',
        '[{"name":"Ben","score":12.50},{"score":null},{}]',
      ],
      [
        '|"a"|"b"|\n|:---|---:|\n|false|0|\n|""|-0|',
        '[{"a":false,"b":0},{"a":"","b":-0}]',
      ],
      [
        '|""|"__proto__"|"2"|"1"|\n|---|---|---|---|\n|1e9999|{}|9007199254740993|1.2300E+40|',
        '[{"":1e9999,"__proto__":{},"2":9007199254740993,"1":1.2300E+40}]',
      ],
      [
        '|"x"|\n|---|\n|{ "x":1,"x":2 }|\n|&#91;{},"x,y:]"&#93;|',
        '[{"x":{"x":1,"x":2}},{"x":[{},"x,y:]"]}]',
      ],
      ['|"a"|\r\n|:---:|\r\n| 1 |\r\n\t', '[{"a":1}]'],
      ['|"a"|\n|---|', "[]"],
      ["", "[]"],
      [" \t\n\r", "[]"],
    ]
  ) equal(c.toJSON(input), fence(output));
});

Deno.test("Object table headers: decoded uniqueness and one-pass escaping", async () => {
  const c = await converters();
  equal(
    c.toJSON(
      '|"&#92;u006eame"|"a\\|b"|\n|---|---|\n|"&#60;b&#62;"|"&#38;#124;"|',
    ),
    fence('[{"\\u006eame":"<b>","a|b":"&#124;"}]'),
  );
  equal(
    c.toJSON('|"&#128512;"|"&#92;ud800"|\n|---|---|\n|1|2|'),
    fence('[{"😀":1,"\\ud800":2}]'),
  );
  for (
    const header of [
      '|"x"|"x"|',
      '|"x"|"&#92;u0078"|',
      '|"😀"|"&#92;ud83d&#92;ude00"|',
      '|"&#92;uD800"|"&#92;ud800"|',
      '|"a\\|b"|"a&#124;b"|',
      '|""|""|',
      '|"a"|&#32;"a"&#32;|',
    ]
  ) {
    traps(() => c.toJSON(header + "\n|---|---|\n|1|2|"));
    equal(c.toJSON('|"x"|\n|---|\n|1|'), fence('[{"x":1}]'));
  }
  equal(
    c.toJSON('|"A"|"a"|"é"|"e&#92;u0301"|\n|---|---|---|---|\n|1|2|3|4|'),
    fence('[{"A":1,"a":2,"é":3,"e\\u0301":4}]'),
  );
});

Deno.test("Object tables: 600 actual Wasm round trips and shared-state alternation", async () => {
  const c = await converters();
  let seed = 871;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const names = [
    "x",
    "猫",
    "😀",
    "__proto__",
    "",
    "a|b",
    'a"b',
    "a\\b",
    "a\nb",
  ];
  const values = [null, false, true, 0, -2.25, "<b>text</b>", "x|y", {}, [1, {
    a: "b",
  }]];
  for (let n = 0; n < 600; n++) {
    const rows: Record<string, unknown>[] = [];
    const headers: string[] = [];
    for (let r = 0, count = random() % 7 + 1; r < count; r++) {
      const row = Object.create(null);
      for (let i = 0, count = random() % 10 + 1; i < count; i++) {
        const key = names[random() % names.length];
        row[key] = values[random() % values.length];
        if (!headers.includes(key)) headers.push(key);
      }
      rows.push(row);
    }
    // The table retains union-column order, not each source object's order.
    const ordered = rows.map((row) =>
      Object.fromEntries(
        headers
          .filter((key) => Object.hasOwn(row, key)).map((
            key,
          ) => [key, row[key]]),
      )
    );
    const source = fence(JSON.stringify(rows));
    const table = c.toTable(source);
    const result = c.toJSON(table);
    equal(result, fence(JSON.stringify(ordered)));
    equal(c.toTable(result), table);
    equal(c.toRows('|"a"|\n|---|\n|1|'), fence('[["a"],[1]]'));
  }
});

Deno.test("Table objects: invalid headers, row grammar and JSON cell isolation", async () => {
  const c = await converters();
  for (
    const input of [
      "|a|\n|---|\n|1|",
      "|1|\n|---|",
      "|null|\n|---|",
      "|{}|\n|---|",
      "||\n|---|",
      '|"a", "b"|\n|---|',
      '|"x"|',
      '|"x"|\n|--|',
      '|"x"|\n|---|\n|1,2|',
      '|"x"|\n|---|\n|1,"y":2|',
      '|"x"|\n|---|\n|bare|',
      '|"x"|\n|---|\n|&#32;|',
      '|"x"|"y"|\n|---|---|\n|[1|2]|',
      '|"x"|\n|---|\n|1||',
      '|"x"|"y"|\n|---|---|\n|1|',
      '|"x"|\n|---|\n|"a&#10;b"|',
      '|"x"|\n|---|\n\n|1|',
      '|"x"|\n|---|\n|1|\nprose',
      '|"x"|\n|---|---|',
      ' |"x"|\n|---|',
      '|"x"|\n---',
    ]
  ) {
    traps(() => c.toJSON(input));
    equal(c.toJSON('|"x"|\n|---|\n||'), fence("[{}]"));
  }
});

Deno.test("Table objects: column/depth limits, output expansion and recovery", async () => {
  const c = await converters();
  const header = (n: number) =>
    "|" + Array.from({ length: n }, (_, i) => `"k${i}"|`).join("") +
    "\n|" + "---|".repeat(n);
  equal(c.toJSON(header(1024)), fence("[]"));
  traps(() => c.toJSON(header(1025)));
  const nested = (n: number) => "[".repeat(n) + "0" + "]".repeat(n);
  equal(
    c.toJSON('|"x"|\n|---|\n|' + nested(126) + "|"),
    fence('[{"x":' + nested(126) + "}]"),
  );
  traps(() => c.toJSON('|"x"|\n|---|\n|' + nested(127) + "|"));
  // Repeating a long header can hit the output bound with tiny input rows.
  const longHeader = '|"' + "k".repeat(10000) + '"|\n|---|\n';
  equal(c.toJSON(longHeader + "|1|\n".repeat(10)).length > 100000, true);
  traps(() => c.toJSON(longHeader + "|1|\n".repeat(13)));
  equal(c.toJSON('|"recovered"|\n|---|\n|2|'), fence('[{"recovered":2}]'));
  // Two repeated keys can exactly fill the 120 KiB output region. The next
  // header byte would require two additional output bytes and must trap.
  const exactKey = "k".repeat(61426);
  const exactTable = '|"' + exactKey + '"|\n|---|\n|1|\n|1|';
  equal(c.toJSON(exactTable).length, 120 * 1024);
  const records = new DataView(c.memory.buffer);
  equal(records.getUint32(0x2e000, true), 1);
  equal(records.getUint32(0x2e004, true), exactKey.length + 3);
  traps(() => c.toJSON('|"' + exactKey + 'k"|\n|---|\n|1|\n|1|'));
  equal(c.toJSON('|"x"|\n|---|\n||'), fence('[{}]'));
  equal(c.toTable(fence('[{"x":3}]')), '| "x" |\n| --- |\n| 3 |\n');
});

Deno.test("Table objects: full-size source and large repeated header comparisons", async () => {
  const c = await converters();
  const prefix = '|"x"|\n|---|\n|"', suffix = '"|';
  const text = "a".repeat(65536 - prefix.length - suffix.length);
  const input = prefix + text + suffix;
  equal(encoder.encode(input).length, 65536);
  equal(c.toJSON(input), fence('[{"x":"' + text + '"}]'));
  traps(() => c.toJSON(input + " "));
  const a = "a".repeat(25000), b = a + "b";
  equal(
    c.toJSON(`|"${a}"|"${b}"|\n|---|---|\n|1|2|`),
    fence(`[{"${a}":1,"${b}":2}]`),
  );
  traps(() => c.toJSON(`|"${a}"|"${a}"|\n|---|---|`));
});

Deno.test("Shared table decoder: bounded API, raw text, scratch-only mutation", async () => {
  const c = await converters();
  const decode = c.imports.d.decode as (start: number, end: number) => number;
  c.memory.fill(0x5a, 65536, 0x30000);
  const source = encoder.encode("a&#128512;\\|b &amp; &#38;#124;");
  c.memory.set(source);
  const literals = c.memory.slice(0x30000, 0x3000c);
  const end = decode(0, source.length);
  equal(decoder.decode(c.memory.subarray(0x3000c, end)), "a😀|b &amp; &#124;");
  equal(c.memory.subarray(65536, 0x30000).every((b) => b === 0x5a), true);
  equal(toHex(c.memory.subarray(0x30000, 0x3000c)), toHex(literals));
  equal(toHex(c.memory.subarray(0, source.length)), toHex(source));
  equal(decode(65536, 65536), 0x3000c);
  for (const [a, b] of [[-1, 1], [0, 65537], [2, 1], [0, -1], [65537, 65537]]) {
    traps(() => decode(a, b));
  }
  c.memory.fill(97, 0, 65536);
  equal(decode(0, 65524), 0x40000);
  traps(() => decode(0, 65525));
  equal(decode(0, 1), 0x3000d);
});
