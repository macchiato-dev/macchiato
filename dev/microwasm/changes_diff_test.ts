import { applyPatch, createTwoFilesPatch, parsePatch } from "npm:diff@8.0.2";
import { Parser } from "npm:commonmark@0.31.2";
import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder(),
  decoder = new TextDecoder("utf-8", { fatal: true });
const file = '- file "a/example" "b/example"\n';
const basic = file + '- hunk -1 +1 ""\n- remove "old"\n- add "new"\n';
const patch = "--- a/example\n+++ b/example\n@@ -1 +1 @@\n-old\n+new\n";
const marker = "\\ No newline at end of file\n";
function fence(body: string) {
  let width = 3;
  for (const m of body.matchAll(/`+/g)) {
    width = Math.max(width, m[0].length + 1);
  }
  const ticks = "`".repeat(width);
  return ticks + "diff\n" + body + ticks + "\n";
}
function bodyOf(fenced: string) {
  const n = fenced.indexOf("diff\n"), start = n + 5;
  return fenced.slice(start, -(n + 1));
}
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      JSON.stringify(a)?.slice(0, 2200) + " != " +
        JSON.stringify(b)?.slice(0, 2200),
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
type Module = { memory: WebAssembly.Memory; run(n: number): number };
async function pair() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["c", "transforms/00-calendar-lines"],
      ["r", "transforms/38-srt-to-cues"],
      ["p", "transforms/00-patch-lines"],
      ["d", "transforms/42-diff-to-changes"],
      ["w", "transforms/43-changes-to-diff"],
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(a.resolved).bytes), toHex(a.bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const d = imports.d as unknown as Module, w = imports.w as unknown as Module;
  const memory = new Uint8Array(w.memory.buffer),
    constants = memory.slice(196608);
  function run(m: Module, s: string | Uint8Array) {
    const input = typeof s === "string" ? encoder.encode(s) : s;
    if (input.length > 65536) throw Error("Test source exceeds input page");
    memory.set(input);
    try {
      const n = m.run(input.length);
      equal(n <= 131072, true);
      return decoder.decode(memory.subarray(65536, 65536 + n));
    } finally {
      equal(toHex(memory.subarray(0, input.length)), toHex(input));
      equal(toHex(memory.subarray(196608)), toHex(constants));
    }
  }
  return {
    read: (s: string) => run(d, s),
    write: (s: string | Uint8Array) => run(w, s),
    memory,
    run: w.run,
  };
}

Deno.test("Diff writer: documented rows, whitespace, range spelling and unchanged metadata", async () => {
  const p = await pair();
  const doc = await Deno.readTextFile(
    new URL("transforms/43-changes-to-diff.md", import.meta.url),
  );
  const rows = doc.match(/```text\n([\s\S]*?)```/)![1];
  equal(p.write(rows), doc.match(/```diff[\s\S]*?```/)![0] + "\n");
  equal(p.read(p.write(rows)), rows);
  for (const s of ["", "\n", " \t\r\n"]) equal(p.write(s), fence(""));
  for (const nl of ["\n", "\r", "\r\n"]) {
    equal(p.write(basic.replaceAll("\n", nl)), fence(patch));
  }
  equal(
    p.write(
      '-  file\t"a/example"\t"b/example"\n- hunk\t-1\t+1\t""\n- remove\t"old"\n- add\t"new" \t',
    ),
    fence(patch),
  );
  const labeled =
    '- file "a name\\tbefore" "b name\\tafter"\n- hunk -0001,01 +01 " section"\n- remove "-- looks like header"\n- add "++ same"\n';
  equal(p.read(p.write(labeled)), labeled);
  for (
    const meta of [
      "",
      "Index: name",
      "diff --git a/old b/new",
      "rename from old",
      "rename to new",
      "\tindented note",
      "\0zero",
      "GIT binary patches are different",
    ]
  ) {
    equal(p.write("- meta " + JSON.stringify(meta)), fence(meta + "\n"));
  }
});

Deno.test("Diff pair: 400 generated patches survive actual Wasm round trips and independent application", async () => {
  const p = await pair();
  let seed = 572;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const words = [
    "",
    "雪 😀",
    "old",
    "new",
    "--- a file?",
    "+++ another?",
    "@@ header?",
    "\0zero",
    "\tindent",
    "`````",
    '<img src="https://patch.invalid/x">',
    '"quote" \\slash',
  ];
  for (let trial = 0; trial < 400; trial++) {
    const a = Array.from(
      { length: random() % 35 },
      () => words[random() % words.length],
    );
    const b = a.slice();
    for (let i = 0, n = 1 + random() % 8; i < n; i++) {
      b.splice(
        random() % (b.length + 1),
        random() % 3,
        words[random() % words.length],
      );
    }
    const nl = trial % 3 ? "\n" : "\r\n";
    const before = a.join(nl) + (a.length && trial % 2 ? nl : "");
    const after = b.join(nl) + (b.length && trial % 4 ? nl : "");
    const diff = createTwoFilesPatch(
      "a/example",
      "b/example",
      before,
      after,
      "before",
      "after",
      { context: trial % 6 },
    );
    const records = p.read(fence(diff));
    const written = p.write(records);
    equal(written, fence(diff));
    equal(p.read(written), records);
    equal(parsePatch(bodyOf(written)), parsePatch(diff));
    equal(
      applyPatch(before, bodyOf(written), { autoConvertLineEndings: false }),
      after,
    );
  }
});

Deno.test("Diff writer: preserve record kinds and use separate-side validation, not only total counts", async () => {
  const p = await pair();
  const invalid = [
    '- remove "-- old"\n- add "++ new"',
    file + '- hunk -1 +1 ""\n- file "old" "new"',
    file + '- hunk -1 +1 ""\n- meta "text"',
    file + '- hunk -1 +1 ""\n- hunk -1 +1 ""\n- remove "a"\n- add "b"',
    // Both have a zero contribution sum, but consume the wrong file sides.
    file + '- hunk -1 +1 ""\n- remove "a"\n- remove "b"',
    file + '- hunk -1,2 +0,0 ""\n- context "a"',
    file + '- hunk -1 +1 ""\n- add "a"\n- add "b"',
    '- hunk -1 +1 ""\n- remove "a"\n- add "b"',
    file + '- hunk -1 +1 ""\n- remove "a"',
    basic + '- add "extra"',
    basic + '- context "extra"',
    '- file "" "b"',
    '- file "a" ""',
    '- file "a"',
    '- meta "GIT binary patch"',
  ];
  for (
    const value of [
      "--- a",
      "+++ b",
      "@@ -1 +1 @@",
      " context",
      "\\ No newline at end of file",
    ]
  ) {
    invalid.push("- meta " + JSON.stringify(value));
  }
  for (const s of invalid) {
    try {
      traps(() => p.write(s));
    } catch (e) {
      throw Error(s, { cause: e });
    }
    equal(p.write(basic), fence(patch));
    equal(p.read(fence(patch)), basic);
  }
});

Deno.test("Diff writer: incomplete-line flags, zero sides, multiple files and marker recovery", async () => {
  const p = await pair();
  const records = file +
    '- hunk -1 +1,2 ""\n- remove "old"\n- no-newline\n- add "new"\n- add "last"\n- no-newline\n';
  const body = "--- a/example\n+++ b/example\n@@ -1 +1,2 @@\n-old\n" + marker +
    "+new\n+last\n" + marker;
  equal(p.write(records), fence(body));
  equal(p.write(records + basic), fence(body + patch));
  equal(
    p.write(file + '- hunk -0,0 +1 ""\n- add ""\n'),
    fence("--- a/example\n+++ b/example\n@@ -0,0 +1 @@\n+\n"),
  );
  equal(
    p.write(file + '- hunk -1 +0,0 ""\n- remove ""\n'),
    fence("--- a/example\n+++ b/example\n@@ -1 +0,0 @@\n-\n"),
  );
  for (
    const bad of [
      "- no-newline",
      file + "- no-newline",
      records + "- no-newline",
      file +
      '- hunk -1,2 +0,0 ""\n- remove "old"\n- no-newline\n- remove "later"',
      file + '- hunk -0,0 +1,2 ""\n- add "new"\n- no-newline\n- add "later"',
      records + '- hunk -2 +3 ""\n- remove "x"\n- add "y"',
      basic + '- no-newline "unexpected field"',
    ]
  ) {
    traps(() => p.write(bad));
    equal(p.write(basic), fence(patch));
  }
});

Deno.test("Diff writer: Unicode and control escapes cannot inject physical lines", async () => {
  const p = await pair();
  const prefix = file + '- hunk -0,0 +1 ""\n- add ';
  const controls = Array.from({ length: 32 }, (_, i) => i).filter((i) =>
    i !== 10
  ).map((i) => String.fromCharCode(i)).join("");
  const text = controls + '雪 😀 "quote" \\slash';
  equal(
    p.write(prefix + JSON.stringify(text)),
    fence("--- a/example\n+++ b/example\n@@ -0,0 +1 @@\n+" + text + "\n"),
  );
  equal(
    p.write(prefix + '"\\u96ea \\ud83d\\ude00"'),
    p.write(prefix + '"雪 😀"'),
  );
  for (
    const quoted of [
      '"\\n"',
      '"\\u000a"',
      '"\\ud800"',
      '"\\udc00"',
      '"\\ud800x"',
      '"\\q"',
      '"\\uXXXX"',
      '"unterminated',
      '"raw\tcontrol"',
    ]
  ) {
    traps(() => p.write(prefix + quoted));
  }
  for (
    const line of [
      '- meta "x\\ny"',
      '- file "x\\ny" "z"',
      file + '- hunk -1 +1 "x\\ny"\n- remove "a"\n- add "b"',
    ]
  ) {
    traps(() => p.write(line));
  }
  for (
    const bytes of [
      [0xc0, 0x80],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0x80],
    ]
  ) {
    traps(() =>
      p.write(new Uint8Array([...encoder.encode(prefix + '"'), ...bytes, 34]))
    );
    equal(p.write(basic), fence(patch));
  }
  for (
    const s of [
      "- {}",
      "  " + basic,
      basic.replace("- file", "* file"),
      basic + "junk",
      basic.replace("hunk", "hunks"),
      basic.replace("-1 +1", "-0 +1"),
      basic.replace("-1 +1", "-1,+1"),
      basic.replace("-1 +1", "-1 +1,65537"),
      basic.replace('"old"', '"old" 7'),
    ]
  ) traps(() => p.write(s));
});

