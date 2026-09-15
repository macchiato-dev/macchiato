import { Parser } from "npm:commonmark@0.31.2";
import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
type Cue = {
  start: string;
  end: string;
  text: string;
  id?: string;
  settings?: string;
};
const cue = (text = "Hello!"): Cue => ({
  start: "00:01.000",
  end: "00:03.250",
  text,
});
const row = (c: Cue) =>
  `- cue ${c.start} --> ${c.end} ${JSON.stringify(c.text)}` +
  (c.id === undefined ? "" : " id " + JSON.stringify(c.id)) +
  (c.settings === undefined ? "" : " settings " + JSON.stringify(c.settings)) +
  "\n";
const block = (c: Cue) =>
  (c.id === undefined ? "" : c.id + "\n") +
  `${c.start} --> ${c.end}` +
  (c.settings === undefined ? "" : " " + c.settings) + "\n" + c.text;
function fence(body: string) {
  let max = 2;
  for (const m of body.matchAll(/`+/g)) max = Math.max(max, m[0].length);
  const ticks = "`".repeat(max + 1);
  return ticks + "vtt\n" + body + ticks + "\n";
}
function file(cues: Cue[], header = "") {
  return fence(
    "WEBVTT" + (header ? " " + header : "") +
      cues.map((c) => "\n\n" + block(c)).join("") +
      (cues.length ? "\n" : "\n\n"),
  );
}
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw Error(
      JSON.stringify(actual)?.slice(0, 1800) + " != " +
        JSON.stringify(expected)?.slice(0, 1800),
    );
  }
}
function traps(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
    throw e;
  }
  throw Error("Expected Wasm trap");
}
type Module = { memory: WebAssembly.Memory; run(n: number): number };
async function machine(writer: boolean) {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["c", "transforms/00-calendar-lines"],
      ["r", "transforms/38-srt-to-cues"],
      ["v", "transforms/00-webvtt-time"],
      ["w", "transforms/" + (writer ? "41-cues-to-vtt" : "40-vtt-to-cues")],
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(a.resolved).bytes), toHex(a.bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const m = imports.w as unknown as Module;
  const memory = new Uint8Array(m.memory.buffer);
  function convert(source: string | Uint8Array) {
    const input = typeof source === "string" ? encoder.encode(source) : source;
    if (input.length > 65536) throw Error("Test input exceeds input page");
    memory.set(input);
    // Each row's decoded strings cannot exceed the entire encoded input.
    const guard = 196608 + input.length;
    if (writer) memory.fill(0xa5, guard);
    try {
      const n = m.run(input.length);
      equal(n <= 131072, true);
      return decoder.decode(memory.subarray(65536, 65536 + n));
    } finally {
      equal(toHex(memory.subarray(0, input.length)), toHex(input));
      if (writer) equal(memory.subarray(guard).every((x) => x === 0xa5), true);
    }
  }
  return { convert, memory, run: m.run };
}

Deno.test("WebVTT writer: documented records, omitted wrapper, optional fields and line endings", async () => {
  const w = await machine(true), r = await machine(false);
  const doc = await Deno.readTextFile(
    new URL("transforms/41-cues-to-vtt.md", import.meta.url),
  );
  const rows = doc.match(/```text\n([\s\S]*?)```/)![1];
  equal(w.convert(rows), doc.match(/```vtt[\s\S]*?```/)![0] + "\n");
  equal(r.convert(w.convert(rows)), rows);
  for (const s of ["", "\n", " \t\n\t\r\n"]) equal(w.convert(s), file([]));
  const c = {
    ...cue("<v Jane>雪 😀\n\t second line "),
    id: "speaker",
    settings: "align:start size:50% ",
  };
  for (const nl of ["\n", "\r\n", "\r"]) {
    equal(w.convert(row(c).replaceAll("\n", nl)), file([c]));
  }
  equal(
    w.convert(
      '- cue 00:01.000 --> 00:03.250 "Hello!" settings "align:end" id "named"',
    ),
    file([{ ...cue(), id: "named", settings: "align:end" }]),
  );
  equal(
    w.convert('-  cue\t00:01.000\t-->\t00:03.250\t"Hello!" \t'),
    file([cue()]),
  );
  for (const text of ["", " ", "\t", "\t \nfirst\n  ", "```", "a\n````\nz"]) {
    equal(w.convert(row(cue(text))), file([cue(text)]));
    equal(r.convert(w.convert(row(cue(text)))), row(cue(text)));
  }
});

