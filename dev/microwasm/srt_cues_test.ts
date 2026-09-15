import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder(),
  decoder = new TextDecoder("utf-8", { fatal: true });
type Cue = { id: string; start: string; end: string; text: string };
const cueList = (cues: Cue[]) =>
  cues.map((c) =>
    `- ${c.id} ${c.start} --> ${c.end} ${JSON.stringify(c.text)}\n`
  ).join("");
const srt = (cues: Cue[], newline = "\n") =>
  cues.map((c) => `${c.id}\n${c.start} --> ${c.end}\n${c.text}`).join("\n\n")
    .replaceAll("\n", newline);
function fence(body: string, ticks = 3, newline = "\n") {
  const marker = "`".repeat(ticks);
  return marker + "srt" + newline + body + newline + marker + newline;
}
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      JSON.stringify(a)?.slice(0, 1200) + " != " +
        JSON.stringify(b)?.slice(0, 1200),
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
    (imports.r.memory as WebAssembly.Memory).buffer,
  );
  memory.fill(0xa5, 0x30000);
  const run = imports.r.run as (n: number) => number;
  function convert(source: string) {
    const input = encoder.encode(source);
    if (input.length > 65536) throw Error("Test source exceeds capacity");
    memory.set(input);
    const n = run(input.length);
    equal(toHex(memory.subarray(0, input.length)), toHex(input));
    equal(memory.subarray(0x30000).every((v) => v === 0xa5), true);
    return decoder.decode(memory.subarray(65536, 65536 + n));
  }
  return { memory, run, convert, exports: imports.r };
}
const example: Cue[] = [
  {
    id: "1",
    start: "00:00:01,000",
    end: "00:00:03,250",
    text: "Hello, world!\nSecond line.",
  },
  {
    id: "2",
    start: "00:00:03,000",
    end: "00:00:05,000",
    text: "<i>Overlapping subtitles</i>",
  },
];

Deno.test("SubRip reader: flat rows, multiline text, overlaps and physical line endings", async () => {
  const r = await reader();
  for (const nl of ["\n", "\r\n", "\r"]) {
    equal(r.convert(fence(srt(example, nl), 3, nl)), cueList(example));
    equal(
      r.convert(fence("\ufeff" + srt(example, nl), 3, nl)),
      cueList(example),
    );
  }
  const unusual: Cue[] = [
    {
      id: "0007",
      start: "0000000:01:00,100",
      end: "01:00:00,000",
      text: '  雪 😀 "quote" \\path\t  \nleading and trailing  ',
    },
    {
      id: "0",
      start: "00:00:00,000",
      end: "00:00:00,000",
      text:
        "https://example.invalid/never-fetch\n1\n00:01:00,000 --> 00:02:00,000",
    },
    {
      id: "0007",
      start: "00:00:00,000",
      end: "00:00:01,000",
      text: "<script>alert(1)</script> &amp;",
    },
  ];
  equal(r.convert(fence(srt(unusual))), cueList(unusual));
  const withWhitespace =
    "\n \t\n  001 \t\n\t00:00:01,000 \t-->\t 00:00:02,000 \t\ntext\n \t\n\n";
  equal(
    r.convert(fence(withWhitespace)),
    '- 001 00:00:01,000 --> 00:00:02,000 "text"\n',
  );
  for (const body of ["", "\n", " \t\n\n", "\ufeff"]) {
    equal(r.convert(fence(body)), "");
  }
  equal(r.convert("```srt\n```"), "");
});

Deno.test("SubRip reader: generated cue models with exact text and timestamp spelling", async () => {
  const r = await reader();
  const texts = [
    "Plain",
    "雪😀 café",
    '"quoted" \\path',
    "line one\nline two",
    "<b>literal</b>",
    "  indented\ntrailing  ",
    "tab\there",
  ];
  const time = (ms: number, extra = 0) => {
    const hours = Math.floor(ms / 3600000).toString().padStart(2 + extra, "0");
    const mins = (Math.floor(ms / 60000) % 60).toString().padStart(2, "0");
    const secs = (Math.floor(ms / 1000) % 60).toString().padStart(2, "0");
    return `${hours}:${mins}:${secs},${
      (ms % 1000).toString().padStart(3, "0")
    }`;
  };
  for (let i = 0; i < 500; i++) {
    const cues = Array.from({ length: i % 7 + 1 }, (_, j) => {
      const start = (i * 7654321 + j * 1357911) % 987654321;
      return {
        id: String(i + j).padStart(j + 1, "0"),
        start: time(start, j % 3),
        end: time(start + i * 91),
        text: texts[(i + j) % texts.length],
      };
    });
    equal(r.convert(fence(srt(cues))), cueList(cues));
  }
});

