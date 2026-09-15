import ICAL from "npm:ical.js@2.2.1";
import { assemble, toHex } from "./microwasm.ts";

const encoder = new TextEncoder(),
  decoder = new TextDecoder("utf-8", { fatal: true });
const fence = (s: string) => "```ics\n" + s + "\n```\n";
const calendar = (s: string) => "BEGIN:VCALENDAR\n" + s + "END:VCALENDAR";
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
async function reader() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["c", "transforms/00-calendar-lines"],
      ["t", "transforms/34-ical-to-agenda"],
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(a.resolved).bytes), toHex(a.bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const t = imports.t as unknown as {
    memory: WebAssembly.Memory;
    run(n: number): number;
  };
  const memory = new Uint8Array(t.memory.buffer),
    literals = memory.slice(0x30400);
  function bytes(input: Uint8Array) {
    if (input.length > 65536) throw Error("Oversized test input");
    memory.set(input);
    const n = t.run(input.length);
    if (n < 0 || n > 131072) throw Error("Invalid output length");
    equal(toHex(memory.subarray(0x30400)), toHex(literals));
    return decoder.decode(memory.subarray(65536, 65536 + n));
  }
  return { t, memory, bytes, run: (s: string) => bytes(encoder.encode(s)) };
}

// Test-only output reader: no iCalendar parsing or conversion here.
type Component = {
  name: string;
  rows: [string, string, unknown][];
  children: Component[];
};
function outline(markdown: string): Component {
  const roots: Component[] = [], stack: Component[] = [];
  for (const line of markdown.split("\n")) {
    if (!line || line === "# Agenda") continue;
    const h = /^(#{2,6}) ([A-Z0-9-]+)$/.exec(line);
    if (h) {
      const depth = h[1].length - 2;
      if (depth > stack.length) throw Error("Skipped outline depth");
      stack.length = depth;
      const node: Component = { name: h[2], rows: [], children: [] };
      (depth ? stack[depth - 1].children : roots).push(node);
      stack.push(node);
    } else {
      const row = /^- ("(?:[^"\\]|\\.)*") (raw|text|text-list) (.*)$/.exec(
        line,
      );
      if (!row || !stack.length) throw Error("Invalid agenda row: " + line);
      stack.at(-1)!.rows.push([JSON.parse(row[1]), row[2], JSON.parse(row[3])]);
    }
  }
  equal(roots.length, 1);
  return roots[0];
}

Deno.test("Agenda: parent/child cursor trace and property normalization", async () => {
  const r = await reader();
  const input = calendar(
    "VERSION:2.0\nBEGIN:VEVENT\nUID:first\nBEGIN:VALARM\nACTION:DISPLAY\n" +
      "DESCRIPTION:Wake up\nEND:VALARM\nSUMMARY:After alarm\nEND:VEVENT\n" +
      "PRODID:After event\nBEGIN:VTODO\nSUMMARY:Task\nEND:VTODO\n",
  );
  equal(outline(r.run(fence(input))), {
    name: "VCALENDAR",
    rows: [["VERSION", "raw", "2.0"], ["PRODID", "text", "After event"]],
    children: [
      {
        name: "VEVENT",
        rows: [["UID", "text", "first"], ["SUMMARY", "text", "After alarm"]],
        children: [{
          name: "VALARM",
          rows: [["ACTION", "raw", "DISPLAY"], [
            "DESCRIPTION",
            "text",
            "Wake up",
          ]],
          children: [],
        }],
      },
      { name: "VTODO", rows: [["SUMMARY", "text", "Task"]], children: [] },
    ],
  });
  equal(outline(r.run(fence(calendar("")))), {
    name: "VCALENDAR",
    rows: [],
    children: [],
  });
});

