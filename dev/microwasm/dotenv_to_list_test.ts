import { parse } from "npm:dotenv@17.2.3";
import { assemble, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}
function traps(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
    throw e;
  }
  throw new Error("Expected Wasm trap");
}
const encoder = new TextEncoder(), decoder = new TextDecoder();
const fence = (body: string) => "```dotenv\n" + body + "```\n";
async function reader() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["t", "transforms/22-dotenv-to-list"],
    ]
  ) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    imports[name] =
      (await WebAssembly.instantiate(b.bytes, imports)).instance.exports;
  }
  const memory = new Uint8Array(
    (imports.n.memory as WebAssembly.Memory).buffer,
  );
  const run = imports.t.run as (length: number) => number;
  function convert(input: string) {
    const bytes = encoder.encode(input);
    memory.set(bytes);
    const length = run(bytes.length);
    equal(toHex(memory.subarray(0, bytes.length)), toHex(bytes));
    return decoder.decode(memory.subarray(65536, 65536 + length));
  }
  return { memory, run, convert };
}
function list(data: Record<string, string>) {
  return "- {}\n" +
    Object.entries(data).map(([k, v]) =>
      "  - " + JSON.stringify(k) + " " + JSON.stringify(v) + "\n"
    ).join("");
}

Deno.test("Dotenv reader: assignments, export, quoting, comments and literal variables", async () => {
  const r = await reader();
  const source =
    'export NAME=Ben\nPORT=3030\nGREETING="Hello # friend"\nLINES="first\\nsecond"\nLITERAL=\'${NAME}\'\nEMPTY=\nexport=value\nkey.dot-dash: colon\n';
  const expected = list({
    NAME: "Ben",
    PORT: "3030",
    GREETING: "Hello # friend",
    LINES: "first\nsecond",
    LITERAL: "${NAME}",
    EMPTY: "",
    export: "value",
    "key.dot-dash": "colon",
  });
  equal(r.convert(fence(source)), expected);
  equal(r.convert(fence(source).replaceAll("\n", "\r\n")), expected);
  equal(r.convert(fence("")), "- {}\n");
  equal(r.convert(fence("# no assignments\n\t\n")), "- {}\n");
  equal(
    r.convert(
      fence(
        "A=one#ignored\nB=one;two\nC= a  b \t\nD=\" x \"#comment\nE='\\n'\nF=`a 'b' \"c\"`\n",
      ),
    ),
    list({
      A: "one",
      B: "one;two",
      C: "a  b",
      D: " x ",
      E: "\\n",
      F: "a 'b' \"c\"",
    }),
  );
  equal(
    r.convert(fence("10=first\n2=second\nA=yes\na=no\n")),
    '- {}\n  - "10" "first"\n  - "2" "second"\n  - "A" "yes"\n  - "a" "no"\n',
  );
  equal(
    r.convert(fence("__proto__=literal\nconstructor=also literal\n")),
    '- {}\n  - "__proto__" "literal"\n  - "constructor" "also literal"\n',
  );
});

Deno.test("Dotenv reader: 500 generated documents compared with the independent dotenv parser", async () => {
  const r = await reader();
  const values: [string, string][] = [
    ["Ben", "Ben"],
    ["false", "false"],
    ["123", "123"],
    ["", ""],
    ['" x # y "', " x # y "],
    ["'${UNDEFINED}'", "${UNDEFINED}"],
    ['"first\\nsecond\\rthird"', "first\nsecond\rthird"],
    ["'line\nnext'", "line\nnext"],
    ["`a 'b' \"c\"`", "a 'b' \"c\""],
    ['"a\\"b"', 'a\\"b'],
    ["'a\\'b'", "a\\'b"],
    ["`a\\`b`", "a\\`b"],
    ['"a\\\\nb"', "a\\\nb"],
    ['"\\t\\u0041"', "\\t\\u0041"],
    ["'猫😀'", "猫😀"],
    ["C:\\folder", "C:\\folder"],
    ["a; b", "a; b"],
  ];
  for (let seed = 0; seed < 500; seed++) {
    let source = "# generated\n";
    const expected: Record<string, string> = {};
    for (let k = 0; k < 1 + seed % 19; k++) {
      const key = "KEY_" + k,
        [text, value] = values[(seed + k) % values.length];
      source += (k % 2 ? "export " : "\t") + key + (k % 3 ? " = " : ": ") +
        text + " # trailing\n";
      expected[key] = value;
    }
    equal(list(parse(source)), list(expected));
    equal(r.convert(fence(source)), list(expected));
  }
});

