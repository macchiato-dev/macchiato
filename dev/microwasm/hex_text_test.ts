import { Parser } from "npm:commonmark@0.31.2";
import { assemble, toHex } from "./microwasm.ts";

const enc = new TextEncoder();
// A BOM is data here, not a transport signature.
const dec = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      `${JSON.stringify(a)?.slice(0, 1000)} != ${
        JSON.stringify(b)?.slice(0, 1000)
      }`,
    );
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
function frame(body: string, label = "text", width = 3) {
  for (const run of body.matchAll(/`+/g)) {
    width = Math.max(width, run[0].length + 1);
  }
  const ticks = "`".repeat(width);
  return ticks + label + "\n" + body + "\n" + ticks + "\n";
}
function hex(bytes: Uint8Array) {
  return Array.from(
    bytes,
    (b, i) => (i ? i % 16 ? " " : "\n" : "") + b.toString(16).padStart(2, "0"),
  ).join("");
}
type Exports = {
  memory: WebAssembly.Memory;
  run(n: number): number;
  encode(n: number): number;
};
async function pair() {
  const modules: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["c", "transforms/00-calendar-lines"],
      ["h", "transforms/44-hex-to-text"],
      ["t", "transforms/45-text-to-hex"],
    ]
  ) {
    const source = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(source.resolved).bytes), toHex(source.bytes));
    modules[name] =
      (await WebAssembly.instantiate(source.bytes, modules)).instance.exports;
  }
  const h = modules.h as unknown as Exports,
    t = modules.t as unknown as Exports;
  equal(h.memory === t.memory, true);
  const memory = new Uint8Array(h.memory.buffer), table = memory.slice(196608);
  function convert(f: (n: number) => number, source: string | Uint8Array) {
    const bytes = typeof source === "string" ? enc.encode(source) : source;
    if (bytes.length > 65536) throw Error("Test input exceeds source page");
    memory.set(bytes);
    try {
      const n = f(bytes.length);
      equal(n >= 0 && n <= 131072, true);
      return dec.decode(memory.subarray(65536, 65536 + n));
    } finally {
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] !== memory[i]) throw Error(`Input changed at ${i}`);
      }
    }
  }
  return {
    read: (s: string | Uint8Array) => convert(h.run, s),
    write: (s: string | Uint8Array) => convert(t.run, s),
    direct: (s: string) => convert(h.encode, s),
    rawRead: h.run,
    rawWrite: t.run,
    check() {
      equal(toHex(memory.subarray(196608)), toHex(table));
    },
  };
}

Deno.test("Hex/text: documented bytes, empty input, separators and exact final newlines", async () => {
  const p = await pair();
  const hello = "Hello, 世界!";
  equal(
    p.read(frame("48 65 6c 6c 6f 2c 20 e4 b8 96 e7 95 8c 21", "hex")),
    frame(hello),
  );
  equal(p.write(frame(hello)), frame(hex(enc.encode(hello)), "hex"));
  for (
    const s of [
      "",
      "hello",
      "hello\n",
      "\n",
      "\n\n",
      "\r",
      "\r\n",
      "\t  ",
      "\0",
      "\ufeff",
    ]
  ) {
    const h = frame(hex(enc.encode(s)), "hex");
    equal(p.write(frame(s)), h);
    equal(p.direct(frame(s)), h);
    equal(p.read(h), frame(s));
  }
  equal(p.read("```hex\n```"), frame(""));
  equal(p.write("```text\n```"), frame("", "hex"));
  for (
    const h of ["48656C6c6F", "48\t65\r6C\n6c 6F", " \t48 65 6c 6c 6f\r\n "]
  ) {
    equal(p.read(frame(h, "hex")), frame("Hello"));
  }
  for (const n of [15, 16, 17, 31, 32, 33]) {
    equal(
      p.write(frame("a".repeat(n))),
      frame(hex(enc.encode("a".repeat(n))), "hex"),
    );
  }
  p.check();
});

Deno.test("Hex/text: 1000 Unicode byte round trips retain normalization, BOM and controls", async () => {
  const p = await pair();
  let seed = 0x55ec7821;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const special = [
    "\0",
    "\ufeff",
    "é",
    "e\u0301",
    "\r\n",
    "\n",
    "`",
    "`````",
    "<img src='https://bytes.invalid/x'>",
    "\t",
    " ",
  ];
  for (let i = 0; i < 1000; i++) {
    let s = "";
    const length = random() % 150;
    for (let j = 0; j < length; j++) {
      let cp = random() % 0x110000;
      if (cp >= 0xd800 && cp <= 0xdfff) cp = 0x20;
      s += random() % 4
        ? String.fromCodePoint(cp)
        : special[random() % special.length];
    }
    const expectedHex = frame(hex(enc.encode(s)), "hex");
    equal(p.write(frame(s)), expectedHex);
    equal(p.read(expectedHex), frame(s));
    equal(p.read(frame(hex(enc.encode(s)).toUpperCase(), "hex", 5)), frame(s));
  }
  p.check();
});

