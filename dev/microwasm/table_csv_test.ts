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
async function converter(name = "05-table-to-csv") {
  const built = assemble(
    await Deno.readTextFile(
      new URL(`transforms/${name}.md`, import.meta.url),
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
    transform(text: string) {
      const bytes = new TextEncoder().encode(text);
      memory.set(bytes);
      const n = run(bytes.length);
      return new TextDecoder().decode(memory.subarray(65536, 65536 + n));
    },
  };
}
function fenced(body: string) {
  const longest = Math.max(
    2,
    ...Array.from(body.matchAll(/`+/g), (m) => m[0].length),
  );
  const ticks = "`".repeat(longest + 1);
  return ticks + "csv\n" + body + ticks + "\n";
}
function csv(rows: string[][]) {
  return rows.map((row) =>
    row.map((cell) => '"' + cell.replaceAll('"', '""') + '"').join(",") + "\n"
  ).join("");
}

Deno.test("Table to CSV: quoting, escapes, Unicode references and separator rules", async () => {
  const c = await converter();
  for (
    const [table, expected] of [
      [
        '| name | note |\n| --- | --- |\n| Ben | hello,&#32;world |\n| Ada | said "hi" |',
        [["name", "note"], ["Ben", "hello, world"], ["Ada", 'said "hi"']],
      ],
      ["||\n|---|", [[""]]],
      ["| a | b |\r\n| :--- | ---: |\r\n| x | y |\r\n\t ", [["a", "b"], [
        "x",
        "y",
      ]]],
      ["| &#32;x&#32; | &#10;line&#13;&#10;next |\n| --- | :---: |", [[
        " x ",
        "\nline\r\nnext",
      ]]],
      ["| \\| | \\\\ | \\*bold\\* |\n|---|---|---|", [["|", "\\", "*bold*"]]],
      ["| &#34; | &#128008; | &#1114111; |\n|---|---|---|", [[
        '"',
        "🐈",
        "\u{10ffff}",
      ]]],
      ["| &#x60; &amp; &#0; &#55296; &#1114112; |\n|---|", [[
        "&#x60; &amp; &#0; &#55296; &#1114112;",
      ]]],
      ["| **bold** [x](url) `code` |\n|---|", [["**bold** [x](url) `code`"]]],
    ] as [string, string[][]][]
  ) equal(c.transform(table), fenced(csv(expected)));
  for (const scalar of [1, 8, 11, 12, 14, 31]) {
    traps(() => c.transform(`| &#${scalar}; |\n|---|`));
  }
  for (
    const scalar of [
      9,
      10,
      13,
      32,
      127,
      128,
      255,
      2047,
      2048,
      0xd7ff,
      0xe000,
      65535,
      65536,
      0x10ffff,
    ]
  ) {
    equal(
      c.transform(`| &#${scalar}; |\n|---|`),
      fenced(csv([[String.fromCodePoint(scalar)]])),
    );
  }
});

Deno.test("Table to CSV: generated round trips preserve all text fields", async () => {
  const c = await converter();
  const reverse = await converter("04-csv-to-table");
  const parts = [
    "",
    "猫",
    " ",
    "\t",
    "\n",
    "\r\n",
    "\r",
    '"',
    ",",
    "|",
    "&amp;",
    "&#65;",
    "[x](url)",
    "**",
    "`",
    "```",
    "\\",
    "0",
  ];
  let seed = 0x15873abc;
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
    const source = fenced(csv(rows));
    const table = reverse.transform(source);
    equal(c.transform(table), source);
    equal(reverse.transform(c.transform(table)), table);
  }
});

Deno.test("Table to CSV: malformed rows, widths, separators and trap recovery", async () => {
  const c = await converter();
  for (
    const table of [
      "",
      "|a|",
      "a\n---",
      "|a|\n|--|",
      "|a|\n|---x|",
      "|a|\n|:|",
      "|a|\n|::|",
      "|a|\n|---|---|",
      "|a|b|\n|---|---|\n|x|",
      "|a|\n|---|\n\n|b|",
      "|a|\n|---|\ntext",
      "|a|\n|---|\n|x\\|",
      "|a|\n|---|\n|x",
      "|a|\n|---|\n|x\u0000|",
      " |a|\n|---|",
    ]
  ) {
    traps(() => c.transform(table));
    equal(c.transform("| recovered |\n|---|"), fenced(csv([["recovered"]])));
  }
});

Deno.test("Table to CSV: fence collisions, large input, output limits and isolation", async () => {
  const c = await converter();
  const reverse = await converter("04-csv-to-table");
  for (const count of [3, 4, 7, 127, 128, 1024]) {
    const data = "before\n" + "`".repeat(count) + "\nafter";
    const source = fenced(csv([[data]]));
    equal(c.transform(reverse.transform(source)), source);
  }
  const large = "|" + "x".repeat(65528) + "|\n|---|";
  equal(large.length, 65536);
  equal(c.transform(large), fenced(csv([["x".repeat(65528)]])));
  const saved = c.memory.slice(0, 65536);
  c.run(65536);
  equal(toHex(c.memory.subarray(0, 65536)), toHex(saved));
  c.memory.fill(0xa5, 0x30000);
  // Quote doubling leaves only two bytes spare after wrapping. The overlapping
  // copy must preserve every byte and stop before the sentinel region.
  const quotes = '"'.repeat(65528);
  const nearLimit = c.transform("|" + quotes + "|\n|---|");
  equal(nearLimit, fenced(csv([[quotes]])));
  equal(nearLimit.length, 131070);
  traps(() => c.run(65537));
  traps(() => c.run(-1));
  traps(() => c.transform("|" + "`".repeat(60000) + "|\n|---|"));
  equal(c.transform("| a |\n|---|"), fenced(csv([["a"]])));
  equal(c.memory.subarray(0x30000).every((v) => v === 0xa5), true);
});
