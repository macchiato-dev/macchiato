import { Parser } from "npm:commonmark@0.31.2";
import { SaxesParser } from "npm:saxes@6.0.0";
import { assemble, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
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
type Outline = { text: string; url?: string; children: Outline[] };
const node = (text: string, children: Outline[] = [], url?: string): Outline =>
  url === undefined ? { text, children } : { text, url, children };
const encoder = new TextEncoder(), decoder = new TextDecoder();
async function tool() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      ["o", "transforms/00-xml-output"],
      ["t", "transforms/28-outline-to-opml"],
    ]
  ) {
    const built = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
    imports[name] =
      (await WebAssembly.instantiate(built.bytes, imports)).instance.exports;
  }
  const t = imports.t as unknown as {
    memory: WebAssembly.Memory;
    run(n: number): number;
  };
  const memory = new Uint8Array(t.memory.buffer);
  const literals = memory.slice(196608);
  function bytes(input: Uint8Array) {
    if (input.length > 65536) throw Error("Use direct run for invalid length");
    memory.set(input);
    const n = t.run(input.length);
    equal([...memory.subarray(0, input.length)], [...input]);
    equal([...memory.subarray(196608)], [...literals]);
    return decoder.decode(memory.subarray(65536, 65536 + n));
  }
  return { t, memory, bytes, run: (s: string) => bytes(encoder.encode(s)) };
}

// Independent Markdown framing and XML tree readers; neither ships in the tool.
function xml(output: string) {
  const block = new Parser().parse(output).firstChild;
  equal(block?.type, "code_block");
  equal(block?.info, "opml");
  equal(block?.next, null);
  return block!.literal!.slice(0, -1);
}
function parsed(output: string) {
  const outlines: Outline[] = [], lists = [outlines], tags: string[] = [];
  let title: string | undefined;
  let heads = 0, bodies = 0;
  const p = new SaxesParser({ xmlns: false });
  p.on("opentag", ({ name, attributes }) => {
    const parent = tags.at(-1);
    if (name === "opml") {
      equal(parent, undefined);
      equal(attributes, { version: "2.0" });
    } else if (name === "head") {
      equal(parent, "opml");
      heads++;
    } else if (name === "body") {
      equal(parent, "opml");
      bodies++;
    } else if (name === "title") {
      equal(parent, "head");
      equal(title, undefined);
      title = "";
    } else if (name === "outline") {
      equal(parent === "body" || parent === "outline", true);
      equal(typeof attributes.text, "string");
      const n = node(
        String(attributes.text),
        [],
        attributes.url as string | undefined,
      );
      equal(
        attributes,
        n.url === undefined
          ? { text: n.text }
          : { text: n.text, type: "link", url: n.url },
      );
      lists.at(-1)!.push(n);
      lists.push(n.children);
    } else throw Error("Unexpected element " + name);
    tags.push(name);
  });
  p.on("closetag", () => {
    if (tags.pop() === "outline") lists.pop();
  });
  p.on("text", (text) => {
    if (tags.at(-1) === "title") title += text;
    else equal(text.trim(), "");
  });
  p.write(xml(output)).close();
  equal([heads, bodies, lists.length], [1, 1, 1]);
  return { title, outlines };
}

Deno.test("OPML writer: nested labels, linked parents, titles, and empty labels", async () => {
  const { run } = await tool();
  equal(parsed(run("- One")), { outlines: [node("One")] });
  equal(
    parsed(
      run(
        "\n# Reading\r\n\r\n- Web\r\n  - [Wasm](https://webassembly.org/)\r\n  - [](<https://example.com>)\r\n-\r\n",
      ),
    ),
    {
      title: "Reading",
      outlines: [
        node("Web", [
          node("Wasm", [], "https://webassembly.org/"),
          node("", [], "https://example.com"),
        ]),
        node(""),
      ],
    },
  );
  equal(
    parsed(run("#\n- [parent](HTTP://example.com/)\n  - child\n- sibling")),
    {
      title: "",
      outlines: [
        node("parent", [node("child")], "HTTP://example.com/"),
        node("sibling"),
      ],
    },
  );
  equal(parsed(run("- same\n  - same\n- same\n\t \n- ")).outlines, [
    node("same", [node("same")]),
    node("same"),
    node(""),
  ]);
});

