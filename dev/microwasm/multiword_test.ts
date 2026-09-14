import { assemble, fromHex, toHex } from "./microwasm.ts";

function equal(a: unknown, b: unknown) {
  if (a !== b) throw new Error(`${a} != ${b}`);
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
async function arithmetic() {
  const numeric = await WebAssembly.instantiate(
    assemble(
      await Deno.readTextFile(
        new URL("numbers/02-json-number.md", import.meta.url),
      ),
    ).bytes,
  );
  const built = assemble(
    await Deno.readTextFile(
      new URL("numbers/03-multiword.md", import.meta.url),
    ),
  );
  equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
  const { instance } = await WebAssembly.instantiate(
    fromHex(toHex(built.bytes)),
    { n: numeric.instance.exports },
  );
  const ops = instance.exports as unknown as Record<
    "set" | "copy" | "muladd" | "shl" | "shr" | "cmp" | "sub" | "bits",
    (...args: number[]) => number
  >;
  const memory = new DataView(
    (instance.exports.memory as WebAssembly.Memory).buffer,
  );
  function address(slot: number) {
    return 0x31000 + slot * 0x800;
  }
  return {
    ops,
    memory,
    address,
    put(slot: number, value: bigint) {
      let count = 0;
      while (value) {
        memory.setUint32(
          address(slot) + 4 + count * 4,
          Number(value & 0xffffffffn),
          true,
        );
        value >>= 32n;
        count++;
      }
      memory.setUint32(address(slot), count, true);
    },
    get(slot: number) {
      const count = memory.getUint32(address(slot), true);
      if (count > 256) throw new Error("Invalid limb count");
      if (count && memory.getUint32(address(slot) + count * 4, true) === 0) {
        throw new Error("Unnormalized result");
      }
      let value = 0n;
      for (let i = count; i > 0; i--) {
        value = (value << 32n) |
          BigInt(memory.getUint32(address(slot) + i * 4, true));
      }
      return value;
    },
  };
}

Deno.test("Multiword: set, carry accumulation, bit lengths and native arithmetic differential", async () => {
  const m = await arithmetic();
  let seed = 0xc0ffee;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const values = [
    0n,
    1n,
    0xffffffffn,
    1n << 32n,
    (1n << 64n) - 1n,
    1n << 4095n,
  ];
  for (let i = 0; i < 150; i++) {
    let n = 0n;
    for (let j = 0; j <= i % 64; j++) n = (n << 32n) | BigInt(random());
    values.push(n);
  }
  for (const value of values) {
    for (
      const [scale, add] of [[0, 0], [0, 123], [1, 0], [2, 1], [10, 9], [
        36,
        35,
      ], [0xffffffff, 0xffffffff]]
    ) {
      m.put(0, value);
      m.ops.muladd(0, scale, add);
      const expected = value * BigInt(scale) + BigInt(add);
      equal(m.get(0), expected);
      equal(m.ops.bits(0), expected ? expected.toString(2).length : 0);
    }
  }
  // Build a large decimal only through the Wasm arithmetic operations.
  const decimal = "1234567890".repeat(100);
  m.ops.set(0, 0);
  for (const char of decimal) m.ops.muladd(0, 10, char.charCodeAt(0) - 48);
  equal(m.get(0), BigInt(decimal));
  for (let slot = 0; slot < 4; slot++) {
    m.ops.set(slot, 0xffffffff);
    equal(m.get(slot), 0xffffffffn);
    m.ops.set(slot, 0);
    equal(m.get(slot), 0n);
  }
});

Deno.test("Multiword: shifts, normalization, comparison, borrow chains and aliasing", async () => {
  const m = await arithmetic();
  for (
    const value of [
      0n,
      1n,
      2n,
      3n,
      0x80000000n,
      0xffffffffn,
      1n << 32n,
      (1n << 512n) - 1n,
      1n << 4096n,
    ]
  ) {
    for (const shift of [0, 1, 31, 32, 33, 53, 1074]) {
      m.put(0, value);
      m.ops.shl(0, shift);
      equal(m.get(0), value << BigInt(shift));
      for (let i = 0; i < shift; i++) m.ops.shr(0);
      equal(m.get(0), value);
      m.ops.shr(0);
      equal(m.get(0), value >> 1n);
    }
  }
  const values = [
    0n,
    1n,
    2n,
    0xffffffffn,
    1n << 32n,
    (1n << 128n) - 1n,
    1n << 128n,
    (1n << 2048n) - 1n,
  ];
  for (const a of values) {
    for (const b of values) {
      m.put(0, a);
      m.put(1, b);
      equal(m.ops.cmp(0, 1), a < b ? -1 : a > b ? 1 : 0);
      if (a >= b) {
        m.ops.sub(0, 1);
        equal(m.get(0), a - b);
      } else {
        traps(() => m.ops.sub(0, 1));
        equal(m.get(0), a);
      }
      equal(m.get(1), b);
    }
  }
  m.put(2, (1n << 2048n) - 1n);
  m.ops.copy(3, 2);
  equal(m.get(3), m.get(2));
  m.ops.copy(3, 3);
  equal(m.get(3), m.get(2));
  m.ops.sub(3, 3);
  equal(m.get(3), 0n);
});

Deno.test("Multiword: slot isolation, capacity traps, invalid lengths and reset", async () => {
  const m = await arithmetic();
  for (let slot = 0; slot < 4; slot++) {
    m.memory.setUint8(m.address(slot) - 1, 0xa5);
    m.memory.setUint8(m.address(slot) + 0x404, 0xa5);
    m.ops.set(slot, 1);
    m.ops.shl(slot, 8191);
    equal(m.ops.bits(slot), 8192);
    equal(m.get(slot), 1n << 8191n);
    traps(() => m.ops.shl(slot, 1));
    m.ops.set(slot, 123);
    equal(m.get(slot), 123n);
    equal(m.memory.getUint8(m.address(slot) - 1), 0xa5);
    equal(m.memory.getUint8(m.address(slot) + 0x404), 0xa5);
  }
  for (const slot of [-1, 4, 0x10000000]) {
    traps(() => m.ops.set(slot, 0));
    traps(() => m.ops.copy(0, slot));
    traps(() => m.ops.bits(slot));
  }
  traps(() => m.ops.shl(0, -1));
  traps(() => m.ops.shl(0, 8193));
  m.memory.setUint32(m.address(0), 257, true);
  traps(() => m.ops.bits(0));
  m.memory.setUint32(m.address(0), 0, true);
  m.ops.set(0, 99);
  equal(m.get(0), 99n);
});
