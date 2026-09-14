import { assemble, fromHex, toHex } from "./microwasm.ts";

function writeInts(memory: WebAssembly.Memory, values: number[]) {
  const view = new DataView(memory.buffer);
  values.forEach((n, i) => view.setInt32(i * 4, n, true));
}
function traps(fn: () => unknown) {
  try { fn(); } catch (error) { if (error instanceof WebAssembly.RuntimeError) return; throw error; }
  throw new Error("Expected a Wasm trap");
}

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function load(name: string) {
  const source = await Deno.readTextFile(new URL(`examples/${name}.md`, import.meta.url));
  const built = assemble(source);
  equal([...assemble(built.resolved).bytes], [...built.bytes]);
  const bytes = fromHex(toHex(built.bytes));
  // Compile supplies a useful byte offset on failure, rather than just false.
  const module = await WebAssembly.compile(bytes);
  const instance = await WebAssembly.instantiate(module);
  return {
    run: instance.exports.run as (...args: number[]) => number | number[],
    memory: instance.exports.memory as WebAssembly.Memory,
  };
}

Deno.test("Fibonacci: all accepted values, bounds, repeated calls", async () => {
  const { run } = await load("02-fibonacci");
  let a = 0, b = 1;
  for (let n = 0; n <= 46; n++) {
    equal(run(n), a);
    [a, b] = [b, a + b];
  }
  for (const n of [-1, 47]) {
    let trapped = false;
    try { run(n); } catch (error) { trapped = error instanceof WebAssembly.RuntimeError; }
    equal(trapped, true);
  }
  equal(run(0), 0);
});

Deno.test("GCD: zero, equal, coprime and unsigned inputs", async () => {
  const { run } = await load("03-gcd");
  for (const [a, b, expected] of [[0, 0, 0], [0, 17, 17], [48, 18, 6], [17, 17, 17], [19, 17, 1], [0xffffffff, 15, 15], [0x80000000, 0, 0x80000000]]) {
    equal((run(a, b) as number) >>> 0, expected);
  }
});

Deno.test("Power: modulo arithmetic and full-width exponents", async () => {
  const { run } = await load("04-integer-power");
  for (const base of [0, 1, 2, 3, 100, 0xffffffff]) {
    for (let exponent = 0; exponent < 64; exponent++) {
      equal((run(base, exponent) as number) >>> 0, Number(BigInt(base) ** BigInt(exponent) & 0xffffffffn));
    }
  }
  equal(run(1, 0xffffffff), 1);
  equal(run(2, 0xffffffff), 0);
});

Deno.test("Prime: cutoff, squares and high unsigned values", async () => {
  const { run } = await load("05-prime-test");
  for (let n = 0; n < 500; n++) {
    let prime = n >= 2;
    for (let d = 2; d < n; d++) if (n % d === 0) prime = false;
    equal(run(n), Number(prime));
  }
  equal(run(4294967291), 1);
  equal(run(65535 * 65535), 0);
  equal(run(0xffffffff), 0);
});

Deno.test("Population count: all single bits and deterministic mixed patterns", async () => {
  const { run } = await load("06-population-count");
  const values = [0, 0xffffffff, 0xaaaaaaaa, 0x55555555];
  for (let bit = 0; bit < 32; bit++) values.push(2 ** bit);
  let state = 123;
  for (let i = 0; i < 100; i++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; values.push(state); }
  for (const n of values) {
    let expected = 0;
    for (let bit = 0; bit < 32; bit++) expected += n >>> bit & 1;
    equal(run(n), expected);
  }
});

Deno.test("Array sum: full page, wrapping, no writes and invalid counts", async () => {
  const { run, memory } = await load("07-array-sum");
  for (const values of [[], [5], [1, -2, 3], [0x7fffffff, 1], Array(16384).fill(123)]) {
    writeInts(memory, values);
    const before = new Uint8Array(memory.buffer).slice();
    equal(run(values.length), values.reduce((sum, n) => sum + n | 0, 0));
    equal([...new Uint8Array(memory.buffer)], [...before]);
  }
  traps(() => run(-1)); traps(() => run(16385));
});

Deno.test("Minimum: first tie, empty multi-return and signed extremes", async () => {
  const { run, memory } = await load("08-minimum-index");
  for (const values of [[], [4], [8, -3, 5, -3], [0x7fffffff, -2147483648, 0]]) {
    writeInts(memory, values);
    const min = Math.min(...values);
    equal(run(values.length), values.length ? [min, values.indexOf(min)] : [0, -1]);
  }
  traps(() => run(16385));
});

Deno.test("Binary search: hits, misses, duplicates and empty intervals", async () => {
  const { run, memory } = await load("09-binary-search");
  for (const values of [[], [5], [-7, -2, 0, 3, 3, 3, 8, 99]]) {
    writeInts(memory, values);
    for (let target = -10; target <= 100; target++) {
      const index = run(values.length, target) as number;
      if (values.includes(target)) {
        equal(index >= 0 && index < values.length, true);
        equal(values[index], target);
      } else equal(index, -1);
    }
  }
  traps(() => run(16385, 1));
});

Deno.test("Insertion sort: compare numeric order and protect trailing memory", async () => {
  const { run, memory } = await load("10-insertion-sort");
  const cases = [[], [4], [4, 3, 2, 1], [2, -4, 2, 0, -4], [-2147483648, 2147483647, -1]];
  for (let n = 2; n < 50; n++) cases.push(Array.from({ length: n }, (_, i) => (i * 31 + n * 17) % 101 - 50));
  for (const values of cases) {
    writeInts(memory, [...values, 0x12345678]);
    equal(run(values.length), values.length);
    const view = new DataView(memory.buffer);
    equal(values.map((_, i) => view.getInt32(i * 4, true)), [...values].sort((a, b) => a - b));
    equal(view.getInt32(values.length * 4, true), 0x12345678);
  }
  traps(() => run(-1)); traps(() => run(16385));
});
