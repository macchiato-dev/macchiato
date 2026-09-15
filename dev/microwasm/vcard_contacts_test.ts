import ICAL from "npm:ical.js@2.2.1";
import { assemble, toHex } from "./microwasm.ts";
import { transforms } from "./transforms.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const fence = (s: string, ticks = "```") =>
  ticks + "vcard\n" + s + "\n" + ticks + "\n";
const card = (s: string, version = 4) =>
  "BEGIN:VCARD\nVERSION:" + version + ".0\nFN:Jane\n" +
  (version === 3 ? "N:Doe;Jane;;;\n" : "") + s + "END:VCARD";
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      JSON.stringify(a).slice(0, 1400) + " != " +
        JSON.stringify(b).slice(0, 1400),
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
      ["v", "transforms/36-vcard-to-contacts"],
    ]
  ) {
    const a = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(a.resolved).bytes), toHex(a.bytes));
    imports[name] =
      (await WebAssembly.instantiate(a.bytes, imports)).instance.exports;
  }
  const v = imports.v as unknown as {
    memory: WebAssembly.Memory;
    run(n: number): number;
  };
  const memory = new Uint8Array(v.memory.buffer);
  const literals = memory.slice(0x30000);
  function bytes(input: Uint8Array) {
    if (input.length > 65536) throw Error("Oversized test input");
    memory.set(input);
    let n: number;
    try {
      n = v.run(input.length);
    } finally {
      equal(toHex(memory.subarray(0x30000)), toHex(literals));
    }
    if (n < 0 || n > 131072) throw Error("Invalid output length");
    return decoder.decode(memory.subarray(65536, 65536 + n));
  }
  return { v, memory, bytes, run: (s: string) => bytes(encoder.encode(s)) };
}

type Row = [header: string, mode: string, value: unknown];
// Read only the generated Markdown representation, not the vCard input.
function outline(markdown: string): Row[][] {
  const cards: Row[][] = [];
  for (const line of markdown.split("\n")) {
    if (!line || line === "# Contacts") continue;
    if (line === "## Contact") cards.push([]);
    else {
      const row = /^- ("(?:[^"\\]|\\.)*") (raw|text|text-list|structured) (.*)$/
        .exec(line);
      if (!row || !cards.length) throw Error("Invalid contact row: " + line);
      cards.at(-1)!.push([JSON.parse(row[1]), row[2], JSON.parse(row[3])]);
    }
  }
  return cards;
}

Deno.test("Contacts: catalogue, grouped fields and late version discovery", async () => {
  const r = await reader();
  const demo = transforms.find((t) => t.id === "36-vcard-to-contacts")!;
  equal(r.run(demo.input), demo.expected);
  const input =
    "BEGIN:VCARD\nUID:one\\,two\nFN:Jane\nN:Doe;Jane\nVERSION:3.0\nEND:VCARD\n\n" +
    card("UID:urn:example:one,two\nitem1.EMAIL;TYPE=home:jane@example.com\n");
  equal(outline(r.run(fence(input))), [
    [
      ["UID", "text", "one,two"],
      ["FN", "text", "Jane"],
      ["N", "structured", [["Doe"], ["Jane"]]],
      ["VERSION", "text", "3.0"],
    ],
    [
      ["VERSION", "text", "4.0"],
      ["FN", "text", "Jane"],
      ["UID", "raw", "urn:example:one,two"],
      ["item1.EMAIL;TYPE=home", "text", "jane@example.com"],
    ],
  ]);
});

Deno.test("Contacts: mode table, lexical parameters and binary preservation", async () => {
  const r = await reader();
  const fields = [
    'item1.NOTE;X-LABEL="home,office:desk";VALUE="TeXt":hello;there',
    "X-UNKNOWN:one\\q,two;three",
    "X-UNKNOWN;VALUE=text:one\\,two;three",
    "NICKNAME:Jane,JJ,",
    "ORG:Company\\, Inc.;R&D;",
    "TZ:America/Phoenix",
    "TEL:tel:+1-555-0000",
    "BDAY;VALUE=text:after the party",
    "PHOTO:data:image/png;base64,a+b/==",
    "NOTE;CHARSET=UTF-8:中文",
  ];
  equal(outline(r.run(fence(card(fields.join("\n") + "\n"))))[0].slice(2), [
    [
      'item1.NOTE;X-LABEL="home,office:desk";VALUE="TeXt"',
      "text",
      "hello;there",
    ],
    ["X-UNKNOWN", "raw", "one\\q,two;three"],
    ["X-UNKNOWN;VALUE=text", "text", "one,two;three"],
    ["NICKNAME", "text-list", ["Jane", "JJ", ""]],
    ["ORG", "structured", [["Company, Inc."], ["R&D"], [""]]],
    ["TZ", "text", "America/Phoenix"],
    ["TEL", "raw", "tel:+1-555-0000"],
    ["BDAY;VALUE=text", "text", "after the party"],
    ["PHOTO", "raw", "data:image/png;base64,a+b/=="],
    ["NOTE;CHARSET=UTF-8", "text", "中文"],
  ]);
  for (const order of ["ENCODING=b;VALUE=binary", "VALUE=binary;ENCODING=b"]) {
    equal(
      outline(r.run(fence(card("PHOTO;" + order + ":YWJj\n", 3))))[0].at(-1),
      ["PHOTO;" + order, "raw", "YWJj"],
    );
  }
  for (
    const name of [
      "UID",
      "KEY",
      "LABEL",
      "MAILER",
      "SORT-STRING",
      "CLASS",
      "NAME",
      "PROFILE",
    ]
  ) {
    equal(outline(r.run(fence(card(name + ":x\\,y\n", 3))))[0].at(-1), [
      name,
      "text",
      "x,y",
    ]);
    equal(outline(r.run(fence(card(name + ":x\\,y\n"))))[0].at(-1), [
      name,
      "raw",
      "x\\,y",
    ]);
  }
  for (const name of ["KIND", "XML", "TZ"]) {
    equal(outline(r.run(fence(card(name + ":x\\,y\n"))))[0].at(-1), [
      name,
      "text",
      "x,y",
    ]);
  }
});

Deno.test("Contacts: generated text and components agree with ICAL.js", async () => {
  const r = await reader();
  const samples = [
    "",
    "Jane",
    "a,b;c\\d",
    "two\nlines",
    "é中😀",
    '"&<>|`',
    "\t",
    "𝄞",
  ];
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n")
      .replace(/,/g, "\\,").replace(/;/g, "\\;");
  for (let i = 0; i < 240; i++) {
    const version = i % 2 ? 3 : 4;
    const pick = (j: number) =>
      samples[(i * 5 + j) % samples.length] +
      ((i + j) % 3 ? String(i) : "");
    const n = Array.from(
      { length: 5 },
      (_, j) => j % 2 ? [pick(j), pick(j + 1)] : [pick(j)],
    );
    const adr = Array.from({ length: 7 }, (_, j) => [pick(j)]);
    const org = [pick(1), pick(4), ""];
    // ICAL.js 2.2.1 retains \; outside structured properties in both versions.
    // Test those valid escapes against explicit expectations separately.
    // Use bare semicolons in v4 here; v3 comparison text avoids semicolons.
    const scalar = (s: string) => version === 3 ? s.replace(/;/g, ":") : s;
    const names = [scalar(pick(2)), scalar(pick(5))];
    const note = scalar(pick(7));
    const textEscape = (s: string) =>
      version === 3
        ? escape(s)
        : s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
    const source = "BEGIN:VCARD\nVERSION:" + version + ".0\nFN:Jane\n" +
      "N:" + n.map((part) => part.map(escape).join(",")).join(";") + "\n" +
      "ADR:" + adr.map((part) => part.map(escape).join(",")).join(";") +
      "\n" +
      "ORG:" + org.map(escape).join(";") + "\n" +
      "NICKNAME:" + names.map(textEscape).join(",") + "\n" +
      "NOTE:" + textEscape(note) + "\nEND:VCARD";
    const rows = outline(r.run(fence(source)))[0];
    equal(rows.slice(2), [
      ["N", "structured", n],
      ["ADR", "structured", adr],
      ["ORG", "structured", org.map((s) => [s])],
      ["NICKNAME", "text-list", names],
      ["NOTE", "text", note],
    ]);
    const parsed = ICAL.parse(source) as [string, unknown[][], unknown[]];
    for (const [header, mode, value] of rows) {
      const field = parsed[1].find((p) => p[0] === header.toLowerCase())!;
      const actual = mode === "structured"
        ? (value as string[][]).map((part) =>
          part.length === 1 ? part[0] : part
        )
        : value;
      equal(actual, mode === "text-list" ? field.slice(3) : field[3]);
    }
  }
});

