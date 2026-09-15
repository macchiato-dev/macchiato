import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder();
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  }
}
function traps(f: () => unknown) {
  try {
    f();
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
    throw e;
  }
  throw Error("Expected Wasm trap");
}
async function helper() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["c", "transforms/00-calendar-lines"],
      ["r", "transforms/38-srt-to-cues"],
      ["p", "transforms/00-patch-lines"],
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(a.resolved).bytes), toHex(a.bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const p = imports.p as unknown as {
    memory: WebAssembly.Memory;
    range(a: number, b: number): [number, number];
    line(a: number, b: number): [number, number];
  };
  const memory = new Uint8Array(p.memory.buffer);
  return {
    ...p,
    memory,
    put(s: string, at = 0) {
      const b = encoder.encode(s);
      memory.set(b, at);
      return at + b.length;
    },
  };
}
Deno.test("Patch spans: LF only, all bytes retained and exact next positions", async () => {
  const p = await helper();
  for (
    const s of ["", "a", "\n", "a\nb", " a\r\nnext", "+\0\t\r\n", "雪😀\nlast"]
  ) {
    for (const start of [0, 1, 65536, 196500]) {
      const end = p.put(s, start), b = encoder.encode(s), lf = b.indexOf(10);
      const before = p.memory.slice();
      equal(
        p.line(start, end),
        lf < 0 ? [end, end] : [start + lf, start + lf + 1],
      );
      equal(toHex(p.memory), toHex(before));
    }
  }
});
Deno.test("Patch ranges: implicit one, explicit zero, large starts and exact endpoints", async () => {
  const p = await helper();
  for (
    const [s, after, count] of [
      ["12 rest", 2, 1],
      ["12,0 rest", 4, 0],
      ["0,0", 3, 0],
      ["0007,002", 8, 2],
      ["999999999999999999999,1 @@", 23, 1],
      ["1,65536", 7, 65536],
    ] as const
  ) {
    for (const start of [0, 123, 196500]) {
      const end = p.put(s, start), before = p.memory.slice();
      equal(p.range(start, end), [start + after, count]);
      equal(toHex(p.memory), toHex(before));
    }
  }
  for (let n = 0; n <= 65536; n += 37) {
    const s = "42," + n + " rest", end = p.put(s);
    equal(p.range(0, end), [3 + String(n).length, n]);
  }
});
Deno.test("Patch ranges: bad counts, zero line positions, bounds and recovery", async () => {
  const p = await helper();
  for (
    const s of [
      "",
      "x",
      "-1",
      "0",
      "00,1",
      "1,",
      "1,x",
      "1,65537",
      "1,999999999999999999",
    ]
  ) {
    const end = p.put(s), before = p.memory.slice();
    traps(() => p.range(0, end));
    equal(toHex(p.memory), toHex(before));
  }
  for (
    const [a, b] of [[-1, 0], [1, 0], [0, 196609], [196609, 196609], [0, -1]]
  ) {
    traps(() => p.line(a, b));
    traps(() => p.range(a, b));
  }
  equal(p.line(196608, 196608), [196608, 196608]);
  const end = p.put("123,2", 196603);
  equal(p.range(196603, end), [end, 2]);
  equal(p.range(0, p.put("1,0")), [3, 0]);
});
