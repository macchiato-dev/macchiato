import ICAL from "npm:ical.js@2.2.1";
import { assemble, toHex } from "./microwasm.ts";
import { transforms } from "./transforms.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const row = (header: string, mode: string, value: unknown) =>
  "- " + JSON.stringify(header) + " " + mode + " " + JSON.stringify(value) +
  "\n";
const contact = (rows: string, version = "4.0") =>
  "## Contact\n\n" + row("VERSION", "text", version) +
  row("FN", "text", "Jane") + rows;
const escaped = (s: string) =>
  s.replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(
      JSON.stringify(a)?.slice(0, 1500) + " != " +
        JSON.stringify(b)?.slice(0, 1500),
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
      ["v", "transforms/36-vcard-to-contacts"],
      ["w", "transforms/37-contacts-to-vcard"],
    ]
  ) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    imports[name] =
      (await WebAssembly.instantiate(b.bytes, imports)).instance.exports;
  }
  const w = imports.w as unknown as Module, v = imports.v as unknown as Module;
  const memory = new Uint8Array(w.memory.buffer);
  const literals = memory.slice(0x30000, 0x31000);
  memory.fill(0xa5, 0x35000);
  function run(module: Module, s: string, readOnly: boolean) {
    const input = encoder.encode(s);
    if (input.length > 65536) throw Error("Test source exceeds capacity");
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
    memory,
    w,
    v: imports.v,
    write: (s: string) => run(w, s, true),
    read: (s: string) => run(v, s, false),
  };
}
function payload(output: string) {
  const open = /^`{3,}vcard\n/.exec(output), end = /\n`{3,}\n$/.exec(output);
  if (!open || !end) throw Error("Missing vCard fence");
  return output.slice(open[0].length, end.index);
}
// Independent code-point oracle: it neither uses the byte-list assembler nor
// the writer's fold-offset/backward-copy algorithm.
function framed(logical: string) {
  const ticks = "`".repeat(
    Math.max(3, ...Array.from(logical.matchAll(/`+/g), (m) => m[0].length + 1)),
  );
  const lines = logical.split("\n");
  if (lines.pop() !== "") throw Error("Oracle requires trailing LF");
  const folded = lines.map((line) => {
    let out = "", width = 0;
    for (const ch of line) {
      const n = encoder.encode(ch).length;
      if (width + n > 75) {
        out += "\r\n ";
        width = 1;
      }
      out += ch;
      width += n;
    }
    return out + "\r\n";
  }).join("");
  return ticks + "vcard\n" + folded + "\n" + ticks + "\n";
}

Deno.test("Contact writer: exact rows, optional title, grouping and two versions", async () => {
  const p = await pair();
  const demo = transforms.find((t) => t.id === "37-contacts-to-vcard")!;
  equal(p.write(demo.input), demo.expected);
  const rows =
    row("N", "structured", [["Doe"], ["Jane", "Janet"], [""], ["Dr."], [""]]) +
    row("item1.EMAIL;TYPE=home", "text", "jane@example.com") +
    row("ORG", "structured", [["Example, Inc."], ["Research"]]) +
    row("NICKNAME", "text-list", ["Jane", "JJ"]);
  const logical =
    "BEGIN:VCARD\nVERSION:4.0\nFN:Jane\nN:Doe;Jane,Janet;;Dr.;\n" +
    "item1.EMAIL;TYPE=home:jane@example.com\nORG:Example\\, Inc.;Research\n" +
    "NICKNAME:Jane,JJ\nEND:VCARD\n";
  equal(p.write(contact(rows)), framed(logical));
  equal(p.write("# Contacts\n\n" + contact(rows)), framed(logical));
  equal(p.write(contact(rows).replaceAll("\n", "\r\n")), framed(logical));
  const later = "## Contact\n" + row("UID", "text", "first,second") +
    row("FN", "text", "Ben") + row("N", "structured", [["Atkin"], ["Ben"]]) +
    '- "VERSION" text "3\\u002e0"\n';
  const laterLogical =
    "BEGIN:VCARD\nUID:first\\,second\nFN:Ben\nN:Atkin;Ben\nVERSION:3.0\nEND:VCARD\n";
  equal(p.write(contact(rows) + "\n" + later), framed(logical + laterLogical));
  const read = p.read(p.write(contact(rows) + later));
  equal(p.read(p.write(read)), read);
});

Deno.test("Contact inspector: read-only spans at multiple offsets and recovery", async () => {
  const p = await pair();
  const inspect = p.v.inspect as (a: number, b: number) => number[];
  const source = "BEGIN:VCARD\nVERSION:4.0\nFN:Jane\nEND:VCARD\n";
  const bytes = encoder.encode(source);
  for (const offset of [0, 91, 65536, 130000]) {
    p.memory.set(bytes, offset);
    const before = p.memory.slice();
    equal(inspect(offset, offset + bytes.length), [
      offset + 12,
      offset + source.indexOf("END:"),
      offset + bytes.length,
      4,
    ]);
    equal(toHex(p.memory), toHex(before));
  }
  for (
    const source of [
      "BEGIN:VCARD\nEND:VCARD\n",
      "BEGIN:VCARD\nVERSION:4.0\nFN:A\n",
      "x",
    ]
  ) {
    p.memory.set(encoder.encode(source));
    const before = p.memory.slice();
    traps(() => inspect(0, source.length));
    equal(toHex(p.memory), toHex(before));
  }
  equal(
    p.write(contact("")),
    framed("BEGIN:VCARD\nVERSION:4.0\nFN:Jane\nEND:VCARD\n"),
  );
});

Deno.test("Contact writer: generated versions, structured values and independent ICAL.js comparison", async () => {
  const p = await pair();
  const values = [
    "",
    "Plain",
    "雪😀 café",
    "a,b",
    "a;b",
    "a\\b",
    "a\nb",
    "a\tb",
  ];
  for (let i = 0; i < 240; i++) {
    const version = i % 2 ? 3 : 4;
    const text = values[i % values.length] + i;
    const n = Array.from(
      { length: version === 3 ? i % 5 + 1 : 5 },
      (_, j) => [values[(i + j) % values.length], ...(j % 2 ? [text] : [])],
    );
    const adr = Array.from(
      { length: version === 3 ? i % 7 + 1 : 7 },
      (_, j) => [values[(i + j + 1) % values.length]],
    );
    const org = [[text], ["Research"]];
    // ICAL.js retains escaped semicolons in unstructured TEXT. Test those
    // separately below; do not silently patch the independent oracle.
    const note = text.replaceAll(";", ":");
    const names = [note, "Next, value", ""];
    const input = contact(
      row("N", "structured", n) + row("ADR", "structured", adr) +
        row("ORG", "structured", org) + row("NOTE", "text", note) +
        row("NICKNAME", "text-list", names),
      version + ".0",
    );
    const logical = "BEGIN:VCARD\nVERSION:" + version + ".0\nFN:Jane\n" +
      "N:" + n.map((c) => c.map(escaped).join(",")).join(";") + "\nADR:" +
      adr.map((c) => c.map(escaped).join(",")).join(";") + "\nORG:" +
      org.map((c) => c.map(escaped).join(",")).join(";") + "\nNOTE:" +
      escaped(note) +
      "\nNICKNAME:" + names.map(escaped).join(",") + "\nEND:VCARD\n";
    const actual = p.write(input);
    equal(actual, framed(logical));
    const readerResult = p.read(actual);
    equal(p.read(p.write(readerResult)), readerResult);
    const parsed = new ICAL.Component(ICAL.parse(payload(actual)));
    equal(parsed.getFirstPropertyValue("note"), note);
    equal(parsed.getFirstProperty("nickname")!.getValues(), names);
    // ICAL.js collapses a structure with no semicolon to its sole component.
    const normalized = (parts: string[][]) => {
      const values = parts.map((c) => c.length === 1 ? c[0] : c);
      return values.length === 1 ? values[0] : values;
    };
    equal(parsed.getFirstPropertyValue("n"), normalized(n));
    equal(parsed.getFirstPropertyValue("adr"), normalized(adr));
    equal(parsed.getFirstPropertyValue("org"), normalized(org));
  }
  for (const version of ["3.0", "4.0"]) {
    const input = contact(
      row("N", "structured", [[""], [""], [""], [""], [""]]) +
        row("NOTE", "text", "one;two,three\\four\nfive"),
      version,
    );
    const actual = p.write(input);
    equal(
      payload(actual).includes("NOTE:one\\;two\\,three\\\\four\\nfive\r\n"),
      true,
    );
    equal(
      p.read(actual).includes(row("NOTE", "text", "one;two,three\\four\nfive")),
      true,
    );
  }
});

Deno.test("Contact writer: lexical headers, value overrides, repeated variants and inert resources", async () => {
  const p = await pair();
  const variants = row("N;ALTID=1;LANGUAGE=ja", "structured", [
    ["山田"],
    ["太郎"],
    [""],
    [""],
    [""],
  ]) +
    row("N;ALTID=1;LANGUAGE=en", "structured", [["Yamada"], ["Taro"], [""], [
      "",
    ], [""]]);
  const rows = variants +
    row(
      'item1.EMAIL;X-REF="https://example.com/a:b";TYPE=home,work',
      "text",
      "a@example.com",
    ) +
    row("UID;VALUE=TEXT", "text", "comma,value") +
    row("NOTE;VALUE=URI", "raw", "https://example.com/a;b,c") +
    row("X-THING;VALUE=TEXT", "text", "read, this; later") +
    row("PHOTO", "raw", "data:image/png;base64,ABC=") +
    row("URL", "raw", "javascript:alert(1)") +
    row("X-UNKNOWN", "raw", "one\\q,two;three");
  const original = "# Contacts\n\n" + contact(rows);
  const read = p.read(p.write(original));
  equal(read, original);
  const legacy = contact(
    row("N", "structured", [["Doe"], ["Jane"]]) +
      row("PHOTO;VALUE=binary;ENCODING=b;TYPE=JPEG", "raw", "aGVsbG8=") +
      row("KEY;ENCODING=b;VALUE=text", "raw", "aGVsbG8=") +
      row("FN;CHARSET=UTF-8", "text", "雪"),
    "3.0",
  );
  equal(p.read(p.write(legacy)), "# Contacts\n\n" + legacy);
  const cased = contact("").replace("## Contact", "## cOnTaCt").replaceAll(
    " text ",
    " TeXt ",
  );
  equal(p.write(cased), p.write(contact("")));
});

Deno.test("Contact writer: invalid headers, modes, arrays, required fields and failed-edit recovery", async () => {
  const p = await pair(), good = contact("");
  const badRows = [
    row("BEGIN", "raw", "VCARD"),
    row("item1.END", "raw", "VCARD"),
    row("FN:injected", "text", "other"),
    row("FN\nX", "text", "bad"),
    row('X;P="unfinished', "raw", "bad"),
    row("a.b.c", "raw", "bad"),
    row(".FN", "text", "bad"),
    row("FN", "raw", "wrong"),
    row("X-UNKNOWN", "text", "wrong"),
    row("N", "text-list", ["wrong"]),
    row("NICKNAME", "text-list", []),
    row("NICKNAME", "text-list", [1]),
    row("N", "structured", []),
    row("N", "structured", [[], [""], [""], [""], [""]]),
    row("N", "structured", [["Doe"], ["Jane"]]),
    row("ADR", "structured", [[""]]),
    row("ORG", "structured", [["one", "two"]]),
    row("ORG", "structured", ["one"]),
    row("N", "structured", Array.from({ length: 6 }, () => [""])),
    row("ADR", "structured", Array.from({ length: 8 }, () => [""])),
    row("VERSION", "text", "4.0"),
    row("NOTE;CHARSET=latin1", "text", "bad"),
    row("PHOTO;ENCODING=b", "raw", "YQ=="),
    row("FN;VALUE=text;VALUE=uri", "text", "bad"),
    '- "FN" text "extra" junk\n',
    '- "FN" unknown "bad"\n',
    '- "FN" text 1\n',
    '- "NICKNAME" text-list ["one",]\n',
    '- "ORG" structured [["one"],]\n',
    '- "NICKNAME" text-list [\n"split"]\n',
  ];
  for (
    const bad of [
      "",
      "# Contacts\n",
      "## Contact\n",
      "# Wrong\n" + good,
      "# Contact\n" + good,
      good.replace("## Contact", "### Contact"),
      good.replace("## Contact", "## ContactExtra"),
      good.replace('- "VERSION" text "4.0"\n', ""),
      good.replace('- "FN" text "Jane"\n', ""),
      good.replace('"4.0"', '"2.1"'),
      good.replace('"4.0"', '"3.0"'),
      '## Contact\n- "FN" text "Jane"\n- "VERSION" text "4.0"\n',
      ...badRows.map((r) => good + r),
      good + "unmarked text\n",
      good + '  - "NOTE" text "indented"\n',
    ]
  ) {
    try {
      traps(() => p.write(bad));
    } catch (e) {
      throw Error(JSON.stringify(bad), { cause: e });
    }
    equal(
      p.write(good),
      framed("BEGIN:VCARD\nVERSION:4.0\nFN:Jane\nEND:VCARD\n"),
    );
  }
});

Deno.test("Contact writer: UTF-8, JSON escapes, controls and malformed byte sequences", async () => {
  const p = await pair();
  const raw = contact(row("NOTE", "text", '雪😀 "quote"\tline\nnext'));
  equal(p.write(raw), p.write(raw.replace("雪😀", "\\u96ea\\ud83d\\ude00")));
  for (
    const escape of [
      "\\ud800",
      "\\udc00",
      "\\ud800x",
      "\\ud800\\ud800",
      "\\q",
      "\\u001f",
      "\\u007f",
      "\\r",
    ]
  ) {
    traps(() => p.write(contact('- "NOTE" text "' + escape + '"\n')));
  }
  for (const mode of ["raw", "text"]) {
    for (let code = 0; code < 32; code++) {
      if (code === 9 || code === 10 && mode === "text") continue;
      traps(() =>
        p.write(
          contact(
            row(
              mode === "raw" ? "X-RAW" : "NOTE",
              mode,
              String.fromCharCode(code),
            ),
          ),
        )
      );
    }
  }
  for (
    const invalid of [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [
      0xf4,
      0x90,
      0x80,
      0x80,
    ], [0xf0, 0x9f]]
  ) {
    const prefix = encoder.encode(contact('- "NOTE" text "'));
    const suffix = encoder.encode('"\n');
    p.memory.set(prefix);
    p.memory.set(invalid, prefix.length);
    p.memory.set(suffix, prefix.length + invalid.length);
    traps(() => p.w.run(prefix.length + invalid.length + suffix.length));
  }
  equal(
    p.write(contact(row("NOTE", "text", "valid"))),
    framed("BEGIN:VCARD\nVERSION:4.0\nFN:Jane\nNOTE:valid\nEND:VCARD\n"),
  );
});

Deno.test("Contact writer: code-point folding, escape splits and Markdown fence safety", async () => {
  const p = await pair();
  for (
    const size of [0, 1, 68, 69, 70, 71, 72, 73, 74, 75, 76, 145, 149, 150, 300]
  ) {
    for (const tail of ["a", "é", "雪", "😀", "\\,;\nend", "```\n`````\nend"]) {
      const note = "x".repeat(size) + tail;
      const result = p.write(contact(row("NOTE", "text", note)));
      equal(
        result,
        framed(
          "BEGIN:VCARD\nVERSION:4.0\nFN:Jane\nNOTE:" + escaped(note) +
            "\nEND:VCARD\n",
        ),
      );
      for (const line of payload(result).split("\r\n")) {
        if (encoder.encode(line).length > 75) {
          throw Error("Overlong physical line");
        }
        decoder.decode(encoder.encode(line));
      }
      equal(p.read(result).includes(row("NOTE", "text", note)), true);
    }
  }
});

Deno.test("Contact writer: exact capacities, bounded expansion and recovery", async () => {
  const p = await pair();
  const baseline = contact(row("NOTE", "text", ""));
  const full = contact(
    row("NOTE", "text", "a".repeat(65536 - encoder.encode(baseline).length)),
  );
  equal(encoder.encode(full).length, 65536);
  const fullResult = p.write(full);
  equal(payload(fullResult).replaceAll("\r\n ", "").includes("NOTE:aaa"), true);
  const literals = p.memory.slice(0x30000, 0x31000);
  traps(() => p.w.run(65537));
  traps(() => p.w.run(-1));

  // Long literal backtick runs enlarge both fences. Find the exact boundary
  // with a separate string oracle rather than guessing from implementation.
  const logical = (n: number, tail: number) =>
    "BEGIN:VCARD\nVERSION:4.0\nFN:Jane\nX-RAW:" + "`".repeat(n) +
    "a".repeat(tail) + "\nEND:VCARD\n";
  let low = 0, high = 65000;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (encoder.encode(framed(logical(mid, 0))).length <= 131072) low = mid;
    else high = mid - 1;
  }
  let exact: [number, number] | undefined;
  for (let n = low; n >= low - 5 && !exact; n--) {
    for (let tail = 0; tail < 24; tail++) {
      if (encoder.encode(framed(logical(n, tail))).length === 131072) {
        exact = [n, tail];
        break;
      }
    }
  }
  if (!exact) throw Error("No exact expansion fixture");
  const [n, tail] = exact;
  const source = (extra: number) =>
    contact(row("X-RAW", "raw", "`".repeat(n) + "a".repeat(tail + extra)));
  equal(p.write(source(0)), framed(logical(n, tail)));
  traps(() => p.write(source(1)));
  equal(toHex(p.memory.subarray(0x30000, 0x31000)), toHex(literals));
  equal(p.memory.subarray(0x35000).every((x) => x === 0xa5), true);
  equal(
    p.write(contact("")),
    framed("BEGIN:VCARD\nVERSION:4.0\nFN:Jane\nEND:VCARD\n"),
  );
});