Deno.test("Contacts: boundary, required-field and version failures recover", async () => {
  const r = await reader(), good = fence(card(""));
  for (
    const source of [
      "",
      "BEGIN:VCARD\nEND:VCARD",
      "BEGIN:VCARD\nVERSION:4.0\nEND:VCARD",
      "BEGIN:VCARD\nFN:Jane\nVERSION:4.0\nEND:VCARD",
      "BEGIN:VCARD\nVERSION:2.1\nFN:Jane\nEND:VCARD",
      "BEGIN:VCARD\nVERSION:3.0\nFN:Jane\nEND:VCARD",
      card("VERSION:4.0\n"),
      card("BEGIN:VCARD\n"),
      card("item1.END:VCARD\n"),
      card("item1.VERSION:4.0\n"),
      card("\n"),
      card("").replace("END:VCARD", "END:VCALENDAR"),
      card("").replace("END:VCARD", "END;X=y:VCARD"),
      card("").replace("BEGIN:VCARD", "BEGIN;X=y:VCARD"),
      card("").replace("BEGIN:VCARD", "item1.BEGIN:VCARD"),
      card("").replace("END:VCARD", ""),
      card("") + "\nNOTE:orphan",
      card("a.b.c:field\n"),
      card(".FN:name\n"),
      card("a.:name\n"),
    ]
  ) {
    try {
      traps(() => r.run(fence(source)));
    } catch (e) {
      throw Error(JSON.stringify(source), { cause: e });
    }
    equal(outline(r.run(good)).length, 1);
  }
  equal(outline(r.run(fence(card("").toLowerCase())))[0][1], [
    "fn",
    "text",
    "jane",
  ]);
});

