import { Parser } from "npm:commonmark@0.31.2";
import { parse } from "npm:parse5@7.3.0";
import { assemble, toHex } from "./microwasm.ts";

function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
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
type Bookmark = { text: string; url?: string; children?: Bookmark[] };
type HtmlNode = {
  nodeName: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: HtmlNode[];
};
const encoder = new TextEncoder(), decoder = new TextDecoder();
async function tool() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["k", "transforms/00-json-string-keys"],
      ["x", "transforms/00-xml-strings"],
      ["o", "transforms/00-xml-output"],
      ["t", "transforms/31-outline-to-bookmarks"],
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
  const literals = memory.slice(196608, 197632);
  memory.fill(0xa5, 197760);
  function bytes(input: Uint8Array) {
    if (input.length > 65536) throw Error("Test input exceeds capacity");
    memory.set(input);
    const n = t.run(input.length);
    equal([...memory.subarray(0, input.length)], [...input]);
    equal([...memory.subarray(196608, 197632)], [...literals]);
    if (memory.subarray(197760).some((x) => x !== 0xa5)) {
      throw Error("Scratch escaped");
    }
    return decoder.decode(memory.subarray(65536, 65536 + n));
  }
  return { t, memory, bytes, run: (s: string) => bytes(encoder.encode(s)) };
}

