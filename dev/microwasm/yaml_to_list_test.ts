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
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
    throw e;
  }
  throw new Error("Expected Wasm trap");
}
const encoder = new TextEncoder(), decoder = new TextDecoder();
const fence = (body: string) => "```yaml\n" + body + "```\n";
async function load(paths: string[][]) {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (const [name, path] of paths) {
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
const reader = () =>
  load([
    ["n", "numbers/02-json-number"],
    ["p", "transforms/02-json-to-list"],
    ["k", "transforms/00-json-string-keys"],
    ["s", "transforms/00-yaml-scalars"],
    ["y", "transforms/17-yaml-to-list"],
  ]);
const writer = () =>
  load([
    ["n", "numbers/02-json-number"],
    ["l", "transforms/01-list-to-json"],
    ["k", "transforms/00-json-string-keys"],
    ["y", "transforms/16-list-to-yaml"],
  ]);
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

Deno.test("YAML to list: block structure, plain/quoted scalars, comments and nulls", async () => {
  const c = await reader();
  for (
    const body of [
      "name: Ben\nlocation:\n  city: Phoenix\ntags:\n  - wasm\n  - yaml\n",
      "# start\n-\n  x: 1\n\n  y: [] # empty\n-\n  - False\n  - {}\n",
      "first: # absent\nsecond:\n  name: 'it''s fine'\nthird:\n",
      "? 'a:b'\n: 'a#b'\n? name\n: \n  - 1\n  -\n",
      "null\n",
      "[ ]\n",
      "{ }\n",
      "'it''s fine'\n",
    ]
  ) {
    equal(c.convert(fence(body)), list(parse(body, { schema: "json" })));
    equal(
      c.convert(fence(body).replaceAll("\n", "\r\n")),
      list(parse(body, { schema: "json" })),
    );
  }
  equal(c.convert(fence("")), "- = null\n");
  equal(c.convert(fence("# nothing\n\n")), "- = null\n");
  // JavaScript objects reorder integer-like names; the Wasm reader keeps
  // the source order instead of inheriting that oracle representation.
  equal(
    c.convert(fence("'': ''\n'123': yes\n'false': FALSE\n")),
    '- {}\n  - "" ""\n  - "123" "yes"\n  - "false" = false\n',
  );
  equal(
    c.convert(fence("n: 9007199254740993\nz: -0\nx: 1.2300E+40\n")),
    '- {}\n  - "n" = 9007199254740993\n  - "z" = -0\n  - "x" = 1.2300E+40\n',
  );
});

Deno.test("YAML pair: 500 generated nested documents through the actual Wasm writer and reader", async () => {
  const r = await reader(), w = await writer();
  let seed = 381;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const strings = [
    "",
    "a:b # c",
    "true",
    "it's fine",
    "猫",
    "😀",
    "a\\b",
    "line\nbreak",
    "\u0080",
    "<em>x</em>",
  ];
  function generate(depth: number): unknown {
    const kind = random() % (depth ? 6 : 4);
    if (kind === 0) return null;
    if (kind === 1) return !!(random() & 1);
    if (kind === 2) return (random() % 20001 - 10000) / 8;
    if (kind === 3) return strings[random() % strings.length];
    const n = random() % 5;
    if (kind === 4) return Array.from({ length: n }, () => generate(depth - 1));
    return Object.fromEntries(
      Array.from(
        { length: n },
        (_, i) => [strings[random() % strings.length] + i, generate(depth - 1)],
      ),
    );
  }
  for (let i = 0; i < 500; i++) {
    const value = generate(5), yaml = w.convert(list(value));
    equal(
      JSON.stringify(parse(yaml.slice(8, -4), { schema: "json" })),
      JSON.stringify(value),
    );
    // String escape spelling is normalized by the YAML writer, so compare
    // another full Wasm write/read cycle, not the original escape spelling.
    const output = r.convert(yaml);
    equal(w.convert(output), yaml);
    equal(r.convert(w.convert(output)), output);
  }
});

Deno.test("YAML mapping keys: decoded uniqueness, sibling scopes and explicit long keys", async () => {
  const c = await reader();
  for (
    const body of [
      "name: a\nname: b\n",
      'name: a\n"\\u006eame": b\n',
      "'it''s': a\n\"it's\": b\n",
      "? name\n: a\nname: b\n",
      "a:\n  x: 1\n  x: 2\n",
    ]
  ) traps(() => c.convert(fence(body)));
  const scoped = "a:\n  x: 1\nb:\n  x: 2\nx: 3\n";
  equal(c.convert(fence(scoped)), list(parse(scoped, { schema: "json" })));
  const long = "猫".repeat(1500);
  equal(
    c.convert(fence("? " + JSON.stringify(long) + "\n: value\n")),
    list({ [long]: "value" }),
  );
  traps(() => c.convert(fence(JSON.stringify(long) + ": value\n")));
  traps(() =>
    c.convert(
      fence(
        "? " + JSON.stringify(long) + "\n: first\n? " + JSON.stringify(long) +
          "\n: second\n",
      ),
    )
  );
  equal(c.convert(fence("name: recovered\n")), list({ name: "recovered" }));
});

Deno.test("YAML rejection: indentation, mixed blocks, unsupported features, fences and recovery", async () => {
  const c = await reader();
  for (
    const body of [
      " name: Ben\n",
      "a:\n b: c\n",
      "a:\n    b: c\n",
      "a: x\n  b: c\n",
      "a:\n\tb: c\n",
      "- one\nname: two\n",
      "name: one\n- two\n",
      "- name: Ben\n",
      "a:\n  - x\n   - y\n",
      "first\nsecond\n",
      "? key\n",
      "? key\nother: value\n",
      "? key\n  : value\n",
      "1: value\n",
      "false: value\n",
      ": value\n",
      "a: &anchor x\n",
      "a: *alias\n",
      "a: |\n  multiline\n",
      "a: [1, 2]\n",
      "a: 0123\n",
      "a: .inf\n",
      "---\na: 1\n",
      "a: 1\n...\n",
    ]
  ) {
    traps(() => c.convert(fence(body)));
    equal(c.convert(fence("name: recovered\n")), list({ name: "recovered" }));
  }
  for (
    const source of [
      "",
      "```yml\na: b\n```",
      "```yaml\na: b```",
      "prose\n```yaml\na: b\n```",
      "```yaml\na: b\n```\nprose",
      "```yaml\n```\n```yaml\n```",
      "```yaml\na: b\n````",
    ]
  ) {
    traps(() => c.convert(source));
  }
});

Deno.test("YAML reader memory: full input, exact output, nesting and trap recovery", async () => {
  const c = await reader();
  const scratch = c.memory.slice(0x30000);
  const body = "a".repeat(65536 - 13) + "\n";
  const input = fence(body);
  equal(encoder.encode(input).length, 65536);
  equal(c.convert(input), "- " + JSON.stringify(body.trim()) + "\n");
  traps(() => c.run(65537));
  traps(() => c.run(-1));
  // Root marker: 5 bytes; 11,913 null children: 131,043 bytes;
  // one 24-byte child makes exactly 128 KiB.
  const exact = fence("-\n".repeat(11913) + '- "' + "x".repeat(17) + '"\n');
  equal(encoder.encode(c.convert(exact)).length, 131072);
  traps(() => c.convert(exact.replace("x", "xx")));
  equal(toHex(c.memory.subarray(0x30000)), toHex(scratch));
  function nested(count: number, leaf = "1") {
    return Array.from({ length: count }, (_, i) => "  ".repeat(i) + "-\n").join(
      "",
    ) + "  ".repeat(count) + leaf + "\n";
  }
  equal(
    c.convert(fence(nested(128))).endsWith("  ".repeat(128) + "- = 1\n"),
    true,
  );
  traps(() => c.convert(fence(nested(129))));
  traps(() => c.convert(fence(nested(128, "[]"))));
  equal(c.convert(fence("[]\n")), "- []\n");
  equal(toHex(c.memory.subarray(0x30000)), toHex(scratch));
});
