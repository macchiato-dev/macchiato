import assert from "node:assert/strict";
import test from "node:test";

import {
  domUseTodosHandler,
  resetDomUseTodosForTest,
} from "../../../examples/dom-use-todos/handler.js";

async function getPage() {
  const response = await domUseTodosHandler(new Request("http://dom-use-todos.localhost/"));
  return { response, html: await response.text() };
}

async function postEvent(event) {
  const response = await domUseTodosHandler(new Request("http://dom-use-todos.localhost/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  }));
  return { response, text: await response.text() };
}

function nodeIdFor(html, className) {
  const pattern = new RegExp(`<[^>]*class="${className}"[^>]*data-node-id="(\\d+)"[^>]*>`);
  return html.match(pattern)?.[1];
}

test("dom-use-todos renders through QuickJS and dom-use validation", async (t) => {
  await resetDomUseTodosForTest();
  t.after(resetDomUseTodosForTest);

  const { response, html } = await getPage();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Todos<\/title>/);
  assert.match(html, /class="todoapp"/);
  assert.match(html, /class="new-todo" data-node-id="\d+"/);
  assert.doesNotMatch(html, /Sandbox error/);
});

test("dom-use-todos dispatches events inside the QuickJS guest", async (t) => {
  await resetDomUseTodosForTest();
  t.after(resetDomUseTodosForTest);

  const initial = await getPage();
  const inputId = nodeIdFor(initial.html, "new-todo");
  assert.ok(inputId);

  const added = await postEvent({
    nodeId: inputId,
    type: "keydown",
    payload: { key: "Enter", value: "Buy milk" },
  });
  assert.equal(added.response.status, 200);

  const data = JSON.parse(added.text);
  assert.match(data.html, /Buy milk/);
  assert.match(data.html, /<strong>1<\/strong> item left/);

  const toggleId = nodeIdFor(data.html, "toggle");
  assert.ok(toggleId);
  const toggled = await postEvent({
    nodeId: toggleId,
    type: "change",
    payload: { checked: true },
  });
  const toggledData = JSON.parse(toggled.text);
  assert.match(toggledData.html, /completed/);
  assert.match(toggledData.html, /<strong>0<\/strong> items left/);
});

test("dom-use-todos rejects guest output that violates the schema", async (t) => {
  await resetDomUseTodosForTest();
  t.after(resetDomUseTodosForTest);

  const initial = await getPage();
  const inputId = nodeIdFor(initial.html, "new-todo");
  assert.ok(inputId);

  const rejected = await postEvent({
    nodeId: inputId,
    type: "keydown",
    payload: { key: "Enter", value: "<script>alert(1)</script>" },
  });

  assert.equal(rejected.response.status, 500);
  assert.match(rejected.text, /Sandbox error/);
});
