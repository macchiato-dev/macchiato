import { assemble, toHex } from "./microwasm.ts";

function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
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
async function converter(out = false) {
  async function module(name: string) {
    const built = assemble(
      await Deno.readTextFile(
        new URL(`transforms/${name}.md`, import.meta.url),
      ),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    return await WebAssembly.compile(built.bytes);
  }
  const dependency = await module(out ? "05-table-to-csv" : "04-csv-to-table");
  equal(WebAssembly.Module.imports(dependency), []);
  const d = (await WebAssembly.instantiate(dependency)).exports;
  const entry = await module(out ? "07-table-to-tsv" : "06-tsv-to-table");
  equal(WebAssembly.Module.imports(entry), [
    { module: "d", name: "tsv", kind: "function" },
    { module: "d", name: "memory", kind: "memory" },
  ]);
  const e = (await WebAssembly.instantiate(entry, { d })).exports;
  equal(e.memory === d.memory, true);
  equal(e.run === d.tsv, true);
  const memory = new Uint8Array((e.memory as WebAssembly.Memory).buffer);
  const run = e.run as (n: number) => number;
  return {
    memory,
    run,
    transform(text: string, csv = false) {
      const bytes = new TextEncoder().encode(text);
      memory.set(bytes);
      const length = (csv ? d.run as typeof run : run)(bytes.length);
      return new TextDecoder().decode(memory.subarray(65536, 65536 + length));
    },
  };
}
function fenced(body: string, label = "tsv") {
  const count =
    Math.max(2, ...Array.from(body.matchAll(/`+/g), (m) => m[0].length)) + 1;
  const ticks = "`".repeat(count);
  return ticks + label + "\n" + body + ticks + "\n";
}

Deno.test("TSV to table: literal quotes, tabs, CRLF, empty cells and escaping", async () => {
  const c = await converter();
  for (
    const [body, table] of [
      ["a\tb\nx\ty\n", "| a | b |\n| --- | --- |\n| x | y |\n"],
      ["a,b\n", "| a,b |\n| --- |\n"],
      ['"a\tb"\n', '| "a | b" |\n| --- | --- |\n'],
      ['"a\nb"\n', '| "a |\n| --- |\n| b" |\n'],
      ['a"b\n', '| a"b |\n| --- |\n'],
      ["\n", "|  |\n| --- |\n"],
      ["\t\n", "|  |  |\n| --- | --- |\n"],
      ["a\tb\r\n\t\r\n", "| a | b |\n| --- | --- |\n|  |  |\n"],
      [" x \t猫\n", "| &#32;x&#32; | 猫 |\n| --- | --- |\n"],
      [
        "[link](url)\t\\t\n",
        "| &#91;link&#93;(url) | &#92;t |\n| --- | --- |\n",
      ],
    ]
  ) equal(c.transform(fenced(body)), table);
});

Deno.test("Table to TSV: no quote convention, decoded cells and unrepresentable controls", async () => {
  const c = await converter(true);
  for (
    const [table, body] of [
      ['| a,b | said "hi" |\n|---|---|', 'a,b\tsaid "hi"\n'],
      ["||\n|---|", "\n"],
      ["| a | b |\r\n|:---|---:|\r\n|x|y|", "a\tb\nx\ty\n"],
      ["| &#32;x&#32; | &#128008; |\n|---|---|", " x \t🐈\n"],
      ["| \\| | \\\\ | &#34; |\n|---|---|---|", '|\t\\\t"\n'],
      ["| &amp; | &#38;#65; |\n|---|---|", "&amp;\t&#65;\n"],
      ["| &#96;&#96;&#96; |\n|---|", "```\n"],
    ]
  ) equal(c.transform(table), fenced(body));
  for (
    const cell of [
      "&#9;",
      "&#10;",
      "&#13;",
      "&#0000009;",
      "a\tb",
      "a\rb",
      "&#1;",
    ]
  ) {
    traps(() => c.transform(`| ${cell} |\n|---|`));
  }
  equal(c.transform("|recovered|\n|---|"), fenced("recovered\n"));
});

Deno.test("TSV pair: generated round trips without type inference", async () => {
  const from = await converter(), to = await converter(true);
  const parts = [
    "",
    " ",
    "猫",
    "|",
    '"',
    ",",
    "\\t",
    "&amp;",
    "&#9;",
    "`",
    "```",
    "[x]",
    "0",
    "1e999",
    "**",
  ];
  let seed = 0x4216d827;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  }
  for (let i = 0; i < 500; i++) {
    const width = 1 + random() % 8;
    const rows = Array.from(
      { length: 1 + random() % 8 },
      () =>
        Array.from(
          { length: width },
          () =>
            Array.from({ length: random() % 7 }, () =>
              parts[random() % parts.length]).join(""),
        ),
    );
    const body = rows.map((row) => row.join("\t") + "\n").join("");
    const source = fenced(body);
    const table = from.transform(source);
    equal(to.transform(table), source);
    equal(from.transform(to.transform(table)), table);
  }
});

Deno.test("TSV pair: grammar errors and alternating CSV modes after traps", async () => {
  const from = await converter(), to = await converter(true);
  for (
    const text of [
      "",
      "```tsv\n```",
      "```tsv\na\n``",
      "```csv\na\n```",
      fenced("a\rb\n"),
      fenced("a\tb\nx\n"),
      fenced("a\n\tx\n"),
      fenced("a\0b\n"),
    ]
  ) {
    traps(() => from.transform(text));
  }
  for (
    const text of ["", "|a|", "|a|\n|--|", "|a|b|\n|---|", "|a|\n|---|\n|x|y|"]
  ) {
    traps(() => to.transform(text));
  }
  for (let i = 0; i < 20; i++) {
    equal(from.transform(fenced('"a"\n')), '| "a" |\n| --- |\n');
    equal(from.transform(fenced('"a"\n', "csv"), true), "| a |\n| --- |\n");
    traps(() => from.transform(fenced('"unclosed\n', "csv"), true));
    equal(from.transform(fenced('"unclosed\n')), '| "unclosed |\n| --- |\n');
    traps(() => to.transform("|&#9;|\n|---|"));
    equal(to.transform("|&#9;|\n|---|", true), '```csv\n"\t"\n```\n');
    equal(to.transform('|a"b|\n|---|'), fenced('a"b\n'));
    equal(to.transform('|a"b|\n|---|', true), '```csv\n"a""b"\n```\n');
  }
});

Deno.test("TSV to table: input/output bounds and untouched memory", async () => {
  const c = await converter();
  const source = fenced("x".repeat(65524) + "\n");
  equal(source.length, 65536);
  equal(c.transform(source), "| " + "x".repeat(65524) + " |\n| --- |\n");
  const input = c.memory.slice(0, 65536);
  c.run(65536);
  equal(toHex(c.memory.subarray(0, 65536)), toHex(input));
  c.memory.fill(0xa5, 0x30000);
  traps(() => c.transform(fenced(" ".repeat(30000) + "\n")));
  traps(() => c.run(-1));
  traps(() => c.run(65537));
  equal(c.transform(fenced("a\n")), "| a |\n| --- |\n");
  equal(c.memory.subarray(0x30000).every((v) => v === 0xa5), true);
});

Deno.test("Table to TSV: fence capacity, full input, isolation and recovery", async () => {
  const c = await converter(true);
  const data = "x".repeat(65528);
  const source = "|" + data + "|\n|---|";
  equal(source.length, 65536);
  equal(c.transform(source), fenced(data + "\n"));
  const input = c.memory.slice(0, 65536);
  c.run(65536);
  equal(toHex(c.memory.subarray(0, 65536)), toHex(input));
  c.memory.fill(0xa5, 0x30000);
  traps(() => c.transform("|" + "`".repeat(60000) + "|\n|---|"));
  traps(() => c.run(-1));
  traps(() => c.run(65537));
  equal(c.transform("|a|\n|---|"), fenced("a\n"));
  equal(c.memory.subarray(0x30000).every((v) => v === 0xa5), true);
});