Deno.test("Dotenv reader: multiline values, CR normalization, retained escapes and UTF-8", async () => {
  const r = await reader();
  for (const quote of ['"', "'", "`"]) {
    const source = "A=" + quote + "first\r\n# inner\rlast\t " + quote +
      "\rB=next\r";
    const expected = list({ A: "first\n# inner\nlast\t ", B: "next" });
    equal(list(parse(source)), expected);
    equal(r.convert(fence(source)), expected);
  }
  for (
    const point of [
      0x80,
      0x85,
      0x7ff,
      0x800,
      0xd7ff,
      0xe000,
      0xffff,
      0x10000,
      0x10ffff,
      0x2028,
      0x2029,
    ]
  ) {
    const value = "a" + String.fromCodePoint(point) + "z";
    equal(r.convert(fence("A='" + value + "'\n")), list({ A: value }));
  }
  equal(r.convert(fence('A="\\\\n"\n')), list({ A: "\\\n" }));
  equal(r.convert(fence("A='C:\\folder'\n")), list({ A: "C:\\folder" }));
});

Deno.test("Dotenv reader: reject duplicate names and malformed syntax, then recover", async () => {
  const r = await reader();
  for (
    const source of [
      "A=1\nA=2\n",
      "A=1\nexport A=2\n",
      "A=1\nB=2\nA=3\n",
      "export \n",
      "export A\n",
      "=value\n",
      "a b=value\n",
      "猫=value\n",
      "A:value\n",
      'A: "x" junk\n',
      'A="open\n',
      "A='open\n",
      "A=`open\n",
      "A=\"x\"'y'\n",
      'A="x";comment\n',
      'A="ends\\"\n',
    ]
  ) {
    traps(() => r.convert(fence(source)));
    equal(r.convert(fence("OK=yes\n")), list({ OK: "yes" }));
  }
  const long = "K".repeat(2048);
  equal(r.convert(fence(long + "=x\n")), list({ [long]: "x" }));
  traps(() => r.convert(fence(long + "=x\n" + long + "=y\n")));
  for (
    const input of [
      "",
      "```dotenv",
      "```env\nA=x\n```\n",
      "```dotenv\nA=x```\n",
      "```dotenv\nA=x\n",
      "prose\n" + fence("A=x\n"),
      fence("A=x\n") + "prose",
    ]
  ) traps(() => r.convert(input));
});

Deno.test("Dotenv reader: controls and invalid UTF-8 cannot hide in comments or quotes", async () => {
  const r = await reader();
  for (let code = 0; code <= 127; code++) {
    if (
      code >= 32 && code !== 127 || code === 9 || code === 10 || code === 13
    ) continue;
    for (const prefix of ["A=", "# comment ", 'A="']) {
      traps(() => r.convert(fence(prefix + String.fromCharCode(code) + '"\n')));
    }
  }
  for (
    const invalid of [
      [0x80],
      [0xc0, 0xaf],
      [0xe0, 0x80, 0xaf],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0xf0, 0x90],
    ]
  ) {
    for (const prefix of ["```dotenv\nA=", "```dotenv\n# ", '```dotenv\nA="']) {
      const before = encoder.encode(prefix), after = encoder.encode('"\n```\n');
      r.memory.set(before);
      r.memory.set(invalid, before.length);
      r.memory.set(after, before.length + invalid.length);
      traps(() => r.run(before.length + invalid.length + after.length));
    }
  }
  equal(r.convert(fence("A='valid'\n")), list({ A: "valid" }));
});

Deno.test("Dotenv reader: exact source and output bounds, scratch isolation and recovery", async () => {
  const r = await reader();
  const scratch = toHex(r.memory.subarray(196608));
  const value = "a".repeat(65519), full = fence("A=" + value + "\n");
  equal(encoder.encode(full).length, 65536);
  equal(r.convert(full), list({ A: value }));
  traps(() => r.convert(full + " "));
  const expanded = fence("B=\nC=\nD=\nE=\nA=" + "\\".repeat(65506) + "\n");
  equal(encoder.encode(expanded).length, 65535);
  equal(encoder.encode(r.convert(expanded)).length, 131072);
  traps(() => r.convert(expanded.replace("\n```", "x\n```")));
  equal(toHex(r.memory.subarray(196608)), scratch);
  equal(r.convert(fence("A=ok\n")), list({ A: "ok" }));
  traps(() => r.run(-1));
});

Deno.test("Dotenv reader: variable Markdown fence lengths and matching close", async () => {
  const r = await reader();
  for (const count of [3, 4, 7, 128, 256]) {
    const ticks = "`".repeat(count);
    equal(r.convert(ticks + "dotenv\nA=x\n" + ticks + "\n"), list({ A: "x" }));
    equal(r.convert(ticks + "dotenv\nA=x\n" + ticks + "`\n"), list({ A: "x" }));
    traps(() => r.convert(ticks + "dotenv\nA=x\n" + ticks.slice(1) + "\n"));
  }
  equal(
    r.convert("````dotenv\nA='before\n```\nafter'\n````\n"),
    list({ A: "before\n```\nafter" }),
  );
  traps(() => r.convert("```dotenv\nA=x\n```extra\n"));
  for (const close of ["```", "````", " ```", "  ```  ", "   ```\t"]) {
    traps(() => r.convert(fence("A='before\n" + close + "\nafter'\n")));
  }
  equal(
    r.convert(fence("A='before\n    ```\nafter'\n")),
    list({ A: "before\n    ```\nafter" }),
  );
  equal(r.convert(fence("A=reset\n")), list({ A: "reset" }));
});
