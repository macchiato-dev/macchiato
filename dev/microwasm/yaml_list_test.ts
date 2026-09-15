// Independent oracle only; no YAML parser is shipped with the browser tool.
import { parse } from "jsr:@std/yaml@1.2.0";
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
const encoder = new TextEncoder(), decoder = new TextDecoder();
const fence = (body: string) => "```yaml\n" + body + "```\n";
async function converter() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["l", "transforms/01-list-to-json"],
      ["k", "transforms/00-json-string-keys"],
      ["y", "transforms/16-list-to-yaml"],
    ]
  ) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    const module = await WebAssembly.compile(b.bytes);
    if (name === "y") {
      equal(
        JSON.stringify(WebAssembly.Module.imports(module)),
        JSON.stringify([
          { module: "l", name: "run", kind: "function" },
          { module: "k", name: "equal", kind: "function" },
          { module: "k", name: "next", kind: "function" },
          { module: "l", name: "memory", kind: "memory" },
        ]),
      );
    }
    imports[name] = (await WebAssembly.instantiate(module, imports)).exports;
  }
  const memory = new Uint8Array(
    (imports.n.memory as WebAssembly.Memory).buffer,
  );
  const run = imports.y.run as (length: number) => number;
  function convert(input: string) {
    const bytes = encoder.encode(input);
    memory.set(bytes);
    const length = run(bytes.length);
    equal(toHex(memory.subarray(0, bytes.length)), toHex(bytes));
    return decoder.decode(memory.subarray(65536, 65536 + length));
  }
  return { memory, run, convert };
}
function list(value: unknown, depth = 0, key?: string): string {
  const prefix = "  ".repeat(depth) + "- " +
    (key === undefined ? "" : JSON.stringify(key) + " ");
  if (Array.isArray(value)) {
    return prefix + "[]\n" + value.map((v) => list(v, depth + 1)).join("");
  }
  if (value !== null && typeof value === "object") {
    return prefix + "{}\n" +
      Object.entries(value).map(([k, v]) => list(v, depth + 1, k)).join("");
  }
  return prefix +
    (typeof value === "string"
      ? JSON.stringify(value)
      : "= " + JSON.stringify(value)) +
    "\n";
}
function read(output: string) {
  equal(output.startsWith("```yaml\n"), true);
  equal(output.endsWith("\n```\n"), true);
  return parse(output.slice(8, -4), { schema: "json" });
}

Deno.test("List to YAML: block mappings, sequences, empty containers and scalar roots", async () => {
  const c = await converter();
  equal(
    c.convert(
      "- {}\n  - name Ben\n  - tags []\n    - wasm\n    - = false\n  - location {}\n    - city Phoenix\n  - empty {}",
    ),
    fence(
      '"name": "Ben"\n"tags":\n  - "wasm"\n  - false\n"location":\n  "city": "Phoenix"\n"empty": {}\n',
    ),
  );
  equal(
    c.convert("- []\n  - {}\n    - x = 1\n  - []\n    - {}\n  - []"),
    fence('-\n  "x": 1\n-\n  - {}\n- []\n'),
  );
  for (
    const [source, body] of [
      ["- {}", "{}\n"],
      ["- []", "[]\n"],
      ["- = null", "null\n"],
      ["- = true", "true\n"],
      ["- false", '"false"\n'],
      ["- = -0", "-0\n"],
      ["- = 1.2300E+40", "1.2300E+40\n"],
      ["- = 9007199254740993", "9007199254740993\n"],
      ["- = 1e9999", "1e9999\n"],
      ['- ""', '""\n'],
    ]
  ) equal(c.convert(source), fence(body));
  equal(c.convert("\r\n- {}\r\n  - name Ben\r\n"), fence('"name": "Ben"\n'));
});

Deno.test("YAML strings: Unicode scalars, controls and syntax remain values", async () => {
  const c = await converter();
  for (let cp = 0; cp < 160; cp++) {
    const text = String.fromCodePoint(cp);
    equal(read(c.convert(list(text))), text);
  }
  for (
    const text of [
      "😀",
      "猫",
      "é",
      "é",
      "a\u2028b\u2029c",
      "\ufffe\uffff",
      String.fromCodePoint(0x10ffff),
      "&anchor *alias !tag #comment",
      "---\n...",
      "yes",
      "false",
      "null",
      "2026-09-15",
      "0123",
      "1e3",
      "a: b",
      "[1,2]",
      "{}",
      "```yaml",
      '"\\/\n\r\t\0',
    ]
  ) {
    equal(read(c.convert(list(text))), text);
    const object = Object.fromEntries([[text, text]]);
    equal(
      JSON.stringify(read(c.convert(list(object)))),
      JSON.stringify(object),
    );
  }
  equal(c.convert('- "\\ud83d\\ude00"'), fence('"😀"\n'));
  equal(c.convert('- "a\\nb"'), fence('"a\\u000ab"\n'));
  equal(c.convert('- "\\u0061\\/b"'), fence('"a/b"\n'));
});