Deno.test("SubRip timestamps: component limits and exact ordering without number conversion", async () => {
  const r = await reader();
  const timestamp = r.exports.timestamp as (a: number, b: number) => number;
  const notAfter = r.exports.notAfter as (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => number;
  function put(s: string, offset = 0) {
    const b = encoder.encode(s);
    r.memory.set(b, offset);
    return offset + b.length;
  }
  for (let n = 0; n < 100; n++) {
    for (
      const t of [
        `00:${String(n).padStart(2, "0")}:00,000`,
        `00:00:${String(n).padStart(2, "0")},000`,
      ]
    ) {
      const end = put(t);
      if (n < 60) equal(timestamp(0, end), end);
      else traps(() => timestamp(0, end));
    }
  }
  for (
    const t of [
      "0:00:00,000",
      "00:0:00,000",
      "00:00:0,000",
      "00:00:00.000",
      "00:00:00,00",
      "-1:00:00,000",
      "aa:00:00,000",
      "00:00:00,0a0",
    ]
  ) {
    const end = put(t);
    traps(() => timestamp(0, end));
  }
  const micros = (s: string) => {
    const m = /^(\d+):(\d{2}):(\d{2}),(\d{3})$/.exec(s)!;
    return BigInt(m[1]) * 3600000n + BigInt(m[2]) * 60000n +
      BigInt(m[3]) * 1000n + BigInt(m[4]);
  };
  for (let i = 0; i < 1000; i++) {
    const a = (BigInt(i) ** 7n).toString().padStart(2 + i % 5, "0") +
      `:59:59,${String(i % 1000).padStart(3, "0")}`;
    const b = (BigInt(1000 - i) ** 7n).toString().padStart(2 + i % 7, "0") +
      ":00:00,000";
    const ae = put(a), be = put(b, 1000);
    equal(timestamp(0, ae), ae);
    equal(timestamp(1000, be), be);
    equal(notAfter(0, ae, 1000, be), micros(a) <= micros(b) ? 1 : 0);
  }
  const huge = "9".repeat(300) + ":59:59,999",
    later = "1" + "0".repeat(300) + ":00:00,000";
  const a = put(huge), b = put(later, 1000);
  equal(timestamp(0, a), a);
  equal(timestamp(1000, b), b);
  equal(notAfter(0, a, 1000, b), 1);
  equal(notAfter(1000, b, 0, a), 0);
  equal(notAfter(0, a, 0, a), 1);
  const zero = put("0000:59:59,999"), one = put("01:00:00,000", 1000);
  equal(notAfter(0, zero, 1000, one), 1);
});

Deno.test("SubRip reader: malformed cue syntax fails without poisoning another call", async () => {
  const r = await reader();
  const bad = [
    "1",
    "1\n00:00:00,000 --> 00:00:01,000",
    "1\n00:00:00,000 --> 00:00:01,000\n \t",
    "word\n00:00:00,000 --> 00:00:01,000\ntext",
    "-1\n00:00:00,000 --> 00:00:01,000\ntext",
    "1 extra\n00:00:00,000 --> 00:00:01,000\ntext",
    "1\n00:00:02,000 --> 00:00:01,999\ntext",
    "1\n00:00:00,000-->00:00:01,000\ntext",
    "1\n00:00:00,000 -> 00:00:01,000\ntext",
    "1\n00:00:00,000 --> 00:00:01,000 X1:1 X2:2 Y1:3 Y2:4\ntext",
    "1\n00:00:00,0000 --> 00:00:01,000\ntext",
    "1\n00:00:00,000 --> 00:00:01,0000\ntext",
    "1\n00:00:60,000 --> 00:01:01,000\ntext",
    "1\n00:60:00,000 --> 01:00:01,000\ntext",
  ];
  for (const b of bad) {
    try {
      traps(() => r.convert(fence(b)));
    } catch (e) {
      throw Error(JSON.stringify(b), { cause: e });
    }
    equal(r.convert(fence(srt(example))), cueList(example));
  }
});

Deno.test("SubRip reader: strict UTF-8, controls and readonly line spans", async () => {
  const r = await reader();
  const line = r.exports.line as (a: number, b: number) => number[];
  const spans = "a\r\nb\rc\nd";
  r.memory.set(encoder.encode(spans), 100);
  equal(line(100, 108), [101, 103]);
  equal(line(103, 108), [104, 105]);
  equal(line(105, 108), [106, 107]);
  equal(line(107, 108), [108, 108]);
  equal(line(108, 108), [108, 108]);
  const before = r.memory.slice();
  for (const [a, b] of [[-1, 5], [5, 4], [0, 196609], [196609, 196609]]) {
    traps(() => line(a, b));
  }
  equal(toHex(r.memory), toHex(before));
  for (let n = 0; n <= 127; n++) {
    if (n >= 32 && n !== 127 || [9, 10, 13].includes(n)) continue;
    traps(() =>
      r.convert(
        fence(
          srt([{ ...example[0], text: "a" + String.fromCharCode(n) + "b" }]),
        ),
      )
    );
  }
  for (
    const bytes of [
      [0xc0, 0xaf],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0xe2, 0x82],
      [0x80],
    ]
  ) {
    const prefix = encoder.encode("```srt\n1\n00:00:00,000 --> 00:00:01,000\n");
    const suffix = encoder.encode("\n```\n");
    r.memory.set(prefix);
    r.memory.set(bytes, prefix.length);
    r.memory.set(suffix, prefix.length + bytes.length);
    traps(() => r.run(prefix.length + bytes.length + suffix.length));
  }
  equal(r.convert(fence(srt(example))), cueList(example));
});

