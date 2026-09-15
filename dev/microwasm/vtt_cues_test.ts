import { Parser } from "npm:commonmark@0.31.2";
import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder(),
  decoder = new TextDecoder("utf-8", { fatal: true });
type Cue = {
  start: string;
  end: string;
  text: string;
  id?: string;
  settings?: string;
};
const row = (c: Cue) =>
  `- cue ${c.start} --> ${c.end} ${JSON.stringify(c.text)}` +
  (c.id ? " id " + JSON.stringify(c.id) : "") +
  (c.settings ? " settings " + JSON.stringify(c.settings) : "") + "\n";
const block = (c: Cue) =>
  (c.id ? c.id + "\n" : "") +
  `${c.start} --> ${c.end}` + (c.settings ? " " + c.settings : "") +
  "\n" + c.text;
const cue = (text = "Hello!"): Cue => ({
  start: "00:01.000",
  end: "00:03.250",
  text,
});
function fence(body: string, count = 3) {
  const ticks = "`".repeat(count);
  return ticks + "vtt\n" + body + "\n" + ticks + "\n";
}
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      JSON.stringify(a)?.slice(0, 1400) + " != " +
        JSON.stringify(b)?.slice(0, 1400),
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
async function reader() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["c", "transforms/00-calendar-lines"],
      ["r", "transforms/38-srt-to-cues"],
      ["v", "transforms/00-webvtt-time"],
      ["w", "transforms/40-vtt-to-cues"],
    ]
  ) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    imports[name] =
      (await WebAssembly.instantiate(b.bytes, imports)).instance.exports;
  }
  const memory = new Uint8Array(
    (imports.w.memory as WebAssembly.Memory).buffer,
  );
  const constants = memory.slice(0x30000, 0x30100);
  memory.fill(0xa5, 0x30100);
  const run = imports.w.run as (n: number) => number;
  function check(input: Uint8Array) {
    equal(toHex(memory.subarray(0, input.length)), toHex(input));
    equal(toHex(memory.subarray(0x30000, 0x30100)), toHex(constants));
    equal(memory.subarray(0x30100).every((x) => x === 0xa5), true);
  }
  function convert(s: string) {
    const b = encoder.encode(s);
    if (b.length > 65536) throw Error("Test input exceeds capacity");
    memory.set(b);
    try {
      const size = run(b.length);
      return decoder.decode(memory.subarray(65536, 65536 + size));
    } finally {
      check(b);
    }
  }
  return { memory, run, check, convert };
}

Deno.test("WebVTT reader: documentation, optional headers, both time forms and line endings", async () => {
  const r = await reader();
  const doc = await Deno.readTextFile(
    new URL("transforms/40-vtt-to-cues.md", import.meta.url),
  );
  equal(
    r.convert(doc.match(/```vtt[\s\S]*?```/)![0]),
    doc.match(/```text\n([\s\S]*?)```/)![1],
  );
  const model = {
    ...cue("first\nsecond"),
    id: "opening",
    settings: "align:start size:50%",
  };
  for (const nl of ["\n", "\r\n", "\r"]) {
    equal(
      r.convert(fence("WEBVTT\n\n" + block(model)).replaceAll("\n", nl)),
      row(model),
    );
    equal(
      r.convert(fence("\ufeffWEBVTT\n\n" + block(model)).replaceAll("\n", nl)),
      row(model),
    );
  }
  for (const header of ["WEBVTT", "WEBVTT ", "WEBVTT\t \t"]) {
    equal(r.convert(fence(header)), "");
    equal(r.convert(fence(header + "\n\n")), "");
  }
  equal(r.convert(fence("WEBVTT\tTitle\n\n")), '- header "Title"\n');
  const spaced = block(model).replace("00:01.000 -->", "  00:01.000\t-->")
    .replace("--> 00:", "-->\t00:");
  equal(r.convert(fence("WEBVTT\n\n" + spaced)), row(model));
  const empty = cue("");
  equal(r.convert(fence("WEBVTT\n\n" + block(empty))), row(empty));
  const whitespace = cue("\t \nfirst\n  ");
  equal(r.convert(fence("WEBVTT\n\n" + block(whitespace))), row(whitespace));
});

