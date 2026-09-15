import { Parser } from "npm:commonmark@0.31.2";
import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
type Cue = { id: string; start: string; end: string; text: string };
const cue = (text: string): Cue => ({
  id: "1",
  start: "00:00:01,000",
  end: "00:00:03,250",
  text,
});
const rows = (cues: Cue[]) =>
  cues.map((c) =>
    `- ${c.id} ${c.start} --> ${c.end} ${JSON.stringify(c.text)}\n`
  ).join("");
function subtitles(cues: Cue[]) {
  const body = cues.map((c) => `${c.id}\n${c.start} --> ${c.end}\n${c.text}\n`)
    .join("\n");
  let longest = 2;
  for (const m of body.matchAll(/`+/g)) {
    longest = Math.max(longest, m[0].length);
  }
  const fence = "`".repeat(longest + 1);
  return fence + "srt\n" + body + fence + "\n";
}
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      JSON.stringify(a)?.slice(0, 1600) + " != " +
        JSON.stringify(b)?.slice(0, 1600),
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
type Module = { run(n: number): number; memory: WebAssembly.Memory };
async function pair() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["c", "transforms/00-calendar-lines"],
      ["r", "transforms/38-srt-to-cues"],
      ["w", "transforms/39-cues-to-srt"],
    ]
  ) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    imports[name] =
      (await WebAssembly.instantiate(b.bytes, imports)).instance.exports;
  }
  const w = imports.w as unknown as Module, r = imports.r as unknown as Module;
  const memory = new Uint8Array(w.memory.buffer);
  memory.fill(0xa5, 0x30000);
  function checkMemory(input: Uint8Array) {
    equal(toHex(memory.subarray(0, input.length)), toHex(input));
    equal(memory.subarray(0x30000).every((b) => b === 0xa5), true);
  }
  function run(module: Module, source: string) {
    const input = encoder.encode(source);
    if (input.length > 65536) throw Error("Test input exceeds capacity");
    memory.set(input);
    try {
      const length = module.run(input.length);
      return decoder.decode(memory.subarray(65536, 65536 + length));
    } finally {
      checkMemory(input);
    }
  }
  return {
    w,
    r,
    memory,
    checkMemory,
    write: (s: string) => run(w, s),
    read: (s: string) => run(r, s),
  };
}

Deno.test("SubRip writer: flat rows, exact text, timing spellings and blank input", async () => {
  const p = await pair();
  const model = [
    cue("Hello, world!\nSecond line."),
    {
      ...cue("<i>Overlapping subtitles</i>"),
      id: "2",
      start: "00:00:03,000",
      end: "00:00:05,000",
    },
    {
      ...cue('  雪 😀 "quote" \\path\t  '),
      id: "0000",
      start: "000:00:00,000",
      end: "00:00:00,000",
    },
  ];
  for (const ending of ["\n", "\r\n", "\r"]) {
    equal(p.write(rows(model).replaceAll("\n", ending)), subtitles(model));
  }
  equal(p.read(p.write(rows(model))), rows(model));
  equal(p.write(rows(model).trimEnd()), subtitles(model));
  const spaced = rows([cue("hello")]).replace("- 1 ", "-   1\t")
    .replace(" --> ", " \t-->\t ").trimEnd() + " \t\n\n";
  equal(p.write("\n \t\n" + spaced), subtitles([cue("hello")]));
  for (const input of ["", "\n", " \t\r\n\n"]) {
    equal(p.write(input), "```srt\n```\n");
    equal(p.read(p.write(input)), "");
  }
  const hours = "9".repeat(500) + ":59:59,999";
  const huge = [{ ...cue("No rounding"), start: hours, end: hours }];
  equal(p.write(rows(huge)), subtitles(huge));
});

Deno.test("SubRip pair: generated models and repeated shared-memory round trips", async () => {
  const p = await pair();
  const texts = [
    "alpha",
    "雪 😀",
    "first\nsecond",
    " \\" + '"quote"\t ',
    "<script>not executable</script>",
    "before\n```\nafter",
    "a,b|c:d",
    "&amp; [link](https://example.com/)",
  ];
  for (let n = 0; n < 500; n++) {
    const model = Array.from({ length: 1 + n % 7 }, (_, i) => {
      const h = String(n % 125).padStart(2 + i % 3, "0");
      const ms = String(n % 1000).padStart(3, "0");
      return {
        id: String((n + i) % 11).padStart(1 + i % 3, "0"),
        start: `${h}:00:00,${ms}`,
        end: `${h}:59:59,999`,
        text: texts[(n + i) % texts.length],
      };
    });
    const source = rows(model), expected = subtitles(model);
    equal(p.write(source), expected);
    equal(p.read(expected), source);
    equal(p.write(p.read(expected)), expected);
  }
});

