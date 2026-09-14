import { assemble, fromHex, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`${actual} != ${expected}`);
}
function traps(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) return;
    throw error;
  }
  throw new Error("Expected a Wasm trap");
}
async function integers() {
  const source = await Deno.readTextFile(
    new URL("numbers/01-unsigned-integers.md", import.meta.url),
  );
  const built = assemble(source);
  equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
  const module = await WebAssembly.compile(fromHex(toHex(built.bytes)));
  equal(WebAssembly.Module.imports(module).length, 0);
  const instance = await WebAssembly.instantiate(module);
  const memory = new Uint8Array(
    (instance.exports.memory as WebAssembly.Memory).buffer,
  );
  const parse = instance.exports.parse as (
    length: number,
    radix: number,
  ) => bigint;
  const format = instance.exports.format as (
    value: bigint,
    radix: number,
  ) => number;
  return {
    memory,
    parse,
    format,
    read(text: string, radix: number) {
      const input = new TextEncoder().encode(text);
      memory.set(input);
      return BigInt.asUintN(64, parse(input.length, radix));
    },
    write(value: bigint, radix: number) {
      const length = format(value, radix);
      return new TextDecoder().decode(
        memory.subarray(0x10000, 0x10000 + length),
      );
    },
  };
}

Deno.test("Unsigned numbers: all radixes, full-width bounds, round trips and sentinels", async () => {
  const m = await integers();
  let random = 0xcafebeef12345678n;
  const values = [
    0n,
    1n,
    9n,
    10n,
    35n,
    36n,
    255n,
    65535n,
    (1n << 32n) - 1n,
    (1n << 53n) - 1n,
    1n << 53n,
    (1n << 63n) - 1n,
    1n << 63n,
    (1n << 64n) - 1n,
  ];
  for (let i = 0; i < 300; i++) {
    random = BigInt.asUintN(
      64,
      random * 6364136223846793005n + 1442695040888963407n,
    );
    values.push(random);
  }
  for (let radix = 2; radix <= 36; radix++) {
    for (const value of values) {
      const expected = value.toString(radix); // Independent native test oracle.
      m.memory.fill(0xa5, 0xffff, 0x10042);
      equal(m.write(value, radix), expected);
      equal(m.memory[0xffff], 0xa5);
      equal(m.memory[0x10000 + expected.length], 0xa5);
      equal(m.read(expected, radix), value);
      equal(m.read(expected.toUpperCase(), radix), value);
    }
    traps(() => m.read((1n << 64n).toString(radix), radix));
  }
});

Deno.test("Unsigned numbers: digit alphabet, malformed input, capacity and recovery", async () => {
  const m = await integers();
  for (let radix = 2; radix <= 36; radix++) {
    for (let byte = 0; byte < 256; byte++) {
      m.memory[0] = byte;
      const char = String.fromCharCode(byte).toLowerCase();
      const digit = "0123456789abcdefghijklmnopqrstuvwxyz".indexOf(char);
      if (digit >= 0 && digit < radix) equal(m.parse(1, radix), BigInt(digit));
      else traps(() => m.parse(1, radix));
    }
  }
  for (const radix of [0, 1, 37, -1]) {
    traps(() => m.read("1", radix));
    traps(() => m.format(0n, radix));
  }
  for (
    const text of [
      "",
      " 1",
      "+1",
      "-1",
      "1 ",
      "1.0",
      "0x10",
      "12_3",
      "1e2",
      "NaN",
    ]
  ) {
    traps(() => m.read(text, 10));
  }
  traps(() => m.parse(0x10001, 10));
  traps(() => m.parse(-1, 10));
  m.memory.fill(0x30, 0, 0x10000);
  equal(m.parse(0x10000, 10), 0n);
  equal(m.read("000123", 10), 123n);
  equal(m.write(123n, 10), "123");
});