Deno.test("Contacts: escape syntax, components and parameter rejection", async () => {
  const r = await reader();
  for (const version of [3, 4]) {
    equal(
      outline(
        r.run(fence(card("NOTE:a\\;b\nNICKNAME:a\\;b,c\\;d\n", version))),
      )[0].slice(-2),
      [["NOTE", "text", "a;b"], ["NICKNAME", "text-list", ["a;b", "c;d"]]],
    );
  }
  for (const n of ["", "Doe", "Doe;Jane", ";;;;"]) {
    equal(
      outline(
        r.run(
          fence("BEGIN:VCARD\nVERSION:3.0\nFN:Jane\nN:" + n + "\nEND:VCARD"),
        ),
      )[0].at(-1),
      ["N", "structured", n.split(";").map((s) => [s])],
    );
  }
  traps(() =>
    r.run(fence("BEGIN:VCARD\nVERSION:3.0\nFN:Jane\nN:;;;;;\nEND:VCARD"))
  );
  traps(() => r.run(fence(card("ADR:;;;;;;;\n", 3))));
  for (
    const row of [
      "NOTE:x\\q",
      "NOTE:x\\",
      "NOTE:x,y",
      "ORG:x,y",
      "N:a;b;c;d",
      "N:;;;;;",
      "ADR:;;;;;",
      "ADR:;;;;;;;",
      "FN;VALUE=:x",
      "FN;VALUE=text,uri:x",
      "FN;VALUE=text;VALUE=uri:x",
      "NOTE;CHARSET=ISO-8859-1:x",
      "NOTE;CHARSET=UTF-8;CHARSET=UTF-8:x",
      "PHOTO;ENCODING=b:x",
      'FN;X="unterminated:x',
      'FN;X="a"junk:x',
    ]
  ) traps(() => r.run(fence(card(row + "\n"))));
  for (
    const row of [
      "NOTE:semi;colon",
      "PHOTO;ENCODING=QUOTED-PRINTABLE:x",
      "PHOTO;ENCODING=b;ENCODING=b:x",
    ]
  ) {
    traps(() => r.run(fence(card(row + "\n", 3))));
  }
  equal(outline(r.run(fence(card("NOTE:semi;colon\n"))))[0].at(-1), [
    "NOTE",
    "text",
    "semi;colon",
  ]);
  equal(outline(r.run(fence(card("NOTE:a\\N\\n\\;\\,\\\\\n"))))[0].at(-1), [
    "NOTE",
    "text",
    "a\n\n;,\\",
  ]);
  equal(outline(r.run(fence(card("ADR:;\n", 3))))[0].at(-1), [
    "ADR",
    "structured",
    [[""], [""]],
  ]);
});