Deno.test("WebVTT writer: ordered NOTE/STYLE/REGION data and keyword-like identifiers", async () => {
  const w = await machine(true), r = await machine(false);
  const blocks = [
    "NOTE",
    "NOTE \t",
    "NOTE text\nmore",
    "STYLE\n::cue { background: url(https://example.invalid/x); }",
    "REGION\nid:r\nwidth:40%",
  ];
  const rows = '- header "Title"\n' +
    blocks.map((b) => "- block " + JSON.stringify(b) + "\n").join("") +
    row(cue()) + '- block "NOTE after"\n';
  const expected = fence(
    "WEBVTT Title\n\n" + blocks.join("\n\n") + "\n\n" + block(cue()) +
      "\n\nNOTE after\n",
  );
  equal(w.convert(rows), expected);
  equal(r.convert(expected), rows);
  for (
    const id of [
      "NOTEBOOK",
      "STYLE name",
      "REGION name",
      "region",
      "123",
      "  ",
      "雪",
      "a`b",
    ]
  ) {
    const c = { ...cue(), id };
    equal(r.convert(w.convert(row(c))), row(c));
  }
  const duplicate = { ...cue(), id: "same" };
  equal(
    r.convert(w.convert(row(duplicate).repeat(2))),
    row(duplicate).repeat(2),
  );
});

Deno.test("WebVTT writer: 500 generated collections round-trip through independent reader machines", async () => {
  const w = await machine(true), r = await machine(false);
  let seed = 941;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const time = (ms: number, hours: boolean) => {
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
    return (hours || h ? String(h).padStart(2, "0") + ":" : "") +
      String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" +
      String(s % 60).padStart(2, "0") + "." +
      String(ms % 1000).padStart(3, "0");
  };
  const texts = [
    "",
    "雪 😀",
    'a "quote" \\path',
    "<b>literal</b>",
    "one\ntwo",
    "\t \n \t",
    "`inline`",
    "a\n````\nz",
  ];
  for (let trial = 0; trial < 500; trial++) {
    const cues: Cue[] = [];
    let ms = random() % 10000000;
    for (let i = 0, n = 1 + random() % 12; i < n; i++) {
      ms += random() % 3000;
      cues.push({
        start: time(ms, !!(random() % 2)),
        end: time(ms + 1 + random() % 15000, !!(random() % 2)),
        text: texts[random() % texts.length],
        ...(random() % 2 ? { id: "id-" + i } : {}),
        ...(random() % 2 ? { settings: "line:50% align:start" } : {}),
      });
    }
    const rows = cues.map(row).join("");
    equal(w.convert(rows), file(cues));
    equal(r.convert(w.convert(rows)), rows);
  }
});

Deno.test("WebVTT writer: malformed rows, block injection, chronology and reset after traps", async () => {
  const w = await machine(true);
  const valid = row(cue());
  const invalid = [
    "- {}",
    "  " + valid,
    valid.replace("- ", "* "),
    valid.replace("cue", "cues"),
    valid.replace(" --> ", "-->"),
    valid.replace("Hello!", "x") + "garbage",
    valid.replace("00:03.250", "00:01.000"),
    valid.replace("00:03.250", "00:00.999"),
    valid.replace("00:01.000", "0:01.000"),
    valid.replace("00:01.000", "60:01.000"),
    valid.replace("00:01.000", "00:01,000"),
    valid.replace("00:01.000", "00:01.0000"),
    valid + row({ ...cue(), start: "00:00.999" }),
    valid + '- header "late"',
    '- header "a"\n- header "b"',
    '- block "UNKNOWN"',
    '- block "NOTEBOOK"',
    '- block "STYLE name"',
    '- block "REGION x"',
    '- block ""',
    '- block "NOTE\n\nx"',
    '- block "NOTE\n"',
    '- block "NOTE --> cue"',
    valid + '- block "STYLE\n::cue { color: red; }"',
    valid + '- block "REGION"',
    '- header "a\\nb"',
    '- header "a --> b"',
  ];
  for (const field of ["id", "settings"]) {
    for (const value of ["", "a\nb", "a --> b"]) {
      invalid.push(valid.trimEnd() + ` ${field} ${JSON.stringify(value)}`);
    }
    invalid.push(valid.trimEnd() + ` ${field} "x" ${field} "y"`);
    invalid.push(valid.trimEnd() + `${field} "x"`);
  }
  for (
    const id of ["NOTE", "NOTE x", "NOTE\t", "STYLE", "STYLE \t", "REGION"]
  ) {
    invalid.push(row({ ...cue(), id }));
  }
  for (const settings of [" x", "\tx"]) {
    invalid.push(row({ ...cue(), settings }));
  }
  for (
    const text of [
      "\n",
      "\nx",
      "x\n",
      "x\n\ny",
      "a --> b",
      "\r",
      "\0",
      "\u007f",
    ]
  ) {
    invalid.push(row(cue(text)));
  }
  for (const s of invalid) {
    try {
      traps(() => w.convert(s));
    } catch (e) {
      throw Error("accepted/bad rejection: " + JSON.stringify(s), { cause: e });
    }
    equal(w.convert(valid), file([cue()]));
  }
  const huge = "9".repeat(500), next = "1" + "0".repeat(500);
  const c = { ...cue(), start: huge + ":59:59.999", end: next + ":00:00.000" };
  equal(w.convert(row(c)), file([c]));
  equal(
    w.convert(row(c) + '- block "NOTE intervening"\n' + row(c)),
    fence(
      "WEBVTT\n\n" + block(c) + "\n\nNOTE intervening\n\n" + block(c) + "\n",
    ),
  );
});

