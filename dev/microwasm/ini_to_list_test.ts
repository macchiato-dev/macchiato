import { parse } from "jsr:@std/ini@0.225.2";
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
const fence = (body: string) => "```ini\n" + body + "```\n";
async function reader() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["t", "transforms/20-ini-to-list"],
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
function list(sections: Record<string, Record<string, string>>) {
  let text = "- {}\n";
  for (const [section, entries] of Object.entries(sections)) {
    text += "  - " + JSON.stringify(section) + " {}\n";
    for (const [key, value] of Object.entries(entries)) {
      text += "    - " + JSON.stringify(key) + " " + JSON.stringify(value) +
        "\n";
    }
  }
  return text;
}

Deno.test("INI to list: sections, string values, delimiters and explicit dialect", async () => {
  const r = await reader();
  const source =
    " name = Ben \n[ server ] ; comment\n host = localhost\nport: 3030\nempty=\n[DEFAULT]\nkey=%(name)s\n[empty]\n";
  const expected = list({
    "": { name: "Ben" },
    server: { host: "localhost", port: "3030", empty: "" },
    DEFAULT: { key: "%(name)s" },
    empty: {},
  });
  equal(r.convert(fence(source)), expected);
  equal(r.convert(fence(source).replaceAll("\n", "\r\n")), expected);
  equal(r.convert(fence("")), "- {}\n");
  equal(r.convert(fence("# comment\n ; another\n\n")), "- {}\n");
  equal(
    r.convert(
      fence(
        '[s]\nfalse=false\nnumber=123\nquote="hi"\npath=C:\\folder\ninline=a # b; c\ncolon=a:b=c\ntab=a\tb\n',
      ),
    ),
    list({
      s: {
        false: "false",
        number: "123",
        quote: '"hi"',
        path: "C:\\folder",
        inline: "a # b; c",
        colon: "a:b=c",
        tab: "a\tb",
      },
    }),
  );
  equal(
    r.convert(fence("[10]\nb=first\na=second\n[2]\nx=y\n")),
    '- {}\n  - "10" {}\n    - "b" "first"\n    - "a" "second"\n  - "2" {}\n    - "x" "y"\n',
  );
});

Deno.test("INI to list: 500 generated documents against Deno's independent parser", async () => {
  const r = await reader();
  const words = [
    "Ben",
    "猫",
    "😀",
    "false",
    "123",
    '"quoted"',
    "a # b",
    "C:\\folder",
    "<b>text</b>",
  ];
  for (let seed = 0; seed < 500; seed++) {
    let source = "# generated document\n";
    const data: Record<string, Record<string, string>> = {};
    for (let s = 0; s < 1 + seed % 7; s++) {
      const section = "section-" + s;
      source += "[" + section + "]\n";
      data[section] = {};
      for (let k = 0; k < 1 + seed % 11; k++) {
        const key = "key-" + k, value = words[(seed + s + k) % words.length];
        source += key + " = " + value + "\n";
        data[section][key] = value;
      }
    }
    const expected = list(data);
    equal(
      list(parse(source) as Record<string, Record<string, string>>),
      expected,
    );
    equal(r.convert(fence(source)), expected);
  }
});

Deno.test("INI to list: duplicate scope, case, Unicode and long names", async () => {
  const r = await reader();
  for (
    const source of [
      "x=1\nx=2\n",
      "[a]\nx=1\nx=2\n",
      "[a]\n[a]\n",
      "[a]\nx=1\n[b]\ny=2\n[ a ]\n",
      "[猫]\n[猫]\n",
      '[a]\n"x"=1\n"x"=2\n',
    ]
  ) {
    traps(() => r.convert(fence(source)));
    equal(r.convert(fence("x=ok\n")), list({ "": { x: "ok" } }));
  }
  const key = "a".repeat(2048);
  equal(
    r.convert(fence("[a]\nx=1\nX=2\n[b]\nx=3\n")),
    list({ a: { x: "1", X: "2" }, b: { x: "3" } }),
  );
  equal(
    r.convert(fence("[" + key + "]\n" + key + "=long\n")),
    list({ [key]: { [key]: "long" } }),
  );
  traps(() => r.convert(fence("[" + key + "]\n[" + key + "]\n")));
  equal(
    r.convert(fence("[猫😀]\né=one\né=two\n\\u0078=three\nx=four\n")),
    list({ "猫😀": { "é": "one", "é": "two", "\\u0078": "three", x: "four" } }),
  );
});

Deno.test("INI to list: malformed grammar, controls, UTF-8 and recovery", async () => {
  const r = await reader();
  for (
    const source of [
      "[]\n",
      "[ ]\n",
      "[a\n",
      "[[a]]\n",
      "[a] junk\n",
      "[a];comment\n",
      "=x\n",
      " :x\n",
      "lonely\n",
      "[a]\nx=one\n continuation\n",
      "x=one\ry=two\n",
    ]
  ) {
    traps(() => r.convert(fence(source)));
  }
  for (let byte = 0; byte <= 127; byte++) {
    if (
      byte >= 32 && byte !== 127 || byte === 9 || byte === 10 || byte === 13
    ) continue;
    for (const prefix of ["x=", "# ", "[a"]) {
      traps(() => r.convert(fence(prefix + String.fromCharCode(byte) + "\n")));
    }
  }
  for (
    const input of [
      "",
      "```ini",
      "```ini\nx=1\n",
      "```INI\nx=1\n```\n",
      "prose\n" + fence("x=1\n"),
      fence("x=1\n") + "prose",
      "```ini\nx=1```\n",
    ]
  ) {
    traps(() => r.convert(input));
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
    for (const prefix of ["```ini\nx=", "```ini\n# "]) {
      const before = encoder.encode(prefix), after = encoder.encode("\n```\n");
      r.memory.set(before);
      r.memory.set(invalid, before.length);
      r.memory.set(after, before.length + invalid.length);
      traps(() => r.run(before.length + invalid.length + after.length));
    }
  }
  equal(r.convert(fence("[ok]\nx=yes\n")), list({ ok: { x: "yes" } }));
});

Deno.test("INI to list: exact input/output capacity and untouched scratch", async () => {
  const r = await reader();
  const scratch = toHex(r.memory.subarray(196608));
  const full = fence("x=" + "\\".repeat(65522) + "\n");
  equal(encoder.encode(full).length, 65536);
  equal(encoder.encode(r.convert(full)).length, 131072);
  equal(toHex(r.memory.subarray(196608)), scratch);
  traps(() => r.convert(full + " "));
  const exact = fence("a=\nb=" + "\\".repeat(65515) + "x\n");
  equal(encoder.encode(r.convert(exact)).length, 131072);
  traps(() => r.convert(exact.replace("x\n", "xx\n")));
  equal(toHex(r.memory.subarray(196608)), scratch);
  equal(r.convert(fence("x=ok\n")), list({ "": { x: "ok" } }));
  traps(() => r.run(-1));
});
