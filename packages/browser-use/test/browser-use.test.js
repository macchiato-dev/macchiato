import assert from "node:assert/strict";
import test from "node:test";
import { compileDomShapePolicy, inspectDomShape } from "../src/index.js";

function element(tagName, attrs = {}, children = [], text = "") {
  return {
    nodeType: 1,
    localName: tagName,
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    children,
    childNodes: text ? [{ nodeType: 3, textContent: text }, ...children] : children,
  };
}

test("browser-use detects a constrained live DOM shape", () => {
  const policy = compileDomShapePolicy({
    tags: ["div", "span"],
    attributes: { class: "^[a-z0-9 -]+$" },
    classNames: ["^cm-", "^active$"],
    maxElements: 4,
    maxDepth: 3,
  });
  const root = element("root", {}, [
    element("div", { class: "cm-editor active" }, [element("span", { class: "cm-line" }, [], "hello")]),
  ]);
  assert.deepEqual(inspectDomShape(root, policy), {
    elements: 2,
    textLength: 5,
    tags: { div: 1, span: 1 },
  });
});

test("browser-use rejects undeclared elements, attributes, and classes", () => {
  const policy = { tags: ["div"], attributes: { class: true }, classNames: ["^cm-"] };
  assert.throws(() => inspectDomShape(element("root", {}, [element("script")]), policy), /rejected element/);
  assert.throws(() => inspectDomShape(element("root", {}, [element("div", { onclick: "x" })]), policy), /rejected attribute/);
  assert.throws(() => inspectDomShape(element("root", {}, [element("div", { class: "escape" })]), policy), /rejected class/);
});
