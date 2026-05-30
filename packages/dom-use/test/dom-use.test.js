import assert from "node:assert/strict";
import test from "node:test";

import { DomUse } from "../src/index.js";

function articleDomUse(schema = {}) {
  return new DomUse({
    nodes: {
      main: { attrs: ["class"], children: ["h1", "p", "ul", "a", "img"] },
      h1: { attrs: [], children: ["#text"] },
      p: { attrs: ["class"], children: ["#text", "strong"] },
      strong: { attrs: [], children: ["#text"] },
      ul: { attrs: [], children: ["li"] },
      li: { attrs: [], children: ["#text"] },
      a: { attrs: ["href"], children: ["#text"] },
      img: { attrs: ["src", "srcset"], children: [] },
    },
    urls: false,
    maxDepth: 6,
    ...schema,
  });
}

test("serializes allowed article-shaped content", () => {
  const domUse = articleDomUse();
  const doc = domUse.createDocument();
  const main = doc.createElement("main");
  const heading = doc.createElement("h1");
  heading.textContent = "Neighborhood Library";
  const body = doc.createElement("p");
  body.textContent = "Open late on Thursdays.";
  main.appendChild(heading);
  main.appendChild(body);

  assert.equal(
    domUse.getOuterHTML(main),
    '<main><h1>Neighborhood Library</h1><p>Open late on Thursdays.</p></main>',
  );
});

test("rejects nodes, children, and attributes outside the schema", () => {
  const domUse = articleDomUse();
  const doc = domUse.createDocument();
  const main = doc.createElement("main");

  assert.throws(() => doc.createElement("script"), /Node not allowed: script/);
  assert.throws(() => main.setAttribute("onclick", "alert(1)"), /Attribute not allowed/);
  assert.throws(() => main.appendChild(doc.createElement("strong")), /Child strong not allowed in main/);
});

test("drops invalid markup when setting innerHTML", () => {
  const domUse = articleDomUse();
  const doc = domUse.createDocument();
  const main = doc.createElement("main");

  domUse.setInnerHTML(
    main,
    '<h1>Hours</h1><script>alert(1)</script><p onclick="alert(1)">Open</p><ul><li>Cards</li></ul>',
  );

  assert.equal(domUse.getInnerHTML(main), "<h1>Hours</h1><ul><li>Cards</li></ul>");
});

test("denies URL attributes by default even when attribute names are allowed", () => {
  const domUse = articleDomUse();
  const doc = domUse.createDocument();
  const link = doc.createElement("a");

  assert.throws(
    () => link.setAttribute("href", "https://example.test/"),
    /URL attribute not allowed on a: href/,
  );
});

test("allows URL attributes only when the URL matches an explicit rule", () => {
  const domUse = articleDomUse({
    urls: {
      href: /^https:\/\/library\.example\//,
      srcset: /^https:\/\/images\.example\//,
    },
  });
  const doc = domUse.createDocument();
  const link = doc.createElement("a");
  const image = doc.createElement("img");

  link.setAttribute("href", "https://library.example/events");
  image.setAttribute("srcset", "https://images.example/a.jpg 1x, https://images.example/b.jpg 2x");

  assert.equal(link.getAttribute("href"), "https://library.example/events");
  assert.throws(() => link.setAttribute("href", "https://tracker.example/"), /URL not allowed/);
  assert.throws(() => link.setAttribute("href", "javascript:alert(1)"), /Disallowed URL/);
  assert.throws(
    () => image.setAttribute("srcset", "https://images.example/a.jpg 1x, https://tracker.example/b.jpg 2x"),
    /URL not allowed/,
  );
});

test("enforces configurable text and attribute length limits", () => {
  const domUse = articleDomUse({
    limits: {
      maxTextLength: 5,
      maxAttributeNameLength: 8,
      maxAttributeValueLength: 6,
    },
    globalAttrs: ["data-*"],
  });
  const doc = domUse.createDocument();
  const paragraph = doc.createElement("p");

  assert.throws(() => { paragraph.textContent = "too long"; }, /Text exceeds maxTextLength 5/);
  assert.throws(() => paragraph.setAttribute("data-long-name", "ok"), /Attribute name exceeds/);
  assert.throws(() => paragraph.setAttribute("class", "too-big"), /Attribute value exceeds/);
});

test("enforces attribute and node count limits", () => {
  const domUse = articleDomUse({
    limits: {
      maxAttributes: 1,
      maxNodes: 3,
    },
    globalAttrs: ["data-*"],
  });
  const doc = domUse.createDocument();
  const main = doc.createElement("main");

  main.setAttribute("class", "page");
  assert.throws(() => main.setAttribute("data-extra", "x"), /Element exceeds maxAttributes 1/);

  doc.createElement("h1");
  doc.createElement("p");
  assert.throws(() => doc.createElement("ul"), /DOM document exceeds maxNodes 3/);
});

test("rejects troublesome special characters in text and attributes by default", () => {
  const domUse = articleDomUse({ globalAttrs: ["data-*"] });
  const doc = domUse.createDocument();
  const paragraph = doc.createElement("p");

  assert.throws(() => { paragraph.textContent = "bad\u0000text"; }, /Troublesome special character in text/);
  assert.throws(
    () => paragraph.setAttribute("data-note", "hidden\u202Etxt"),
    /Troublesome special character in attribute value/,
  );
});

test("supports schema content patterns for stricter pages", () => {
  const domUse = articleDomUse({
    content: {
      allowedPattern: "^[A-Za-z0-9 .-]*$",
    },
    globalAttrs: ["data-*"],
  });
  const doc = domUse.createDocument();
  const paragraph = doc.createElement("p");

  paragraph.textContent = "Room 2 - open";
  assert.throws(() => { paragraph.textContent = "Room 2!"; }, /Content not allowed in text/);
  assert.throws(() => paragraph.setAttribute("data-note", "Room 2!"), /Content not allowed in attribute value/);
});
