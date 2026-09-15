import ICAL from "npm:ical.js@2.2.1";
import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      JSON.stringify(a).slice(0, 1200) + " != " +
        JSON.stringify(b).slice(0, 1200),
    );
  }
}
function traps(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) return;
    throw error;
  }
  throw Error("Expected Wasm trap");
}
async function helper() {
  const n = (await WebAssembly.instantiate(
    assemble(
      await Deno.readTextFile(
        new URL("numbers/02-json-number.md", import.meta.url),
      ),
    ).bytes,
  )).instance.exports;
  const a = assemble(
    await Deno.readTextFile(
      new URL("transforms/00-calendar-lines.md", import.meta.url),
    ),
  );
  equal(toHex(a.bytes), toHex(assemble(a.resolved).bytes));
  const c = (await WebAssembly.instantiate(a.bytes, { n })).instance
    .exports as unknown as {
      memory: WebAssembly.Memory;
      unfold(s: number, e: number): number;
      utf8(s: number, e: number): void;
      nameEnd(s: number, e: number): number;
      parameter(s: number, e: number): [number, number, number];
      line(s: number, e: number): [number, number, number, number, number];
    };
  const memory = new Uint8Array(c.memory.buffer);
  const text = (s: number, e: number) => decoder.decode(memory.subarray(s, e));
  function input(source: string | Uint8Array, offset = 0) {
    const bytes = typeof source === "string" ? encoder.encode(source) : source;
    if (offset + bytes.length > 65536) throw Error("Oversized test input");
    memory.set(bytes, offset);
    return offset + bytes.length;
  }
  function unfold(source: string | Uint8Array, offset = 0) {
    const end = input(source, offset);
    const before = memory.slice(offset, end);
    const length = c.unfold(offset, end);
    equal(toHex(memory.subarray(offset, end)), toHex(before));
    if (length < 0 || length > 65536) throw Error("Bad unfolded length");
    return text(65536, 65536 + length);
  }
  function lines(source: string) {
    const unfolded = unfold(source),
      end = 65536 + encoder.encode(unfolded).length;
    const result: { name: string; parameters: string; value: string }[] = [];
    let start = 65536;
    while (start < end) {
      const [nameEnd, parametersEnd, valueStart, valueEnd, next] = c.line(
        start,
        end,
      );
      if (next <= start || next > end || valueStart !== parametersEnd + 1) {
        throw Error("Non-advancing or malformed line spans");
      }
      result.push({
        name: text(start, nameEnd),
        parameters: text(nameEnd, parametersEnd),
        value: text(valueStart, valueEnd),
      });
      start = next;
    }
    equal(c.line(end, end), [end, end, end, end, end]);
    return result;
  }
  return { c, memory, text, input, unfold, lines };
}

Deno.test("Calendar lines: exact offsets and quoted delimiter ownership", async () => {
  const h = await helper();
  const source =
    'ATTENDEE;CN="Doe, Jane";ROLE=REQ-PARTICIPANT:mailto:jane@example.com\nSUMMARY:Hello';
  const end = h.input(source);
  const newline = source.indexOf("\n"), colon = source.indexOf(":mailto");
  equal(h.c.line(0, end), [8, colon, colon + 1, newline, newline + 1]);
  equal(h.c.parameter(9, newline), [11, 12, 23]);
  const nextParam = h.c.parameter(24, newline);
  equal(h.text(24, nextParam[0]), "ROLE");
  equal(h.text(nextParam[1], nextParam[2]), "REQ-PARTICIPANT");
  equal(nextParam[2], colon);
  equal(h.lines(source), [
    {
      name: "ATTENDEE",
      parameters: ';CN="Doe, Jane";ROLE=REQ-PARTICIPANT',
      value: "mailto:jane@example.com",
    },
    { name: "SUMMARY", parameters: "", value: "Hello" },
  ]);
  equal(h.lines('X-TEST;P="a:b;c,d","",plain,,last:one:two;three,four'), [{
    name: "X-TEST",
    parameters: ';P="a:b;c,d","",plain,,last',
    value: "one:two;three,four",
  }]);
  equal(h.lines("X;P=:")[0], { name: "X", parameters: ";P=", value: "" });
});

