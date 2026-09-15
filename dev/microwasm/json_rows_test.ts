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
function cell(source: string) {
  return source.replace(
    /[\x00-\x20&<>|\\`*_\[\]]/g,
    (ch) => `&#${ch.charCodeAt(0)};`,
  );
}
function table(rows: string[][]): string {
  if (!rows.length) return "";
  return rows.map((row, index) =>
    "| " + row.map(cell).join(" | ") + " |\n" +
    (index === 0 ? "| " + row.map(() => "---").join(" | ") + " |\n" : "")
  ).join("");
}
async function converter() {
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
  const mod = await module("transforms/10-json-rows-to-table");
  equal(
    JSON.stringify(WebAssembly.Module.imports(mod)),
    JSON.stringify([
      { module: "p", name: "compact", kind: "function" },
      { module: "p", name: "memory", kind: "memory" },
    ]),
  );
  const e = (await WebAssembly.instantiate(mod, { p })).exports;
  equal(e.memory, n.memory);
  const memory = new Uint8Array((e.memory as WebAssembly.Memory).buffer);
  const run = e.run as (length: number) => number;
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

Deno.test("JSON rows: header, value types, exact lexemes and nested cells", async () => {
  const c = await converter();
  const rows = [
    ['"name"', '"score"', '"metadata"'],
    ['"Ben"', "12.50", '{"active":true}'],
    ['"Ada"', "null", '["wasm","Markdown"]'],
  ];
  equal(
    c.transform(
      fence(
        '[ ["name", "score", "metadata"], ["Ben",12.50,{"active":true}], ["Ada",null,["wasm","Markdown"]] ]',
      ),
    ),
    table(rows),
  );
  const tokens = [
    '"12"',
    "12",
    '"null"',
    "null",
    '""',
    "-0",
    "1.2300E+40",
    "1e9999",
    "9007199254740993",
    '{"x":1,"x":2}',
    "[]",
    "{}",
    "true",
    "false",
    '"\\uD800"',
  ];
  equal(c.transform(fence("[[" + tokens.join(",") + "]]")), table([tokens]));
  equal(c.transform(fence("[]")), "");
  equal(c.transform(fence("[[0]]")), "| 0 |\n| --- |\n");
  equal(
    c.transform(" \n```json\r\n[[true],[false]]\r\n```\r\n\t"),
    table([["true"], ["false"]]),
  );
});

Deno.test("JSON rows: string delimiters, Markdown escaping and single-pass entities", async () => {
  const c = await converter();
  const strings = [
    "a,b",
    "[x]",
    "{x}",
    "a|b",
    '"\\,]',
    "\\",
    "\n\r\t",
    "猫",
    "[link](https://example.com/)",
    "<script>alert(1)</script>",
    "*bold* _em_ `code`",
    "&#124;",
    "&amp;",
    " leading and trailing ",
  ];
  for (let i = 0; i < 128; i++) strings.push(String.fromCharCode(i));
  const rows = strings.map((v) => [JSON.stringify(v)]);
  const result = c.transform(fence(JSON.stringify(strings.map((v) => [v]))));
  equal(result, table(rows));
  // Decode once, as the rendered table does. A literal entity string must not
  // become a pipe, and raw '<script>' must remain cell text, not an element.
  const decoded = result.trimEnd().split("\n").filter((_, i) => i !== 1)
    .map((line) =>
      line.slice(2, -2).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    );
  equal(JSON.stringify(decoded), JSON.stringify(rows.map((r) => r[0])));
});

Deno.test("JSON rows: 600 generated rectangular tables preserve every JSON cell", async () => {
  const c = await converter();
  type Value = null | boolean | number | string | Value[] | {
    [key: string]: Value;
  };
  let seed = 0x182de973;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  }
  const strings = [
    "",
    "[]",
    "{a,b}",
    '"\\',
    "a|b",
    "猫",
    "&#124;",
    "x\ny",
    "\ud800",
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
    equal(
      c.transform(input),
      table(rows.map((r) => r.map((v) => JSON.stringify(v)))),
    );
  }
});

Deno.test("JSON rows: malformed syntax, invalid shapes, nesting and recovery", async () => {
  const c = await converter();
  for (
    const input of [
      "",
      "null",
      "1",
      '"[]"',
      "{}",
      "[1]",
      '["row"]',
      "[{}]",
      "[[]]",
      "[[],[]]",
      "[[1],[]]",
      "[[1],[2,3]]",
      "[[1,2],[3]]",
      "[[1],2]",
      "[[1],]",
      "[[1,]]",
      "[[01]]",
      '[["\\q"]]',
      "[[true]] trailing",
      "[[1]",
    ]
  ) {
    traps(() => c.transform(fence(input)));
    equal(c.transform(fence("[[0]]")), table([["0"]]));
  }
  for (
    const input of [
      "",
      "[[1]]",
      "```\n[[1]]\n```",
      "```json\n[[1]] ```",
      "```json\n[[1]]\n```x",
    ]
  ) {
    traps(() => c.transform(input));
  }
  traps(() => c.run(-1));
  traps(() => c.run(65537));
  const cell = "[".repeat(126) + "0" + "]".repeat(126);
  equal(c.transform(fence("[[" + cell + "]]")), table([[cell]]));
  traps(() => c.transform(fence("[[[" + cell + "]]]")));
  equal(c.transform(fence("[]")), "");
});

Deno.test("JSON rows: exact scratch capacity, wide tables, output overflow and input isolation", async () => {
  const c = await converter();
  const token = '"' + "x".repeat(65518) + '"';
  const maximum = fence("[[" + token + "]]").trimEnd();
  equal(maximum.length, 65536);
  equal(c.transform(maximum), table([[token]]));
  equal(
    toHex(c.memory.subarray(0, 65536)),
    toHex(new TextEncoder().encode(maximum)),
  );
  // This compact body occupies all 65,524 scratch bytes after the literals.
  equal(c.memory[0x3ffff], 0x5d);
  const small = "[[1]]";
  c.memory.fill(0xa5, 0x3000c);
  equal(c.transform(fence(small)), table([["1"]]));
  equal(
    c.memory.subarray(0x3000c + small.length).every((v) => v === 0xa5),
    true,
  );
  const wide = Array(13000).fill("0");
  equal(c.transform(fence("[[" + wide.join(",") + "]]")), table([wide]));
  traps(() =>
    c.transform(fence("[[" + Array(14000).fill("0").join(",") + "]]"))
  );
  traps(() => c.transform(fence(JSON.stringify([[" ".repeat(30000)]]))));
  equal(c.transform(fence("[[true],[false]]")), table([["true"], ["false"]]));
  equal(
    toHex(c.memory.subarray(0x30000, 0x3000c)),
    "07 60 60 60 6a 73 6f 6e 03 60 60 60\n",
  );
});