Deno.test("WebVTT reader: ordered blocks, lexical settings, identifiers and inert markup", async () => {
  const r = await reader();
  const blocks = [
    "NOTE",
    "NOTE leading\nsecond line",
    "NOTE\tTabbed",
    "STYLE\t\n::cue { background: url(https://example.invalid/a); }",
    "REGION\nid:one\nwidth:40%\nlines:3",
    "STYLE",
  ];
  const a = {
    ...cue('<v Jane>雪 😀 <00:02.000> &amp; "\\"'),
    id: "NOTEBOOK",
    settings: "region:one align:end\tunknown:kept ",
  };
  const b = {
    ...cue("<script>literal</script>"),
    id: "NOTEBOOK",
    start: "00:00:02.000",
    end: "00:04.000",
  };
  const body = "WEBVTT note\n\n" +
    [...blocks, block(a), "NOTE between", block(b)].join("\n\n");
  const expected = '- header "note"\n' +
    blocks.map((b) => "- block " + JSON.stringify(b) + "\n").join("") +
    row(a) + '- block "NOTE between"\n' + row(b);
  equal(r.convert(fence(body)), expected);
  for (
    const id of [
      "STYLE-ish",
      "STYLE name",
      "REGION name",
      "NOTEBOOK",
      "12",
      "雪",
      "  spaced  ",
    ]
  ) {
    const model = { ...cue(), id };
    equal(r.convert(fence("WEBVTT\n\n" + block(model))), row(model));
  }
});

Deno.test("WebVTT reader: generated cue models preserve exact data and chronological order", async () => {
  const r = await reader();
  const texts = [
    "plain",
    'quote " \\ path',
    "雪 😀",
    "<i>styled</i>",
    "first\nsecond",
    "\t ",
    "",
    "&amp;",
    "    ```",
  ];
  for (let n = 0; n < 500; n++) {
    const model = Array.from({ length: 1 + n % 9 }, (_, i) => {
      const minutes = String(i).padStart(2, "0"), h = "0".repeat(2 + n % 7);
      return {
        start: (i % 2 ? h + ":" : "") + `${minutes}:00.000`,
        end: `${h}:${minutes}:59.999`,
        text: texts[(n + i) % texts.length],
        id: i % 3 ? `cue ${n}.${i}` : undefined,
        settings: i % 2 ? "align:center" : undefined,
      };
    });
    const note = "NOTE " + n;
    const body = "WEBVTT\n\n" +
      model.map((c, i) => block(c) + (i === 0 ? "\n\n" + note : "")).join(
        "\n\n",
      );
    const expected = model.map((c, i) =>
      row(c) + (i === 0 ? "- block " + JSON.stringify(note) + "\n" : "")
    ).join("");
    equal(r.convert(fence(body, 4)), expected);
  }
});

Deno.test("WebVTT reader: positive durations and ordered starts, without numeric overflow", async () => {
  const r = await reader();
  const zero = { start: "00:00.000", end: "00:00:00.000", text: "zero" };
  traps(() => r.convert(fence("WEBVTT\n\n" + block(zero))));
  traps(() =>
    r.convert(
      fence(
        "WEBVTT\n\n" +
          block({ ...cue(), start: "01:00:00.000", end: "59:59.999" }),
      ),
    )
  );
  const first = { ...cue(), start: "59:59.999", end: "01:00:00.001" };
  const second = { ...cue(), start: "01:00:00.000", end: "01:00:00.002" };
  equal(
    r.convert(fence("WEBVTT\n\n" + [first, second].map(block).join("\n\n"))),
    [first, second].map(row).join(""),
  );
  traps(() =>
    r.convert(fence("WEBVTT\n\n" + [second, first].map(block).join("\n\n")))
  );
  const hours = "9".repeat(500);
  const huge = [{
    ...cue(),
    start: hours + ":00:00.000",
    end: hours + ":00:00.001",
  }, {
    ...cue(),
    start: "000" + hours + ":00:00.000",
    end: "1" + "0".repeat(500) + ":00:00.000",
  }];
  equal(
    r.convert(fence("WEBVTT\n\n" + huge.map(block).join("\n\n"))),
    huge.map(row).join(""),
  );
  // A failed run must not retain its last timestamp for the next file.
  equal(r.convert(fence("WEBVTT\n\n" + block(cue()))), row(cue()));
});

