import assert from "node:assert/strict";
import test from "node:test";
import { loadBlogPosts, renderBlogInline } from "../../../examples/resources-site/blog-content.js";

const escapeHtml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

test("WebAssembly containers post is complete in English and Spanish", () => {
  for (const locale of ["en", "es"]) {
    const post = loadBlogPosts(undefined, locale).find(({ slug }) => slug === "webassembly-based-sandboxed-containers");
    assert.ok(post);
    assert.match(post.paragraphs.at(-1), locale === "en" ? /practical middle ground/ : /punto medio práctico/);
    assert.ok(post.paragraphs.length >= 10);
    assert.equal(post.body.filter(({ type }) => type === "image").length, 2);
    assert.equal(post.body.find(({ type }) => type === "list").items.length, 5);
  }
});

test("blog inline rendering supports emphasis without weakening escaping", () => {
  assert.equal(renderBlogInline("Use *dom-use* with <care>.", escapeHtml), "Use <em>dom-use</em> with &lt;care&gt;.");
  assert.equal(renderBlogInline("[Try Article](/try?template=article)", escapeHtml), '<a href="/try?template=article">Try Article</a>');
});
