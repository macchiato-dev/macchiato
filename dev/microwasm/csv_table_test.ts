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
async function converter() {
  const built = assemble(
    await Deno.readTextFile(
      new URL("transforms/04-csv-to-table.md", import.meta.url),
    ),
  );
  equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
  const module = await WebAssembly.compile(built.bytes);
  equal(WebAssembly.Module.imports(module), []);
  const instance = await WebAssembly.instantiate(module);
  const memory = new Uint8Array(
    (instance.exports.memory as WebAssembly.Memory).buffer,
  );
  const run = instance.exports.run as (length: number) => number;
  return {
    memory,
    run,
    transform(csv: string) {
      const input = new TextEncoder().encode(csv);
      memory.set(input);
      const length = run(input.length);
      return new TextDecoder().decode(memory.subarray(65536, 65536 + length));
    },
  };
}
function fence(csv: string) {
  return "```csv\n" + csv + "\n```\n";
}
function rows(markdown: string) {
  const lines = markdown.trimEnd().split("\n");
  const rule = lines.splice(1, 1)[0];
  const result = lines.map((line) =>
    line.slice(2, -2).split(" | ").map((cell) =>
      cell.replace(
        /&#(\d+);/g,
        (_, number) => String.fromCodePoint(Number(number)),
      )
    )
  );
  equal(rule, "| --- ".repeat(result[0].length) + "|");
  return result;
}
Deno.test("CSV to table: records, quoted fields, empty cells and escaping", async () => {
  const c = await converter();
  for (
    const [csv, expected] of [
      ["a,b\nx,y", [["a", "b"], ["x", "y"]]],
      [",", [["", ""]]],
      ["", [[""]]],
      ['"name","note"\nBen,"hello, world"', [["name", "note"], [
        "Ben",
        "hello, world",
      ]]],
      ['"a""b"," x "', [['a"b', " x "]]],
      ['a,b\r\n"x\r\ny","z\nw"', [["a", "b"], ["x\r\ny", "z\nw"]]],
      ["a,b\n,", [["a", "b"], ["", ""]]],
      ['"[x](https://example.com)","**bold** <img> `x` \\ | &amp; _"', [[
        "[x](https://example.com)",
        "**bold** <img> `x` \\ | &amp; _",
      ]]],
      ["猫,β", [["猫", "β"]]],
      ['a,b\n"\t",x', [["a", "b"], ["\t", "x"]]],
    ] as const
  ) equal(rows(c.transform(fence(csv))), expected);
  equal(
    c.transform(fence("a,b\nc,d")),
    "| a | b |\n| --- | --- |\n| c | d |\n",
  );
  equal(rows(c.transform("```csv\r\na,b\r\n```\r\n \t")), [["a", "b"]]);
  equal(rows(c.transform("```csv\na,b\n```")), [["a", "b"]]);
});

Deno.test("CSV to table: generated rows and independent CSV encoding", async () => {
  const c = await converter();
  let seed = 0x571289ab;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  }
  const parts = [
    "a",
    "0",
    "",
    " ",
    ",",
    '"',
    "\r\n",
    "\n",
    "|",
    "&",
    "猫",
    "**",
    "[]",
    "\\",
    "\t",
  ];
  for (let i = 0; i < 400; i++) {
    const width = 1 + random() % 9;
    const expected = Array.from(
      { length: 1 + random() % 10 },
      () =>
        Array.from(
          { length: width },
          () =>
            Array.from({ length: random() % 8 }, () =>
              parts[random() % parts.length]).join(""),
        ),
    );
    const csv = expected.map((row) =>
      row.map((cell) =>
        /[,"\r\n]/.test(cell) || random() % 2
          ? '"' + cell.replaceAll('"', '""') + '"'
          : cell
      ).join(",")
    ).join(i % 2 ? "\r\n" : "\n");
    equal(rows(c.transform(fence(csv))), expected);
  }
});

Deno.test("CSV to table: rejected syntax, row widths and recovery", async () => {
  const c = await converter();
  for (
    const csv of [
      'a"b',
      '"unclosed',
      '"x"oops',
      '"x" ',
      "a,b\nc",
      "a\nb,c",
      "a\rb",
      '"a"\rb',
      '"a",b\n"x"',
      "a,b\nc,d,e",
    ]
  ) {
    traps(() => c.transform(fence(csv)));
  }
  for (
    const input of [
      "",
      "a,b",
      "```csv\n```",
      "```tsv\na\n```",
      "```csv\na```",
      "```csv\na\n````",
      "```csv\na\n```\nx",
      "```csv\na\n  ```",
    ]
  ) traps(() => c.transform(input));
  for (let byte = 0; byte < 32; byte++) {
    if ([9, 10, 13].includes(byte)) continue;
    traps(() => c.transform(fence('"x' + String.fromCharCode(byte) + '"')));
  }
  equal(rows(c.transform(fence("recovered"))), [["recovered"]]);
});

Deno.test("CSV to table: exact input bound, output bound and literal isolation", async () => {
  const c = await converter();
  const large = fence("a".repeat(65524));
  equal(large.length, 65536);
  equal(rows(c.transform(large)), [["a".repeat(65524)]]);
  const input = c.memory.slice(0, 65536);
  c.run(65536);
  equal(toHex(c.memory.subarray(0, 65536)), toHex(input));
  c.memory.fill(0xa5, 0x30007);
  traps(() => c.transform(fence(" ".repeat(30000))));
  traps(() => c.run(-1));
  traps(() => c.run(65537));
  equal(rows(c.transform(fence("a,b"))), [["a", "b"]]);
  equal(c.memory.subarray(0x30007).every((v) => v === 0xa5), true);
  equal(toHex(c.memory.subarray(0x30000, 0x30007)), "06 60 60 60 63 73 76\n");
});