Deno.test("WebVTT reader: malformed structure, forbidden arrows and failed-edit recovery", async () => {
  const r = await reader(), good = "WEBVTT\n\n" + block(cue());
  const bad = [
    "",
    "webvtt",
    "WEBVTTx",
    "WEBVTT\n" + block(cue()),
    "WEBVTT\n \n" + block(cue()),
    "WEBVTT\n\nlonely identifier",
    good + "\n" + block(cue()),
    good + "\n\nSTYLE\n::cue { color: red; }",
    good + "\n\nREGION\nid:late",
    "WEBVTT\n\nNOTE bad --> text",
    "WEBVTT\n\nSTYLE\na --> b",
    "WEBVTT\n\nREGION\nid:a --> b",
    good.replace("Hello!", "a --> b"),
    good.replace(" --> ", "-->"),
    good.replace(" --> ", " -> "),
    good.replace("00:01.000", "00:60.000"),
    good.replace("00:03.250", "00:03.250x"),
    good.replace("00:03.250", "00:03.250 x-->y"),
  ];
  for (const body of bad) {
    traps(() => r.convert(fence(body)));
    equal(r.convert(fence(good)), row(cue()));
  }
});

Deno.test("WebVTT reader: UTF-8, controls, fence safety and literal content", async () => {
  const r = await reader();
  for (const text of ["```", " ```", "   ```\t", "````"]) {
    const c = cue("first\n" + text + "\nlast"), body = "WEBVTT\n\n" + block(c);
    traps(() => r.convert(fence(body)));
    const source = fence(body, 5);
    equal(r.convert(source), row(c));
    const parsed = new Parser().parse(source).firstChild;
    equal(parsed?.type, "code_block");
    equal(parsed?.next, null);
    equal(parsed?.literal, body + "\n");
  }
  for (
    const s of [
      "```vtt",
      "```vtt\n",
      "```srt\nWEBVTT\n```",
      "```vtt extra\nWEBVTT\n```",
      "````vtt\nWEBVTT\n```",
      "```vtt\nWEBVTT\n```oops",
    ]
  ) traps(() => r.convert(s));
  const prefix = encoder.encode("```vtt\nWEBVTT\n\n00:01.000 --> 00:02.000\na"),
    suffix = encoder.encode("b\n```\n");
  const bad = [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [
    0xe2,
    0x82,
  ], [0x80]];
  for (let c = 0; c < 32; c++) if (![9, 10, 13].includes(c)) bad.push([c]);
  bad.push([127]);
  for (const bytes of bad) {
    const input = new Uint8Array([...prefix, ...bytes, ...suffix]);
    r.memory.set(input);
    traps(() => r.run(input.length));
    r.check(input);
  }
  equal(
    r.convert(fence("WEBVTT\n\n" + block(cue("recovered")))),
    row(cue("recovered")),
  );
});

Deno.test("WebVTT reader: full-size input, expansion, many empty cues and immutable tables", async () => {
  const r = await reader(), base = fence("WEBVTT\n\n" + block(cue("x")));
  const c = cue("x".repeat(65536 - encoder.encode(base).length + 1));
  const full = fence("WEBVTT\n\n" + block(c));
  equal(encoder.encode(full).length, 65536);
  equal(r.convert(full), row(c));
  const quotes = { ...c, text: '"'.repeat(c.text.length) };
  equal(r.convert(fence("WEBVTT\n\n" + block(quotes))), row(quotes));
  const small = cue("");
  equal(
    r.convert(
      fence("WEBVTT\n\n" + Array(1800).fill(block(small)).join("\n\n")),
    ),
    row(small).repeat(1800),
  );
  traps(() => r.run(65537));
  traps(() => r.run(-1));
  equal(r.convert(fence("WEBVTT")), "");
  equal(r.convert(fence("WEBVTT\n\n" + block(cue()))), row(cue()));
});
