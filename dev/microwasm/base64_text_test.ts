import { Parser } from "npm:commonmark@0.31.2";
import { assemble, toHex } from "./microwasm.ts";

const enc = new TextEncoder(),
  dec = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
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
function frame(text: string, label = "text") {
  const ticks = "`".repeat(
    Math.max(3, ...Array.from(text.matchAll(/`+/g), (r) => r[0].length + 1)),
  );
  return ticks + label + "\n" + text + "\n" + ticks + "\n";
}
function b64(bytes: Uint8Array) {
  let s = "";
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s);
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
      ["b", "transforms/46-base64-to-text"],
      ["t", "transforms/47-text-to-base64"],
    ]
  ) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    modules[name] =
      (await WebAssembly.instantiate(built.bytes, modules)).instance.exports;
  }
  const b = modules.b as unknown as Exports,
    t = modules.t as unknown as Exports;
  const memory = new Uint8Array(b.memory.buffer),
    constants = memory.slice(196608);
  equal(b.memory === t.memory, true);
  function convert(f: (n: number) => number, s: string | Uint8Array) {
    const source = typeof s === "string" ? enc.encode(s) : s;
    if (source.length > 65536) throw Error("Test input exceeds page");
    memory.set(source);
    try {
      const n = f(source.length);
      equal(n >= 0 && n <= 131072, true);
      return dec.decode(memory.subarray(65536, 65536 + n));
    } finally {
      for (let i = 0; i < source.length; i++) {
        if (source[i] !== memory[i]) throw Error(`Input changed at ${i}`);
      }
    }
  }
  return {
    read: (s: string | Uint8Array) => convert(b.run, s),
    write: (s: string | Uint8Array) => convert(t.run, s),
    direct: (s: string) => convert(b.encode, s),
    rawRead: b.run,
    rawWrite: t.run,
    check() {
      equal(toHex(memory.subarray(196608)), toHex(constants));
    },
  };
}

Deno.test("Base64/text: RFC vectors, all padding lengths, whitespace and byte preservation", async () => {
  const p = await pair();
  for (
    const [text, encoded] of [
      ["", ""],
      ["f", "Zg=="],
      ["fo", "Zm8="],
      ["foo", "Zm9v"],
      ["foob", "Zm9vYg=="],
      ["fooba", "Zm9vYmE="],
      ["foobar", "Zm9vYmFy"],
      ["Hello, world!", "SGVsbG8sIHdvcmxkIQ=="],
    ]
  ) {
    equal(p.read(frame(encoded, "base64")), frame(text));
    equal(p.write(frame(text)), frame(encoded, "base64"));
    equal(p.direct(frame(text)), frame(encoded, "base64"));
    equal(
      p.read(frame(encoded.split("").join(" \t\r\n"), "base64")),
      frame(text),
    );
  }
  for (
    const text of [
      "\0",
      "\ufeff",
      "\ufeff\ufeff",
      "\r",
      "\r\n",
      "\n",
      "f\n",
      "f\n\n",
      "é",
      "e\u0301",
      "雪😀",
      "\t  ",
    ]
  ) {
    const encoded = frame(b64(enc.encode(text)), "base64");
    equal(p.write(frame(text)), encoded);
    equal(p.read(encoded), frame(text));
  }
  equal(p.read("```base64\n```"), frame(""));
  equal(p.write("```text\n```"), frame("", "base64"));
  p.check();
});

Deno.test("Base64 pair: 1500 generated UTF-8 sources agree with the independent browser codec", async () => {
  const p = await pair();
  let seed = 0x1960fbaa;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const specials = [
    "\0",
    "`",
    "```",
    "\r\n",
    "\ufeff",
    "\n",
    "é",
    "e\u0301",
    "<img src='https://base64.invalid/x'>",
  ];
  for (let i = 0; i < 1500; i++) {
    let text = "";
    const length = random() % 200;
    for (let j = 0; j < length; j++) {
      let cp = random() % 0x110000;
      if (cp >= 0xd800 && cp <= 0xdfff) cp = 0x20;
      text += random() % 3
        ? String.fromCodePoint(cp)
        : specials[random() % specials.length];
    }
    const encoded = b64(enc.encode(text));
    const output = p.write(frame(text));
    equal(output, frame(encoded, "base64"));
    equal(p.read(output), frame(text));
    equal(
      p.read(frame(encoded.replace(/.{1,17}/g, "$&\r\n"), "base64")),
      frame(text),
    );
  }
  p.check();
});

Deno.test("Base64 syntax: reject all nonzero pad bits, missing padding and trailing groups", async () => {
  const p = await pair();
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let a = 0; a < 128; a++) {
    const good = b64(Uint8Array.of(a));
    const digit = alphabet.indexOf(good[1]);
    for (let bits = 1; bits < 16; bits++) {
      traps(() =>
        p.read(frame(good[0] + alphabet[digit | bits] + "==", "base64"))
      );
    }
  }
  for (let a = 0; a < 128; a++) {
    for (let b = 0; b < 128; b++) {
      const good = b64(Uint8Array.of(a, b)), digit = alphabet.indexOf(good[2]);
      for (let bits = 1; bits < 4; bits++) {
        traps(() =>
          p.read(
            frame(good.slice(0, 2) + alphabet[digit | bits] + "=", "base64"),
          )
        );
      }
    }
  }
  for (
    const s of [
      "Z",
      "Zg",
      "Zg=",
      "Zm8",
      "=g==",
      "Z===",
      "====",
      "Zg===",
      "Zg==Zg==",
      "Zm8=AAAA",
      "Zm9v=",
      "Zg==x",
      "Zg==\0",
      "Zg==\f",
      "Zg==\v",
      "Zg==\u00a0",
      "_w==",
      "-w==",
      "data:text/plain;base64,Zg==",
      "Zg==#",
      "Ｚg==",
    ]
  ) {
    traps(() => p.read(frame(s, "base64")));
  }
  equal(p.read(frame(" Z g = = \t\r\n", "base64")), frame("f"));
  p.check();
});

Deno.test("Base64 decoding: all one/two-byte inputs preserve or reject UTF-8, never repair it", async () => {
  const p = await pair();
  function test(bytes: Uint8Array) {
    const source = frame(b64(bytes), "base64");
    let text: string;
    try {
      text = dec.decode(bytes);
    } catch {
      traps(() => p.read(source));
      return;
    }
    equal(p.read(source), frame(text));
    equal(p.write(frame(text)), source);
  }
  for (let i = 0; i < 256; i++) test(Uint8Array.of(i));
  for (let i = 0; i < 65536; i++) test(Uint8Array.of(i >>> 8, i & 255));
  for (
    const bytes of [
      [0xc0, 0xaf],
      [0xed, 0xa0, 0x80],
      [0xe0, 0x9f, 0xbf],
      [0xf4, 0x90, 0x80, 0x80],
      [0xf4, 0x8f, 0xbf, 0xbf],
      [0xe2, 0x82],
      [0xf0, 0x9f, 0x98],
    ]
  ) test(Uint8Array.from(bytes));
  p.check();
});

Deno.test("Base64 fences: decoded delimiters stay inert, malformed edits recover", async () => {
  const p = await pair(), parser = new Parser();
  for (
    const text of [
      "```",
      "\n   ````\t",
      "x\r```\ny",
      "<script>alert(1)</script>",
      "<img src='https://base64.invalid/x'>",
    ]
  ) {
    const output = p.read(frame(b64(enc.encode(text)), "base64"));
    const ast = parser.parse(output);
    equal(ast.firstChild?.type, "code_block");
    equal(ast.firstChild?.info, "text");
    equal(ast.firstChild?.next, null);
    equal(
      ast.firstChild?.literal,
      text.replaceAll("\r\n", "\n").replaceAll("\r", "\n") + "\n",
    );
  }
  for (
    const source of [
      "```base64\nZg==\n```\nextra",
      "```base64\n```\nZg==\n```",
      "```base64\nZg==",
      "```Base64\nZg==\n```",
      "```text\nZg==\n```",
      "```base64\nZg==\r```",
      "```base64url\nZg==\n```",
    ]
  ) {
    traps(() => p.read(source));
  }
  const badText = enc.encode(frame("x"));
  badText[8] = 0xff;
  traps(() => p.write(badText));
  equal(
    p.write(frame("recovered")),
    frame(b64(enc.encode("recovered")), "base64"),
  );
  p.check();
});

Deno.test("Base64 memory: maximum source, exact framed-output cap and table isolation", async () => {
  const p = await pair();
  const full = frame("YQ==" + " ".repeat(65536 - 19), "base64");
  equal(enc.encode(full).length, 65536);
  equal(p.read(full), frame("a"));
  const text = "a".repeat(65523);
  equal(enc.encode(frame(text)).length, 65536);
  equal(p.write(frame(text)), frame(b64(enc.encode(text)), "base64"));
  const exact = "`".repeat(43687) + "xx";
  const output = p.read(frame(b64(enc.encode(exact)), "base64"));
  equal(enc.encode(output).length, 131072);
  equal(output, frame(exact));
  traps(() => p.read(frame(b64(enc.encode(exact + "x")), "base64")));
  for (const n of [-1, 65537, 262144, 0x7fffffff]) {
    traps(() => p.rawRead(n));
    traps(() => p.rawWrite(n));
  }
  equal(p.read(frame("AA==", "base64")), frame("\0"));
  p.check();
});
