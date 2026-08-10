import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { BrowserDomHost, compileDomShapePolicy, inspectDomShape, ownsNativeInput } from "../src/index.js";
import { browserUseQuickJsDomGuestSource } from "../src/quickjs-dom-guest.js";

function element(tagName, attrs = {}, children = [], text = "") {
  return {
    nodeType: 1,
    localName: tagName,
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    children,
    childNodes: text ? [{ nodeType: 3, textContent: text }, ...children] : children,
  };
}

function nativeSurface() {
  const outside = { nodeType: 1, localName: "main", parentNode: null };
  const root = {
    nodeType: 1,
    localName: "div",
    parentNode: outside,
    children: [],
    childNodes: [],
    querySelectorAll() { return []; },
    contains(node) {
      for (let current = node; current; current = current.parentNode) if (current === root) return true;
      return false;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const makeNode = (nodeType, localName = "") => ({
    nodeType, localName, parentNode: null, children: [], childNodes: [],
  });
  const range = { setStart() {}, setEnd() {} };
  const selection = { rangeCount: 0, removeAllRanges() {} };
  const ownerDocument = {
    nodeType: 9,
    createElement: (tag) => makeNode(1, tag),
    createTextNode: (text) => ({ ...makeNode(3), textContent: text }),
    createDocumentFragment: () => makeNode(11),
    createRange: () => range,
    getSelection: () => selection,
  };
  root.ownerDocument = ownerDocument;
  outside.ownerDocument = ownerDocument;
  return { root, outside, ownerDocument, range, selection, makeNode };
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

test("browser-use accounts for per-element surface budgets", () => {
  const policy = compileDomShapePolicy({ tags: ["div", "span"], maxElements: 4, maxTagCounts: { span: 1 } });
  const allowed = element("root", {}, [element("div", {}, [element("span")])]);
  assert.deepEqual(inspectDomShape(allowed, policy).tags, { div: 1, span: 1 });
  assert.throws(
    () => inspectDomShape(element("root", {}, [element("div", {}, [element("span"), element("span")])]), policy),
    /exceeds 1 span elements/,
  );
});

test("browser-use exhausts and renews operation gas", () => {
  const ownerDocument = {};
  const root = element("root", {}, [element("div")]);
  Object.assign(root, { ownerDocument, querySelectorAll() { return []; } });
  const host = new BrowserDomHost(root, { tags: ["div"], maxOperations: 2 });
  host.dispatch({ op: "inspect" });
  host.dispatch({ op: "inspect" });
  assert.throws(() => host.dispatch({ op: "inspect" }), /operation gas exhausted/);
  assert.deepEqual(host.surface.operations, { total: 3, window: 3, peakWindow: 3 });
  host.renewOperationBudget();
  assert.doesNotThrow(() => host.dispatch({ op: "inspect" }));
  assert.equal(host.surface.remaining.operations, 1);
  assert.equal(host.surface.operations.peakWindow, 3);
});

test("browser-use filters guest event subscriptions through policy", () => {
  const ownerDocument = {};
  const root = {
    ownerDocument,
    querySelectorAll() { return []; },
    contains(node) { return node === root; },
    addEventListener() {},
    removeEventListener() {},
  };
  const host = new BrowserDomHost(root, {
    tags: ["div"],
    events: ["keydown"],
  });
  assert.doesNotThrow(() => host.listen("root", "keydown", "allowed"));
  assert.throws(() => host.listen("root", "message", "denied"), /subscription is not allowed: message/);
});

test("browser-use recognizes DOM handles from another realm by shape", () => {
  const iframeNode = { nodeType: 1, localName: "p" };
  const root = {
    ownerDocument: {}, firstChild: iframeNode,
    querySelectorAll() { return []; }, contains() { return true; },
  };
  const host = new BrowserDomHost(root, { tags: ["p"] });
  const encoded = host.remote({ action: "get", id: "root", property: "firstChild" });
  assert.equal(typeof encoded.handle, "string");
  assert.equal(host.remoteNode(encoded.handle), iframeNode);
});

test("browser-use does not expose native nodes outside the granted surface", () => {
  const { root, outside } = nativeSurface();
  const host = new BrowserDomHost(root, { tags: ["div"] });

  assert.deepEqual(host.remote({ action: "get", id: "root", property: "parentNode" }), { value: null });
  assert.throws(() => host.registerRemote(outside), /outside the granted surface/);
  assert.throws(
    () => host.remote({ action: "call", id: "document", method: "appendChild", args: [{ __handle: "root" }] }),
    /Document access is outside/,
  );
  assert.throws(() => host.remote({ action: "call", id: "root", method: "remove", args: [] }), /root cannot be removed/);
  assert.equal(host.ids.has(outside), false);
});

test("browser-use retains handles for owned detached subtrees and scoped browser objects", () => {
  const { root, range, selection, makeNode } = nativeSurface();
  const host = new BrowserDomHost(root, { tags: ["div", "span"] });
  const created = host.remote({ action: "createElement", tag: "div" });
  const createdNode = host.remoteNode(created.handle);
  const child = makeNode(1, "span");
  const attribute = { nodeType: 2, name: "class", value: "cm-line", ownerElement: createdNode };
  child.parentNode = createdNode;
  createdNode.firstChild = child;
  createdNode.attributes = [attribute];

  const encodedChild = host.remote({ action: "get", id: created.handle, property: "firstChild" });
  assert.equal(host.remoteNode(encodedChild.handle), child);
  const encodedAttributes = host.remote({ action: "get", id: created.handle, property: "attributes" });
  assert.equal(host.remoteNode(encodedAttributes.list[0].handle), attribute);
  assert.equal(host.remoteNode(host.remote({ action: "createRange" }).handle), range);
  assert.equal(host.remoteNode(host.remote({ action: "getSelection" }).handle), selection);
});

test("browser-use destruction releases strong handles and invalidates dispatch", () => {
  const { root } = nativeSurface();
  const host = new BrowserDomHost(root, { tags: ["div"] });
  const created = host.remote({ action: "createElement", tag: "div" });

  assert.ok(host.nodes.size > 2);
  host.destroy();
  assert.equal(host.nodes.size, 0);
  assert.throws(() => host.remoteNode(created.handle), /destroyed/);
  assert.throws(() => host.dispatch({ op: "inspect" }), /destroyed/);
  assert.doesNotThrow(() => host.destroy());
});

test("native form controls retain their own text input", () => {
  assert.equal(ownsNativeInput({ localName: "input" }), true);
  assert.equal(ownsNativeInput({ tagName: "TEXTAREA" }), true);
  assert.equal(ownsNativeInput({ localName: "div", isContentEditable: true }), false);
});

test("generated QuickJS environment matches its directly runnable source", async () => {
  const source = await readFile(new URL("../guest/quickjs-dom-environment.js", import.meta.url), "utf8");
  assert.equal(browserUseQuickJsDomGuestSource, source);
  const context = { __browserUseHost() { throw new Error("host should not run during environment setup"); } };
  vm.runInNewContext(source, context, { filename: "quickjs-dom-environment.js" });
  assert.equal(typeof context.__browserUseDispatchEvent, "function");
  assert.equal(typeof context.__browserUseConfigureEnvironment, "function");
  assert.equal(typeof context.IntersectionObserver, "function");
  assert.equal(typeof context.scrollBy, "function");
  assert.equal(typeof context.scrollTo, "function");
  assert.doesNotThrow(() => context.scrollBy(0, 100));
  vm.runInNewContext("globalThis.intersections = 0; const observer = new IntersectionObserver(() => { intersections += 1; }); observer.observe(document.body);", context);
  assert.equal(context.intersections, 0);
  context.__browserUseFlush();
  assert.equal(context.intersections, 1);
  assert.deepEqual(
    JSON.parse(context.__browserUseConfigureEnvironment(JSON.stringify({ innerWidth: 640, innerHeight: 480, devicePixelRatio: 2 }))),
    { platform: "Linux", innerWidth: 640, innerHeight: 480, devicePixelRatio: 2 },
  );
});

test("QuickJS guest timers honor their requested delay", () => {
  let now = 1_000;
  class GuestDate extends Date { static now() { return now; } }
  const context = { Date: GuestDate, __browserUseHost() { throw new Error("host should not run"); } };
  vm.runInNewContext(browserUseQuickJsDomGuestSource, context);
  vm.runInNewContext("globalThis.fires = 0; setInterval(() => { fires += 1; }, 5000);", context);

  context.__browserUseTick();
  now = 5_999;
  context.__browserUseTick();
  assert.equal(context.fires, 0);
  now = 6_000;
  context.__browserUseTick();
  assert.equal(context.fires, 1);
  now = 10_999;
  context.__browserUseTick();
  assert.equal(context.fires, 1);
  now = 11_000;
  context.__browserUseTick();
  assert.equal(context.fires, 2);
});
