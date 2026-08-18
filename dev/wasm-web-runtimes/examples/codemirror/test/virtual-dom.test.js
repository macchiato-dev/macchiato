import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

test("insertBefore preserves browser ordering when moving an existing sibling", async () => {
  const source = await readFile(new URL("../src/microquickjs-dom.js", import.meta.url), "utf8");
  const context = vm.createContext({ print() {} });
  vm.runInContext(source, context);
  const order = vm.runInContext(`(() => {
    const parent = document.createElement("div");
    const a = document.createTextNode("a");
    const b = document.createTextNode("b");
    const c = document.createTextNode("c");
    parent.append(a, b, c);
    parent.insertBefore(a, c);
    return parent.textContent;
  })()`, context);
  assert.equal(order, "bac");
});

test("text node DOM properties share one value", async () => {
  const source = await readFile(new URL("../src/microquickjs-dom.js", import.meta.url), "utf8");
  const context = vm.createContext({ print() {} });
  vm.runInContext(source, context);
  const values = vm.runInContext(`(() => {
    const node = document.createTextNode("old");
    node.nodeValue = "new";
    node.data += "!";
    return [node.textContent, node.nodeValue, node.data];
  })()`, context);
  assert.deepEqual(Array.from(values), ["new!", "new!", "new!"]);
});

test("snapshot identities remain stable across guest mutations", async () => {
  const source = await readFile(new URL("../src/microquickjs-dom.js", import.meta.url), "utf8");
  const context = vm.createContext({ print() {} });
  vm.runInContext(source, context);
  const identities = vm.runInContext(`(() => {
    const parent = document.createElement("div");
    const child = document.createTextNode("before");
    parent.appendChild(child);
    document.body.appendChild(parent);
    const before = __wwcSnapshot().children.at(-1);
    child.data = "after";
    const after = __wwcSnapshot().children.at(-1);
    return [before.id, after.id, before.children[0].id, after.children[0].id];
  })()`, context);
  assert.equal(identities[0], identities[1]);
  assert.equal(identities[2], identities[3]);
});