Deno.test("Calendar unfolding: one whitespace byte and split UTF-8 repair", async () => {
  const h = await helper();
  equal(h.unfold("A\r\n  B"), "A B");
  equal(h.unfold("A\n\t\tB"), "A\tB");
  equal(h.unfold("A\r\n \r\n\tB"), "AB");
  equal(h.unfold("A\r\nB\nC"), "A\nB\nC");
  equal(h.unfold(""), "");
  const raw = encoder.encode("SUMMARY:hé雪😀\tmore");
  for (let split = 1; split < raw.length; split++) {
    for (const whitespace of [9, 32]) {
      const folded = Uint8Array.from([
        ...raw.subarray(0, split),
        13,
        10,
        whitespace,
        ...raw.subarray(split),
      ]);
      equal(h.unfold(folded, 17), decoder.decode(raw));
    }
  }
  for (
    const source of ["A\r", "A\rB", "A\r \nB", "A\0B", "A\u007fB", "A\u0001B"]
  ) {
    traps(() => h.unfold(source));
  }
  traps(() => h.unfold(Uint8Array.from([0xf0, 13, 10, 32, 0x80])));
  equal(h.unfold("SUMMARY:Recovered\r\n"), "SUMMARY:Recovered\n");
});

Deno.test("Calendar content lines: generated folds agree with ICAL.js", async () => {
  const h = await helper();
  for (let i = 0; i < 300; i++) {
    const summary = ["Small meeting", "雪の日", "Compilers 😀", "Café"][i % 4] +
      " " + i;
    const physical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Microwasm//Test//EN",
      "BEGIN:VEVENT",
      "UID:event-" + i,
      "DTSTAMP:20260915T120000Z",
      "SUMMARY;LANGUAGE=en:" + summary,
      'ATTENDEE;CN="Doe, Jane";MEMBER="mailto:a@example.com","mailto:b@example.com":mailto:jane@example.com',
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const folded = physical.map((line) => {
      const chars = Array.from(line), parts: string[] = [];
      const width = 3 + i % 31;
      for (let p = 0; p < chars.length; p += width) {
        parts.push(chars.slice(p, p + width).join(""));
      }
      return parts.join(i % 2 ? "\r\n " : "\r\n\t");
    }).join("\r\n") + "\r\n";
    const normalized = h.unfold(folded);
    equal(normalized, physical.join("\n") + "\n");
    const actual = ICAL.parse(folded);
    equal(ICAL.parse(normalized), actual);
    const component = new ICAL.Component(actual);
    const event = component.getFirstSubcomponent("vevent")!;
    equal(event.getFirstPropertyValue("summary"), summary);
    const rows = h.lines(folded);
    equal(rows.find((r) => r.name === "SUMMARY"), {
      name: "SUMMARY",
      parameters: ";LANGUAGE=en",
      value: summary,
    });
    equal(
      rows.find((r) => r.name === "ATTENDEE")?.parameters,
      ';CN="Doe, Jane";MEMBER="mailto:a@example.com","mailto:b@example.com"',
    );
  }
});

Deno.test("Calendar content lines: malformed headers and controls cannot hide in quotes", async () => {
  const h = await helper();
  const invalid = [
    "",
    ":value",
    "NO-COLON",
    "BAD_NAME:value",
    "é:value",
    "X;:value",
    "X;P:value",
    'X;P="unterminated:value',
    'X;P="a"x:value',
    'X;P=a"b:value',
    'X;P="a\\"b":value',
    "X;P=a\n:value",
    "X;P=\r:value",
    "X;P=\0:value",
    'X;P="a\u0001b":value',
    "X:value\r",
    "X:val\u007fue",
  ];
  for (const source of invalid) {
    const end = h.input(source);
    if (source === "") {
      equal(h.c.line(0, 0), [0, 0, 0, 0, 0]);
    } else traps(() => h.c.line(0, end));
  }
  for (const source of ["\n", " \n", "\t\n"]) {
    const end = h.input(source);
    traps(() => h.c.line(0, end));
  }
  for (
    const bytes of [
      [88, 59, 80, 61, 34, 0xc0, 0xaf, 34, 58, 97],
      [88, 58, 0xed, 0xa0, 0x80],
      [88, 58, 0xf4, 0x90, 0x80, 0x80],
    ]
  ) {
    const end = h.input(Uint8Array.from(bytes));
    traps(() => h.c.line(0, end));
  }
  equal(h.lines("x-name;p=abc:X\\nY:Z"), [{
    name: "x-name",
    parameters: ";p=abc",
    value: "X\\nY:Z",
  }]);
});

