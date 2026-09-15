import { assembleRenderer } from "./renderer.ts";
import { assemble, fromHex, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}
async function renderer() {
  const built = await assembleRenderer();
  equal(toHex(assemble(built.resolved).bytes), toHex(built.bytes));
  const { instance } = await WebAssembly.instantiate(
    fromHex(toHex(built.bytes)),
  );
  const memory = new Uint8Array(
    (instance.exports.memory as WebAssembly.Memory).buffer,
  );
  const run = instance.exports.run as (length: number) => number;
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  return {
    built,
    run,
    memory,
    render(source: string) {
      const input = encoder.encode(source);
      if (input.length > 0x40000) throw new Error("Input limit");
      memory.set(input);
      const length = run(input.length);
      return decoder.decode(memory.subarray(0x40000, 0x40000 + length));
    },
  };
}

Deno.test("Markdown Wasm: paragraphs, headings, lists, code and literal HTML", async () => {
  const { render } = await renderer();
  equal(render(""), "");
  equal(
    render("# Title\n\nfirst\nsecond\n\n## Sub\n"),
    "<h1>Title</h1>\n<p>first second</p>\n<h2>Sub</h2>\n",
  );
  equal(
    render("- a\n  - b\n\n  - c\n- d"),
    "<ul><li>a<ul><li>b</li>\n<li>c</li>\n</ul>\n</li>\n<li>d</li>\n</ul>\n",
  );
  equal(
    render("`a < b` and **strong**"),
    "<p><code>a &lt; b</code> and <strong>strong</strong></p>\n",
  );
  equal(
    render("- one\n  continued\n  - nested\n    continued\n- two\n\nprose"),
    "<ul><li>one continued<ul><li>nested continued</li>\n</ul>\n</li>\n<li>two</li>\n</ul>\n<p>prose</p>\n",
  );
  equal(
    render("```mermaid\r\nflowchart LR\r\n  A --> B\r\n```\r\n"),
    "<pre><code>flowchart LR\n  A --&gt; B\n</code></pre>",
  );
  equal(
    render('<script>alert(1)</script> & "hi"'),
    "<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;hi&quot;</p>\n",
  );
  equal(render("```text\na\n"), "<pre><code>a\n</code></pre>");
  equal(render("###No space"), "<p>###No space</p>\n");
  equal(render("# reset"), "<h1>reset</h1>\n");
});

Deno.test("Markdown inline code: matching runs retain literal backticks and inert HTML", async () => {
  const { render } = await renderer();
  const escape = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  for (let width = 1; width <= 32; width++) {
    const ticks = "`".repeat(width);
    const text = '"value" "a' + "`".repeat(width - 1) +
      'b <img src=https://patch.invalid/x> & [link](bad)"';
    equal(
      render("- " + ticks + text + ticks),
      "<ul><li><code>" + escape(text) + "</code></li>\n</ul>\n",
    );
    const mismatched = "a" + "`".repeat(width + 1) + "b";
    equal(
      render("- " + ticks + mismatched + ticks),
      "<ul><li><code>" + mismatched + "</code></li>\n</ul>\n",
    );
    equal(
      render("- " + ticks + "unfinished"),
      "<ul><li>" + ticks + "unfinished</li>\n</ul>\n",
    );
  }
  equal(
    render("before ``a`b`` after `c`"),
    "<p>before <code>a`b</code> after <code>c</code></p>\n",
  );
  equal(
    render("- " + "`".repeat(100000)),
    "<ul><li>" + "`".repeat(100000) + "</li>\n</ul>\n",
  );
});

Deno.test("Markdown links have only escaped data-href, never active URLs", async () => {
  const { render } = await renderer();
  equal(
    render("[read](02-scanning.md) [x](https://evil.test/)"),
    '<p><a data-href="02-scanning.md">read</a> <a data-href="https://evil.test/">x</a></p>\n',
  );
  equal(
    render('[<img>](x" onmouseover="evil&foo)'),
    '<p><a data-href="x&quot; onmouseover=&quot;evil&amp;foo">&lt;img&gt;</a></p>\n',
  );
  equal(
    render("[x](javascript:evil)"),
    '<p><a data-href="javascript:evil">x</a></p>\n',
  );
  equal(
    render("![x](https://evil.test/img)"),
    '<p>!<a data-href="https://evil.test/img">x</a></p>\n',
  );
});