Deno.test("Agenda: lexical headers, explicit modes and TEXT list escaping", async () => {
  const r = await reader();
  const properties = [
    "SUMMARY;LANGUAGE=es:Reunión\\nmañana",
    'ATTENDEE;CN="Doe, Jane";MEMBER="mailto:a","mailto:b";X-NOTE=one^ntwo:mailto:jane',
    "CATEGORIES:Work,Research\\, reading,\\;,\\\\,",
    "RESOURCES:",
    "X-UNKNOWN:a,b;c\\d",
    'X-UNKNOWN;VALUE="tExT":a\\,b\\;c\\\\d',
    "SUMMARY;VALUE=URI:a,b;c\\d",
    "CATEGORIES;VALUE=TEXT:one,two",
    "CATEGORIES;VALUE=URI:one,two",
    "X;P=x;P=y:duplicates",
    "summary:Again",
  ];
  equal(outline(r.run(fence(calendar(properties.join("\n") + "\n")))).rows, [
    ["SUMMARY;LANGUAGE=es", "text", "Reunión\nmañana"],
    [
      'ATTENDEE;CN="Doe, Jane";MEMBER="mailto:a","mailto:b";X-NOTE=one^ntwo',
      "raw",
      "mailto:jane",
    ],
    ["CATEGORIES", "text-list", ["Work", "Research, reading", ";", "\\", ""]],
    ["RESOURCES", "text-list", [""]],
    ["X-UNKNOWN", "raw", "a,b;c\\d"],
    ['X-UNKNOWN;VALUE="tExT"', "text", "a,b;c\\d"],
    ["SUMMARY;VALUE=URI", "raw", "a,b;c\\d"],
    ["CATEGORIES;VALUE=TEXT", "text-list", ["one", "two"]],
    ["CATEGORIES;VALUE=URI", "raw", "one,two"],
    ["X;P=x;P=y", "raw", "duplicates"],
    ["summary", "text", "Again"],
  ]);
});

Deno.test("Agenda: generated event values agree with ICAL.js", async () => {
  const r = await reader();
  const escape = (s: string) =>
    s.replaceAll("\\", "\\\\").replaceAll("\n", "\\n")
      .replaceAll(";", "\\;").replaceAll(",", "\\,");
  for (let i = 0; i < 200; i++) {
    const title = ["Snow 雪", "Café 😀", "a,b;c\\d", "First\nsecond"][i % 4] +
      i;
    const categories = ["Work", title, ""];
    const source = calendar(
      "VERSION:2.0\nPRODID:-//Test//EN\nBEGIN:VEVENT\nUID:event-" + i +
        "\nDTSTAMP:20260915T120000Z\nDTSTART;TZID=America/Phoenix:20260916T090000\n" +
        "SUMMARY:" + escape(title) + "\nCATEGORIES:" +
        categories.map(escape).join(",") +
        "\nEND:VEVENT\n",
    );
    const physical = source.split("\n").map((line) => {
      const chars = Array.from(line), pieces = [], width = 2 + i % 29;
      for (let p = 0; p < chars.length; p += width) {
        pieces.push(chars.slice(p, p + width).join(""));
      }
      return pieces.join("\r\n ");
    }).join("\r\n");
    const oracle = new ICAL.Component(ICAL.parse(physical))
      .getFirstSubcomponent("vevent")!;
    const event = outline(r.run(fence(physical))).children[0];
    for (const name of ["SUMMARY", "UID"]) {
      equal(
        event.rows.find((row) => row[0] === name)![2],
        oracle.getFirstPropertyValue(name.toLowerCase()),
      );
    }
    equal(
      event.rows.find((row) => row[0] === "CATEGORIES")![2],
      oracle.getFirstProperty("categories")!.getValues(),
    );
    equal(event.rows.find((row) => row[0].startsWith("DTSTART")), [
      "DTSTART;TZID=America/Phoenix",
      "raw",
      "20260916T090000",
    ]);
  }
});