Deno.test("SubRip reader: fence boundaries and literal backtick lines stay visible", async () => {
  const r = await reader();
  for (const ticks of [3, 4, 7, 128]) {
    equal(r.convert(fence(srt(example), ticks)), cueList(example));
  }
  for (
    const bad of [
      "",
      "```srt",
      "```srt\n",
      "```txt\n```",
      " ```srt\n```",
      "```srt extra\n```",
      "````srt\n```",
      "```srt\n```text",
    ]
  ) traps(() => r.convert(bad));
  for (const close of ["```", "````", " ```", "  ``` ", "   ```\t"]) {
    const cue = { ...example[0], text: "before\n" + close + "\nafter" };
    traps(() => r.convert(fence(srt([cue]))));
    equal(r.convert(fence(srt([cue]), 5)), cueList([cue]));
  }
  const indented = { ...example[0], text: "before\n    ```\nafter" };
  equal(r.convert(fence(srt([indented]))), cueList([indented]));
});

Deno.test("SubRip reader: exact source cap, output expansion and scratch isolation", async () => {
  const r = await reader();
  const baseline = fence(srt([{ ...example[0], text: "x" }]));
  const cue = {
    ...example[0],
    text: "x".repeat(65536 - encoder.encode(baseline).length + 1),
  };
  const full = fence(srt([cue]));
  equal(encoder.encode(full).length, 65536);
  equal(r.convert(full), cueList([cue]));
  traps(() => r.run(65537));
  traps(() => r.run(-1));
  // A JSON quote can double a text byte, without changing the text's meaning.
  const dense = { ...cue, text: '"'.repeat(cue.text.length) };
  equal(r.convert(fence(srt([dense]))), cueList([dense]));
  // Many tiny cues exercise per-row overhead instead of quote expansion.
  const tiny = {
    id: "0",
    start: "00:00:00,000",
    end: "00:00:00,000",
    text: "x",
  };
  const rows = Array.from({ length: 1800 }, () => tiny);
  equal(r.convert(fence(srt(rows))), cueList(rows));
  equal(r.memory.subarray(0x30000).every((v) => v === 0xa5), true);
  equal(r.convert(fence(srt(example))), cueList(example));
});

Deno.test("SubRip shared spans: offset-independent, bounded and read-only", async () => {
  const r = await reader();
  const digits = r.exports.digits as (a: number, b: number) => number;
  const spaces = r.exports.spaces as (a: number, b: number) => number;
  const timestamp = r.exports.timestamp as (a: number, b: number) => number;
  const line = r.exports.line as (a: number, b: number) => [number, number];
  const notAfter = r.exports.notAfter as (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => number;
  const text = " \t000012:34:56,789";
  for (const offset of [0, 65536, 196608 - text.length]) {
    const end = offset + text.length;
    r.memory.set(encoder.encode(text), offset);
    const snapshot = r.memory.slice();
    equal(spaces(offset, end), offset + 2);
    equal(digits(offset + 2, end), offset + 8);
    equal(timestamp(offset + 2, end), end);
    equal(line(offset, end), [end, end]);
    equal(notAfter(offset + 2, end, offset + 2, end), 1);
    // Every truncated timestamp must fail even if valid bytes follow its bound.
    for (let bound = offset + 2; bound < end; bound++) {
      traps(() => timestamp(offset + 2, bound));
    }
    equal(toHex(r.memory), toHex(snapshot));
  }
  for (const span of [[-1, 0], [0, -1], [2, 1], [0, 196609]]) {
    const [a, b] = span;
    for (const f of [digits, spaces, timestamp, line]) traps(() => f(a, b));
    traps(() => notAfter(a, b, 0, 0));
    traps(() => notAfter(0, 0, a, b));
  }
  equal(spaces(196608, 196608), 196608);
  equal(line(196608, 196608), [196608, 196608]);
  traps(() => digits(196608, 196608));
  traps(() => timestamp(196608, 196608));
  equal(r.memory.subarray(0x30000).every((v) => v === 0xa5), true);
});
