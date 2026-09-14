import { assemble, fromHex, toHex, uleb } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}
function rejects(fn: () => unknown, pattern: RegExp) {
  try {
    fn();
  } catch (error) {
    if (pattern.test(String(error))) return;
    throw error;
  }
  throw new Error(`Expected failure matching ${pattern}`);
}
function region(body: string) {
  return `\`[microwasm]\`\n\n${body}\n`;
}

Deno.test("counts use unsigned LEB128, including the multi-byte boundaries", () => {
  for (
    const [value, bytes] of [
      [0, [0]],
      [127, [127]],
      [128, [128, 1]],
      [16383, [255, 127]],
      [16384, [128, 128, 1]],
      [0xffffffff, [255, 255, 255, 255, 15]],
    ] as const
  ) {
    equal(uleb(value), bytes);
  }
  for (const value of [-1, 0.5, NaN, Infinity, 0x1_0000_0000]) {
    rejects(() => uleb(value), /unsigned 32-bit/);
  }
});

Deno.test("forward lengths count resolved nested placeholders, not source characters", () => {
  const source = region(
    "- outer: `{{size:payload}}`\n  - payload: `{{size:data}}`\n    - data: `" +
      Array(128).fill("00").join(" ") + "`",
  );
  const result = assemble(source);
  equal([...result.bytes.slice(0, 4)], [130, 1, 128, 1]);
  equal(result.bytes.length, 132);
  equal([...assemble(result.resolved).bytes], [...result.bytes]);
  equal(result.map.find((item) => item.id === "data")?.offset, 4);
});

Deno.test("entry counts differ from subtree lengths and regions concatenate", () => {
  const source = region(
    "- count: `{{count:entries}}`\n- entries:\n  - first: `aa bb`\n  - second: `cc`",
  ) +
    "\n\nProse and ordinary `00` do not emit bytes.\n\n" +
    region("- tail: `dd`");
  equal([...assemble(source).bytes], [2, 170, 187, 204, 221]);
});

Deno.test("bad syntax and ambiguous bookkeeping fail closed", () => {
  for (
    const [body, pattern] of [
      ["- one: `0`", /invalid byte/],
      ["- one: `local.get 00`", /invalid byte/],
      ["- one: `{{size:missing}}`", /unknown label/],
      ["- one: `{{size:one}}`", /cyclic size/],
      ["- one: `{{size:two}}`\n- two: `{{size:one}}`", /cyclic size/],
      ["- one: `00`\n- one: `01`", /duplicate label/],
      ["- one: `00`\n    - child: `01`", /skipped nesting/],
      [" - one: `00`", /expected an annotated/],
    ] as const
  ) rejects(() => assemble(region(body)), pattern);
  rejects(() => assemble("`[microwasm]`"), /expected a byte list/);
  rejects(
    () => assemble("`[microwasm]`\n\n## No list"),
    /expected a byte list/,
  );
  rejects(
    () =>
      assemble("<!-- microwasm:start -->\n- one: `00`\n<!-- microwasm:end -->"),
    /No executable/,
  );
  rejects(() => assemble("just prose"), /No executable/);
  for (const value of ["", "0", "000", "0x00", "00 gg", "00 # comment"]) {
    rejects(() => fromHex(value), /only whitespace-separated bytes/);
  }
});

Deno.test("visible marker captures only its following list, with no closing directive", () => {
  const source = "`file.txt`\n\n```text\nnot bytecode\n```\n\n" +
    "```md\n" + region("- illustrative: `ff`") + "```\n\n" +
    "`[microwasm]` — First bytes\n\n- first: `aa`\n\n  - nested: `bb`\n\n" +
    "## Explanation\n\n- ordinary: `ff`\n\n" + region("- last: `cc`");
  const built = assemble(source);
  equal([...built.bytes], [0xaa, 0xbb, 0xcc]);
  equal(built.resolved.includes("`[microwasm]` — First bytes"), true);
  equal(
    built.map.map((item) =>
      source.split("\n")[item.line - 1].trim().split(":")[0]
    ),
    ["- first", "- nested", "- last"],
  );
});

Deno.test("grouping hexadecimal bytes does not change their order", () => {
  equal([...fromHex("41 8010\n4103")], [0x41, 0x80, 0x10, 0x41, 0x03]);
  equal([...assemble(region("- offset: `41 8010` — i32.const 2048")).bytes], [
    0x41,
    0x80,
    0x10,
  ]);
});

Deno.test("factorial document -> filled Markdown -> hex -> real Wasm for every valid input", async () => {
  const source = await Deno.readTextFile(
    new URL("examples/01-factorial.md", import.meta.url),
  );
  const built = assemble(source);
  equal([...assemble(built.resolved).bytes], [...built.bytes]);
  const bytes = fromHex(toHex(built.bytes));
  equal([...bytes], [...built.bytes]);
  equal(WebAssembly.validate(bytes), true);
  const { instance } = await WebAssembly.instantiate(bytes);
  const factorial = instance.exports.factorial as (n: number) => number;
  let expected = 1;
  for (let n = 0; n <= 12; n++) {
    if (n) expected *= n;
    equal(factorial(n), expected);
  }
  for (const n of [-1, 13, 0x7fffffff]) {
    rejects(() => factorial(n), /unreachable/);
  }
});