Deno.test("Markdown links: angle destinations and decoded spans stay inert", async () => {
  const { render } = await renderer();
  equal(
    render("[a\\]b&#32;](<https://example.com/a(b)?x=1\\&y=2>)"),
    '<p><a data-href="https://example.com/a(b)?x=1&amp;y=2">a]b&#32;</a></p>\n',
  );
  equal(
    render("[\\<b\\>](<x&#34; onmouseover=&#34;bad>)"),
    '<p><a data-href="x&#34; onmouseover=&#34;bad">&lt;b&gt;</a></p>\n',
  );
  equal(render("[](<>)"), '<p><a data-href=""></a></p>\n');
  equal(
    render("[x](a\\)b)"),
    '<p><a data-href="a)b">x</a></p>\n',
  );
  equal(
    render("[x](<unfinished)"),
    "<p>[x](&lt;unfinished)</p>\n",
  );
  equal(
    render("[x](<url>not-a-close)"),
    "<p>[x](&lt;url&gt;not-a-close)</p>\n",
  );
  equal(
    render("[x\\](" + "a".repeat(50000)),
    "<p>[x\\](" + "a".repeat(50000) + "</p>\n",
  );
});

Deno.test("Markdown tables: header recognition, row widths and block transitions", async () => {
  const { render } = await renderer();
  const table = "<table><thead><tr><th>a</th><th>b</th></tr>\n" +
    "</thead><tbody><tr><td>x</td><td>y</td></tr>\n</tbody></table>\n";
  equal(render("| a | b |\n| --- | --- |\n| x | y |"), table);
  equal(render("| a | b |\r\n| :--- | ---: |\r\n| x | y |\r\n"), table);
  equal(
    render("before\n| a | b |\n| --- | :---: |\n| x | y |\nafter"),
    "<p>before</p>\n" + table + "<p>after</p>\n",
  );
  equal(
    render("- list\n| a | b |\n| --- | --- |\n| x | y |\n# End"),
    "<ul><li>list</li>\n</ul>\n" + table + "<h1>End</h1>\n",
  );
  equal(
    render("| a | b |\n| --- | --- |\n| x | y |\n| short |"),
    table + "<p>| short |</p>\n",
  );
  equal(
    render("||\n|---|"),
    "<table><thead><tr><th></th></tr>\n</thead><tbody></tbody></table>\n",
  );
  for (
    const source of [
      "| a |\n| -- |",
      "| a |\n| --- | --- |",
      "| a |\n| a--- |",
      "| a |\n| -- -- |",
      "| a\n| --- |",
      "|\n|---|",
      "|a|\n|:|",
      "|a|\n| |",
      "|a|\n|::|",
    ]
  ) {
    equal(render(source).includes("<table>"), false);
  }
  equal(
    render("| **a** | `b` |\n|---|---|\n|[x](https://example.com)|<img>|"),
    "<table><thead><tr><th><strong>a</strong></th><th><code>b</code></th></tr>\n" +
      '</thead><tbody><tr><td><a data-href="https://example.com">x</a></td><td>&lt;img&gt;</td></tr>\n</tbody></table>\n',
  );
});

Deno.test("Markdown character references: bounded parsing and no raw HTML", async () => {
  const { render } = await renderer();
  for (
    const token of [
      "&#9;",
      "&#10;",
      "&#13;",
      "&#32;",
      "&#60;",
      "&#128008;",
      "&#1114111;",
      "&#0000032;",
    ]
  ) {
    equal(render(token), "<p>" + token + "</p>\n");
  }
  for (
    const token of [
      "&",
      "&#",
      "&#;",
      "&#0;",
      "&#x3c;",
      "&#-1;",
      "&#1114112;",
      "&#00000032;",
      "&#12x;",
      "&#32",
      "&amp;",
      "&#999999999999999999;",
    ]
  ) {
    equal(render(token), "<p>&amp;" + token.slice(1) + "</p>\n");
  }
  equal(
    render("&#60;script&#62;evil&#60;/script&#62;"),
    "<p>&#60;script&#62;evil&#60;/script&#62;</p>\n",
  );
  equal(
    render("`&#60;`\n\n```html\n&#60;\n```"),
    "<p><code>&amp;#60;</code></p>\n<pre><code>&amp;#60;\n</code></pre>",
  );
  equal(
    render("| x |\n| --- |\n| &#91;link&#93;(https://example.com) |"),
    "<table><thead><tr><th>x</th></tr>\n</thead><tbody><tr><td>&#91;link&#93;(https://example.com)</td></tr>\n</tbody></table>\n",
  );
  const long = "&#00000000000000000000;".repeat(5000);
  const start = performance.now();
  equal(render(long), "<p>" + long.replaceAll("&", "&amp;") + "</p>\n");
  equal(performance.now() - start < 2000, true);
});

