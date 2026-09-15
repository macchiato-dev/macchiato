import { parse } from "npm:dotenv@17.2.3";
import { Parser } from "npm:commonmark@0.31.2";
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
function list(data: Record<string, string>) {
  return Object.entries(data).map(([k, v]) =>
    "- " + JSON.stringify(k) + " " + JSON.stringify(v) + "\n"
  ).join("");
}
async function converter(write: boolean) {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ...(write ? [["l", "transforms/01-list-to-json"]] : []),
      ["k", "transforms/00-json-string-keys"],
      [
        "t",
        "transforms/" + (write ? "23-list-to-dotenv" : "22-dotenv-to-list"),
      ],
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

Deno.test("Dotenv writer: canonical assignments and value-preserving quote selection", async () => {
  const w = await converter(true), r = await converter(false);
  const data = {
    NAME: "Ben",
    PORT: "3030",
    GREETING: "Hello # friend",
    LINES: "first\nsecond",
    LITERAL: "${NAME}",
    EMPTY: "",
  };
  const output = fence(
    'NAME=Ben\nPORT=3030\nGREETING="Hello # friend"\nLINES="first\\nsecond"\nLITERAL=${NAME}\nEMPTY=\n',
  );
  equal(w.convert(list(data)), output);
  equal(r.convert(output), list(data));
  equal(w.convert("- {}"), fence(""));
  equal(w.convert(""), fence(""));
  equal(w.convert("- NAME Ben\n- PORT 3030"), fence("NAME=Ben\nPORT=3030\n"));
  traps(() => w.convert("- A first\n- A second"));
  equal(w.convert("- A recovered"), fence("A=recovered\n"));
  const fixtures = [
    ["a # b", '"a # b"'],
    [" x ", '" x "'],
    ['"quoted"', "'\"quoted\"'"],
    ['\'"quoted"', '`\'"quoted"`'],
    ["a\\n#b", "'a\\n#b'"],
    ["a\\r#b", "'a\\r#b'"],
    ["a\rb\nc", '"a\\rb\\nc"'],
    ["C:\\path\\", "C:\\path\\"],
    ["a\\n\nb", "'a\\n\nb'"],
    ["a\tb", "a\tb"],
  ];
  for (const [value, text] of fixtures) {
    equal(w.convert(list({ A: value })), fence("A=" + text + "\n"));
    equal(r.convert(w.convert(list({ A: value }))), list({ A: value }));
  }
  equal(
    w.convert('- {}\n  - "10" one\n  - "2" two\n  - export value'),
    fence("10=one\n2=two\nexport=value\n"),
  );
});

Deno.test("Dotenv pair: 500 generated objects with independent parser comparisons", async () => {
  const w = await converter(true), r = await converter(false);
  const values = [
    "Ben",
    "",
    "false",
    "1e99",
    "猫😀",
    "Hello # friend",
    "a\nb",
    "a\rb",
    "a\\n\nb",
    '"hello"',
    '\'"hello"',
    "${NAME}",
    "a\tb",
    "C:\\path\\",
    "<b>name</b>",
  ];
  for (let seed = 0; seed < 500; seed++) {
    const data: Record<string, string> = {};
    for (let k = 0; k < 1 + seed % 17; k++) {
      data["KEY_" + k] = values[(seed + k) % values.length];
    }
    const input = list(data), output = w.convert(input);
    equal(list(parse(output.slice(10, -4))), input);
    equal(r.convert(output), input);
    equal(w.convert(r.convert(output)), output);
  }
});

Deno.test("Dotenv quoting: exhaustive short punctuation strings and all available forms", async () => {
  const w = await converter(true), r = await converter(false);
  const alphabet = ["a", "'", '"', "`", "\\", "#", " ", "\n", "\r"];
  let checked = 0;
  function check(value: string) {
    checked++;
    const expected = list({ A: value });
    let output: string;
    try {
      output = w.convert(expected);
    } catch (e) {
      if (!(e instanceof WebAssembly.RuntimeError)) throw e;
      // Independently try each form through the reader. A writer rejection
      // must not hide a usable form. No short candidate contains a fence line.
      const candidates = [
        value,
        '"' + value.replaceAll("\n", "\\n").replaceAll("\r", "\\r") + '"',
        "'" + value + "'",
        "`" + value + "`",
      ];
      for (const candidate of candidates) {
        let actual: string;
        try {
          actual = r.convert(fence("A=" + candidate + "\n"));
        } catch (e) {
          if (e instanceof WebAssembly.RuntimeError) continue;
          throw e;
        }
        if (actual === expected) {
          throw new Error(
            "Rejected representable value: " + JSON.stringify(value),
          );
        }
      }
      return;
    }
    equal(r.convert(output), expected);
    equal(list(parse(output.slice(10, -4))), expected);
  }
  function visit(prefix: string, remaining: number) {
    check(prefix);
    if (remaining) {
      for (const c of alphabet) {
        visit(prefix + c, remaining - 1);
      }
    }
  }
  visit("", 4);
  equal(checked, 7381);
});

Deno.test("Dotenv writer: unsupported shapes, controls, duplicate keys and recovery", async () => {
  const w = await converter(true);
  for (
    const input of [
      "- []",
      "- scalar",
      "- {}\n  - A []",
      "- {}\n  - A {}",
      "- {}\n  - A = false",
      "- {}\n  - A = 1",
      "- {}\n  - A = null",
      '- {}\n  - A one\n  - "\\u0041" two',
      '- {}\n  - A "\\ud800"',
      '- {}\n  - "\\udc00" value',
      "- {}\n   - A value",
    ]
  ) traps(() => w.convert(input));
  for (const key of ["", "a b", "a=b", "a:b", "a#", "'a'", "猫", "a\n"]) {
    traps(() => w.convert(list({ [key]: "value" })));
  }
  for (const value of ["#\\", " '\"` # ", '\r"', "\r\\n"]) {
    traps(() => w.convert(list({ A: value })));
  }
  for (let code = 0; code <= 127; code++) {
    if (
      code >= 32 && code !== 127 || code === 9 || code === 10 || code === 13
    ) continue;
    traps(() => w.convert(list({ A: "a" + String.fromCharCode(code) + "z" })));
  }
  equal(w.convert(list({ A: "ok" })), fence("A=ok\n"));
});

Deno.test("Dotenv writer: quoted Unicode, key spans and Markdown fence integrity", async () => {
  const w = await converter(true), r = await converter(false);
  equal(w.convert('- {}\n  - "\\u0041" "\\uD83D\\uDE00\\/"'), fence("A=😀/\n"));
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
    equal(r.convert(w.convert(list({ A: value }))), list({ A: value }));
  }
  const long = "KEY".repeat(700);
  equal(
    r.convert(w.convert(list({ [long]: "value" }))),
    list({ [long]: "value" }),
  );
  traps(() => w.convert("- {}\n  - " + long + " one\n  - " + long + " two"));
  const markdown = new Parser();
  function intact(output: string) {
    const ticks = output.slice(0, output.indexOf("dotenv"));
    const tree = markdown.parse(output);
    equal(tree.firstChild.type, "code_block");
    equal(tree.firstChild.next, null);
    equal(
      tree.firstChild.literal,
      output.slice(ticks.length + 7, -(ticks.length + 1)),
    );
  }
  for (const ticks of ["```", "````", " ```", "  ```  ", "   ```\t"]) {
    const input = list({ A: "literal\\n\n" + ticks + "\nafter" });
    const output = w.convert(input);
    equal(r.convert(output), input);
    intact(output);
    equal(output.indexOf("dotenv"), ticks.trim().length + 1);
  }
  for (
    const value of [
      "\n```\n",
      "literal\\n\n```suffix\nafter",
      "literal\\n\n    ```\nafter",
      "literal\\n\n```",
      "literal\\n\n``\nafter",
    ]
  ) {
    const output = w.convert(list({ A: value }));
    equal(r.convert(output), list({ A: value }));
    intact(output);
  }
  const many = list({
    A: "literal\\n\n```\nafter",
    B: "literal\\n\n``````\nafter",
  });
  const expanded = w.convert(many);
  equal(expanded.indexOf("dotenv"), 7);
  equal(r.convert(expanded), many);
  intact(expanded);
  equal(w.convert(list({ A: "reset" })), fence("A=reset\n"));
});