Deno.test("Agenda: time zones, unknown components and bounded nesting", async () => {
  const r = await reader();
  const input = calendar(
    "BEGIN:VTIMEZONE\nTZID:Test/Zone\nBEGIN:STANDARD\n" +
      "DTSTART:20251102T020000\nTZOFFSETFROM:-0400\nTZOFFSETTO:-0500\n" +
      "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\nTZNAME:Standard\nEND:STANDARD\n" +
      "BEGIN:DAYLIGHT\nTZNAME:Daylight\nEND:DAYLIGHT\nEND:VTIMEZONE\n" +
      "BEGIN:X-1\nX:abc\nEND:x-1\n",
  );
  const tree = outline(r.run(fence(input)));
  equal(tree.children[0].children[0].rows[3], [
    "RRULE",
    "raw",
    "FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  ]);
  equal(tree.children[0].children.map((n) => n.name), ["STANDARD", "DAYLIGHT"]);
  equal(tree.children[1].name, "X-1");
  const nested = (n: number) =>
    calendar("BEGIN:X\n".repeat(n) + "X:ok\n" + "END:X\n".repeat(n));
  r.run(fence(nested(4)));
  traps(() => r.run(fence(nested(5))));
  r.run(fence(input));
});

Deno.test("Agenda: malformed structures, values, fences and recovery", async () => {
  const r = await reader();
  for (
    const body of [
      "SUMMARY:raw,comma\n",
      "SUMMARY:raw;semicolon\n",
      "SUMMARY:bad\\q\n",
      "SUMMARY:bad\\\n",
      "X;VALUE=TEXT;value=URI:x\n",
      'X;P="unfinished:x\n',
      "BEGIN:VEVENT\nEND:VTODO\n",
      "BEGIN:VEVENT\n",
      "END:VEVENT\n",
      "BEGIN:X;P=1\nEND:X\n",
      "BEGIN:X\nEND;P=1:X\n",
      "BEGIN:\nEND:\n",
      "BEGIN:X_Y\nEND:X_Y\n",
      "BEGIN:VCALENDAR\nEND:VCALENDAR\n",
      "\n",
    ]
  ) traps(() => r.run(fence(calendar(body))));
  for (
    const input of [
      fence("BEGIN:VEVENT\nEND:VEVENT"),
      fence(calendar("") + "\n" + calendar("")),
    fence(calendar("") + "\n\n"),
      "```text\n" + calendar("") + "\n```",
      "``ics\n" + calendar("") + "\n``",
      "```ics\n" + calendar("") + "\n ```",
      fence(calendar("X:x\n   ``` \t\nX:y\n")),
      fence(calendar("X:a\rb\n")),
    ]
  ) traps(() => r.run(input));
  equal(
    outline(r.run(fence(calendar("SUMMARY:Recovered\n")))).rows[0][2],
    "Recovered",
  );
});

Deno.test("Agenda: UTF-8 fold repair before validation, BOM and CRLF", async () => {
  const r = await reader();
  const source = encoder.encode(fence("\ufeff" + calendar("SUMMARY:雪😀\n")));
  const start = source.indexOf(0xe9);
  for (let at = start + 1; at < start + 7; at++) {
    const folded = Uint8Array.from([
      ...source.subarray(0, at),
      13,
      10,
      32,
      ...source.subarray(at),
    ]);
    equal(outline(r.bytes(folded)).rows, [["SUMMARY", "text", "雪😀"]]);
  }
  equal(
    outline(r.run(fence(calendar("SUMMARY:Hello\n")).replaceAll("\n", "\r\n")))
      .rows[0][2],
    "Hello",
  );
  const malformed = source.slice();
  malformed[start] = 0xff;
  traps(() => r.bytes(malformed));
});

Deno.test("Agenda: exact capacities and immutable literals", async () => {
  const r = await reader();
  const empty = fence(calendar("X:\n"));
  const large = fence(
    calendar("X:" + "a".repeat(65536 - encoder.encode(empty).length) + "\n"),
  );
  equal(encoder.encode(large).length, 65536);
  equal(
    (outline(r.run(large)).rows[0][2] as string).length,
    65536 - encoder.encode(empty).length,
  );
  traps(() => r.t.run(65537));
  const row = "X:\t\n", overhead = r.run(fence(calendar(""))).length;
  const perRow = r.run(fence(calendar(row))).length - overhead;
  const count = Math.floor((131072 - overhead) / perRow);
  const remaining = 131072 - overhead - count * perRow;
  const body = row.repeat(count - 1) + "X:" + "a".repeat(2 + remaining) + "\n";
  const exact = fence(calendar(body));
  if (encoder.encode(exact).length > 65536) {
    throw Error("Invalid capacity fixture");
  }
  equal(r.run(exact).length, 131072);
  traps(() => r.run(fence(calendar(body.replace("X:aa", "X:aaa")))));
  equal(outline(r.run(fence(calendar("X:ok\n")))).rows[0][2], "ok");
});
