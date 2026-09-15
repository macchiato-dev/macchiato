import { assemble, toHex } from "./microwasm.ts";

const enc = new TextEncoder();
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
      ["k", "transforms/00-json-string-keys"],
      ["p", "transforms/00-json-pointer"],
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
    pointer(a: number, b: number): void;
    descendant(a: number, b: number, c: number, d: number): number;
  };
  const memory = new Uint8Array(p.memory.buffer);
  const put = (s: string | Uint8Array, at = 0) => {
    const b = typeof s === "string" ? enc.encode(s) : s;
    memory.set(b, at);
    return at + b.length;
  };
  return { ...p, memory, put };
}
function quoted(s: string, escaped = false) {
  if (!escaped) return JSON.stringify(s);
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    out += "\\u" + s.charCodeAt(i).toString(16).padStart(4, "0");
  }
  return out + '"';
}
function tokens(pointer: string) {
  return pointer === ""
    ? []
    : pointer.slice(1).split("/").map((s) =>
      s.replaceAll("~1", "/").replaceAll("~0", "~")
    );
}
function below(from: string, path: string) {
  const a = tokens(from), b = tokens(path);
  return a.length < b.length && a.every((s, i) => s === b[i]);
}

Deno.test("JSON pointers: root, empty tokens, escaping and token-boundary descendants", async () => {
  const p = await helper();
  const cases: [string, string, boolean][] = [
    ["", "", false],
    ["", "/a", true],
    ["/a", "", false],
    ["/a", "/a/b", true],
    ["/a", "/ab", false],
    ["/a", "/a~1b", false],
    ["/a~1b", "/a~1b/c", true],
    ["/a~01", "/a~1/c", false],
    ["/", "//x", true],
    ["/", "/x", false],
    ["/a", "/a", false],
    ["/a/", "/a//", true],
    ["/a", "/a/", true],
    ["/雪😀", "/雪😀/x", true],
    ["/é", "/e\u0301/x", false],
    ["/\ud800", "/\ud800/x", true],
    ["/a\0", "/a\0/b", true],
    ["/01", "/01/-", true],
    ["/-", "/-/00", true],
  ];
  for (const [from, path, expected] of cases) {
    equal(below(from, path), expected);
    for (const aEscape of [false, true]) {
      for (const bEscape of [false, true]) {
        const aEnd = p.put(quoted(from, aEscape));
        const bEnd = p.put(quoted(path, bEscape), aEnd);
        const before = p.memory.slice();
        p.pointer(0, aEnd);
        p.pointer(aEnd, bEnd);
        equal(p.descendant(0, aEnd, aEnd, bEnd), +expected);
        equal(toHex(p.memory), toHex(before));
      }
    }
  }
});

Deno.test("JSON pointers: generated token arrays and independent decoded-token comparison", async () => {
  const p = await helper();
  let state = 0x733098ab;
  const random = () => state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  const alphabet = [
    "",
    "a",
    "ab",
    "/",
    "~",
    "~1",
    "~0/",
    "雪",
    "😀",
    "\udfff",
    "\0",
    "01",
    "-",
  ];
  const make = () =>
    Array.from(
      { length: random() % 6 },
      () => alphabet[random() % alphabet.length],
    );
  const pointer = (parts: string[]) =>
    parts.map((s) => "/" + s.replaceAll("~", "~0").replaceAll("/", "~1")).join(
      "",
    );
  for (let i = 0; i < 3000; i++) {
    const a = make();
    const b = i % 3 === 0
      ? a.concat(make())
      : i % 3 === 1
      ? a.slice(0, random() % (a.length + 1))
      : make();
    const from = pointer(a), path = pointer(b);
    const end = p.put(quoted(from, i % 2 === 0));
    const other = p.put(quoted(path, i % 5 === 0), end);
    equal(p.descendant(0, end, end, other), +below(from, path));
  }
});

