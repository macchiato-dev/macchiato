import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { parseProjectHtml } from "../project-html-parser.js";

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
