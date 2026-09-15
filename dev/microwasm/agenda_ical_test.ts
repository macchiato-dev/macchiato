import ICAL from "npm:ical.js@2.2.1";
import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder(),
  decoder = new TextDecoder("utf-8", { fatal: true });
const wrap = (s: string) => "```ics\n" + s + "\n```\n";
const agenda = (rows: string) => "# Agenda\n\n## VCALENDAR\n\n" + rows;
const textRow = (value: string) =>
  '- "SUMMARY" text ' + JSON.stringify(value) + "\n";
const escapeText = (s: string) =>
  s.replaceAll("\\", "\\\\").replaceAll("\n", "\\n")
    .replaceAll(";", "\\;").replaceAll(",", "\\,");
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
      ["a", "transforms/34-ical-to-agenda"],
      ["w", "transforms/35-agenda-to-ical"],
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(a.resolved).bytes), toHex(a.bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const w = imports.w as unknown as Module, a = imports.a as unknown as Module;
  const memory = new Uint8Array(w.memory.buffer),
    literals = memory.slice(0x30000, 0x31000);
  memory.fill(0xa5, 0x35000);
  function run(module: Module, source: string, readOnly: boolean) {
    const input = encoder.encode(source);
    if (input.length > 65536) throw Error("Test input exceeds one page");
    memory.set(input);
    const n = module.run(input.length);
    if (readOnly) equal(toHex(memory.subarray(0, input.length)), toHex(input));
    equal(toHex(memory.subarray(0x30000, 0x31000)), toHex(literals));
    if (!memory.subarray(0x35000).every((x) => x === 0xa5)) {
      throw Error("Scratch escaped");
    }
    return decoder.decode(memory.subarray(65536, 65536 + n));
  }
  return {
    w,
    a,
    memory,
    write: (s: string) => run(w, s, true),
    read: (s: string) => run(a, s, false),
  };
}

// Independent test-only formatting oracle works on code points and strings.
function fold(logical: string): string {
  return logical.trimEnd().split("\n").map((line) => {
    let result = "", width = 0;
    for (const character of line) {
      const length = encoder.encode(character).length;
      if (width + length > 75) {
        result += "\r\n ";
        width = 1;
      }
      result += character;
      width += length;
    }
    return result + "\r\n";
  }).join("");
}
function framed(logical: string): string {
  const output = fold(logical);
  const longest = Math.max(
    0,
    ...Array.from(output.matchAll(/`+/g), (m) => m[0].length),
  );
  // The implementation conservatively measures before folding as well.
  const beforeFold = Math.max(
    0,
    ...Array.from(logical.matchAll(/`+/g), (m) => m[0].length),
  );
  const ticks = "`".repeat(Math.max(3, longest + 1, beforeFold + 1));
  return ticks + "ics\n" + output + "\n" + ticks + "\n";
}
function payload(output: string): string {
  const open = /^`{3,}ics\n/.exec(output)!;
  const closing = /\n`{3,}\n$/.exec(output)!;
  if (!open || !closing) throw Error("Missing calendar fence");
  return output.slice(open[0].length, closing.index);
}

Deno.test("Agenda writer: exact rows, escaped values and nested components", async () => {
  const p = await pair();
  const rows = '- "VERSION" raw "2.0"\n- "PRODID" text "-//Example//EN"\n' +
    '### VEVENT\n- "UID" text "first"\n- "DTSTART" raw "20260915T090000Z"\n' +
    textRow("Coffee, tea; snow 雪\nNext\\last") +
    '- "CATEGORIES" text-list ["Work","Research, reading",""]\n' +
    '#### VALARM\n- "ACTION" raw "DISPLAY"\n- "DESCRIPTION" text "Reminder"\n' +
    '### VTODO\n- "SUMMARY" text "Later"\n';
  const logical = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Example//EN\n" +
    "BEGIN:VEVENT\nUID:first\nDTSTART:20260915T090000Z\nSUMMARY:" +
    escapeText("Coffee, tea; snow 雪\nNext\\last") +
    "\nCATEGORIES:Work,Research\\, reading,\nBEGIN:VALARM\nACTION:DISPLAY\n" +
    "DESCRIPTION:Reminder\nEND:VALARM\nEND:VEVENT\nBEGIN:VTODO\nSUMMARY:Later\n" +
    "END:VTODO\nEND:VCALENDAR\n";
  const actual = p.write(agenda(rows));
  equal(actual, framed(logical));
  const component = new ICAL.Component(ICAL.parse(payload(actual)));
  equal(component.getAllSubcomponents().map((c) => c.name), [
    "vevent",
    "vtodo",
  ]);
  const event = component.getFirstSubcomponent("vevent")!;
  equal(
    event.getFirstPropertyValue("summary"),
    "Coffee, tea; snow 雪\nNext\\last",
  );
  equal(event.getFirstProperty("categories")!.getValues(), [
    "Work",
    "Research, reading",
    "",
  ]);
});