Deno.test("JSON pointers: all UTF-16 units and malformed JSON/tilde escapes", async () => {
  const p = await helper();
  for (let unit = 0; unit <= 65535; unit++) {
    const token = String.fromCharCode(unit).replaceAll("~", "~0").replaceAll(
      "/",
      "~1",
    );
    const end = p.put(quoted("/" + token));
    const other = p.put(quoted("/" + token + "/child", true), end);
    equal(p.descendant(0, end, end, other), 1);
  }
  for (
    const source of [
      "",
      '"',
      "null",
      "[]",
      '"a"',
      '"#/a"',
      '" /a"',
      '"~1a"',
      '"/~"',
      '"/~2"',
      '"/~~0"',
      '"/a~01~"',
      '"/\\u007e2"',
      '"/\\q"',
      '"/\\u"',
      '"/\\u0"',
      '"/\\u000"',
      '"/\\u0xxx"',
      '"/a\nb"',
      '"/a\0b"',
      '"/a""b"',
      '"/a" true',
      '"/a\\"',
    ]
  ) {
    const end = p.put(source), validEnd = p.put('"/different"', end);
    const before = p.memory.slice();
    traps(() => p.pointer(0, end));
    traps(() => p.descendant(0, end, end, validEnd));
    traps(() => p.descendant(end, validEnd, 0, end));
    equal(toHex(p.memory), toHex(before));
    p.pointer(end, validEnd);
  }
  // Tilde handling agrees with the grammar, independently of JSON spelling.
  for (const a of ["", "~", "~0", "~1", "~2", "~~", "/"]) {
    for (const b of ["", "0", "1", "~", "~0", "~1", "/"]) {
      const value = "/" + a + b;
      const end = p.put(quoted(value, true));
      if (/~(?![01])/.test(value)) traps(() => p.pointer(0, end));
      else p.pointer(0, end);
    }
  }
});

Deno.test("JSON pointers: strict raw UTF-8, not replacement text", async () => {
  const p = await helper();
  const fatal = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  for (
    const bytes of [
      [0x80],
      [0xc0, 0xaf],
      [0xe0, 0x80, 0xaf],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0xf0, 0x9f, 0x98],
      [0xff],
      [0xc2, 0xa0],
      [0xe2, 0x82, 0xac],
      [0xf0, 0x9f, 0x98, 0x80],
    ]
  ) {
    const raw = new Uint8Array([34, 47, ...bytes, 34]);
    const end = p.put(raw);
    let valid = true;
    try {
      fatal.decode(raw);
    } catch {
      valid = false;
    }
    if (valid) p.pointer(0, end);
    else traps(() => p.pointer(0, end));
  }
});

Deno.test("JSON pointers: memory boundaries, full spans and read-only trap recovery", async () => {
  const p = await helper();
  for (const at of [0, 1, 65535, 196608, 262142]) {
    const end = p.put('""', at);
    p.pointer(at, end);
    equal(p.descendant(at, end, at, end), 0);
  }
  for (
    const [a, b] of [[0, 0], [0, 1], [1, 0], [-1, 1], [0, -1], [0, 262145], [
      262144,
      262144,
    ], [0x7fffffff, 0x7fffffff]]
  ) {
    traps(() => p.pointer(a, b));
  }
  const full = '"/' + "a".repeat(262141) + '"';
  equal(p.put(full), 262144);
  const before = p.memory.slice();
  p.pointer(0, 262144);
  equal(p.descendant(0, 262144, 0, 262144), 0);
  equal(toHex(p.memory), toHex(before));
  p.put('""');
  const end = p.put('"/' + "a".repeat(262139) + '"', 2);
  equal(end, 262144);
  equal(p.descendant(0, 2, 2, end), 1);
  const badEnd = p.put('"/a~"');
  traps(() => p.pointer(0, badEnd));
  const goodEnd = p.put('"/a~0/b"');
  p.pointer(0, goodEnd);
});
