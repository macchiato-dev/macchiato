import assert from "node:assert/strict";
import test from "node:test";

import {
  DOM_NETWORK_CAPABILITIES, DomUse, DomUseGasState, DomUseState,
  SVG_URL_REFERENCE_ATTRIBUTES, URL_CAPABILITY_ATTRIBUTES,
  createDomDocument, sanitizeDomHtml,
} from "../lib/index.js";
import { DomUseHostCapability, LocalStorageBackend } from "../lib/bridge.js";

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

test("keeps compiled capability data in stable state classes", () => {
  const domUse = articleDomUse();
  assert.ok(domUse.state instanceof DomUseState);
  assert.equal(domUse.limits(), domUse.limits());
  assert.ok(createDomDocument(domUse).gas instanceof DomUseGasState);
  assert.equal(sanitizeDomHtml(domUse, "<main><h1>Hello</h1></main>"), "<main><h1>Hello</h1></main>");
});

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

test("allows children through named definitions and alternation rules", () => {
  const domUse = new DomUse({
    definitions: {
      layout: {
        element: "main.layout",
        attrs: ["class"],
        children: [
          { oneOf: ["$brand", "$toggle", "$content"] },
        ],
      },
      brand: {
        element: "header.brand",
        attrs: ["class"],
        children: ["#text"],
      },
      toggle: {
        element: "section.toggle",
        attrs: ["class"],
        children: ["button"],
      },
      content: {
        element: "div.content",
        attrs: ["class", "id"],
        children: ["h1"],
      },
      ambiguousContent: {
        element: "div.content.featured",
        attrs: ["class"],
        children: ["p"],
      },
    },
    nodes: {
      button: { attrs: [], children: ["#text"] },
      h1: { attrs: [], children: ["#text"] },
    },
  });
  const doc = domUse.createDocument();
  const layout = doc.createElement("main");
  const brand = doc.createElement("header");
  const toggle = doc.createElement("section");
  const content = doc.createElement("div");
  const ambiguous = doc.createElement("div");
  const heading = doc.createElement("h1");

  layout.setAttribute("class", "layout");
  brand.setAttribute("class", "brand");
  toggle.setAttribute("class", "toggle");
  content.setAttribute("class", "content");
  content.setAttribute("id", "content");
  assert.throws(() => ambiguous.setAttribute("class", "content featured"), /Ambiguous DOM definitions/);
  brand.appendChild(doc.createTextNode("Resources.co"));
  heading.appendChild(doc.createTextNode("Home"));
  content.appendChild(heading);

  assert.equal(layout.appendChild(brand), brand);
  assert.equal(layout.appendChild(toggle), toggle);
  assert.equal(layout.appendChild(content), content);
  assert.throws(() => layout.appendChild(doc.createElement("button")), /Child button not allowed in main/);
  assert.throws(() => brand.setAttribute("id", "brand"), /Attribute not allowed on header: id/);
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

test("sanitizes HTML fragments for a target container", () => {
  const domUse = articleDomUse();

  assert.equal(
    domUse.sanitizeHTML(
      '<h1>Hours</h1><script>alert(1)</script><p onclick="alert(1)">Open</p><ul><li>Cards</li></ul>',
      { container: "main" },
    ),
    "<h1>Hours</h1><ul><li>Cards</li></ul>",
  );
});

test("can include the sanitized target container when requested", () => {
  const domUse = articleDomUse();

  assert.equal(
    domUse.sanitizeHTML("<h1>Hours</h1><p>Open</p>", {
      container: {
        tagName: "main",
        attributes: { class: "content-root" },
      },
      includeContainer: true,
    }),
    '<main class="content-root"><h1>Hours</h1><p>Open</p></main>',
  );
});

test("matches schema attribute names case-insensitively when sanitizing SVG", () => {
  const domUse = new DomUse({
    nodes: {
      a: { attrs: ["href"], children: ["svg"] },
      svg: { attrs: ["viewBox", "fill"], children: ["path"] },
      path: { attrs: ["d"], children: [] },
    },
    urls: { href: "^/$" },
  });

  assert.equal(
    domUse.sanitizeHTML('<a href="/"><svg viewBox="0 0 24 24" fill="none"><path d="M3 10h18"></path></svg></a>'),
    '<a href="/"><svg viewBox="0 0 24 24" fill="none"><path d="M3 10h18"></path></svg></a>',
  );
});

test("strict sanitization rejects markup that permissive sanitization drops", () => {
  const domUse = articleDomUse();
  assert.equal(domUse.sanitizeHTML("<script>bad()</script><p>Safe</p>"), "<p>Safe</p>");
  assert.throws(
    () => domUse.sanitizeHTML("<script>bad()</script><p>Safe</p>", { strict: true }),
    /Node not allowed: script/,
  );
});

test("denies external URL values when no URL authority is granted", () => {
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

test("allows same-document fragments without granting external URL authority", () => {
  const domUse = articleDomUse({ urls: undefined });
  const doc = domUse.createDocument();
  const link = doc.createElement("a");

  link.setAttribute("href", "#borrowing-rules");
  assert.equal(link.getAttribute("href"), "#borrowing-rules");
  assert.throws(() => link.setAttribute("href", "/borrowing-rules"), /URL attribute not allowed/);
  assert.throws(() => link.setAttribute("href", "https://library.example/"), /URL attribute not allowed/);
});

test("can explicitly deny or constrain same-document fragments", () => {
  const allDenied = articleDomUse({ urls: false });
  const denied = articleDomUse({ urls: { fragments: false } });
  const constrained = articleDomUse({ urls: { fragments: /^#section-[a-z]+$/ } });
  const allDeniedLink = allDenied.createDocument().createElement("a");
  const deniedLink = denied.createDocument().createElement("a");
  const constrainedLink = constrained.createDocument().createElement("a");

  assert.throws(() => allDeniedLink.setAttribute("href", "#details"), /Fragment URL not allowed/);
  assert.throws(() => deniedLink.setAttribute("href", "#details"), /Fragment URL not allowed/);
  constrainedLink.setAttribute("href", "#section-details");
  assert.throws(() => constrainedLink.setAttribute("href", "#dialog"), /Fragment URL not allowed/);
});

test("preserves allowed fragments while sanitizing HTML", () => {
  const domUse = articleDomUse({ urls: undefined });
  assert.equal(
    domUse.sanitizeHTML('<a href="#hours">Hours</a><a href="https://tracker.example/">Tracker</a>'),
    '<a href="#hours">Hours</a>',
  );
});

test("can scope global URL capabilities to an element and attribute pair", () => {
  const domUse = articleDomUse({
    nodes: {
      a: { attrs: ["href"], children: ["#text"] },
      img: { attrs: ["src"], children: [] },
    },
    urls: {
      "a.href": /^https:\/\/articles\.example\//,
      "img.src": /^https:\/\/images\.example\//,
    },
  });
  const doc = domUse.createDocument();
  const link = doc.createElement("a");
  const image = doc.createElement("img");
  link.setAttribute("href", "https://articles.example/one");
  image.setAttribute("src", "https://images.example/one.png");
  assert.throws(() => link.setAttribute("href", "https://images.example/one.png"), /URL not allowed/);
  assert.throws(() => image.setAttribute("src", "https://articles.example/one"), /URL not allowed/);
});

test("network capability inventory covers loading, interaction, hints, and SVG", () => {
  const entries = new Set(DOM_NETWORK_CAPABILITIES.map(({ namespace, tag, attribute, effect }) => `${namespace}:${tag}.${attribute}:${effect}`));
  assert.ok(entries.has("html:img.src:load"));
  assert.ok(entries.has("html:a.href:navigate"));
  assert.ok(entries.has("html:link.href:hint-or-load"));
  assert.ok(entries.has("html:link.imagesrcset:hint-or-load"));
  assert.ok(entries.has("html:base.href:resolution"));
  assert.ok(entries.has("html:form.action:submit"));
  assert.ok(entries.has("html:meta.content:refresh"));
  assert.ok(entries.has("svg:image.href:load"));
  assert.ok(entries.has("svg:a.xlink:href:navigate"));
  assert.ok(URL_CAPABILITY_ATTRIBUTES.includes("srcset"));
  assert.ok(SVG_URL_REFERENCE_ATTRIBUTES.includes("filter"));
});

test("filters HTML network sinks and denies their direct URL assignments by default", () => {
  const domUse = new DomUse({
    nodes: {
      main: { attrs: [], children: ["img", "link", "meta"] },
      img: { attrs: ["src"], children: [] },
      link: { attrs: ["rel", "href"], children: [] },
      meta: { attrs: ["http-equiv", "content"], children: [] },
    },
  });
  const doc = domUse.createDocument();
  assert.throws(() => doc.createElement("img").setAttribute("src", "https://tracker.example/pixel"), /URL attribute not allowed/);
  assert.throws(() => doc.createElement("link").setAttribute("href", "https://tracker.example/prefetch"), /URL attribute not allowed/);
  const meta = doc.createElement("meta");
  meta.setAttribute("http-equiv", "refresh");
  assert.throws(() => meta.setAttribute("content", "0; url=https://tracker.example/next"), /URL attribute not allowed/);
  assert.equal(
    domUse.sanitizeHTML('<main><img src="https://tracker.example/pixel"><link rel="prefetch" href="https://tracker.example/next"><meta http-equiv="refresh" content="0;url=https://tracker.example/next"></main>'),
    "<main></main>",
  );
  assert.throws(
    () => domUse.sanitizeHTML('<main><link rel="prefetch" href="https://tracker.example/next"></main>', { strict: true }),
    /URL attribute not allowed/,
  );
});

test("does not treat ordinary meta content as a refresh URL", () => {
  const domUse = new DomUse({
    nodes: { meta: { attrs: ["name", "content"], children: [] } },
  });
  assert.equal(domUse.sanitizeHTML('<meta name="viewport" content="width=device-width, initial-scale=1">'), '<meta name="viewport" content="width=device-width, initial-scale=1">');
});

test("applies URL policy to SVG href and presentation references", () => {
  const schema = {
    nodes: {
      svg: { attrs: [], children: ["image", "path"] },
      image: { attrs: ["href", "xlink:href"], children: [] },
      path: { attrs: ["fill", "filter"], children: [] },
    },
  };
  const domUse = new DomUse(schema);
  const doc = domUse.createDocument();
  assert.throws(() => doc.createElement("image").setAttribute("href", "https://tracker.example/image.svg"), /URL attribute not allowed/);
  assert.throws(() => doc.createElement("path").setAttribute("filter", "url(https://tracker.example/filter.svg#blur)"), /URL attribute not allowed/);
  const path = doc.createElement("path");
  path.setAttribute("fill", "url(#brand-gradient)");
  assert.equal(path.getAttribute("fill"), "url(#brand-gradient)");
  assert.equal(
    domUse.sanitizeHTML('<svg><image href="https://tracker.example/image.svg"></image><path fill="url(#brand-gradient)"></path><path filter="url(https://tracker.example/filter.svg#blur)"></path></svg>'),
    '<svg><path fill="url(#brand-gradient)"></path></svg>',
  );
});

test("can add target blank to links as a declared projection policy", () => {
  const domUse = articleDomUse({
    links: { addTargetBlank: true },
    urls: { href: /^https:\/\/library\.example\// },
  });
  const doc = domUse.createDocument();
  const link = doc.createElement("a");
  link.setAttribute("href", "https://library.example/events");
  assert.equal(link.getAttribute("target"), "_blank");
  assert.match(domUse.getOuterHTML(link), /target="_blank"/);
});

test("target blank projection preserves an explicitly configured target", () => {
  const domUse = articleDomUse({
    nodes: { a: { attrs: ["href", "target"], children: ["#text"] } },
    links: { addTargetBlank: true },
    urls: { href: /^https:\/\/library\.example\// },
  });
  const doc = domUse.createDocument();
  const link = doc.createElement("a");
  link.setAttribute("target", "_self");
  link.setAttribute("href", "https://library.example/events");
  assert.equal(link.getAttribute("target"), "_self");
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

test("controls event listener registration and payloads by schema policy", () => {
  const domUse = articleDomUse({
    nodes: {
      main: { attrs: [], events: ["click"], children: ["button"] },
      button: { attrs: [], events: ["keydown"], children: ["#text"] },
    },
    limits: {
      maxTextLength: 12,
    },
  });
  const doc = domUse.createDocument();
  const main = doc.createElement("main");
  const button = doc.createElement("button");
  main.appendChild(button);

  main.addEventListener("click");
  button.addEventListener("keydown");
  assert.throws(() => button.addEventListener("click"), /Event not allowed on button: click/);
  assert.equal(domUse.eventTarget([button, main], "click"), main);
  assert.equal(domUse.eventTarget([button, main], "keydown"), button);
  assert.equal(domUse.eventTarget([main], "drop"), null);

  assert.deepEqual(
    domUse.sanitizeEventPayload("keydown", {
      key: "Enter",
      value: "short",
      checked: true,
      ignored: "nope",
      controls: [{ nodeId: "7", value: "field", checked: false }],
    }),
    {
      key: "Enter",
      value: "short",
      checked: true,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      controls: [{ nodeId: "7", value: "field", checked: false }],
    },
  );
  assert.throws(
    () => domUse.sanitizeEventPayload("keydown", { key: "Enter", value: "too many chars" }),
    /Text exceeds maxTextLength 12/,
  );
});

test("reserves bridge node identifiers even when data attributes are allowed", () => {
  const domUse = new DomUse({ nodes: { button: { attrs: ["data-*"], children: [] } } });
  const button = domUse.createDocument().createElement("button");
  assert.throws(() => button.setAttribute("data-node-id", "spoofed"), /reserved for the host bridge/);
});

test("enforces configurable DOM gas budgets", () => {
  const domUse = articleDomUse({
    gas: {
      tank: { init: 11 },
      refill: 0,
      costs: {
        createElement: 6,
      },
    },
  });
  const doc = domUse.createDocument();

  doc.createElement("main");
  assert.equal(doc.gas.available, 5);
  assert.throws(
    () => doc.createElement("h1"),
    /DOM gas exhausted for createElement: need 6, have 5/,
  );
});

test("supports lifecycle tank limits and per-second gas refill", () => {
  const domUse = articleDomUse({
    gas: {
      tank: { init: 10, idle: 5, event: 3 },
      refill: 20,
      costs: {
        createElement: 1,
      },
    },
  });
  const doc = domUse.createDocument();

  doc.createElement("main");
  assert.equal(doc.gas.available, 9);

  domUse.setGasLifecycle(doc, "idle", 0);
  assert.equal(doc.gas.capacity, 5);
  assert.equal(doc.gas.available, 5);

  doc.gas.available = 1;
  doc.gas.lastRefill = 0;
  assert.equal(domUse.gasAvailable(doc, 99), 1);
  assert.equal(domUse.gasAvailable(doc, 100), 3);
  assert.equal(domUse.gasAvailable(doc, 250), 5);

  domUse.setGasLifecycle(doc, "event", 250);
  assert.equal(doc.gas.capacity, 3);
  assert.equal(doc.gas.available, 3);
});

test("charges innerHTML gas from input length and estimated node count", () => {
  const html = "<h1>Title</h1><p>Body</p>";
  const schema = {
    nodes: {
      main: { attrs: [], children: ["h1", "p"] },
      h1: { attrs: [], children: ["#text"] },
      p: { attrs: [], children: ["#text"] },
    },
    gas: {
      tank: { init: 11 },
      refill: 0,
      costs: {
        createElement: 0,
        createTextNode: 0,
        appendChild: 0,
        replaceChildren: 0,
        setTextContent: 0,
        setInnerHTML: { base: 1, perNode: 2, perChar: 1, charUnit: 10 },
      },
    },
  };
  const domUse = new DomUse(schema);
  const doc = domUse.createDocument();
  const main = doc.createElement("main");

  assert.throws(
    () => domUse.setInnerHTML(main, html),
    /DOM gas exhausted for setInnerHTML: need 12, have 11/,
  );

  const enoughGas = new DomUse({
    ...schema,
    gas: {
      ...schema.gas,
      tank: { init: 12 },
    },
  });
  const enoughDoc = enoughGas.createDocument();
  const enoughMain = enoughDoc.createElement("main");
  enoughGas.setInnerHTML(enoughMain, html);

  assert.equal(enoughGas.getInnerHTML(enoughMain), "<h1>Title</h1><p>Body</p>");
  assert.equal(enoughDoc.gas.available, 0);
});

test("host bridge preserves event lifecycle across nested event scopes", () => {
  const capability = new DomUseHostCapability({
    gas: {
      tank: { init: 100, idle: 20, event: 7 },
      refill: 0,
      costs: {},
    },
  });

  capability.finishInit();
  assert.equal(capability.document.gas.lifecycle, "idle");
  assert.equal(capability.document.gas.capacity, 20);

  capability.beginEvent();
  assert.equal(capability.document.gas.lifecycle, "event");
  assert.equal(capability.document.gas.capacity, 7);
  assert.equal(capability.document.gas.available, 7);
  capability.document.gas.available = 5;

  capability.beginEvent();
  assert.equal(capability.document.gas.lifecycle, "event");
  assert.equal(capability.document.gas.capacity, 7);

  capability.endEvent();
  assert.equal(capability.document.gas.lifecycle, "event");
  assert.equal(capability.document.gas.capacity, 7);
  assert.equal(capability.document.gas.available, 5);

  capability.endEvent();
  assert.equal(capability.document.gas.lifecycle, "idle");
  assert.equal(capability.document.gas.capacity, 20);
  assert.equal(capability.document.gas.available, 20);
});

test("host bridge gives each top-level event a fresh gas tank", () => {
  const capability = new DomUseHostCapability({
    gas: {
      tank: { init: 100, idle: 20, event: 7 },
      refill: 0,
      costs: {},
    },
  });

  capability.finishInit();
  capability.beginEvent();
  capability.document.gas.available = 1;
  capability.endEvent();
  assert.equal(capability.document.gas.lifecycle, "idle");
  assert.equal(capability.document.gas.available, 20);

  capability.beginEvent();
  assert.equal(capability.document.gas.lifecycle, "event");
  assert.equal(capability.document.gas.available, 7);
  capability.endEvent();
});

test("host bridge releases quota for host-parsed replacement subtrees", () => {
  const capability = new DomUseHostCapability({
    nodes: {
      body: { attrs: [], children: ["main"] },
      main: { attrs: [], children: ["p"] },
      p: { attrs: [], children: ["#text"] },
    },
    limits: { maxNodes: 8 },
  });
  const { id } = capability.createElement("main");

  capability.setInnerHTML(id, "<p>one</p><p>two</p>");
  assert.equal(capability.document.createdNodes, 5);
  capability.setInnerHTML(id, "<p>three</p>");
  assert.equal(capability.document.createdNodes, 3);
  capability.setInnerHTML(id, "<p>four</p>");
  assert.equal(capability.document.createdNodes, 3);
});

test("host bridge revisions distinguish DOM mutations from read-only work", () => {
  const capability = new DomUseHostCapability({
    nodes: {
      main: { attrs: ["id"], children: ["#text"] },
    },
  });

  const initial = capability.revision;
  const { id } = capability.createElement("main");
  assert.ok(capability.revision > initial);
  const created = capability.revision;

  capability.node(id);
  capability.serializeApp();
  assert.equal(capability.revision, created);

  capability.setAttribute(id, "id", "surface");
  assert.ok(capability.revision > created);
  const attributed = capability.revision;
  capability.setTextContent(id, "changed");
  assert.ok(capability.revision > attributed);
});

test("localStorage bridge removes allowed keys", () => {
  const memory = new Map();
  const storage = new LocalStorageBackend({
    mode: "passthrough",
    keys: ["matrix"],
    storage: {
      getItem: (key) => memory.get(key) || null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    },
  });

  storage.setItem("matrix", "value");
  assert.equal(storage.getItem("matrix"), "value");
  storage.removeItem("matrix");
  assert.equal(storage.getItem("matrix"), null);
  assert.throws(() => storage.removeItem("other"), /localStorage key not allowed/);
});