Deno.test("Agenda writer: generated reader round trips and ICAL.js equivalence", async () => {
  const p = await pair();
  for (let i = 0; i < 250; i++) {
    const value = ["Plain", "雪 😀 café", "a,b;c\\d", "First\nNext"][i % 4]
      .repeat(i % 16 + 1);
    const input = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Test//EN\n" +
      "BEGIN:VTIMEZONE\nTZID:Test/Zone\nBEGIN:STANDARD\nTZOFFSETFROM:-0400\n" +
      "TZOFFSETTO:-0500\nDTSTART:20251102T020000\nEND:STANDARD\nEND:VTIMEZONE\n" +
      "BEGIN:VEVENT\nUID:" + i + "\nDTSTART;TZID=Test/Zone:20260915T090000\n" +
      'ATTENDEE;CN="Doe, Jane";X-NOTE=one^ntwo:mailto:jane@example.com\n' +
      "SUMMARY:" + escapeText(value) + "\nCATEGORIES:A," + escapeText(value) +
      "\nX-RAW:a,b;c\\d\nEND:VEVENT\nEND:VCALENDAR";
    const normalized = p.read(wrap(input));
    const output = p.write(normalized);
    equal(p.read(output), normalized);
    equal(ICAL.parse(payload(output)), ICAL.parse(input));
  }
});

Deno.test("Agenda writer: sibling closure, heading depth and case", async () => {
  const p = await pair();
  const minimal = p.write(
    "# agenda\r\n\r\n## vcalendar\r\n### x-1\r\n### x-2\r\n",
  );
  equal(
    payload(minimal),
    "BEGIN:VCALENDAR\r\nBEGIN:X-1\r\nEND:X-1\r\n" +
      "BEGIN:X-2\r\nEND:X-2\r\nEND:VCALENDAR\r\n",
  );
  equal(
    payload(
      p.write(
        agenda('### A\n#### B\n##### C\n###### D\n- "X" raw ""\n### E\n'),
      ),
    ),
    "BEGIN:VCALENDAR\r\nBEGIN:A\r\nBEGIN:B\r\nBEGIN:C\r\nBEGIN:D\r\nX:\r\n" +
      "END:D\r\nEND:C\r\nEND:B\r\nEND:A\r\nBEGIN:E\r\nEND:E\r\nEND:VCALENDAR\r\n",
  );
  for (
    const input of [
      "# Agenda\n### X\n",
      "# Agenda\n## X\n",
      agenda("#### X\n"),
      agenda("### X\n##### Y\n"),
      agenda("### VCALENDAR\n"),
      agenda("## VCALENDAR\n"),
      agenda("### X_Y\n"),
      agenda("### \n"),
      agenda("### A\n#### B\n##### C\n###### D\n####### E\n"),
      agenda("plain prose\n"),
      agenda("  ### X\n"),
    ]
  ) traps(() => p.write(input));
  p.write(agenda(""));
});

Deno.test("Agenda writer: reject malformed JSON, header injection and inconsistent modes", async () => {
  const p = await pair();
  for (
    const row of [
      '- "SUMMARY" raw "wrong mode"',
      '- "X;VALUE=TEXT" raw "wrong mode"',
      '- "CATEGORIES" text "wrong mode"',
      '- "CATEGORIES" text-list []',
      '- "CATEGORIES" text-list ["a",]',
      '- "CATEGORIES" text-list ["a",2]',
      '- "SUMMARY" text 3',
      '- "SUMMARY" text "a" trailing',
      '- "SUMMARY" text "\\uD800"',
      '- "SUMMARY" text "\\uDC00"',
      '- "SUMMARY" text "\\x20"',
      '- "SUMMARY" text "unterminated',
      '- "SUMMARY" text "raw\nnewline"',
      '- "X" raw "\\n"',
      '- "X" raw "\\r"',
      '- "SUMMARY" text "\\r"',
      '- "SUMMARY" text "\\u0000"',
      '- "BEGIN" raw "VEVENT"',
      '- "END" raw "VCALENDAR"',
      '- "X:injected" raw "bad"',
      '- "X\\nY" raw "bad"',
      '- "X;P=\\"unterminated" raw "bad"',
      '- "X;P=\\"a\\"tail" raw "bad"',
      '- "X;VALUE=TEXT;VALUE=URI" text "bad"',
      '- "" raw "bad"',
      '- "X" raw "ok"\n- "Y" raw "bad" garbage',
    ]
  ) traps(() => p.write(agenda(row + "\n")));
  equal(
    payload(p.write(agenda('- "X;VALUE=TEXT" text "a,b"\n'))),
    "BEGIN:VCALENDAR\r\nX;VALUE=TEXT:a\\,b\r\nEND:VCALENDAR\r\n",
  );
});

