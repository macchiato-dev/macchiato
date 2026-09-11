import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright";
import { parseProjectHtml } from "../project-html-parser.js";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

// Compare inert parsing, not rendering. Never attach these fixtures to the
// active document: URL-valued attributes must not start resource requests.
test("inert HTML parsing preserves quoted delimiters and attribute boundaries", async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const fixtures = [
    '<p title="one > two" data-condition="a < b">Text</p>',
    "<p title='one > two' data-tail='/'>Text</p>",
    '<input value="a > b" placeholder="value /">',
    '<img src=images/tile.png/>',
    '<img src="images/tile.png" />',
    '<p class="first" CLASS="ignored" id="keep" id="ignored">Text</p>',
    '<svg viewBox="0 0 24 24"><path d="M1 2 L3 4" /></svg>',
    '<style>.sample::before { content: "a > b"; }</style><p>Text</p>',
    '<script>var compare = a > b;</script><p>Text</p>',
    '<p>&nbsp;&amp;&lt;&gt;&quot;&apos; &copy; &NotEqualTilde; &#128049; &#x1f431;</p>',
    '<p>&amp;lt; &notit; &notin; &unknown; &#0; &#xD800; &#x110000; &#128;</p>',
    '<p title="&quot; &amp; &#x3e; &notit; &copy=1" data-text=&#65;>A &copy without semicolon</p>',
    '<textarea>&lt;p&gt;&amp;lt;&nbsp;</textarea>',
    '<title>A &amp; B</title>',
    '<style>.sample::before { content: "&amp;"; }</style>',
    '<script>var literal = "&amp; &#65;";</script>',
  ];
  function tree(node) {
    if (node.nodeType === 3) return [0, node.nodeValue];
    return [1, node.localName, node.namespaceURI,
      node.attributeEntries, node.childNodes.map(tree)];
  }
  for (const source of fixtures) {
    const expected = await page.evaluate(source => {
      const template = document.createElement("template");
      template.innerHTML = source;
      function tree(node) {
        if (node.nodeType === 3) return [0, node.nodeValue];
        return [1, node.localName.toLowerCase(), node.namespaceURI,
          [...node.attributes].map(attr => [attr.name.toLowerCase(), attr.value]),
          [...node.childNodes].map(tree)];
      }
      return [...template.content.childNodes].map(tree);
    }, source);
    assert.deepEqual(parseProjectHtml(source).body.childNodes.map(tree), expected, source);
  }
  for (const source of ['<p title="never closed>Text</p>', '<p title="closed"', '<p/>']) {
    assert.throws(() => parseProjectHtml(source), SyntaxError, source);
  }
});

test("the built Wasm compiler agrees with the source compiler on attribute parsing", async t => {
  const javascript = (await build({
    entryPoints: [new URL("../project-machines.js", import.meta.url).pathname],
    bundle: true, format: "esm", platform: "browser", write: false,
  })).outputFiles[0].text;
  const wasm = await readFile(new URL("../generated/project-builder-quickjs-runtime.wasm", import.meta.url));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [], unexpected = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/") return route.fulfill({ body: "<!doctype html><title>Compiler parity</title>", contentType: "text/html" });
    if (path === "/module.js") return route.fulfill({ body: javascript, contentType: "text/javascript" });
    if (path === "/-/resources-site/project-builder-quickjs-runtime.wasm") {
      return route.fulfill({ body: wasm, contentType: "application/wasm" });
    }
    unexpected.push(route.request().url());
    return route.abort();
  });
  await page.goto("http://compiler.test/");
  const sources = [
    '<p data-label="a > b" class="first" CLASS="ignored">Text</p>',
    '<p style=\'color:red; --label:"a > b";\'>Text</p>',
    '<svg viewBox="0 0 24 24"><path d="M1 2 L3 4" /></svg>',
    '<p data-label="unterminated>Text</p>',
    '<p style=\'color:red; } p { color:blue;\'>Text</p>',
    '<p style=\'background:url("https://outside.test/pixel")\'>Text</p>',
    '<p data-label="recovered > failure">Text</p>',
    '<p title="A &amp; B">&nbsp;&NotEqualTilde; &#x1f431; &amp;lt;</p>',
    '<textarea>&lt;b&gt; &amp; &#128;</textarea>',
    '<p style="color:&#114;ed">Decoded inline CSS</p>',
    '<p style="background:&#117;rl(&quot;https://outside.test/pixel&quot;)">Blocked URL</p>',
    '<p>&lt;img src=&quot;https://outside.test/pixel&quot;&gt;</p>',
  ];
  const expected = sources.map(content => {
    try { return { value: compileProjectFiles([{ path: "index.html", content }]) }; }
    catch (error) { return { error: error.message }; }
  });
  const actual = await page.evaluate(async sources => {
    const { createProjectBuildMachine } = await import("/module.js");
    const builder = await createProjectBuildMachine();
    try {
      return sources.map(content => {
        try { return { value: builder.compileFiles([{ path: "index.html", content }], {}) }; }
        catch (error) { return { error: error.message }; }
      });
    } finally { builder.destroy(); }
  }, sources);
  assert.deepEqual(actual, expected);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
});
