import { assemble, fromHex, toHex } from "./microwasm.ts";

function writeInts(memory: WebAssembly.Memory, values: number[]) {
  const view = new DataView(memory.buffer);
  values.forEach((n, i) => view.setInt32(i * 4, n, true));
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

const encoder = new TextEncoder();
function writeBytes(memory: WebAssembly.Memory, value: string | Uint8Array) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  new Uint8Array(memory.buffer, 0, bytes.length).set(bytes);
  return bytes.length;
}
function output(memory: WebAssembly.Memory, length: number) {
  return new Uint8Array(memory.buffer, 65536, length).slice();
}

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

async function load(name: string) {
  const source = await Deno.readTextFile(
    new URL(`examples/${name}.md`, import.meta.url),
  );
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
    try {
      run(n);
    } catch (error) {
      trapped = error instanceof WebAssembly.RuntimeError;
    }
    equal(trapped, true);
  }
  equal(run(0), 0);
});

Deno.test("GCD: zero, equal, coprime and unsigned inputs", async () => {
  const { run } = await load("03-gcd");
  for (
    const [a, b, expected] of [
      [0, 0, 0],
      [0, 17, 17],
      [48, 18, 6],
      [17, 17, 17],
      [19, 17, 1],
      [0xffffffff, 15, 15],
      [0x80000000, 0, 0x80000000],
    ]
  ) {
    equal((run(a, b) as number) >>> 0, expected);
  }
});