Deno.test("Agenda writer: Unicode scalars, controls and lexical parameter preservation", async () => {
  const p = await pair();
  for (
    const cp of [
      9,
      10,
      32,
      127,
      128,
      0x7ff,
      0x800,
      0xd7ff,
      0xe000,
      0xfffe,
      0xffff,
      0x10000,
      0x10ffff,
    ]
  ) {
    const value = String.fromCodePoint(cp);
    if (cp === 127) {
      traps(() => p.write(agenda(textRow(value))));
      continue;
    }
    const raw = p.write(agenda(textRow(value)));
    const escaped = JSON.stringify(value).replace(
      /[^\x20-\x7e]/g,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
    );
    equal(p.write(agenda('- "SUMMARY" text ' + escaped + "\n")), raw);
  }
  for (let cp = 0; cp < 32; cp++) {
    if (cp !== 9 && cp !== 10) {
      traps(() => p.write(agenda(textRow(String.fromCharCode(cp)))));
    }
  }
  const header =
    'ATTENDEE;CN="a:b;c,d";MEMBER="mailto:a","mailto:b";X-P=one^ntwo';
  const output = p.write(
    agenda("- " + JSON.stringify(header) + ' raw "mailto:z"\n'),
  );
  equal(
    payload(output).replaceAll("\r\n ", ""),
    "BEGIN:VCALENDAR\r\n" + header +
      ":mailto:z\r\nEND:VCALENDAR\r\n",
  );
  const data = encoder.encode(agenda(textRow("valid")));
  data[data.indexOf(118, 30)] = 0xff;
  p.memory.set(data);
  traps(() => p.w.run(data.length));
});

Deno.test("Agenda writer: 75-octet folds, UTF-8 boundaries and long fences", async () => {
  const p = await pair();
  for (const character of ["a", "é", "雪", "😀", ",", "\\", "\t"]) {
    for (let prefix = 60; prefix < 80; prefix++) {
      const value = "a".repeat(prefix) + character.repeat(180);
      const output = p.write(agenda(textRow(value)));
      equal(
        output,
        framed(
          "BEGIN:VCALENDAR\nSUMMARY:" + escapeText(value) + "\nEND:VCALENDAR\n",
        ),
      );
      for (const line of payload(output).split("\r\n")) {
        if (encoder.encode(line).length > 75) throw Error("Long physical line");
        decoder.decode(encoder.encode(line)); // Whole code points, including continuations.
      }
      equal(
        p.read(output),
        p.read(
          wrap(
            "BEGIN:VCALENDAR\nSUMMARY:" + escapeText(value) + "\nEND:VCALENDAR",
          ),
        ),
      );
    }
  }
  const value = "`".repeat(80) + "\n```";
  const output = p.write(agenda(textRow(value)));
  equal(
    output,
    framed(
      "BEGIN:VCALENDAR\nSUMMARY:" + escapeText(value) + "\nEND:VCALENDAR\n",
    ),
  );
  equal(output.slice(0, 84), "`".repeat(81) + "ics");
});

Deno.test("Agenda writer: exact source/output caps, sentinels and recovery", async () => {
  const p = await pair();
  const empty = agenda('- "X" raw ""\n');
  const source = agenda(
    '- "X" raw "' + "a".repeat(65536 - encoder.encode(empty).length) + '"\n',
  );
  equal(encoder.encode(source).length, 65536);
  p.write(source);
  traps(() => p.w.run(65537));
  const outputFor = (n: number, a: number) =>
    framed(
      "BEGIN:VCALENDAR\nSUMMARY:" + "\\,".repeat(n) + "a".repeat(a) +
        "\nEND:VCALENDAR\n",
    );
  let exact: string | undefined;
  for (let a = 0; a < 76 && !exact; a++) {
    let lo = 0, hi = 65000;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (encoder.encode(outputFor(mid, a)).length <= 131072) lo = mid;
      else hi = mid - 1;
    }
    if (encoder.encode(outputFor(lo, a)).length === 131072) {
      exact = ",".repeat(lo) + "a".repeat(a);
    }
  }
  if (!exact) throw Error("No exact capacity fixture");
  equal(encoder.encode(p.write(agenda(textRow(exact)))).length, 131072);
  traps(() => p.write(agenda(textRow(exact + "a"))));
  equal(
    payload(p.write(agenda(textRow("Recovered")))),
    "BEGIN:VCALENDAR\r\nSUMMARY:Recovered\r\nEND:VCALENDAR\r\n",
  );
});