function html(output: string) {
  const block = new Parser().parse(output).firstChild;
  equal(block?.type, "code_block");
  equal(block?.info, "html");
  equal(block?.next, null);
  return block!.literal!;
}
// Parse real HTML (with implied DT/P ends), not XML or a regex tag scraper.
function bookmarks(output: string) {
  const root: Bookmark[] = [], lists: Bookmark[][] = [];
  let title = "", heading = "", pending: Bookmark | undefined;
  let roots = 0;
  const text = (n: HtmlNode): string =>
    n.nodeName === "#text" ? n.value! : (n.childNodes ?? []).map(text).join("");
  function visit(n: HtmlNode) {
    if (n.nodeName === "title") {
      title = text(n);
      return;
    }
    if (n.nodeName === "h1") {
      heading = text(n);
      return;
    }
    if (n.nodeName === "h3") {
      if (!lists.length || pending) {
        throw Error("Folder outside list or missing DL");
      }
      pending = { text: text(n), children: [] };
      lists.at(-1)!.push(pending);
      return;
    }
    if (n.nodeName === "a") {
      if (!lists.length || pending) {
        throw Error("Bookmark outside list or before folder DL");
      }
      equal(n.attrs!.map((x) => x.name), ["href"]);
      lists.at(-1)!.push({ text: text(n), url: n.attrs![0].value });
      return;
    }
    if (n.nodeName === "dl") {
      if (lists.length) {
        if (!pending) throw Error("Child DL without folder");
        lists.push(pending.children!);
        pending = undefined;
      } else {
        roots++;
        lists.push(root);
      }
    }
    if (
      ![
        "#document",
        "#documentType",
        "#text",
        "html",
        "head",
        "body",
        "meta",
        "dt",
        "p",
        "dl",
      ].includes(n.nodeName)
    ) {
      throw Error("Unexpected HTML node " + n.nodeName);
    }
    if (n.nodeName === "#text") equal(n.value!.trim(), "");
    for (const child of n.childNodes ?? []) visit(child);
    if (n.nodeName === "dl") {
      if (pending) throw Error("Folder missing child DL");
      lists.pop();
    }
  }
  visit(parse(html(output)) as unknown as HtmlNode);
  equal(title, heading);
  equal(roots, 1);
  equal(lists.length, 0);
  return { title, bookmarks: root };
}
function escape(s: string) {
  return Array.from(
    s,
    (c) =>
      /\s/.test(c)
        ? `&#${c.codePointAt(0)};`
        : /[!-/:-@\[-`{-~]/.test(c)
        ? "\\" + c
        : c,
  ).join("");
}
function outline(nodes: Bookmark[], depth = 0): string {
  return nodes.map((n) =>
    "  ".repeat(depth) + "- " +
    (n.url === undefined ? escape(n.text) : `[${escape(n.text)}](<${n.url}>)`) +
    "\n" +
    (n.children ? outline(n.children, depth + 1) : "")
  ).join("");
}

Deno.test("Bookmark HTML writer: folders, links, empty documents and titles", async () => {
  const { run } = await tool();
  equal(bookmarks(run("")), { title: "Bookmarks", bookmarks: [] });
  equal(bookmarks(run("#")), { title: "", bookmarks: [] });
  equal(
    bookmarks(
      run(
        "# Reading\r\n- Folder\r\n  - [A](https://a.test/?x=1&y=2)\r\n  - Empty\r\n- [B](mailto:b@example.com)",
      ),
    ),
    {
      title: "Reading",
      bookmarks: [
        {
          text: "Folder",
          children: [{ text: "A", url: "https://a.test/?x=1&y=2" }, {
            text: "Empty",
            children: [],
          }],
        },
        { text: "B", url: "mailto:b@example.com" },
      ],
    },
  );
  equal(bookmarks(run("-\n  - [](<file:///home/a>)\n- [X](about:blank)")), {
    title: "Bookmarks",
    bookmarks: [{ text: "", children: [{ text: "", url: "file:///home/a" }] }, {
      text: "X",
      url: "about:blank",
    }],
  });
});

Deno.test("Bookmark HTML writer: generated trees survive independent HTML parsing", async () => {
  const { run } = await tool();
  let seed = 31;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const names = [
    "",
    "猫😀",
    "&amp;",
    "<script>x</script>",
    "[a](b)",
    "a\tb\nc\rd",
    "` ``` ```` `",
    "quotes \" and '",
    " trailing ",
  ];
  function tree(depth = 0): Bookmark[] {
    return Array.from({ length: random() % 4 }, () => {
      const text = names[random() % names.length];
      return depth < 4 && random() % 2 ? { text, children: tree(depth + 1) } : {
        text,
        url: [
          "https://a.test/a(b)?x=1&copy=2",
          "mailto:a@example.com",
          "file:///x",
          "about:blank",
        ][random() % 4],
      };
    });
  }
  for (let i = 0; i < 500; i++) {
    const nodes = tree(), title = names[random() % names.length];
    equal(bookmarks(run("# " + escape(title) + "\n" + outline(nodes))), {
      title,
      bookmarks: nodes,
    });
  }
});

Deno.test("Bookmark HTML writer: malformed input traps and later calls recover", async () => {
  const { run, bytes } = await tool();
  for (
    const source of [
      "prose",
      "## title",
      "# one\n# two",
      "- [A](https://a/)\n  - child",
      "    - skip",
      " - odd",
      "- folder\n    - skip",
      "- [bad]",
      "- [x]()",
      "- [x](a b)",
      "- [x](a&#10;b)",
      "- [x](<a>b>)",
      "- [x](url) trailing",
      "- [unclosed",
      "- &#0;",
      "- &#55296;",
      "- &#1114112;",
      "- a\0b",
    ]
  ) {
    traps(() => run(source));
    equal(bookmarks(run("- after")).bookmarks, [{
      text: "after",
      children: [],
    }]);
  }
  for (
    const invalid of [[45, 32, 0x80], [45, 32, 0xc0, 0x80], [
      45,
      32,
      0xed,
      0xa0,
      0x80,
    ]]
  ) traps(() => bytes(Uint8Array.from(invalid)));
  equal(bookmarks(run("- [balanced [label]](https://x/a(b))")).bookmarks, [{
    text: "balanced [label]",
    url: "https://x/a(b)",
  }]);
});

Deno.test("Bookmark HTML writer: source, output and depth limits with untouched memory", async () => {
  const { run, t, memory } = await tool();
  equal(
    bookmarks(run("- " + "x".repeat(65534))).bookmarks[0].text.length,
    65534,
  );
  traps(() => t.run(65537));
  traps(() => t.run(-1));
  run(Array.from({ length: 128 }, (_, i) => "  ".repeat(i) + "- x").join("\n"));
  traps(() =>
    run(
      Array.from({ length: 129 }, (_, i) => "  ".repeat(i) + "- x").join("\n"),
    )
  );
  traps(() => run("- " + "&".repeat(30000)));
  const base = encoder.encode(run("-")).length;
  const remaining = 131072 - base;
  const exact = "- " + "&".repeat(Math.floor(remaining / 5)) +
    "x".repeat(remaining % 5);
  equal(encoder.encode(run(exact)).length, 131072);
  traps(() => run(exact + "x"));
  equal(memory.subarray(197760).every((x) => x === 0xa5), true);
  equal(bookmarks(run("- final")).bookmarks[0].text, "final");
});

Deno.test("Bookmark HTML writer: punctuation edits either reject or remain structured data", async () => {
  const { run } = await tool();
  const original =
    "# Title\n- Folder\n  - [label](<https://a.test/a(b)?x=1&y=2>)\n- Empty";
  for (let at = 0; at < original.length; at++) {
    for (
      const byte of [
        "<",
        ">",
        "[",
        "]",
        "(",
        ")",
        "\\",
        "&",
        '"',
        "'",
        "`",
        "\n",
        "\t",
      ]
    ) {
      const changed = original.slice(0, at) + byte + original.slice(at + 1);
      let output: string;
      try {
        output = run(changed);
      } catch (e) {
        if (e instanceof WebAssembly.RuntimeError) continue;
        throw e;
      }
      // CommonMark must still see exactly one HTML fence, and the independent
      // HTML parser must see only the bookmark vocabulary with a coherent DL tree.
      bookmarks(output);
    }
  }
});
