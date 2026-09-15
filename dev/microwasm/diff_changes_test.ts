import { applyPatch, createTwoFilesPatch, parsePatch } from "npm:diff@8.0.2";
import { Parser } from "npm:commonmark@0.31.2";
import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder(),
  decoder = new TextDecoder("utf-8", { fatal: true });
const marker = "\\ No newline at end of file\n";
const header = "--- a/example\n+++ b/example\n";
const basic = header + "@@ -1 +1 @@\n-old\n+new\n";
function fence(body: string, ticks?: number) {
  if (ticks === undefined) {
    ticks = 3;
    for (const m of body.matchAll(/`+/g)) {
      ticks = Math.max(ticks, m[0].length + 1);
    }
  }
  const f = "`".repeat(ticks);
  return f + "diff\n" + body + (body && !body.endsWith("\n") ? "\n" : "") + f +
    "\n";
}
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      JSON.stringify(a)?.slice(0, 2000) + " != " +
        JSON.stringify(b)?.slice(0, 2000),
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
// Test-only reconstruction: proves the reader has retained the complete patch.
// Tool 43 will implement the reverse transformation in handwritten Wasm.
function restore(records: string) {
  return records.split("\n").filter(Boolean).map((line) => {
    const m = /^- (\S+)(?: (.*))?$/.exec(line);
    if (!m) throw Error("Bad record: " + line);
    const [, kind, data] = m;
    if (kind === "no-newline") {
      equal(data, undefined);
      return marker;
    }
    if (kind === "file") {
      const fields = data.match(/"(?:[^"\\]|\\.)*"/g)!;
      equal(fields.length, 2);
      return "--- " + JSON.parse(fields[0]) + "\n+++ " + JSON.parse(fields[1]) +
        "\n";
    }
    if (kind === "hunk") {
      const fields = /^(-\d+(?:,\d+)?) (\+\d+(?:,\d+)?) (".*")$/.exec(data)!;
      if (!fields) throw Error("Bad hunk record");
      return `@@ ${fields[1]} ${fields[2]} @@${JSON.parse(fields[3])}\n`;
    }
    const prefix = ({ meta: "", context: " ", add: "+", remove: "-" } as Record<
      string,
      string
    >)[kind];
    if (prefix === undefined) throw Error("Unknown record: " + kind);
    return prefix + JSON.parse(data) + "\n";
  }).join("");
}
async function reader() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["c", "transforms/00-calendar-lines"],
      ["r", "transforms/38-srt-to-cues"],
      ["p", "transforms/00-patch-lines"],
      ["w", "transforms/42-diff-to-changes"],
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(a.resolved).bytes), toHex(a.bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const w = imports.w as unknown as {
    memory: WebAssembly.Memory;
    run(n: number): number;
    validate(start: number, end: number): void;
  };
  const memory = new Uint8Array(w.memory.buffer),
    constants = memory.slice(196608);
  function convert(source: string | Uint8Array) {
    const input = typeof source === "string" ? encoder.encode(source) : source;
    if (input.length > 65536) throw Error("Test input exceeds page");
    memory.set(input);
    try {
      const n = w.run(input.length);
      equal(n <= 131072, true);
      return decoder.decode(memory.subarray(65536, 65536 + n));
    } finally {
      equal(toHex(memory.subarray(0, input.length)), toHex(input));
      equal(toHex(memory.subarray(196608)), toHex(constants));
    }
  }
  return { convert, memory, run: w.run, validate: w.validate };
}

Deno.test("Diff reader: documented file/hunk/change records and preserved metadata", async () => {
  const r = await reader();
  const doc = await Deno.readTextFile(
    new URL("transforms/42-diff-to-changes.md", import.meta.url),
  );
  equal(
    r.convert(doc.match(/```diff[\s\S]*?```/)![0]),
    doc.match(/```text\n([\s\S]*?)```/)![1],
  );
  for (
    const body of [
      "",
      "\n",
      "Index: file\n=======\n",
      header,
      basic,
      "diff --git a/old b/new\nsimilarity index 100%\nrename from old\nrename to new\n",
      '--- "old name"\t2026-01-01\n+++ "new name"\t2026-01-02\n@@ -0001,01 +01 @@ function name\n-old\n+new\n',
      basic + "diff --git a/other b/other\nindex 1111111..2222222 100644\n" +
      basic,
      header + "@@ -1 +1 @@\n--- looks like a header\n+++ also content\n",
      header + "@@ -0,0 +1,2 @@\n+first\n+second\n",
      header + "@@ -1,2 +0,0 @@\n-first\n-second\n",
      header + "@@ -1 +1 @@\n \n@@ -10,0 +11 @@\n+x\n",
    ]
  ) {
    equal(restore(r.convert(fence(body))), body);
  }
});

Deno.test("Diff reader: 400 jsdiff patches reconstruct byte-for-byte and apply to their targets", async () => {
  const r = await reader();
  let seed = 341;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const words = [
    "",
    "one",
    "two",
    "雪 😀",
    "--- header?",
    "+++ header?",
    "@@ hunk?",
    "`ticks`",
    "<a href='https://diff.invalid'>link</a>",
    "\tindent",
    "\0zero",
    'a "quote" \\path',
  ];
  for (let trial = 0; trial < 400; trial++) {
    const oldLines = Array.from(
      { length: random() % 40 },
      () => words[random() % words.length],
    );
    const newLines = oldLines.slice();
    for (let i = 0, n = 1 + random() % 7; i < n; i++) {
      newLines.splice(
        random() % (newLines.length + 1),
        random() % 3,
        words[random() % words.length],
      );
    }
    const nl = trial % 3 ? "\n" : "\r\n";
    const old = oldLines.join(nl) + (oldLines.length && trial % 2 ? nl : "");
    const next = newLines.join(nl) + (newLines.length && trial % 4 ? nl : "");
    const patch = createTwoFilesPatch(
      "a/example",
      "b/example",
      old,
      next,
      "before",
      "after",
      { context: trial % 7 },
    );
    let records: string;
    try {
      records = r.convert(fence(patch));
    } catch (e) {
      throw Error(`Trial ${trial}: ${JSON.stringify(patch)}`, { cause: e });
    }
    const rebuilt = restore(records);
    equal(rebuilt, patch);
    equal(parsePatch(rebuilt), parsePatch(patch));
    equal(applyPatch(old, rebuilt, { autoConvertLineEndings: false }), next);
  }
});

Deno.test("Diff reader: incomplete line ownership, counter exhaustion and file resets", async () => {
  const r = await reader();
  for (
    const body of [
      header + "@@ -1 +1 @@\n-old\n" + marker + "+new\n" + marker,
      header + "@@ -1 +1,2 @@\n-old\n" + marker + "+new\n+more\n",
      header + "@@ -1,2 +1 @@\n-old\n-other\n+new\n" + marker,
      header + "@@ -1 +1 @@\n same\n" + marker,
    ]
  ) {
    equal(restore(r.convert(fence(body))), body);
    equal(restore(r.convert(fence(body + basic))), body + basic);
  }
  const invalid = [
    marker,
    header + marker,
    basic + marker + marker,
    header + "@@ -1,2 +0,0 @@\n-old\n" + marker + "-more\n",
    header + "@@ -0,0 +1,2 @@\n+new\n" + marker + "+more\n",
    header + "@@ -1,2 +1 @@\n same\n" + marker + "-more\n",
    header + "@@ -1 +1 @@\n same\n" + marker + "@@ -2 +2 @@\n next\n",
    header + "@@ -0,0 +1 @@\n+new\n" + marker + "@@ -0,0 +2 @@\n+more\n",
    basic + "\\ localized or misspelled marker\n",
  ];
  for (const body of invalid) {
    traps(() => r.convert(fence(body)));
    equal(restore(r.convert(fence(basic))), basic);
  }
});

Deno.test("Diff reader: malformed file/hunk structure and count mismatch cannot become metadata", async () => {
  const r = await reader();
  for (
    const body of [
      "--- a\n",
      "--- \n+++ b\n",
      "--- a\n+++ \n",
      "+++ orphan\n",
      "-orphan\n",
      " context outside\n",
      "@@ -1 +1 @@\n-old\n+new\n",
      header + "@@@ -1 -1 +1 @@@\n-old\n+new\n",
      header + "@@ -1 +1 @@\n-old\n",
      header + "@@ -1 +1 @@\n+new\n",
      basic + "+extra\n",
      basic + "-extra\n",
      basic + " extra\n",
      header + "@@ -2,3 +2,4 @@\n-old\n+new\nmetadata\n",
      header + "@@ -2,0 +2 @@\n unchanged\n",
      header + "@@ -1 +1 @@\n\n-old\n+new\n",
      "GIT binary patch\nliteral 10\nencoded\n",
      header + "@@ -0 +1 @@\n-old\n+new\n",
      header + "@@ -1,65537 +0,0 @@\n",
      basic + "metadata\n@@ -2 +2 @@\n-a\n+b\n",
      header + "@@ -1, +1 @@\n-old\n+new\n",
      header + "@@ -1+1 @@\n-old\n+new\n",
      header + "@@ -1 +1 @\n-old\n+new\n",
    ]
  ) {
    try {
      traps(() => r.convert(fence(body)));
    } catch (e) {
      throw Error(JSON.stringify(body), { cause: e });
    }
    equal(restore(r.convert(fence(basic))), basic);
  }
  const large = header + "@@ -" + "9".repeat(1000) + " +" + "8".repeat(1000) +
    " @@\n-a\n+b\n";
  equal(restore(r.convert(fence(large))), large);
});

Deno.test("Diff reader: control bytes, UTF-8 and Markdown fence boundaries", async () => {
  const r = await reader();
  const controls = Array.from({ length: 32 }, (_, i) => i).filter((i) =>
    i !== 10
  ).map((i) => String.fromCharCode(i)).join("");
  const body = header + "@@ -1 +1 @@\n-" + controls + "\n+雪 😀\t\r\n";
  equal(restore(r.convert(fence(body))), body);
  for (
    const text of ["```", "````", "`inline`", "<script>bad()</script>", "  ```"]
  ) {
    const patch = header + "@@ -1 +1 @@\n " + text + "\n";
    const fenced = fence(patch);
    equal(restore(r.convert(fenced)), patch);
    const ast = new Parser().parse(fenced);
    equal(ast.firstChild?.literal, patch);
    equal(ast.firstChild?.next, null);
    if (/^ *`+$/.test(text)) traps(() => r.convert(fence(patch, 3)));
  }
  for (
    const invalid of [
      fence(basic).replace("diff", "patch"),
      " " + fence(basic),
      "```diff\nbody```",
      "```diff\n```\n" + basic + "```\n",
      "```diff\r\n" + basic + "```\n",
    ]
  ) {
    traps(() => r.convert(invalid));
  }
  for (
    const bad of [[0xc0, 0x80], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [
      0x80,
    ]]
  ) {
    const prefix = encoder.encode("```diff\n" + header + "@@ -0,0 +1 @@\n+");
    traps(() =>
      r.convert(
        new Uint8Array([...prefix, ...bad, ...encoder.encode("\n```\n")]),
      )
    );
    equal(restore(r.convert(fence(basic))), basic);
  }
});

Deno.test("Diff reader: source/output capacity, read-only constants and recovery", async () => {
  const r = await reader();
  const base = header + "@@ -0,0 +1 @@\n+\n";
  const room = 65536 - encoder.encode(fence(base)).length;
  const full = base.replace("+\n", "+" + "x".repeat(room) + "\n");
  equal(encoder.encode(fence(full)).length, 65536);
  equal(restore(r.convert(fence(full))), full);
  const many = header + "@@ -0,0 +1,16000 @@\n" + "+\n".repeat(16000);
  traps(() => r.convert(fence(many)));
  const contextBase = header + "@@ -1,10000 +1,10000 @@\n" +
    " \n".repeat(10000);
  const outputRoom = 131072 -
    encoder.encode(r.convert(fence(contextBase))).length;
  const exact = contextBase.replace(" \n", " " + "x".repeat(outputRoom) + "\n");
  equal(encoder.encode(r.convert(fence(exact))).length, 131072);
  traps(() => r.convert(fence(exact.replace("x", "xx"))));
  for (const n of [-1, 65537, 262144, 0x7fffffff]) traps(() => r.run(n));
  equal(restore(r.convert(fence(basic))), basic);
});

Deno.test("Diff reader: single-byte edits cannot silently discard accepted patch content", async () => {
  const r = await reader();
  const patch = "diff --git a/file b/file\n" + header +
    "@@ -1,2 +1,2 @@ section\n same\n-old\n+new\n" + marker;
  let accepted = 0, rejected = 0;
  for (let i = 0; i < patch.length; i++) {
    for (const char of ["-", "+", "@", " ", "0", "9", "\n", "\\", "x"]) {
      const edited = patch.slice(0, i) + char + patch.slice(i + 1);
      let records: string;
      try {
        records = r.convert(fence(edited));
      } catch (e) {
        if (!(e instanceof WebAssembly.RuntimeError)) throw e;
        rejected++;
        continue;
      }
      equal(restore(records), edited.endsWith("\n") ? edited : edited + "\n");
      accepted++;
    }
  }
  equal(accepted > 100 && rejected > 100, true);
  equal(
    restore(r.convert(fence("GIT binary patches are different\n"))),
    "GIT binary patches are different\n",
  );
  equal(restore(r.convert(fence(basic))), basic);
});

Deno.test("Diff validation: bare output spans are read-only and independent of Markdown output size", async () => {
  const r = await reader();
  const valid = [
    basic,
    "",
    header,
    basic + marker,
    header + "@@ -0,0 +1,38000 @@\n" + "+\n".repeat(38000),
  ];
  for (const patch of valid) {
    const bytes = encoder.encode(patch);
    for (const start of [0, 65535, 196608 - bytes.length]) {
      r.memory.set(bytes, start);
      const before = r.memory.slice();
      r.validate(start, start + bytes.length);
      equal(toHex(r.memory), toHex(before));
    }
    equal(restore(r.convert(fence(basic))), basic);
  }
  for (
    const patch of [
      header + "@@ -1 +1 @@\n-old\n",
      basic + marker + marker,
      "GIT binary patch\n",
      "@@@ -1 -1 +1 @@@\n",
    ]
  ) {
    const bytes = encoder.encode(patch), start = 65536;
    r.memory.set(bytes, start);
    const before = r.memory.slice();
    traps(() => r.validate(start, start + bytes.length));
    equal(toHex(r.memory), toHex(before));
    equal(restore(r.convert(fence(basic))), basic);
  }
  for (const [a, b] of [[-1, 0], [1, 0], [0, 196609], [196609, 196609]]) {
    const before = r.memory.slice();
    traps(() => r.validate(a, b));
    equal(toHex(r.memory), toHex(before));
  }
  const badUtf8 = new Uint8Array([43, 0xc0, 0x80, 10]);
  r.memory.set(badUtf8, 65536);
  traps(() => r.validate(65536, 65536 + badUtf8.length));
  equal(restore(r.convert(fence(basic))), basic);
});
