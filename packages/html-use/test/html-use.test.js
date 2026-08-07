import assert from "node:assert/strict";
import test from "node:test";

import { HtmlFragment, parseHTML, sanitizeHTML, serializeHTML } from "../src/index.js";

function element(tagName) {
  return {
    tagName,
    attributes: {},
    children: [],
    setAttribute(name, value) { this.attributes[name] = String(value); },
    appendChild(child) { this.children.push(child); return child; },
  };
}

test("parses through the caller-owned element factory", () => {
  const created = [];
  const fragment = parseHTML('<article data-kind="note"><p>Hello &amp; goodbye</p></article>', {
    createElement(tagName) { created.push(tagName); return element(tagName); },
    createTextNode(text) { return { tagName: "#text", textContent: text }; },
  });

  assert.ok(fragment instanceof HtmlFragment);
  assert.deepEqual(created, ["article", "p"]);
  assert.equal(serializeHTML(fragment), '<article data-kind="note"><p>Hello &amp; goodbye</p></article>');
});

test("permissive sanitizing omits a disallowed subtree", () => {
  const schema = { nodes: { article: {}, p: {} } };
  assert.equal(
    sanitizeHTML("<article><script>bad()</script><p>Safe</p></article>", { schema }),
    "<article><p>Safe</p></article>",
  );
});

test("strict parsing reports rejected markup", () => {
  assert.throws(
    () => parseHTML("<p>Safe</p><script>bad()</script>", {
      strict: true,
      createElement(tagName) {
        if (tagName === "script") throw new Error("Node not allowed: script");
        return element(tagName);
      },
    }),
    /Node not allowed: script/,
  );
});