Deno.test("OPML writer: Markdown decoding and XML escaping are distinct passes", async () => {
  const { run } = await tool();
  const source =
    '# A & <title> &#13;\n- [a[b]c\\]](https://example.com/a(b)c?x=1&y=2)\n- \\[literal\\] &amp; &#x41; &#65; &#00010; &#13; &#32;\n- 猫😀 \\\\ " &#128512;\n- **literal** <script> ```';
  equal(parsed(run(source)), {
    title: "A & <title> \r",
    outlines: [
      node("a[b]c]", [], "https://example.com/a(b)c?x=1&y=2"),
      node("[literal] &amp; &#x41; A \n \r  "),
      node('猫😀 \\ " 😀'),
      node("**literal** <script> ```"),
    ],
  });
  equal(run(source).startsWith("````opml\n"), true);
  equal(parsed(run("- [escaped](<https://example.com/a\\(b\\)>)")).outlines, [
    node("escaped", [], "https://example.com/a(b)"),
  ]);
  for (
    const text of ["&#;", "&#12x;", "&#123", "&#" + "9".repeat(300) + "x;"]
  ) {
    equal(parsed(run("- " + text)).outlines, [node(text)]);
  }
});

// Encode our restricted Markdown notation, not XML; an XML parser verifies the
// actual Wasm output against the original data, including punctuation/control data.
function escaped(text: string) {
  return [...text].map((c) =>
    /[\x09-\x20]/.test(c)
      ? `&#${c.codePointAt(0)};`
      : /[!-/:-@[-`{-~]/.test(c)
      ? "\\" + c
      : c
  ).join("");
}
function markdown(nodes: Outline[], depth = 0): string {
  return nodes.map((n) =>
    "  ".repeat(depth) + "- " +
    (n.url === undefined
      ? escaped(n.text)
      : "[" + escaped(n.text) + "](<" + escaped(n.url) + ">)") +
    "\n" + markdown(n.children, depth + 1)
  ).join("");
}
Deno.test("OPML writer: 500 generated trees preserve ordered data through XML", async () => {
  const { run } = await tool();
  let state = 73;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
  const parts = [
    "",
    "A",
    "é猫😀",
    "<>&",
    "[x](y)",
    "\\",
    "\t\r\n",
    " ",
    "````",
    "&#65;",
    "'\"",
  ];
  function tree(depth = 0): Outline[] {
    return Array.from({ length: 1 + random() % 3 }, () => {
      const text = parts[random() % parts.length] +
        parts[random() % parts.length];
      const url = random() % 2
        ? "https://example.com/" + random() + "?a=1&b=(x)"
        : undefined;
      const children = depth < 3 && random() % 3 === 0 ? tree(depth + 1) : [];
      return node(text, children, url);
    });
  }
  for (let i = 0; i < 500; i++) {
    const outlines = tree(), title = parts[random() % parts.length];
    const source = "# " + escaped(title) + "\n" + markdown(outlines);
    equal(parsed(run(i % 2 ? source.replaceAll("\n", "\r\n") : source)), {
      title,
      outlines,
    });
  }
});

Deno.test("OPML writer: reject malformed structure and destination syntax, then recover", async () => {
  const { run } = await tool();
  for (
    const input of [
      "",
      "# title",
      "## Title\n- a",
      "- a\n# Title",
      "word",
      "* a",
      "-a",
      "\t- a",
      " - a",
      "  - a",
      "- a\n    - b",
      "- a\n b",
      "- [a]",
      "- [a][id]",
      "- [a](https://x) trailing",
      '- [a](https://x "title")',
      "- [a](<https://x)",
      "- [a](https://x(a)",
      "- [a](https://x))",
      "- [a](https://x)\\",
    ]
  ) {
    traps(() => run(input));
    equal(parsed(run("- recovered")).outlines, [node("recovered")]);
  }
  for (
    const url of [
      "",
      "http://",
      "https://",
      "ftp://x",
      "javascript:alert(1)",
      "/relative",
      "//example.com",
      "https:/x",
      "httpx://x",
      "https://x y",
      "https://x&#32;y",
      "https://x&#9;y",
      "https://x&#127;y",
      'https://x"',
      "https://x\\q",
      "https://x&#60;y",
    ]
  ) {
    traps(() => run("- [bad](<" + url + ">)"));
  }
  equal(parsed(run("- [ok](hTtPs://example.com/)")).outlines, [
    node("ok", [], "hTtPs://example.com/"),
  ]);
});

Deno.test("OPML writer: references cannot overflow into valid characters; UTF-8 is checked", async () => {
  const { run, bytes } = await tool();
  for (
    const value of [
      "0",
      "1",
      "55296",
      "65534",
      "1114112",
      "4294967361",
      "9".repeat(600),
    ]
  ) {
    traps(() => run("- &#" + value + ";"));
  }
  equal(parsed(run("- &#" + "0".repeat(1000) + "65; &#1114111;")).outlines, [
    node("A " + String.fromCodePoint(0x10ffff)),
  ]);
  for (
    const sequence of [
      [0],
      [0xc0, 0x80],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0xff],
      [0xe2, 0x82],
    ]
  ) {
    for (const prefix of ["- ", "# ", "- [", "- [a](https://x/"]) {
      const suffix = prefix === "# "
        ? "\n- a"
        : prefix === "- ["
        ? "](https://x)"
        : prefix.includes("https")
        ? ")"
        : "";
      traps(() =>
        bytes(
          Uint8Array.from([
            ...encoder.encode(prefix),
            ...sequence,
            ...encoder.encode(suffix),
          ]),
        )
      );
    }
  }
  equal(parsed(run("- valid")).outlines, [node("valid")]);
});

Deno.test("OPML writer: depth, input and output boundaries, frame expansion and recovery", async () => {
  const { run, t, memory } = await tool();
  const source = Array.from({ length: 128 }, (_, i) => "  ".repeat(i) + "- a")
    .join("\n");
  let outlines = parsed(run(source)).outlines;
  for (let i = 0; i < 128; i++) {
    equal(outlines.length, 1);
    outlines = outlines[0].children;
  }
  equal(outlines, []);
  traps(() => run(source + "\n" + "  ".repeat(128) + "- a"));
  equal(parsed(run("- a\n" + "\n".repeat(65532))).outlines, [node("a")]);
  for (const n of [-1, 65537]) traps(() => t.run(n));
  const fixed = run("- ").length;
  // Ampersands expand by five; ordinary bytes fill the remaining exact capacity.
  const count = Math.floor((131072 - fixed) / 5), tail = (131072 - fixed) % 5;
  const exact = "- " + "&".repeat(count) + "a".repeat(tail);
  equal(encoder.encode(run(exact)).length, 131072);
  traps(() => run(exact + "a"));
  // Fence growth can be the part that exceeds capacity, not XML emission.
  const ticks = Math.floor((131072 - fixed - 2) / 3);
  equal(
    run("- " + "`".repeat(ticks)).startsWith("`".repeat(ticks + 1) + "opml\n"),
    true,
  );
  traps(() => run("- " + "`".repeat(ticks + 3)));
  equal(parsed(run("- restored")).outlines, [node("restored")]);
  equal(memory.length, 262144);
});

Deno.test("OPML writer: edited punctuation either traps or yields valid bounded XML", async () => {
  const { run } = await tool();
  const source =
    "# Title\n- Parent\n  - [one](https://example.com/a(b)?x=1&y=2)\n  - [two](<https://example.com/>)\n- \\[literal\\] &#65;";
  let accepted = 0, rejected = 0;
  for (let i = 0; i < source.length; i++) {
    for (const c of ["", "[", "]", "(", ")", "\\", "&", ";", " ", "\n"]) {
      let result: string;
      try {
        result = run(source.slice(0, i) + c + source.slice(i + 1));
      } catch (e) {
        if (!(e instanceof WebAssembly.RuntimeError)) throw e;
        rejected++;
        continue;
      }
      equal(parsed(result).outlines.length > 0, true);
      accepted++;
    }
  }
  equal(accepted > 100 && rejected > 100, true);
  equal(parsed(run("- final")).outlines, [node("final")]);
});