Deno.test("Diff writer: safe decoded fences, exact capacity and literal table isolation", async () => {
  const p = await pair();
  const prefix = file + '- hunk -0,0 +1 ""\n- add ';
  const inputRoom = 65536 - encoder.encode(prefix + '""').length;
  const full = prefix + JSON.stringify("a".repeat(inputRoom));
  equal(encoder.encode(full).length, 65536);
  equal(
    p.write(full),
    fence(
      "--- a/example\n+++ b/example\n@@ -0,0 +1 @@\n+" + "a".repeat(inputRoom) +
        "\n",
    ),
  );
  const exactText = "`".repeat(43687) + "xx";
  const framed = p.write("- meta " + JSON.stringify(exactText));
  equal(encoder.encode(framed).length, 131072);
  equal(framed, fence(exactText + "\n"));
  traps(() => p.write("- meta " + JSON.stringify(exactText + "x")));
  for (
    const text of ["```", "``````", "inline `", "<script>alert(1)</script>"]
  ) {
    const out = p.write(
      file + '- hunk -1 +1 ""\n- context ' + JSON.stringify(text),
    );
    const ast = new Parser().parse(out);
    equal(ast.firstChild?.type, "code_block");
    equal(ast.firstChild?.info, "diff");
    equal(ast.firstChild?.next, null);
    equal(ast.firstChild?.literal, bodyOf(out));
  }
  equal(p.write(prefix + '"\\u0060\\u0060\\u0060"'), p.write(prefix + '"```"'));
  for (const n of [-1, 65537, 262144, 0x7fffffff]) traps(() => p.run(n));
  equal(p.write(basic), fence(patch));
});

Deno.test("Diff writer: mutated records either fail or stabilize through the actual reader", async () => {
  const p = await pair();
  const source = '- meta "Index: file"\n' + basic + "- no-newline\n";
  let accepted = 0, rejected = 0;
  for (let i = 0; i < source.length; i++) {
    for (const char of ['"', "\\", "\n", " ", "-", "+", "0", "9", "x", "`"]) {
      const edited = source.slice(0, i) + char + source.slice(i + 1);
      let output: string;
      try {
        output = p.write(edited);
      } catch (e) {
        if (!(e instanceof WebAssembly.RuntimeError)) throw e;
        rejected++;
        continue;
      }
      equal(p.write(p.read(output)), output);
      accepted++;
    }
  }
  equal(accepted > 100 && rejected > 100, true);
  equal(p.write(basic), fence(patch));
});