Deno.test("Markdown fences and escaped pipes: exported CSV remains one code block", async () => {
  const { render } = await renderer();
  for (const count of [3, 4, 7, 127, 128, 1024]) {
    const fence = "`".repeat(count);
    const body = '"start\n' + "`".repeat(count - 1) + '\nend"\n';
    equal(
      render(fence + "csv\n" + body + fence + "\n"),
      "<pre><code>" + body.replaceAll('"', "&quot;") + "</code></pre>",
    );
  }
  equal(
    render("````csv\nx\n```\ny\n````label\nz\n`````\t \nafter"),
    "<pre><code>x\n```\ny\n````label\nz\n</code></pre><p>after</p>\n",
  );
  equal(
    render("| a\\|b | \\\\ |\n|---|---|\n| \\*x\\* | &#124; |"),
    "<table><thead><tr><th>a|b</th><th>\\</th></tr>\n</thead><tbody><tr><td>*x*</td><td>&#124;</td></tr>\n</tbody></table>\n",
  );
  equal(render("|a\\|\n|---|").includes("<table>"), false);
  equal(render("\\a \\*x\\* \\[link\\](url)"), "<p>\\a *x* [link](url)</p>\n");
});

Deno.test("Renderer renders all example pages and its own multi-page source", async () => {
  const { render, built } = await renderer();
  const pages = built.pages.map((page) => page.source);
  for await (
    const entry of Deno.readDir(new URL("examples/", import.meta.url))
  ) {
    if (entry.name.endsWith(".md")) {
      pages.push(
        await Deno.readTextFile(
          new URL(`examples/${entry.name}`, import.meta.url),
        ),
      );
    }
  }
  for (const source of pages) {
    const html = render(source);
    equal(html.startsWith("<h1>"), true);
    equal(html.includes("<code>[microwasm]</code>"), true);
    if (source.includes("```mermaid")) {
      equal(html.includes("<pre><code>flowchart"), true);
    }
    equal(/<(script|style|img|iframe)\b|<a href=/.test(html), false);
  }
  // Check the handwritten offsets against the actual data bytes.
  const base = built.map.find((item) => item.id === "md-literals")!.offset;
  for (
    const [id, offset] of [
      ["html-code-open", 60],
      ["html-a-open", 94],
      [
        "html-amp",
        117,
      ],
      ["html-quote", 133],
      ["html-table-open", 140],
      ["html-table-body", 155],
      ["html-table-close", 171],
      ["html-td-close", 217],
    ] as const
  ) {
    equal(built.map.find((item) => item.id === id)!.offset - base, offset);
  }
});

Deno.test("Renderer bounded scans, output overflow and repeated-call recovery", async () => {
  const { render, run } = await renderer();
  const start = performance.now();
  for (
    const source of [
      "[".repeat(120000),
      "**" + "a".repeat(120000),
      "[".repeat(100000) + "]",
      "`" + "a".repeat(120000),
    ]
  ) {
    equal(render(source), `<p>${source}</p>\n`);
  }
  // A generous smoke bound catches accidental quadratic rescans, not a benchmark.
  equal(performance.now() - start < 2000, true);
  let trapped = false;
  try {
    render('"'.repeat(0x40000));
  } catch (error) {
    trapped = error instanceof WebAssembly.RuntimeError;
  }
  equal(trapped, true);
  equal(render("ok"), "<p>ok</p>\n");
  trapped = false;
  try {
    run(0x40001);
  } catch (error) {
    trapped = error instanceof WebAssembly.RuntimeError;
  }
  equal(trapped, true);
});

Deno.test("Literal records use one unsigned length byte, including zero and 255", async () => {
  const { render, memory, built } = await renderer();
  for (
    const record of built.map.filter((item) => item.id.startsWith("html-"))
  ) {
    equal(built.bytes[record.offset], record.length - 1);
  }
  // Probe the literal primitive through its existing quote-escape call.
  // This edits test memory, not the document input or production templates.
  const at = 0x100000 + 133;
  for (const length of [0, 1, 127, 128, 255]) {
    memory[at] = length;
    memory.fill(0x78, at + 1, at + 1 + length);
    memory[at + 1 + length] = 0x21; // Must not read beyond the given length.
    equal(render('"'), "<p>" + "x".repeat(length) + "</p>\n");
  }
  memory.set([3, 0x61, 0, 0x62, 0x21], at);
  equal(render('"'), "<p>a\0b</p>\n"); // Zero bytes are data, not terminators.
});