Deno.test("WebVTT writer: escaped scalars, malformed UTF-8 and Markdown fence independence", async () => {
  const w = await machine(true), r = await machine(false);
  const escaped =
    '- cue 00:01.000 --> 00:03.250 "\\u0060\\u0060\\u0060\\n雪 \\ud83d\\ude00"';
  const expected = { ...cue("```\n雪 😀") };
  equal(w.convert(escaped), file([expected]));
  for (
    const payload of [
      '"\\ud800"',
      '"\\udc00"',
      '"\\ud800x"',
      '"\\u0000"',
      '"\\q"',
      '"\\uXXXX"',
      '"unterminated',
      '"raw\tcontrol"',
    ]
  ) {
    traps(() => w.convert("- cue 00:01.000 --> 00:03.250 " + payload));
  }
  for (
    const invalid of [
      [0xc0, 0x80],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0x80],
      [0xe2, 0x82],
    ]
  ) {
    const prefix = encoder.encode('- cue 00:01.000 --> 00:03.250 "');
    const b = new Uint8Array([...prefix, ...invalid, 34]);
    traps(() => w.convert(b));
    equal(w.convert(row(cue())), file([cue()]));
  }
  for (
    const text of [
      "```",
      "before\n  ````\nafter",
      "雪😀 &amp; <script>alert(1)</script>",
      "`".repeat(2000),
    ]
  ) {
    const s = w.convert(row(cue(text)));
    const ast = new Parser().parse(s);
    equal(ast.firstChild?.type, "code_block");
    equal(ast.firstChild?.info, "vtt");
    equal(ast.firstChild?.next, null);
    equal(ast.firstChild?.literal, "WEBVTT\n\n" + block(cue(text)) + "\n");
    equal(r.convert(s), row(cue(text)));
  }
});

Deno.test("WebVTT writer: exact input and output bounds, scratch reuse and recovery", async () => {
  const w = await machine(true);
  const emptySize = encoder.encode(row(cue(""))).length;
  const text = "a".repeat(65536 - emptySize);
  const input = row(cue(text));
  equal(encoder.encode(input).length, 65536);
  equal(w.convert(input), file([cue(text)]));
  // The safe fence can triple a long backtick run. Find the precise last fit.
  let lo = 0, hi = 65536 - emptySize;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (encoder.encode(file([cue("`".repeat(mid))])).length <= 131072) lo = mid;
    else hi = mid - 1;
  }
  equal(w.convert(row(cue("`".repeat(lo)))), file([cue("`".repeat(lo))]));
  traps(() => w.convert(row(cue("`".repeat(lo + 1)))));
  const rows = row(cue("")).repeat(1500);
  equal(w.convert(rows), file(Array.from({ length: 1500 }, () => cue(""))));
  for (const n of [-1, 65537, 262144, 0x7fffffff]) traps(() => w.run(n));
  equal(w.convert(row(cue())), file([cue()]));
});

Deno.test("WebVTT writer: Unicode escape corpus and mutated records stay readable and stable", async () => {
  const w = await machine(true), r = await machine(false);
  for (const header of ["", " ", "\t \t"]) {
    equal(w.convert("- header " + JSON.stringify(header)), file([]));
  }
  // Raw UTF-8 and escaped UTF-16 take separate iterator paths. They must
  // produce the same bytes for BMP values and supplementary scalars.
  for (let cp = 32; cp <= 0x10ffff; cp += 977) {
    if ((cp >= 0xd800 && cp <= 0xdfff) || cp === 127) continue;
    const text = String.fromCodePoint(cp);
    const escaped = text.split("").map((c) =>
      "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")
    ).join("");
    equal(
      w.convert('- cue 00:01.000 --> 00:03.250 "' + escaped + '"'),
      file([cue(text)]),
    );
    equal(w.convert(row(cue(text))), file([cue(text)]));
  }
  for (let unit = 0xd800; unit <= 0xdfff; unit++) {
    traps(() =>
      w.convert('- cue 00:01.000 --> 00:03.250 "\\u' + unit.toString(16) + '"')
    );
  }
  const source = '- header "A"\n- block "NOTE x"\n' +
    row({ ...cue('one\ntwo "quote"'), id: "id", settings: "align:start" });
  const replacements = ['"', "\\", "\n", " ", "-", ">", ":", "0", "x", "`"];
  let accepted = 0, rejected = 0;
  for (let i = 0; i < source.length; i++) {
    for (const character of replacements) {
      const edited = source.slice(0, i) + character + source.slice(i + 1);
      let output: string;
      try {
        output = w.convert(edited);
      } catch (e) {
        if (!(e instanceof WebAssembly.RuntimeError)) throw e;
        rejected++;
        continue;
      }
      const records = r.convert(output);
      equal(w.convert(records), output);
      accepted++;
    }
  }
  equal(accepted > 100 && rejected > 100, true);
  equal(w.convert(row(cue())), file([cue()]));
});
