import assert from "node:assert/strict";
import test from "node:test";

import { DomUse } from "../src/index.js";
import { DomUseHostCapability, LocalStorageBackend } from "../src/bridge.js";

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
      controls: [{ nodeId: "7", value: "field", checked: false }],
    },
  );
  assert.throws(
    () => domUse.sanitizeEventPayload("keydown", { key: "Enter", value: "too many chars" }),
    /Text exceeds maxTextLength 12/,
  );
});

test("enforces configurable DOM gas budgets", () => {
  const domUse = articleDomUse({
    gas: {
      tank: { init: 11 },
      refill: { amount: 0, intervalMs: 1000 },
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

test("supports lifecycle tank limits and interval gas refill", () => {
  const domUse = articleDomUse({
    gas: {
      tank: { init: 10, idle: 5, event: 3 },
      refill: { amount: 2, intervalMs: 100 },
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
      refill: { amount: 0, intervalMs: 1000 },
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
      refill: { amount: 0, intervalMs: 1000 },
      costs: {},
    },
  });

  capability.finishInit();
  assert.equal(capability.document.gas.lifecycle, "idle");
  assert.equal(capability.document.gas.capacity, 20);

  capability.beginEvent();
  assert.equal(capability.document.gas.lifecycle, "event");
  assert.equal(capability.document.gas.capacity, 7);
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
  assert.equal(capability.document.gas.available, 5);
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