Deno.test("SubRip text: Unicode scalar corpus, JSON escapes and surrogate rejection", async () => {
  const p = await pair();
  for (let start = 32; start < 65536; start += 256) {
    let text = "", escaped = "";
    for (let cp = start; cp < Math.min(start + 256, 65536); cp++) {
      if (cp === 127 || cp >= 0xd800 && cp <= 0xdfff) continue;
      text += String.fromCharCode(cp);
      escaped += "\\u" + cp.toString(16).padStart(4, "0");
    }
    if (!text) continue;
    const model = [cue(text)];
    equal(p.write(rows(model)), subtitles(model));
    equal(
      p.write(rows([cue("PLACE")]).replace('"PLACE"', '"' + escaped + '"')),
      subtitles(model),
    );
  }
  for (let n = 0; n < 300; n++) {
    const cp = 65536 + n * 3491 % (0x110000 - 65536);
    const text = String.fromCodePoint(cp), model = [cue(text)];
    const escaped = Array.from(
      { length: text.length },
      (_, i) => "\\u" + text.charCodeAt(i).toString(16).padStart(4, "0"),
    ).join("");
    equal(p.write(rows(model)), subtitles(model));
    equal(
      p.write(rows([cue("PLACE")]).replace('"PLACE"', '"' + escaped + '"')),
      subtitles(model),
    );
  }
  for (let cp = 0xd800; cp <= 0xdfff; cp++) {
    traps(() => p.write(rows([cue(String.fromCharCode(cp))])));
  }
  const escaped = rows([cue("PLACE")]).replace(
    '"PLACE"',
    '"a\\t\\u000ab\\/\\\\\\""',
  );
  equal(p.write(escaped), subtitles([cue('a\t\nb/\\"')]));
});

Deno.test("SubRip writer: malformed rows, timing and text cannot become extra cues", async () => {
  const p = await pair();
  const good = rows([cue("text")]);
  const bad = [
    good.replace("- 1", "  - 1"),
    good.replace("- 1", "-\t1"),
    good.replace("- 1", "- -1"),
    good.replace("- 1", "- one"),
    good.replace("1 00:", "1x 00:"),
    good.replace(" --> ", "-->"),
    good.replace(" --> ", " -> "),
    good.replace("00:00:03,250", "00:00:00,999"),
    good.replace("00:00:01,000", "00:60:01,000"),
    good.replace("00:00:01,000", "0:00:01,000"),
    good.replace("00:00:01,000", "00:00:01.000"),
    good.replace('"text"', '"text" junk'),
    good.replace('"text"', "null"),
    good.replace('"text"', '"unterminated'),
    good.replace('"text"', '"bad\\x22"'),
    good.replace('"text"', '"bad\\u00zz"'),
    good.replace('"text"', '"bad\\"'),
    "- {}\n" + good,
    "# Cues\n" + good,
  ];
  for (
    const text of [
      "",
      " ",
      "\t",
      "\nfirst",
      "last\n",
      "first\n\nlast",
      "first\n \t\nlast",
      "a\rb",
      "a\r\nb",
      "a\u007fb",
    ]
  ) {
    bad.push(rows([cue(text)]));
  }
  for (let cp = 0; cp < 32; cp++) {
    if (cp === 9 || cp === 10) continue;
    bad.push(rows([cue("a" + String.fromCharCode(cp) + "b")]));
  }
  for (const source of bad) {
    traps(() => p.write(source));
    equal(p.write(good), subtitles([cue("text")]));
  }
});