Deno.test("Calendar UTF-8 span: native fatal decoder agrees without scratch writes", async () => {
  const h = await helper();
  let state = 0x1741;
  for (let i = 0; i < 1000; i++) {
    const bytes = Uint8Array.from({ length: i % 17 }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state >>> 24;
    });
    const end = h.input(bytes, 65500);
    let valid = true;
    try {
      decoder.decode(bytes);
    } catch {
      valid = false;
    }
    if (valid) h.c.utf8(65500, end);
    else traps(() => h.c.utf8(65500, end));
    equal(toHex(h.memory.subarray(65500, end)), toHex(bytes));
  }
  for (const value of ["\0", "\t", "\n", "\u007f", "é", "雪", "😀", "\uffff"]) {
    const end = h.input(value);
    h.c.utf8(0, end); // Encoding validation alone does not reject controls.
  }
});

Deno.test("Calendar span limits: full page, no mutations while reading, and reuse", async () => {
  const h = await helper();
  h.memory.fill(0xa5, 131072);
  const source = "X:" + "a".repeat(65534);
  equal(h.unfold(source), source);
  equal(h.c.line(65536, 131072), [65537, 65537, 65538, 131072, 131072]);
  const snapshot = h.memory.slice();
  h.c.utf8(65536, 131072);
  h.c.nameEnd(65536, 131072);
  h.c.line(65536, 131072);
  equal(toHex(h.memory), toHex(snapshot));
  traps(() => h.c.unfold(0, 65537));
  traps(() => h.c.unfold(2, 1));
  traps(() => h.c.unfold(-1, 1));
  for (const fn of [h.c.utf8, h.c.nameEnd, h.c.parameter, h.c.line]) {
    traps(() => fn(0, 196609));
    traps(() => fn(2, 1));
    traps(() => fn(-1, 0));
  }
  equal(h.c.line(196608, 196608), [196608, 196608, 196608, 196608, 196608]);
  equal(h.unfold("X:\r\n"), "X:\n");
  equal(h.memory.subarray(131072).every((byte) => byte === 0xa5), true);
});

Deno.test("UTF-8 SIMD: lane positions, unaligned loads, scalar tails and pending continuations", async () => {
  const h = await helper();
  const sequences = [
    [0],
    [127],
    [0x80],
    [0xc0, 0xaf],
    [0xc2, 0xa0],
    [0xe0, 0xa0, 0x80],
    [0xed, 0xa0, 0x80],
    [0xed, 0x9f, 0xbf],
    [0xf0, 0x90, 0x80, 0x80],
    [0xf4, 0x90, 0x80, 0x80],
    [0xc2],
    [0xe2, 0x82],
    [0xf0, 0x9f, 0x98],
  ];
  for (let offset = 0; offset < 16; offset++) {
    for (let lane = 0; lane < 32; lane++) {
      for (const seq of sequences) {
        for (const tail of [0, 15, 16, 17]) {
          const bytes = new Uint8Array(lane + seq.length + tail).fill(65);
          bytes.set(seq, lane);
          const end = h.input(bytes, offset);
          h.memory.fill(0xff, end, end + 16); // Outside the span is not input.
          let valid = true;
          try {
            decoder.decode(bytes);
          } catch {
            valid = false;
          }
          if (valid) h.c.utf8(offset, end);
          else traps(() => h.c.utf8(offset, end));
          equal(toHex(h.memory.subarray(offset, end)), toHex(bytes));
        }
      }
    }
  }
  for (let length = 0; length <= 48; length++) {
    const start = 196608 - length;
    h.memory.fill(65, start, 196608);
    h.memory.fill(0xff, 196608);
    h.c.utf8(start, 196608);
  }
});
