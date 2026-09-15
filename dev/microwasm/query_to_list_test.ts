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
const encoder = new TextEncoder();
// URL form decoding preserves a leading BOM as data, rather than stripping it.
const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
const fence = (query: string) => "```query\n" + query + "\n```\n";
const list = (pairs: Iterable<readonly [string, string]>) =>
  "- []\n" +
  [...pairs].map(([name, value]) =>
    "  - []\n    - " + JSON.stringify(name) + "\n    - " +
    JSON.stringify(value) + "\n"
  ).join("");
const percent = (bytes: Iterable<number>) =>
  [...bytes].map((b) => "%" + b.toString(16).padStart(2, "0")).join("");

async function reader() {
  const module = assemble(
    await Deno.readTextFile(
      new URL("transforms/24-query-to-list.md", import.meta.url),
    ),
  );
  equal(toHex(assemble(module.resolved).bytes), toHex(module.bytes));
  equal(
    WebAssembly.Module.imports(await WebAssembly.compile(module.bytes)).length,
    0,
  );
  const { instance } = await WebAssembly.instantiate(module.bytes);
  const memory = new Uint8Array(
    (instance.exports.memory as WebAssembly.Memory).buffer,
  );
  const run = instance.exports.run as (length: number) => number;
  function convertBytes(bytes: Uint8Array) {
    memory.set(bytes);
    const length = run(bytes.length);
    equal(toHex(memory.subarray(0, bytes.length)), toHex(bytes));
    return decoder.decode(memory.subarray(65536, 65536 + length));
  }
  const convert = (input: string) => convertBytes(encoder.encode(input));
  return { memory, run, convert, convertBytes };
}

Deno.test("Query reader: ordered repeated names, empty segments and form decoding", async () => {
  const r = await reader();
  for (
    const query of [
      "",
      "?",
      "&&",
      "=&=",
      "?name=Ben+Atkin&tag=wasm&tag=Markdown&flag",
      "??x=1&x=2",
      "x=a=b=c&flag&empty=&=value",
      "x=a;b#fragment",
      " x = y &space=+&plus=%2B&separators=%26%3D",
      "猫=😀&%E7%8C%AB=x",
      "x=%&y=%a&z=%GG&w=%aG&v=%%41",
      "__proto__=x&constructor=y",
      "_charset_=windows-1252&byte=%80",
      "x=%00%0A%0D%09%22%5C%7F",
      "bom=%EF%BB%BFabc",
      "x=%252B&y=%2b&z=%2B",
    ]
  ) {
    const expected = list(new URLSearchParams(query));
    equal(r.convert(fence(query)), expected);
    equal(r.convert(fence(query).replaceAll("\n", "\r\n")), expected);
  }
  equal(r.convert("```query\n```"), list([]));
  equal(r.convert(fence(" x = y ") + " \t\r\n"), list([[" x ", " y "]]));
});

Deno.test("Query reader: 1,000 generated pair lists and 2,000 raw query strings", async () => {
  const r = await reader();
  const values = [
    "",
    "Ben",
    "猫😀",
    "a&b=c",
    "+",
    "?",
    "\0\n\r\t",
    "\ufeff",
    "`<b>x</b>`",
    "'\"\\",
    "false",
    "a a",
    "same",
  ];
  for (let seed = 0; seed < 1000; seed++) {
    const pairs: [string, string][] = Array.from(
      { length: seed % 17 },
      (
        _,
        k,
      ) => [
        values[(seed + k) % values.length],
        values[(seed * 7 + k) % values.length],
      ],
    );
    equal(r.convert(fence(new URLSearchParams(pairs).toString())), list(pairs));
  }
  let state = 123456789;
  const next = () => state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  const alphabet = "abc0123456789ABCDEF%&=+?#; \t_-~.``";
  for (let i = 0; i < 2000; i++) {
    const query = Array.from(
      { length: next() % 200 },
      () => alphabet[next() % alphabet.length],
    ).join("");
    equal(r.convert(fence(query)), list(new URLSearchParams(query)));
  }
});

Deno.test("Query reader: every one- and two-byte UTF-8 sequence against TextDecoder", async () => {
  const r = await reader();
  for (let a = 0; a < 256; a++) {
    const bytes = Uint8Array.of(a);
    equal(
      r.convert(fence("x=" + percent(bytes))),
      list([["x", decoder.decode(bytes)]]),
    );
    for (let b = 0; b < 256; b++) {
      const bytes = Uint8Array.of(a, b);
      equal(
        r.convert(fence("x=" + percent(bytes))),
        list([["x", decoder.decode(bytes)]]),
      );
    }
  }
});