Deno.test("Hex decoder: all single/two-byte inputs agree with fatal UTF-8 decoding", async () => {
  const p = await pair();
  let valid = 0, invalid = 0;
  function test(bytes: Uint8Array) {
    const source = frame(hex(bytes), "hex");
    let text: string;
    try {
      text = dec.decode(bytes);
    } catch {
      traps(() => p.read(source));
      invalid++;
      return;
    }
    equal(p.read(source), frame(text));
    valid++;
  }
  for (let i = 0; i < 256; i++) test(Uint8Array.of(i));
  for (let i = 0; i < 65536; i++) test(Uint8Array.of(i >>> 8, i & 255));
  for (
    const bytes of [
      [0xe0, 0x9f, 0xbf],
      [0xe0, 0xa0, 0x80],
      [0xed, 0x9f, 0xbf],
      [0xed, 0xa0, 0x80],
      [0xef, 0xbb, 0xbf],
      [0xf0, 0x8f, 0xbf, 0xbf],
      [0xf0, 0x90, 0x80, 0x80],
      [0xf4, 0x8f, 0xbf, 0xbf],
      [0xf4, 0x90, 0x80, 0x80],
      [0xf5, 0x80, 0x80, 0x80],
      [0xe2, 0x82],
      [0xf0, 0x9f, 0x98],
      [0xe2, 0x28, 0xa1],
    ]
  ) test(Uint8Array.from(bytes));
  equal(valid > 16000 && invalid > 40000, true);
  p.check();
});

Deno.test("Hex syntax: no partial bytes, non-ASCII lookalikes, offsets or ignored junk", async () => {
  const p = await pair();
  for (
    const body of [
      "0",
      "abc",
      "a b",
      "6\n1",
      "6\t1",
      "6\r1",
      "0x61",
      "61,62",
      "-1",
      "+1",
      "0000: 61",
      "61 |a|",
      "61 #comment",
      "６１",
      "61\u00a062",
      "61\f62",
      "61\v62",
      "gg",
      "61\0",
    ]
  ) {
    traps(() => p.read(frame(body, "hex")));
    equal(p.read(frame("61", "hex")), frame("a"));
  }
  for (let byte = 0; byte < 256; byte++) {
    if (/[0-9a-f]/i.test(String.fromCharCode(byte))) continue;
    const s = enc.encode(frame("00", "hex"));
    s[7] = byte;
    traps(() => p.read(s));
  }
  for (const run of [p.read, p.write]) {
    for (const source of [Uint8Array.of(0xff), Uint8Array.of(0xc0, 0xaf)]) {
      traps(() => run(source));
    }
  }
  p.check();
});

Deno.test("Text fences: first close, indentation, CR boundaries and decoded ticks stay literal", async () => {
  const p = await pair();
  for (
    const [source, text] of [
      ["```text\r\nhello\n```\r\n", "hello"],
      ["```text\nhello\r\n```\n", "hello\r"],
      ["````text\n```\n  ````` \t\n\t \r\n", "```"],
      ["```text\n```more\n```", "```more"],
      ["```text\n    ```\n```", "    ```"],
      ["```text\na\rb\n```", "a\rb"],
    ]
  ) equal(p.write(source), frame(hex(enc.encode(text)), "hex"));
  for (
    const source of [
      "```text",
      "```text\r",
      "```text\nhello",
      "```text\nhello```",
      "```text\nhello\r```",
      "```text\n```\nnot whitespace\n```",
      "```text\nabc\n ```\n```",
      "```text\na\r```\nb\n```",
      "````text\na\n```",
      "```TEXT\na\n```",
      " ```text\na\n```",
      "~~~text\na\n~~~",
      "```text more\na\n```",
    ]
  ) traps(() => p.write(source));
  const parser = new Parser();
  for (
    const text of [
      "```",
      "   ```\t",
      "a\r```\nb",
      "````\n<script>bad()</script>",
      "<img src='https://bytes.invalid/x'>",
    ]
  ) {
    const output = p.read(frame(hex(enc.encode(text)), "hex"));
    const ast = parser.parse(output);
    equal(ast.firstChild?.type, "code_block");
    equal(ast.firstChild?.info, "text");
    equal(ast.firstChild?.next, null);
    equal(
      ast.firstChild?.literal,
      text.replaceAll("\r\n", "\n").replaceAll("\r", "\n") + "\n",
    );
    equal(p.write(output), frame(hex(enc.encode(text)), "hex"));
  }
  p.check();
});

Deno.test("Hex/text memory: exact input/output bounds, read-only tables and trap recovery", async () => {
  const p = await pair();
  const source = frame("61" + " ".repeat(65536 - 14), "hex");
  equal(enc.encode(source).length, 65536);
  equal(p.read(source), frame("a"));
  const text = "a".repeat(43687);
  const result = p.write(frame(text));
  equal(enc.encode(result).length, 131072);
  equal(result, frame(hex(enc.encode(text)), "hex"));
  traps(() => p.write(frame(text + "a")));
  // Fits the input page, but emitting the unframed hex body already overflows.
  const large = frame("a".repeat(65523));
  equal(enc.encode(large).length, 65536);
  traps(() => p.write(large));
  // Maximum compact hex source: decode expansion is still bounded when all
  // resulting bytes are ticks and both enclosing fences need to grow.
  const ticks = "`".repeat(32762);
  const fullHex = frame("60".repeat(32762), "hex");
  equal(enc.encode(fullHex).length, 65536);
  equal(p.read(fullHex), frame(ticks));
  for (const n of [-1, 65537, 262144, 0x7fffffff]) {
    traps(() => p.rawRead(n));
    traps(() => p.rawWrite(n));
  }
  equal(p.read(frame("00efbbbf", "hex")), frame("\0\ufeff"));
  equal(
    p.write(frame("after error")),
    frame(hex(enc.encode("after error")), "hex"),
  );
  p.check();
});