Deno.test("Dotenv writer: full input, intermediate capacity and temporary output reuse", async () => {
  const w = await converter(true);
  const prefix = "- {}\n  - A ", value = "a".repeat(65536 - prefix.length);
  equal(encoder.encode(prefix + value).length, 65536);
  equal(w.convert(prefix + value), fence("A=" + value + "\n"));
  traps(() => w.run(65537));
  traps(() => w.run(-1));
  const slashes = "\\".repeat(32764);
  equal(w.convert(prefix + slashes), fence("A=" + slashes + "\n"));
  equal(w.memory[0x3ffff], 125);
  traps(() => w.convert(prefix + slashes + "\\"));
  const multiline = "a\n".repeat(20000);
  equal(
    w.convert(list({ A: multiline })),
    fence('A="' + multiline.replaceAll("\n", "\\n") + '"\n'),
  );
  // A long embedded fence grows both outer delimiters. This reaches the
  // output limit without exceeding either source/intermediate limit.
  const ticks = "`".repeat(43680);
  const wide = "literal\\n\n" + ticks + "\nafterx";
  const output = w.convert(list({ A: wide }));
  equal(encoder.encode(output).length, 131072);
  equal(output, ticks + "`dotenv\nA='" + wide + "'\n" + ticks + "`\n");
  traps(() => w.convert(list({ A: wide + "y" })));
  equal(w.memory[0x30000], 123);
  for (
    const invalid of [[0x80], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [
      0xf4,
      0x90,
      0x80,
      0x80,
    ]]
  ) {
    const before = encoder.encode(prefix);
    w.memory.set(before);
    w.memory.set(invalid, before.length);
    traps(() => w.run(before.length + invalid.length));
  }
  for (let i = 0; i < 20; i++) {
    traps(() => w.convert(list({ A: "#\\" })));
    equal(w.convert(list({ A: String(i) })), fence("A=" + i + "\n"));
  }
});