Deno.test("SubRip writer: malformed raw UTF-8 and controls are rejected read-only", async () => {
  const p = await pair();
  const prefix = encoder.encode('- 1 00:00:00,000 --> 00:00:01,000 "a');
  const suffix = encoder.encode('b"\n');
  const invalid = [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [
    0xe2,
    0x82,
  ], [0x80]];
  for (let cp = 0; cp < 32; cp++) invalid.push([cp]);
  invalid.push([127]);
  for (const b of invalid) {
    const input = new Uint8Array([...prefix, ...b, ...suffix]);
    p.memory.set(input);
    traps(() => p.w.run(input.length));
    p.checkMemory(input);
  }
  equal(p.write(rows([cue("recovered")])), subtitles([cue("recovered")]));
});

Deno.test("SubRip writer: decoded backticks determine the actual Markdown fence", async () => {
  const p = await pair();
  for (const count of [1, 2, 3, 4, 10, 128, 1024]) {
    for (const indent of ["", " ", "   ", "    ", "inline "]) {
      const model = [cue("before\n" + indent + "`".repeat(count) + "\nafter")];
      const source = rows(model);
      equal(p.write(source), subtitles(model));
      equal(p.read(p.write(source)), source);
      equal(p.write(source.replaceAll("`", "\\u0060")), subtitles(model));
      const block = new Parser().parse(p.write(source)).firstChild;
      equal(block?.type, "code_block");
      equal(block?.info, "srt");
      equal(block?.next, null);
      equal(
        block?.literal,
        `${model[0].id}\n${model[0].start} --> ${model[0].end}\n${
          model[0].text
        }\n`,
      );
    }
  }
});

Deno.test("SubRip writer: edited punctuation either rejects or preserves the parsed rows", async () => {
  const p = await pair();
  const source = rows([cue('hello "quoted"\nsecond\tline'), {
    ...cue("a \\ b"),
    id: "002",
  }]);
  const changes = [
    '"',
    "\\",
    "\n",
    "\t",
    ":",
    ",",
    "0",
    "7",
    "-",
    " ",
    ">",
    "x",
    "",
  ];
  let accepted = 0, rejected = 0;
  for (let i = 0; i < source.length; i++) {
    for (const replacement of changes) {
      const edited = source.slice(0, i) + replacement + source.slice(i + 1);
      let written: string;
      try {
        written = p.write(edited);
      } catch (e) {
        if (!(e instanceof WebAssembly.RuntimeError)) throw e;
        rejected++;
        continue;
      }
      // Test-only row parsing uses the JS engine's JSON decoder, not the Wasm
      // iterator. Successful output must reflect the edited input's data.
      const model: Cue[] = [];
      for (const line of edited.split(/\r\n|\r|\n/)) {
        if (/^[ \t]*$/.test(line)) continue;
        const m =
          /^- [ \t]*([0-9]+)[ \t]+([0-9:,]+)[ \t]+-->[ \t]+([0-9:,]+)[ \t]+(".*")[ \t]*$/
            .exec(line);
        if (!m) throw Error("Accepted an invalid row: " + line);
        model.push({
          id: m[1],
          start: m[2],
          end: m[3],
          text: JSON.parse(m[4]),
        });
      }
      equal(written, subtitles(model));
      equal(p.read(written), rows(model));
      equal(p.write(p.read(written)), written);
      accepted++;
    }
  }
  if (!accepted || !rejected) {
    throw Error("Mutation corpus did not cover both outcomes");
  }
});

Deno.test("SubRip writer: exact input and framed output limits, unchanged input and recovery", async () => {
  const p = await pair();
  const base = rows([cue("x")]);
  const model = [cue("x".repeat(65536 - encoder.encode(base).length + 1))];
  equal(encoder.encode(rows(model)).length, 65536);
  equal(p.write(rows(model)), subtitles(model));
  traps(() => p.w.run(65537));
  traps(() => p.w.run(-1));
  // The body costs one byte per backtick and each fence one more. Choose
  // padding to make the final output exactly 128 KiB, then exceed it by one.
  const skeleton = subtitles([cue("```")]).length - 9;
  const ticks = Math.floor((131072 - skeleton) / 3);
  const padding = 131072 - skeleton - ticks * 3;
  const full = [cue("`".repeat(ticks) + "x".repeat(padding))];
  equal(encoder.encode(subtitles(full)).length, 131072);
  equal(p.write(rows(full)), subtitles(full));
  traps(() => p.write(rows([cue(full[0].text + "x")])));
  equal(p.write(rows([cue("ok")])), subtitles([cue("ok")]));
});