Deno.test("Contacts: UTF-8 folding, controls and fence boundaries", async () => {
  const r = await reader();
  const source = fence("\ufeff" + card("NOTE:é中😀\n")).replaceAll(
    "\n",
    "\r\n",
  );
  const b = encoder.encode(source);
  const start = b.indexOf(0xf0);
  for (let split = 1; split < 4; split++) {
    const folded = new Uint8Array(b.length + 3);
    folded.set(b.subarray(0, start + split));
    folded.set([13, 10, 9], start + split);
    folded.set(b.subarray(start + split), start + split + 3);
    equal(outline(r.bytes(folded))[0].at(-1), ["NOTE", "text", "é中😀"]);
  }
  for (
    const bad of [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [
      0xe2,
      0x82,
    ], [0x80]]
  ) {
    const prefix = encoder.encode("```vcard\nBEGIN:VCARD\nVERSION:4.0\nFN:");
    const suffix = encoder.encode("\nEND:VCARD\n```\n");
    traps(() => r.bytes(new Uint8Array([...prefix, ...bad, ...suffix])));
  }
  for (let byte = 0; byte <= 127; byte++) {
    if (byte >= 32 && byte !== 127 || byte === 9) continue;
    if (byte === 10) continue; // Tested as a malformed separate content line.
    traps(() =>
      r.run(fence(card("NOTE:a" + String.fromCharCode(byte) + "b\n")))
    );
  }
  for (
    const s of [
      fence(card("")).replace("vcard", "ics"),
      fence(card("")).replace("vcard", "vcard extra"),
      "``vcard\n" + card("") + "\n``\n",
      "```vcard\n" + card("") + "\n```\n" + card("") + "\n```\n",
      fence(card("")).slice(0, -4),
      fence(card("")) + "not part of the fence",
    ]
  ) traps(() => r.run(s));
  equal(outline(r.run(fence(card("NOTE:```\n"), "````")))[0].at(-1), [
    "NOTE",
    "text",
    "```",
  ]);
});

Deno.test("Contacts: exact capacities, immutable literals and trap recovery", async () => {
  const r = await reader();
  const empty = fence(card("NOTE:\n"));
  const source = empty.replace(
    "NOTE:",
    "NOTE:" + "x".repeat(65536 - empty.length),
  );
  equal(source.length, 65536);
  equal(
    (outline(r.run(source))[0].at(-1)![2] as string).length,
    65536 - empty.length,
  );
  traps(() => r.v.run(65537));
  const base = r.run(fence(card(""))).length;
  const rowLength = '- "FN" text ""\n'.length;
  const count = Math.floor((131072 - base) / rowLength);
  const extra = 131072 - base - count * rowLength;
  const rows = "FN:\n".repeat(count - 1) + "FN:" + "x".repeat(extra) + "\n";
  equal(r.run(fence(card(rows))).length, 131072);
  traps(() => r.run(fence(card(rows + "FN:x\n"))));
  equal(outline(r.run(fence(card("")))).length, 1);
});
