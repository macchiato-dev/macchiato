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
    equal(html.includes("<pre><code>flowchart"), true);
    equal(/<(script|style|img|iframe)\b|<a href=/.test(html), false);
  }
  // Check the handwritten offsets against the actual data bytes.
  const base = built.map.find((item) => item.id === "md-literals")!.offset;
  for (
    const [id, offset] of [["html-code-open", 60], ["html-a-open", 94], [
      "html-amp",
      117,
    ], ["html-quote", 133]] as const
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
