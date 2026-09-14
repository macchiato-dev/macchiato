import { assemble, fromHex, toHex } from "./microwasm.ts";

async function madlibs() {
  const source = await Deno.readTextFile(
    new URL("transforms/03-mad-libs.md", import.meta.url),
  );
  const built = assemble(source);
  const roundtrip = assemble(built.resolved);
  if (toHex(built.bytes) !== toHex(roundtrip.bytes)) {
    throw new Error("Roundtrip differs");
  }
  const module = await WebAssembly.compile(fromHex(toHex(built.bytes)));
  if (WebAssembly.Module.imports(module).length) {
    throw new Error("Unexpected imports");
  }
  const instance = await WebAssembly.instantiate(module);
  const memory = new Uint8Array(
    (instance.exports.memory as WebAssembly.Memory).buffer,
  );
  const run = instance.exports.run as (length: number) => number;
  return {
    run,
    memory,
    transform(input: string) {
      const bytes = new TextEncoder().encode(input);
      memory.set(bytes);
      const length = run(bytes.length);
      return new TextDecoder().decode(
        memory.subarray(0x10000, 0x10000 + length),
      );
    },
  };
}
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
Deno.test("Mad libs: exact substitution, Unicode, duplicates and retained Markdown", async () => {
  const { transform } = await madlibs();
  for (
    const [input, output] of [
      [
        "My [pet] went to the [place] [time]!\n\n- pet: dog\n- place: park\n- time: yesterday",
        "My dog went to the park yesterday!",
      ],
      ["[time]\n\n- time: yesterdy", "yesterdy"],
      ["[a], [a], [b]\n\n- a: old\n- b: β\n- a: 猫", "猫, 猫, β"],
      ["before [a] after\n\n- a:", "before  after"],
      ["[pet] [unknown]\r\n\r\n- pet:dog\r\n", "dog [unknown]"],
      ["[x]\n\n- x: [y]\n- y: no recursion", "[y]"],
      ["# Heading\n\n**[name]**\n\n- name: Ben", "# Heading\n\n**Ben**"],
      ["ordinary\n\n- list\n", "ordinary\n\n- list\n"],
      ["nothing\n", "nothing\n"],
      ["", ""],
      ["[unterminated\n\n- key: value", "[unterminated"],
      ["- x: unused", ""],
    ]
  ) equal(transform(input), output);
});
Deno.test("Mad libs: record and output limits, malformed bindings, repeat recovery", async () => {
  const { transform, run, memory } = await madlibs();
  for (
    const text of [
      "[x]\n- x: 1\ninvalid",
      "[x]\n- x: 1\n- y: 2\ninvalid",
      "[x]\n- : no name",
      "[x]\n- x: 1\n- bad",
    ]
  ) {
    traps(() => transform(text));
  }
  const bindings = Array.from({ length: 256 }, (_, i) => `- key${i}: value${i}`)
    .join("\n");
  equal(transform("[key0] [key255]\n\n" + bindings), "value0 value255");
  traps(() => transform("[key0]\n\n" + bindings + "\n- extra: no"));
  traps(() => run(0x10001));
  traps(() => run(-1));
  traps(() => transform("[x]".repeat(200) + "\n\n- x: " + "a".repeat(1000)));
  equal(transform("[x]\n\n- x: recovered"), "recovered");
  equal(transform("[".repeat(60000)), "[".repeat(60000));
  memory[0x2ffff] = 0xa5;
  equal(transform("[x]\n\n- x: y"), "y");
  equal(memory[0x2ffff], 0xa5);
});