Deno.test("Power: modulo arithmetic and full-width exponents", async () => {
  const { run } = await load("04-integer-power");
  for (const base of [0, 1, 2, 3, 100, 0xffffffff]) {
    for (let exponent = 0; exponent < 64; exponent++) {
      equal(
        (run(base, exponent) as number) >>> 0,
        Number(BigInt(base) ** BigInt(exponent) & 0xffffffffn),
      );
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
  for (let i = 0; i < 100; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    values.push(state);
  }
  for (const n of values) {
    let expected = 0;
    for (let bit = 0; bit < 32; bit++) expected += n >>> bit & 1;
    equal(run(n), expected);
  }
});

Deno.test("Array sum: full page, wrapping, no writes and invalid counts", async () => {
  const { run, memory } = await load("07-array-sum");
  for (
    const values of [
      [],
      [5],
      [1, -2, 3],
      [0x7fffffff, 1],
      Array(16384).fill(123),
    ]
  ) {
    writeInts(memory, values);
    const before = new Uint8Array(memory.buffer).slice();
    equal(run(values.length), values.reduce((sum, n) => sum + n | 0, 0));
    equal([...new Uint8Array(memory.buffer)], [...before]);
  }
  traps(() => run(-1));
  traps(() => run(16385));
});

Deno.test("Minimum: first tie, empty multi-return and signed extremes", async () => {
  const { run, memory } = await load("08-minimum-index");
  for (
    const values of [[], [4], [8, -3, 5, -3], [0x7fffffff, -2147483648, 0]]
  ) {
    writeInts(memory, values);
    const min = Math.min(...values);
    equal(
      run(values.length),
      values.length ? [min, values.indexOf(min)] : [0, -1],
    );
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
  const cases = [[], [4], [4, 3, 2, 1], [2, -4, 2, 0, -4], [
    -2147483648,
    2147483647,
    -1,
  ]];
  for (let n = 2; n < 50; n++) {
    cases.push(
      Array.from({ length: n }, (_, i) => (i * 31 + n * 17) % 101 - 50),
    );
  }
  for (const values of cases) {
    writeInts(memory, [...values, 0x12345678]);
    equal(run(values.length), values.length);
    const view = new DataView(memory.buffer);
    equal(
      values.map((_, i) => view.getInt32(i * 4, true)),
      [...values].sort((a, b) => a - b),
    );
    equal(view.getInt32(values.length * 4, true), 0x12345678);
  }
  traps(() => run(-1));
  traps(() => run(16385));
});

Deno.test("ASCII uppercase: every byte, full page, empty and immutable input", async () => {
  const { run, memory } = await load("11-ascii-uppercase");
  for (
    const bytes of [
      new Uint8Array(),
      Uint8Array.from({ length: 256 }, (_, i) => i),
      new Uint8Array(65536).fill(97),
    ]
  ) {
    writeBytes(memory, bytes);
    const size = run(bytes.length) as number;
    equal(size, bytes.length);
    equal(
      [...output(memory, size)],
      [...bytes].map((c) => c >= 97 && c <= 122 ? c - 32 : c),
    );
    equal([...new Uint8Array(memory.buffer, 0, bytes.length)], [...bytes]);
  }
  traps(() => run(65537));
});

Deno.test("ROT13: known phrase and all-byte round trip", async () => {
  const { run, memory } = await load("12-rot13");
  const length = writeBytes(memory, "Hello, World!");
  equal(
    new TextDecoder().decode(output(memory, run(length) as number)),
    "Uryyb, Jbeyq!",
  );
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
  writeBytes(memory, bytes);
  const first = output(memory, run(bytes.length) as number);
  writeBytes(memory, first);
  equal([...output(memory, run(first.length) as number)], [...bytes]);
  equal(run(0), 0);
});

Deno.test("Line count: explicit LF and unterminated-line convention", async () => {
  const { run, memory } = await load("13-count-lines");
  for (
    const [text, count] of [
      ["", 0],
      ["abc", 1],
      ["a\n", 1],
      ["\n\n", 2],
      ["a\r\nb", 2],
      ["\r", 1],
      ["\n".repeat(65536), 65536],
    ] as const
  ) {
    equal(run(writeBytes(memory, text)), count);
  }
  traps(() => run(-1));
});

Deno.test("UTF-8: scalar boundaries, malformed sequences, random decoder differential", async () => {
  const { run, memory } = await load("14-utf8-validation");
  const cases: number[][] = [
    [],
    [0],
    [127],
    [128],
    [192, 128],
    [193, 191],
    [194, 128],
    [223, 191],
    [224, 159, 191],
    [224, 160, 128],
    [237, 159, 191],
    [237, 160, 128],
    [239, 191, 191],
    [240, 143, 191, 191],
    [240, 144, 128, 128],
    [244, 143, 191, 191],
    [244, 144, 128, 128],
    [245, 128, 128, 128],
    [255],
    [226, 130],
    [226, 65, 172],
  ];
  for (const text of ["ASCII", "mañana", "猫", "😀", "a\0\uFFFFb"]) {
    cases.push([...encoder.encode(text)]);
  }
  let state = 9876;
  for (let i = 0; i < 2000; i++) {
    const bytes = [];
    for (let j = 0; j < i % 9; j++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      bytes.push(state >>> 24);
    }
    cases.push(bytes);
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const values of cases) {
    const bytes = Uint8Array.from(values);
    let valid = true;
    try {
      decoder.decode(bytes);
    } catch {
      valid = false;
    }
    equal(run(writeBytes(memory, bytes)), Number(valid));
  }
});

Deno.test("Bracket stack: mismatch, underflow, repeated calls and deep nesting", async () => {
  const { run, memory } = await load("15-balanced-brackets");
  for (
    const [text, valid] of [
      ["", 1],
      ["abc", 1],
      ["([{}])", 1],
      ["([)]", 0],
      [")", 0],
      ["((", 0],
      ["x{a[b(c)d]}", 1],
      ["(".repeat(32768) + ")".repeat(32768), 1],
      ["[".repeat(65536), 0],
      ["[]", 1],
    ] as const
  ) {
    equal(run(writeBytes(memory, text)), valid);
  }
  traps(() => run(65537));
});

Deno.test("RLE: exact bytes, run boundaries and actual Wasm round trips", async () => {
  const enc = await load("16-run-length-encoding");
  const dec = await load("17-run-length-decoding");
  for (
    const bytes of [
      new Uint8Array(),
      new Uint8Array([5]),
      new Uint8Array([5, 5, 5, 8]),
      new Uint8Array(255).fill(9),
      new Uint8Array(256).fill(9),
      new Uint8Array(32768).fill(9),
      Uint8Array.from({ length: 32768 }, (_, i) => i % 251),
    ]
  ) {
    const size = enc.run(writeBytes(enc.memory, bytes)) as number;
    const packed = output(enc.memory, size);
    const expected: number[] = [];
    for (let i = 0; i < bytes.length;) {
      const value = bytes[i];
      let count = 0;
      while (i < bytes.length && bytes[i] === value && count < 255) {
        i++;
        count++;
      }
      expected.push(count, value);
    }
    equal([...packed], expected);
    const result = dec.run(writeBytes(dec.memory, packed)) as number;
    equal([...output(dec.memory, result)], [...bytes]);
  }
  traps(() => enc.run(32769));
  for (const invalid of [[1], [0, 9]]) {
    traps(() => dec.run(writeBytes(dec.memory, Uint8Array.from(invalid))));
  }
  const exact = Uint8Array.from([...Array(257).fill([255, 7]).flat(), 1, 7]);
  equal(dec.run(writeBytes(dec.memory, exact)), 65536);
  exact[exact.length - 2] = 2;
  traps(() => dec.run(writeBytes(dec.memory, exact)));
  equal(dec.run(0), 0);
});

Deno.test("JSON escaping: controls, Unicode, capacity and recovery after trap", async () => {
  const { run, memory } = await load("18-json-string");
  for (
    const text of [
      "",
      'quote: " slash: \\',
      "猫 😀 café",
      String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i)),
      "a".repeat(65534),
      "\n".repeat(32767),
    ]
  ) {
    const result = new TextDecoder().decode(
      output(memory, run(writeBytes(memory, text)) as number),
    );
    equal(JSON.parse(result), text);
    equal(result, JSON.stringify(text));
  }
  equal(
    new TextDecoder().decode(
      output(memory, run(writeBytes(memory, "\0\n\u001f")) as number),
    ),
    '"\\u0000\\n\\u001f"',
  );
  traps(() => run(writeBytes(memory, "a".repeat(65535))));
  traps(() => run(writeBytes(memory, "\n".repeat(32768))));
  traps(() => run(writeBytes(memory, "\0".repeat(11000))));
  equal(
    new TextDecoder().decode(
      output(memory, run(writeBytes(memory, "ok")) as number),
    ),
    '"ok"',
  );
});

Deno.test("CSV: quoting, rows, empty fields, malformed data and capacity", async () => {
  const { run, memory } = await load("19-csv-to-json");
  const cases: [string, string[][]][] = [
    ["", []],
    ["a,b\nc,d", [["a", "b"], ["c", "d"]]],
    ["a,b\r\nc,d\r\n", [["a", "b"], ["c", "d"]]],
    [",", [["", ""]]],
    ["\n", [[""]]],
    ["\n\n", [[""], [""]]],
    ['""', [[""]]],
    ['"a,b","say ""hi"""', [["a,b", 'say "hi"']]],
    ['"a\r\nb",x\n', [["a\r\nb", "x"]]],
    ["x,\n", [["x", ""]]],
    ["猫,😀", [["猫", "😀"]]],
    ["a\0b,\\", [["a\0b", "\\"]]],
    ['"\b\t\n\f\r\u001f"', [["\b\t\n\f\r\u001f"]]],
  ];
  for (const [text, expected] of cases) {
    const result = new TextDecoder().decode(
      output(memory, run(writeBytes(memory, text)) as number),
    );
    equal(JSON.parse(result), expected);
    equal(result, JSON.stringify(expected));
  }
  for (
    const invalid of [
      '"',
      '"abc',
      'a"b',
      '"a"x',
      "a\rb",
      "a\r",
      '"a" ',
      "a".repeat(65536),
    ]
  ) {
    traps(() => run(writeBytes(memory, invalid)));
  }
  // Generate valid quoted CSV independently, including embedded separators.
  const fields = ["", "a,b", "x\ny", 'a"b', "猫", "\r\n", "\t", "\\"];
  for (let n = 1; n <= 40; n++) {
    const rows = Array.from(
      { length: n % 5 + 1 },
      (_, row) =>
        Array.from(
          { length: n % 4 + 1 },
          (_, col) => fields[(row * 3 + col + n) % fields.length],
        ),
    );
    const text = rows.map((row) =>
      row.map((field) => '"' + field.replaceAll('"', '""') + '"').join(",")
    ).join(n % 2 ? "\n" : "\r\n");
    equal(
      JSON.parse(
        new TextDecoder().decode(
          output(memory, run(writeBytes(memory, text)) as number),
        ),
      ),
      rows,
    );
  }
});

Deno.test("Life: still life, oscillator, glider, edges and differential generations", async () => {
  const { run, memory } = await load("20-game-of-life");
  const board = new Uint8Array(memory.buffer, 0, 256);
  const all = new Uint8Array(memory.buffer);
  function stepReference(input: Uint8Array) {
    return Uint8Array.from(input, (alive, i) => {
      const x = i % 16, y = Math.floor(i / 16);
      let count = 0;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(15, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(15, x + 1); xx++) {
          if (xx !== x || yy !== y) count += Number(input[yy * 16 + xx] !== 0);
        }
      }
      return Number(count === 3 || count === 2 && alive !== 0);
    });
  }
  const patterns = [
    [],
    [17, 18, 33, 34],
    [7 * 16 + 6, 7 * 16 + 7, 7 * 16 + 8],
    [1, 18, 32, 33, 34],
    [0, 1, 16],
    [0, 15, 240, 255],
  ];
  for (const live of patterns) {
    board.fill(0);
    live.forEach((i) => board[i] = 1);
    let expected = board.slice();
    all[512] = 173;
    for (let generation = 0; generation < 8; generation++) {
      expected = stepReference(expected);
      equal(run(), expected.reduce((sum, n) => sum + n, 0));
      equal([...board], [...expected]);
      equal(all[512], 173);
    }
  }
  let state = 5678;
  for (let trial = 0; trial < 20; trial++) {
    for (let i = 0; i < 256; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      board[i] = state >>> 30;
    }
    let expected = board.slice();
    for (let generation = 0; generation < 5; generation++) {
      expected = stepReference(expected);
      run();
      equal([...board], [...expected]);
    }
  }
  // A blinker must return to its exact starting board, not just population 3.
  board.fill(0);
  [118, 119, 120].forEach((i) => board[i] = 1);
  const initial = board.slice();
  run();
  run();
  equal([...board], [...initial]);
});
