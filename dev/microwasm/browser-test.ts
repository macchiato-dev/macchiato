/// <reference lib="dom" />
// Optional browser verification. Playwright is tooling, not a demo dependency.
import { chromium } from "npm:playwright@1.60.0";

const base = Deno.args[0] ?? "http://127.0.0.1:8766/";
const artifacts = "dist/browser";
await Deno.mkdir(artifacts, { recursive: true });
Deno.env.set("TMPDIR", await Deno.realPath(artifacts));
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "light",
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
function check(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}
async function screenshot(name: string) {
  await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true });
}
async function checkDocumentViews(prefix: string, hexPath = `${prefix}.hex`) {
  // Check all six combinations. Content selection never selects a display.
  for (
    const [label, extension] of [["Original", "md"], [
      "Filled counts",
      "resolved.md",
    ], ["Hex", "hex"]]
  ) {
    const response = await context.request.get(
      new URL(extension === "hex" ? hexPath : `${prefix}.${extension}`, base)
        .href,
    );
    check(response.ok(), `Missing source ${prefix}.${extension}`);
    const original = await response.text();
    const expected = extension === "hex"
      ? "```hex\n" + original.trimEnd() + "\n```\n"
      : original;
    await page.getByRole("button", { name: label, exact: true }).click();
    check(
      await page.locator('[data-view="rendered"]').getAttribute(
        "aria-pressed",
      ) === "true",
      "Content changed display mode",
    );
    await page.getByRole("button", { name: "Markdown source", exact: true })
      .click();
    await page.waitForFunction((expected) => {
      const source = document.getElementById("source");
      return !source?.hidden && source?.textContent === expected;
    }, expected);
    await page.getByRole("button", { name: "Rendered", exact: true }).click();
    await page.waitForSelector("#rendered:visible");
    check(
      await page.locator(`[data-extension="${extension}"]`).getAttribute(
        "aria-pressed",
      ) === "true",
      "Display changed content selection",
    );
    if (extension === "hex") {
      check(
        await page.locator("#rendered pre code").textContent() ===
          original.trimEnd() + "\n",
        "Hex fence rendered differently",
      );
      const valid = await page.locator("#rendered pre code").evaluate((node) =>
        WebAssembly.validate(
          Uint8Array.from(
            node.textContent!.trim().split(/\s+/),
            (part) => parseInt(part, 16),
          ),
        )
      );
      check(valid, "Rendered hex is not valid Wasm");
    } else {
      check(
        await page.locator("#rendered h1").count() === 1,
        "Missing heading",
      );
      if (extension === "resolved.md") {
        check(
          !(await page.locator("#rendered li code").allTextContents()).some(
            (text) => text.includes("{{"),
          ),
          "Rendered counts unresolved",
        );
      }
    }
  }
}
try {
  await page.goto(base);
  await page.waitForSelector("#examples li:nth-child(20)");
  check(
    await page.locator("#examples li").count() === 20,
    "Expected twenty example links",
  );
  const links = await page.locator("#examples a").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLAnchorElement).href)
  );
  const rendererLinks = await page.locator("#renderer-pages a").evaluateAll((
    nodes,
  ) => nodes.map((node) => (node as HTMLAnchorElement).href));
  check(rendererLinks.length === 7, "Expected seven renderer pages");
  const libraryLinks = await page.locator("#library-pages a").evaluateAll((
    nodes,
  ) => nodes.map((node) => (node as HTMLAnchorElement).href));
  await screenshot("index-light");
  for (let i = 0; i < links.length; i++) {
    await page.goto(links[i]);
    await page.waitForFunction(() =>
      !!document.getElementById("output")?.textContent
    );
    check(
      await page.locator("#error").isHidden(),
      `Example ${i + 1}: load error`,
    );
    check(
      !await page.locator("#output").evaluate((node) =>
        node.classList.contains("failure")
      ),
      `Example ${i + 1}: default input failed`,
    );
    check(
      await page.locator("#rendered h1").count() === 1,
      "Missing rendered heading",
    );
    check(
      (await page.locator("#rendered pre").allTextContents()).some((text) =>
        text.startsWith("flowchart")
      ),
      "Mermaid must remain readable source",
    );
    check(
      await page.locator("#rendered ul ul").count() > 0,
      "Missing nested byte lists",
    );
    if (i === 8 || i === 9) {
      const trace = page.locator("#rendered table").first();
      check(await trace.count() === 1, "Missing algorithm state trace");
      await trace.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${artifacts}/${
          i === 8 ? "binary-search" : "insertion-sort"
        }-trace.png`,
      });
    }
    await checkDocumentViews(
      `./examples/${new URL(links[i]).searchParams.get("example")}`,
    );
    check(
      await page.evaluate(() =>
        document.documentElement.scrollWidth <= innerWidth
      ),
      `Example ${i + 1}: horizontal overflow`,
    );
    console.log(`${i + 1}/20 browser example passed`);
  }
  for (const link of rendererLinks) {
    await page.goto(link);
    await page.waitForSelector("#rendered h1");
    check(
      await page.locator("#rendered a[href]").count() > 0,
      "Page needs local navigation",
    );
    await checkDocumentViews(
      `./${new URL(link).searchParams.get("doc")!.slice(0, -3)}`,
      "./markdown-renderer.hex",
    );
  }
  for (const link of libraryLinks) {
    await page.goto(link);
    await page.waitForSelector("#rendered h1");
    await checkDocumentViews(
      `./${new URL(link).searchParams.get("doc")!.slice(0, -3)}`,
    );
  }
  // Inspect internal decision tables, not just a successful top-of-page render.
  for (
    const [id, heading, marker] of [
      [
        "48-radix-table",
        "Preserve a small workspace, not a whole document",
        "Saved in four i64 locals; restored immediately",
      ],
      [
        "46-base64-to-text",
        "Quartet boundaries and canonical padding",
        "Whitespace and end",
      ],
      [
        "44-hex-to-text",
        "Two small conversion loops",
        "None, or one high nibble",
      ],
      [
        "43-changes-to-diff",
        "Boundary bookkeeping is not a second patch validator",
        "Sum alone is insufficient",
      ],
      [
        "42-diff-to-changes",
        "Inside run: counts decide whether a header is content",
        "Cleared after use",
      ],
      [
        "00-patch-lines",
        "Inside range: distinguish absent count from explicit zero",
        "Empty file side",
      ],
      [
        "41-cues-to-vtt",
        "Inside run: gather one row, then write it",
        "Reorder fields without reparsing strings",
      ],
      [
        "40-vtt-to-cues",
        "Inside run: find the block once, then classify it",
        "Checks ordering without converting to a number",
      ],
      [
        "00-webvtt-time",
        "Timestamp: find the tail, then validate it once",
        "Large hours remain a span",
      ],
      [
        "39-cues-to-srt",
        "Inside run: keep the header, stream the text",
        "Reset at each decoded LF",
      ],
      [
        "38-srt-to-cues",
        "Inside run: header spans and a text span instead of a cue object",
        "Distinguishes missing text from empty input",
      ],
      [
        "37-contacts-to-vcard",
        "Inside card: discover once, rewind only this card",
        "Earlier cards are untouched",
      ],
      [
        "36-vcard-to-contacts",
        "Inside card: discover the version before interpreting values",
        "After-END position",
      ],
      [
        "09-radix-format",
        "The two candidate tests and the temporary denominator",
        "D temporarily becomes",
      ],
      [
        "11-precision-format",
        "Carry: the ordinary exit skips the leading-carry repair",
        "Leading-carry repair",
      ],
      [
        "33-entries-to-rss",
        "Inside classify and field: what the descriptor actually decides",
        "Repeated-field flag",
      ],
      [
        "34-ical-to-agenda",
        "Which state survives a child call?",
        "Offset immediately after",
      ],
      [
        "35-agenda-to-ical",
        "Inside frame: count bytes, record folds, expand backward",
        "fold count",
      ],
    ]
  ) {
    const link = libraryLinks.find((url) => url.includes(id));
    check(link, "Missing function walkthrough: " + id);
    await page.goto(link!);
    await page.waitForSelector("#rendered h1");
    const title = page.getByRole("heading", { name: heading, exact: true });
    await title.evaluate((element) =>
      element.scrollIntoView({ block: "start" })
    );
    check(
      (await page.locator("#rendered table").allTextContents()).some((t) =>
        t.includes(marker)
      ),
      "Missing internal state table: " + id,
    );
    check(
      await page.evaluate(() =>
        document.documentElement.scrollWidth <= innerWidth
      ),
      "Walkthrough overflowed the page: " + id,
    );
    await page.screenshot({ path: artifacts + "/" + id + "-walkthrough.png" });
  }
  const calendarPage = libraryLinks.find((link) =>
    link.includes("00-calendar-lines")
  );
  check(calendarPage, "Missing calendar content-line documentation");
  await page.goto(calendarPage!);
  await page.waitForSelector("#rendered h1");
  await screenshot("calendar-lines-light");
  const calendarLines = await page.evaluate(async () => {
    const n = (await WebAssembly.instantiateStreaming(
      fetch("./numbers/02-json-number.wasm"),
    )).instance.exports;
    const c = (await WebAssembly.instantiateStreaming(
      fetch("./transforms/00-calendar-lines.wasm"),
      { n },
    )).instance.exports as unknown as {
      memory: WebAssembly.Memory;
      unfold(s: number, e: number): number;
      line(s: number, e: number): [number, number, number, number, number];
    };
    const memory = new Uint8Array(c.memory.buffer);
    const bytes = new TextEncoder().encode(
      'ATTENDEE;CN="Doe, Jane":mailto:jane@example.com\r\n' +
        "SUMMARY:Folded\r\n  title\r\n",
    );
    memory.set(bytes);
    const end = 65536 + c.unfold(0, bytes.length);
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const text = (s: number, e: number) =>
      decoder.decode(memory.subarray(s, e));
    const rows = [];
    let start = 65536;
    while (start < end) {
      const [nameEnd, parametersEnd, valueStart, valueEnd, next] = c.line(
        start,
        end,
      );
      if (next <= start || next > end) {
        throw Error("Non-advancing calendar cursor");
      }
      rows.push([
        text(start, nameEnd),
        text(nameEnd, parametersEnd),
        text(valueStart, valueEnd),
      ]);
      start = next;
    }
    // The fold lies inside U+1F600's UTF-8 bytes, not between characters.
    memory.set([0xf0, 0x9f, 13, 10, 32, 0x98, 0x80]);
    const length = c.unfold(0, 7);
    if (text(65536, 65536 + length) !== "😀") {
      throw Error("Split UTF-8 fold lost data");
    }
    return rows;
  });
  check(
    JSON.stringify(calendarLines) === JSON.stringify([
      ["ATTENDEE", ';CN="Doe, Jane"', "mailto:jane@example.com"],
      ["SUMMARY", "", "Folded title"],
    ]),
    "Calendar content-line spans differ in Chromium",
  );
  const htmlPage = libraryLinks.find((link) =>
    link.includes("00-html-characters")
  );
  check(htmlPage, "Missing HTML character documentation");
  await page.goto(htmlPage!);
  await page.waitForSelector("#rendered h1");
  const htmlCases = await page.evaluate(async () => {
    const memory = new WebAssembly.Memory({ initial: 4, maximum: 4 });
    const k = (await WebAssembly.instantiateStreaming(
      await fetch("./transforms/00-json-string-keys.wasm"),
      { n: { memory } },
    )).instance.exports;
    const h = (await WebAssembly.instantiateStreaming(
      await fetch("./transforms/00-html-characters.wasm"),
      { k },
    )).instance.exports;
    const next = h.next as (...args: number[]) => number[];
    const bytes = new Uint8Array(memory.buffer),
      view = new DataView(memory.buffer);
    const encoder = new TextEncoder(), decoder = new TextDecoder();
    const names = Array.from({ length: 2231 }, (_, i) => {
      const p = 0x33000 + view.getUint16(0x31000 + 2 * i, true);
      return "&" + decoder.decode(bytes.subarray(p + 1, p + 1 + bytes[p]));
    });
    const parser = new DOMParser();
    const sources = [
      names.join("|"),
      "&notit; &notin; &amp=1 &AMPx &copy7 &fjlig; &NotEqualTilde;",
      "&#@; &#x`; &#13; &#xD; &#0; &#128; &#xD800; &#1114112;",
      "&#" + "9".repeat(1000) + "; &unknown; &#x; &; &",
      "line\r\nnext\rline\0with\ttabs and 😀",
    ];
    for (const source of sources) {
      const input = encoder.encode(source);
      if (input.length > 65536) throw Error("HTML oracle input too big");
      for (const attribute of [0, 1]) {
        bytes.set(input);
        let p = 0, pending = 0, output = "";
        for (let calls = 0;; calls++) {
          if (calls > input.length * 2 + 1) {
            throw Error("HTML iterator stalled");
          }
          const [cp, end, later] = next(p, input.length, attribute, pending);
          p = end;
          pending = later;
          if (cp === -1) break;
          output += String.fromCodePoint(cp);
        }
        const doc = parser.parseFromString(
          "<!DOCTYPE html><body>" +
            (attribute ? `<span data-value="${source}"></span>` : source),
          "text/html",
        );
        const expected = attribute
          ? doc.querySelector("span")!.getAttribute("data-value")
          : doc.body.textContent;
        // The in-body tree builder ignores raw NUL character tokens;
        // numeric references to zero have already become U+FFFD.
        const bodyText = attribute ? output : output.replaceAll("\0", "");
        if (bodyText !== expected) {
          throw Error(
            `Browser HTML character mismatch in mode ${attribute}: ` +
              JSON.stringify([output.slice(0, 100), expected?.slice(0, 100)]),
          );
        }
      }
    }
    return names.length;
  });
  check(htmlCases === 2231, "HTML character table count differs");
  console.log(
    "HTML character reader agrees with browser text and attribute parsing",
  );
  const xmlPage = libraryLinks.find((link) => link.includes("00-xml-strings"));
  check(xmlPage, "Missing XML primitive documentation");
  await page.goto(xmlPage!);
  await page.waitForSelector("#rendered h1");
  await screenshot("xml-primitives-light");
  const xmlCases = await page.evaluate(async () => {
    async function load(path: string, imports: WebAssembly.Imports = {}) {
      return (await WebAssembly.instantiateStreaming(
        await fetch(path),
        imports,
      )).instance.exports;
    }
    const n = await load("./numbers/02-json-number.wasm");
    const k = await load("./transforms/00-json-string-keys.wasm", { n });
    const x = await load("./transforms/00-xml-strings.wasm", { k });
    const o = await load("./transforms/00-xml-output.wasm", { k, x });
    const reader = await load("./transforms/26-xml-to-list.wasm", { x });
    const memory = new Uint8Array((x.memory as WebAssembly.Memory).buffer);
    const string = x.string as (
      start: number,
      end: number,
      output: number,
      mode: number,
    ) => number;
    const write = o.string as typeof string;
    const next = x.next as (
      start: number,
      end: number,
      mode: number,
    ) => [number, number];
    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
    const chunks = [
      "text",
      "猫😀",
      "&amp;",
      "&lt;",
      "&gt;",
      "&quot;",
      "&#x9;",
      "&#10;",
      "&#13;",
      "\r\n",
      "\r",
      "\t",
      "\\n",
      "&#x1F600;",
      "\ufeff",
    ];
    for (let seed = 0; seed < 100; seed++) {
      const source = Array.from(
        { length: 1 + seed % 23 },
        (_, i) => chunks[(seed + i) % chunks.length],
      ).join("");
      const doc = new DOMParser().parseFromString(
        '<r a="' + source + '">' + source + "</r>",
        "application/xml",
      );
      if (doc.querySelector("parsererror")) {
        throw new Error("Invalid XML oracle fixture");
      }
      const bytes = encoder.encode(source);
      for (const mode of [0, 1]) {
        memory.set(bytes);
        const length = string(0, bytes.length, 65536, mode);
        const actual = decoder.decode(memory.subarray(65536, 65536 + length));
        const expected = JSON.stringify(
          mode
            ? doc.documentElement.getAttribute("a")
            : doc.documentElement.textContent,
        );
        if (actual !== expected) {
          throw new Error("XML decoding differs from DOMParser: " + source);
        }
        let cursor = 0, decoded = "";
        while (cursor < bytes.length) {
          const [cp, end] = next(cursor, bytes.length, mode);
          if (end <= cursor || end > bytes.length) {
            throw Error("XML iterator did not advance within span");
          }
          decoded += String.fromCodePoint(cp);
          cursor = end;
        }
        if (JSON.stringify(decoded) !== expected) {
          throw Error("XML iterator differs from DOMParser");
        }
        const input = encoder.encode(expected.slice(1, -1));
        memory.set(input);
        const outputLength = write(0, input.length, 65536, mode);
        const output = decoder.decode(
          memory.subarray(65536, 65536 + outputLength),
        );
        const encodedDoc = new DOMParser().parseFromString(
          mode ? '<r a="' + output + '"/>' : "<r>" + output + "</r>",
          "application/xml",
        );
        const restored = mode
          ? encodedDoc.documentElement.getAttribute("a")
          : encodedDoc.documentElement.textContent;
        if (
          encodedDoc.querySelector("parsererror") ||
          JSON.stringify(restored) !== expected
        ) {
          throw new Error("XML output changed data after DOMParser: " + output);
        }
      }
      const xml = '<r a="' + source + '">' + source + "</r>";
      const rawBytes = encoder.encode(xml);
      memory.set(rawBytes, 37);
      const rawLength =
        (reader.readSpan as (start: number, end: number) => number)(
          37,
          37 + rawBytes.length,
        );
      const rawTree = decoder.decode(memory.subarray(65536, 65536 + rawLength));
      const fencedBytes = encoder.encode("```xml\n" + xml + "\n```\n");
      memory.set(fencedBytes);
      const fencedLength = (reader.run as (length: number) => number)(
        fencedBytes.length,
      );
      if (
        decoder.decode(memory.subarray(65536, 65536 + fencedLength)) !== rawTree
      ) {
        throw Error("XML raw and fenced entry points disagree in browser");
      }
    }
    const walk = await load("./transforms/00-xml-walk.wasm", { x });
    const token = walk.next as (
      start: number,
      end: number,
    ) => [number, number, number, number, number, number];
    const attribute = walk.attribute as (
      start: number,
      end: number,
    ) => [number, number, number, number, number];
    const raw = (start: number, end: number) =>
      decoder.decode(memory.subarray(start, end));
    const decoded = (start: number, end: number, mode: number) => {
      const length = string(start, end, 65536, mode);
      return JSON.parse(raw(65536, 65536 + length));
    };
    const feed =
      '<rss version="2.0"><channel><title>Books &amp; notes</title>' +
      "<link>https://example.com/</link><description>News</description>" +
      '<item><title>猫</title><category domain="a&gt;b">Research</category>' +
      '<category>Wasm</category><guid isPermaLink="false">id:1</guid>' +
      "<description><![CDATA[<b>Literal markup</b>]]></description>" +
      '<enclosure url="https://example.com/a.mp3" length="123" type="audio/mpeg"/>' +
      "</item><!--tail--><?ready yes?></channel></rss>";
    const source = encoder.encode(feed);
    memory.set(source);
    (reader.readSpan as (start: number, end: number) => number)(
      0,
      source.length,
    );
    const walked: unknown[] = [];
    let cursor = 0;
    while (cursor < source.length) {
      const [kind, ns, ne, vs, ve, next] = token(cursor, source.length);
      if (next <= cursor) throw Error("XML cursor did not advance in browser");
      if (kind === 1 || kind === 3) {
        const attrs: Record<string, string> = {};
        let position = vs;
        while (position < ve) {
          const [as, ae, start, end, after] = attribute(position, ve);
          if (as === 0 && ae === 0) break;
          attrs[raw(as, ae)] = decoded(start, end, 1);
          position = after;
        }
        walked.push(["open", raw(ns, ne), attrs]);
        if (kind === 3) walked.push(["close", raw(ns, ne)]);
      } else if (kind === 2) walked.push(["close", raw(ns, ne)]);
      else if (kind === 4) walked.push(["text", decoded(vs, ve, 0)]);
      else if (kind === 5) walked.push(["cdata", decoded(vs, ve, 2)]);
      else if (kind === 6) walked.push(["comment", decoded(vs, ve, 2)]);
      else if (kind === 7) walked.push(["pi", raw(ns, ne), decoded(vs, ve, 2)]);
      else throw Error("Unexpected XML token in browser");
      cursor = next;
    }
    const browserEvents: unknown[] = [];
    function visit(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        browserEvents.push([
          "open",
          element.tagName,
          Object.fromEntries(
            Array.from(element.attributes, (a) => [a.name, a.value]),
          ),
        ]);
        for (const child of node.childNodes) visit(child);
        browserEvents.push(["close", element.tagName]);
      } else if (node.nodeType === Node.TEXT_NODE) {
        browserEvents.push(["text", node.nodeValue]);
      } else if (node.nodeType === Node.CDATA_SECTION_NODE) {
        browserEvents.push(["cdata", node.nodeValue]);
      } else if (node.nodeType === Node.COMMENT_NODE) {
        browserEvents.push(["comment", node.nodeValue]);
      } else if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
        browserEvents.push(["pi", node.nodeName, node.nodeValue]);
      }
    }
    visit(
      new DOMParser().parseFromString(feed, "application/xml").documentElement,
    );
    if (JSON.stringify(walked) !== JSON.stringify(browserEvents)) {
      throw Error("Wasm XML walk differs from the browser's feed DOM");
    }
    if (
      (walk.skip as (start: number, end: number) => number)(
        0,
        source.length,
      ) !== source.length
    ) {
      throw Error("Wasm subtree skip did not stop at the RSS root end");
    }
    return 100;
  });
  check(xmlCases === 100, "XML browser comparisons incomplete");
  const xmlOutputPage = libraryLinks.find((link) =>
    link.includes("00-xml-output")
  );
  check(xmlOutputPage, "Missing XML output documentation");
  await page.goto(xmlOutputPage!);
  await page.waitForSelector("#rendered h1");
  await screenshot("xml-output-light");
  const shortestPage = libraryLinks.find((link) =>
    link.includes("06-shortest-decimal")
  );
  check(shortestPage, "Missing shortest-decimal documentation link");
  await page.goto(shortestPage!);
  await page.waitForSelector("#rendered h1");
  await screenshot("shortest-decimal-light");
  // Execute the shipped dependency graph in Chromium, with no host numeric
  // callbacks. Native expected strings below are assertions, not imports.
  const conversions = await page.evaluate(async () => {
    async function load(name: string, imports: WebAssembly.Imports = {}) {
      const response = await fetch(`./numbers/${name}.wasm`);
      if (!response.ok) throw new Error(`Missing ${name}`);
      return (await WebAssembly.instantiateStreaming(response, imports))
        .instance.exports;
    }
    const n = await load("02-json-number");
    const b = await load("03-multiword", { n });
    const f = await load("04-json-binary64", { n, b });
    const d = await load("05-exact-decimal", { b });
    const s = await load("06-shortest-decimal", { f, d });
    const r = await load("09-radix-format", { b, s });
    const pf = await load("11-precision-format", { d, r });
    const p = await load("07-parse-integer", { f, b });
    const w = await load("10-whole-number", { f, p, n });
    const prefix = await load("08-parse-float", { f, p, n });
    const memory = new Uint8Array((s.memory as WebAssembly.Memory).buffer);
    for (
      const [method, value, digits, expected] of [
        ["fixed", 1.005, 2, "1.00"],
        ["fixed", 9.99, 1, "10.0"],
        ["fixed", -0.001, 2, "-0.00"],
        ["exponential", 12.5, 2, "1.25e+1"],
        ["precision", 0.00000123, 2, "0.0000012"],
        ["exponentialShortest", 1000, 0, "1e+3"],
      ] as const
    ) {
      const length = (pf[method] as (v: number, k: number) => number)(
        value,
        digits,
      );
      const text = new TextDecoder().decode(
        memory.subarray(65536, 65536 + length),
      );
      if (text !== expected) throw new Error(`Precision ${method}: ${text}`);
    }
    for (
      const [value, expected] of [
        [NaN, "null"],
        [Infinity, "null"],
        [-0, "0"],
        [0.1, "0.1"],
      ] as const
    ) {
      const length = (r.json as (value: number) => number)(value);
      const text = new TextDecoder().decode(
        memory.subarray(65536, 65536 + length),
      );
      if (text !== expected) throw new Error(`JSON scalar: ${text}`);
    }
    for (
      const [text, expected] of [
        ["\ufeff", 0],
        ["0b101", 5],
        ["0o77", 63],
        ["0xff", 255],
        ["-0x10", NaN],
        ["1e+oops", NaN],
        [" +.5\u3000", .5],
        ["-0", -0],
      ] as const
    ) {
      const input = new TextEncoder().encode(text);
      memory.set(input);
      const actual = (w.parse as (start: number, end: number) => number)(
        0,
        input.length,
      );
      if (!Object.is(actual, expected)) throw new Error(`Number: ${text}`);
    }
    for (
      const [value, radix, expected] of [
        [12.5, 16, "c.8"],
        [-255, 2, "-11111111"],
        [0.1, 36, "0.3lllllllllm"],
        [NaN, 3, "NaN"],
        [-Infinity, 36, "-Infinity"],
        [-0, 8, "0"],
      ] as const
    ) {
      const length = (r.format as (value: number, radix: number) => number)(
        value,
        radix,
      );
      const text = new TextDecoder().decode(
        memory.subarray(65536, 65536 + length),
      );
      if (text !== expected) throw new Error(`Radix ${radix}: ${text}`);
    }
    const tinyLength = (r.format as (value: number, radix: number) => number)(
      Number.MIN_VALUE,
      2,
    );
    const tinyText = new TextDecoder().decode(
      memory.subarray(65536, 65536 + tinyLength),
    );
    if (tinyText !== "0." + "0".repeat(1073) + "1") {
      throw new Error("Binary subnormal output differs");
    }
    for (
      const [text, radix, expected] of [
        [" \u1680-0xffrest", 0, -255],
        ["0b101", 0, 0],
        ["101z", 2, 5],
        ["-0", 36, -0],
        ["xyz", 36, 44027],
        ["+90", 8, NaN],
      ] as const
    ) {
      const input = new TextEncoder().encode(text);
      memory.set(input);
      const actual =
        (p.parse as (start: number, end: number, radix: number) => number)(
          0,
          input.length,
          radix,
        );
      if (!Object.is(actual, expected)) throw new Error(`parseInt: ${text}`);
    }
    for (
      const [text, expected] of [
        ["+.5suffix", .5],
        ["-Infinity!", -Infinity],
        ["1e+oops", 1],
        ["-.0", -0],
      ] as const
    ) {
      const input = new TextEncoder().encode(text);
      memory.set(input);
      const actual = (prefix.parse as (start: number, end: number) => number)(
        0,
        input.length,
      );
      if (!Object.is(actual, expected)) throw new Error(`parseFloat: ${text}`);
    }
    return ["0.1", "-0", "1e-7", "1e21", "5e-324", "1.7976931348623157e308"]
      .map((text) => {
        const input = new TextEncoder().encode(text);
        memory.set(input);
        const number = (f.parse as (start: number, end: number) => number)(
          0,
          input.length,
        );
        const length = (s.format as (number: number) => number)(number);
        return new TextDecoder().decode(memory.subarray(65536, 65536 + length));
      });
  });
  check(
    JSON.stringify(conversions) === JSON.stringify([
      "0.1",
      "0",
      "1e-7",
      "1e+21",
      "5e-324",
      "1.7976931348623157e+308",
    ]),
    `Browser numeric conversions differ: ${conversions}`,
  );
  await page.goto(rendererLinks[0]);
  await page.waitForSelector("#rendered h1");
  await screenshot("renderer-module-light");
  await page.getByRole("link", { name: "Scanning patterns", exact: true })
    .click();
  await page.waitForSelector("#rendered h1");
  check(
    new URL(page.url()).searchParams.get("doc") === "renderer/02-scanning.md",
    "Local page navigation failed",
  );
  await screenshot("renderer-patterns-light");
  await page.goto(rendererLinks[3]);
  await page.waitForSelector("#rendered h1");
  check(
    await page.locator('#rendered a[data-href="https://example.com/"]')
      .getAttribute("href") === null,
    "External link became active",
  );
  check(
    await page.locator('#rendered a[data-href="javascript:evil"]').getAttribute(
      "href",
    ) === null,
    "Script link became active",
  );
  // Exercise policy and escaping in the real browser DOM, including a
  // GitHub-Pages-style prefix. No mock HTML parser or URL implementation.
  const linkPolicy = await page.evaluate(async () => {
    const { enableLocalLinks, createReader } = await import(
      new URL("./reader.js", location.href).href
    );
    const documents = [{ path: "renderer/02-scanning.md" }];
    const root = document.createElement("div");
    const targets = [
      "02-scanning.md",
      "../renderer/02-scanning.md",
      "https://evil.test/renderer/02-scanning.md",
      "//evil.test/a",
      "javascript:evil",
      "data:text/html,evil",
      "missing.md",
      "../../renderer/02-scanning.md",
      "02-scanning.md?track=1",
      "02-scanning.md#section",
      '02-scanning.md" onclick="evil',
    ];
    for (const target of targets) {
      const a = document.createElement("a");
      a.dataset.href = target;
      root.append(a);
    }
    enableLocalLinks(
      root,
      "renderer/00-module.md",
      documents,
      "https://site.test/project/?doc=x",
    );
    const actual = Array.from(root.children, (a) => a.getAttribute("href"));
    await createReader([]).render(
      '<img src="https://evil.test/x"> [<img>](x" onmouseover="evil&foo)',
      root,
      "renderer/00-module.md",
    );
    return {
      actual,
      tags: [...root.querySelectorAll("*")].map((el) => el.tagName),
      attrs: [...root.querySelectorAll("a")].flatMap((el) =>
        el.getAttributeNames()
      ),
    };
  });
  check(
    JSON.stringify(linkPolicy.actual.map(Boolean)) ===
      JSON.stringify([
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        false,
      ]),
    "Local-link allowlist differs",
  );
  check(
    linkPolicy.actual[0] ===
      "https://site.test/project/?doc=renderer%2F02-scanning.md",
    "Prefix not preserved",
  );
  check(
    JSON.stringify(linkPolicy.tags) === '["P","A"]',
    "Raw HTML created elements",
  );
  check(
    JSON.stringify(linkPolicy.attrs) === '["data-href"]',
    "Injected link attribute survived",
  );
  console.log(
    "Seven renderer pages, local navigation, escaping and link policy passed",
  );
  await page.goto(links[0]);
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent === "120"
  );
  await page.locator("#input").fill("6");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent === "720"
  );
  await page.locator("#input").fill("13");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForSelector("#output.failure");
  await page.locator("#input").fill("5");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent === "120"
  );
  await screenshot("factorial-light");

  await page.goto(links[18]);
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent?.startsWith("[[")
  );
  await page.locator("#input").fill(
    'name,note\r\nAda,"comma, and ""quote"""\r\n猫,"two\nlines"',
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent?.includes("猫")
  );
  const converted = JSON.parse((await page.locator("#output").textContent())!);
  check(
    JSON.stringify(converted) ===
      JSON.stringify([["name", "note"], ["Ada", 'comma, and "quote"'], [
        "猫",
        "two\nlines",
      ]]),
    "CSV browser result differs",
  );
  check(
    await page.locator("#output").textContent() === JSON.stringify(converted),
    "CSV should use readable short JSON escapes, including \\n",
  );
  await screenshot("csv-light");
  await page.emulateMedia({ colorScheme: "dark" });
  await screenshot("csv-dark");

  await page.goto(links[19]);
  await page.waitForSelector("#board button:nth-child(256)");
  await page.getByRole("button", { name: "Blinker", exact: true }).click();
  const before = await page.locator("#board button").evaluateAll((nodes) =>
    nodes.map((node) => node.classList.contains("alive"))
  );
  await page.getByRole("button", { name: "Step", exact: true }).click();
  const after = await page.locator("#board button").evaluateAll((nodes) =>
    nodes.map((node) => node.classList.contains("alive"))
  );
  check(
    JSON.stringify(before) !== JSON.stringify(after),
    "Blinker did not change",
  );
  await page.getByRole("button", { name: "Step", exact: true }).click();
  const restored = await page.locator("#board button").evaluateAll((nodes) =>
    nodes.map((node) => node.classList.contains("alive"))
  );
  check(
    JSON.stringify(before) === JSON.stringify(restored),
    "Blinker did not return after two steps",
  );
  await page.getByRole("button", { name: "Glider", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent?.startsWith("Generation 4")
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await screenshot("life-dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth
    ),
    "Mobile horizontal overflow",
  );
  // Visit the lower panel too: a full-page capture alone can leave an
  // offscreen overflow scroller unrasterized in Chromium.
  await page.locator("#rendered").scrollIntoViewIfNeeded();
  check(
    (await page.locator("#rendered").textContent())!.includes("neighbors"),
    "Mobile source missing",
  );
  await page.locator("#rendered").screenshot({
    path: `${artifacts}/life-mobile-source.png`,
  });
  await page.evaluate(() => scrollTo(0, 0));
  await screenshot("life-mobile");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("button", { name: "Cell 1, 1", exact: true }).click();
  check(
    await page.getByRole("button", { name: "Cell 1, 1", exact: true })
      .getAttribute("aria-pressed") === "true",
    "Cell edit did not work",
  );
  await page.getByRole("button", { name: "Step", exact: true }).click();
  check(
    await page.locator("#board .alive").count() === 0,
    "Isolated cell did not die",
  );
  check(errors.length === 0, `Browser errors: ${errors.join("\n")}`);
  console.log(`Browser checks passed. Screenshots: ${artifacts}/`);
} finally {
  await browser.close();
}