Deno.test("List to YAML: 500 nested datasets checked by an independent YAML parser", async () => {
  const c = await converter();
  let seed = 1749;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const strings = [
    "name",
    "x|y",
    "猫",
    "😀",
    "__proto__",
    "constructor",
    "",
    "a\nb",
    "a: b",
    "false",
  ];
  function value(depth: number): unknown {
    const choice = random() % (depth ? 7 : 5);
    if (choice === 0) return null;
    if (choice === 1) return !!(random() % 2);
    if (choice === 2) return ((random() % 10000) - 5000) / 8;
    if (choice < 5) return strings[random() % strings.length];
    if (choice === 5) {
      return Array.from({ length: random() % 5 }, () => value(depth - 1));
    }
    return Object.fromEntries(
      Array.from(
        { length: random() % 5 },
        () => [strings[random() % strings.length], value(depth - 1)],
      ),
    );
  }
  for (let i = 0; i < 500; i++) {
    const v = value(5), input = list(v);
    const output = c.convert(input);
    equal(JSON.stringify(read(output)), JSON.stringify(v));
    equal(c.convert(input), output);
  }
});

Deno.test("YAML: reject duplicate mapping keys, lone surrogates and malformed trees", async () => {
  const c = await converter();
  equal(c.convert(""), c.convert("- {}"));
  equal(c.convert("- x ok"), fence('"x": "ok"\n'));
  for (
    const input of [
      "- x a\n- x b",
      "- {}\n  - x a\n  - x b",
      '- {}\n  - x a\n  - "\\u0078" b',
      "- {}\n  - nested {}\n    - a []\n      - 1\n    - a 2",
      '- []\n  - {}\n    - "😀" 1\n    - "\\ud83d\\ude00" 2',
      '- "\\ud800"',
      '- "\\udc00"',
      '- "\\ud800x"',
      '- "\\ud800\\ud800"',
      '- {}\n  - "\\ud800" x',
      '- {}\n  - x "\\udc00"',
      "- {}\n    - x 1",
      "- = 01",
      '- "\\q"',
      "- 1\n- 2",
    ]
  ) {
    traps(() => c.convert(input));
    equal(c.convert("- {}\n  - x ok"), fence('"x": "ok"\n'));
  }
  const separate = [{ x: 1 }, { x: 2 }];
  equal(
    JSON.stringify(read(c.convert(list(separate)))),
    JSON.stringify(separate),
  );
  const distinct = { A: 1, a: 2, "é": 3, "é": 4 };
  equal(
    JSON.stringify(read(c.convert(list(distinct)))),
    JSON.stringify(distinct),
  );
});

Deno.test("YAML long keys: explicit syntax without truncation or implicit-key overflow", async () => {
  const c = await converter();
  for (
    const key of [
      "a".repeat(1021),
      "a".repeat(1022),
      "a".repeat(1024),
      "猫".repeat(400),
      "\n".repeat(200),
      "x".repeat(20000),
    ]
  ) {
    const object = Object.fromEntries([[key, { nested: [1, 2] }], [
      "after",
      true,
    ]]);
    const output = c.convert(list(object));
    equal(JSON.stringify(read(output)), JSON.stringify(object));
    if (key.length >= 1022 || key.includes("猫") || key.includes("\n")) {
      equal(output.startsWith('```yaml\n? "'), true);
    }
    equal(
      JSON.stringify(read(c.convert(list([object])))),
      JSON.stringify([object]),
    );
  }
});

Deno.test("YAML memory: input, intermediate body, depth and output limits with recovery", async () => {
  const c = await converter();
  const full = '- "' + "a".repeat(65532) + '"';
  equal(encoder.encode(full).length, 65536);
  equal(read(c.convert(full)), "a".repeat(65532));
  traps(() => c.convert(full + " "));
  const slash = "\\".repeat(32767);
  equal(read(c.convert("- " + slash)), slash);
  equal(c.memory[0x3ffff], 34);
  traps(() => c.convert("- " + slash + "\\"));
  const chain = (n: number) =>
    Array.from({ length: n }, (_, i) => "  ".repeat(i) + "- []\n").join("") +
    "  ".repeat(n) + "- = 0";
  let nested = read(c.convert(chain(128)));
  for (let depth = 0; depth < 128; depth++) {
    equal(Array.isArray(nested), true);
    equal((nested as unknown[]).length, 1);
    nested = (nested as unknown[])[0];
  }
  equal(nested, 0);
  traps(() => c.convert(chain(129)));
  // DEL is one input byte, but deliberately emits six readable escape bytes.
  const expanded = "\x7f".repeat(21842) + "a".repeat(5);
  equal(c.convert("- " + expanded).length, 128 * 1024);
  traps(() => c.convert("- " + expanded + "a"));
  equal(c.convert("- []"), fence("[]\n"));
});