Deno.test("Query reader: UTF-8 boundary, truncation and continuation reprocessing", async () => {
  const r = await reader();
  const vectors = [
    [0xe0, 0xa0, 0x80],
    [0xe0, 0x9f, 0xbf],
    [0xed, 0x9f, 0xbf],
    [0xed, 0xa0, 0x80],
    [0xef, 0xbb, 0xbf],
    [0xf0, 0x90, 0x80, 0x80],
    [0xf0, 0x8f, 0xbf, 0xbf],
    [0xf4, 0x8f, 0xbf, 0xbf],
    [0xf4, 0x90, 0x80, 0x80],
    [0xe2, 0x82, 0x41],
    [0xf0, 0x90, 0xc2, 0xa0],
  ];
  for (const vector of vectors) {
    for (let end = 0; end <= vector.length; end++) {
      const bytes = Uint8Array.from(vector.slice(0, end));
      equal(
        r.convert(fence(percent(bytes) + "=" + percent(bytes))),
        list([[decoder.decode(bytes), decoder.decode(bytes)]]),
      );
    }
  }
  let state = 982451653;
  const next = () => state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  for (let i = 0; i < 10000; i++) {
    // High bits avoid the short repeating cycles of low LCG bits.
    const bytes = Uint8Array.from(
      { length: 1 + (next() >>> 24) % 40 },
      () => next() >>> 24,
    );
    equal(
      r.convert(fence("x=" + percent(bytes))),
      list([["x", decoder.decode(bytes)]]),
    );
  }
  // The ABI can receive invalid UTF-8 directly, not just through percent decoding.
  for (const vector of vectors) {
    const bytes = Uint8Array.from([
      ...encoder.encode("```query\nx="),
      ...vector,
      ...encoder.encode("\n```\n"),
    ]);
    equal(
      r.convertBytes(bytes),
      list([["x", decoder.decode(Uint8Array.from(vector))]]),
    );
  }
});

Deno.test("Query reader: framing errors trap and do not poison the next call", async () => {
  const r = await reader();
  for (
    const input of [
      "",
      "```query",
      "```url\nx=y\n```",
      "````query\nx=y\n````",
      "```query\nx=y```",
      "```query\nx=y\n",
      "```query\nx=y\n```x",
      "```query\nx=y\nz=w\n```",
      "```query\nx=y\rz=w\n```",
      "before\n" + fence("x=y"),
      ...["```", "````", " ```", "  ```\t", "   ```  "].map(fence),
      fence("x=y") + "after",
    ]
  ) {
    traps(() => r.convert(input));
    equal(r.convert(fence("ok=yes")), list([["ok", "yes"]]));
  }
  traps(() => r.run(-1));
  traps(() => r.run(65537));
  equal(r.convert(fence("    ```")), list([["    ```", ""]]));
  equal(r.convert(fence("%60``")), list([["```", ""]]));
});

Deno.test("Query reader: exact 64 KiB source and 128 KiB output limits", async () => {
  const r = await reader();
  const value = "a".repeat(65520), full = fence("A=" + value);
  equal(encoder.encode(full).length, 65536);
  equal(r.convert(full), list([["A", value]]));
  traps(() => r.convert(full + " "));
  const dense = Array(5242).fill("=").join("&") + "a".repeat(17);
  equal(encoder.encode(r.convert(fence(dense))).length, 131072);
  // Scratch is reused, not preserved; a sentinel well beyond these tiny fields
  // proves that output overflow does not cross into unrelated scratch bytes.
  r.memory.fill(0x5a, 196608 + 100);
  traps(() => r.convert(fence(dense + "a")));
  equal(r.memory.subarray(196608 + 100).every((b) => b === 0x5a), true);
  equal(r.convert(fence("ok=yes")), list([["ok", "yes"]]));
  const badBytes = Uint8Array.from([
    ...encoder.encode("```query\nx="),
    ...new Uint8Array(50000).fill(0x80),
    ...encoder.encode("\n```\n"),
  ]);
  traps(() => r.convertBytes(badBytes));
  equal(toHex(r.memory.subarray(0, badBytes.length)), toHex(badBytes));
  equal(r.convert(fence("last=%F0%9F%98%80")), list([["last", "😀"]]));
});
