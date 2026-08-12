import assert from "node:assert/strict";
import test from "node:test";
import { applyBatch, createEditorDom, digestVirtualDom, VIRTUAL_DOM_PROTOCOL } from "../src/model.js";
import { createGuestDomFacade } from "../src/guest-dom.js";

test("the same bulk batch produces exactly matching stores", () => {
  const guest = createEditorDom("before");
  const host = structuredClone(guest);
  const batch = {
    protocol: VIRTUAL_DOM_PROTOCOL, baseRevision: 0, revision: 1,
    operations: [
      { op: "set", path: ["nodes", "input", "props", "value"], value: "after" },
      { op: "set", path: ["nodes", "metrics-label", "text"], value: "1 lines · 5 characters" },
    ],
  };
  applyBatch(guest, batch);
  applyBatch(host, structuredClone(batch));
  assert.deepEqual(host, guest);
  assert.equal(digestVirtualDom(host), digestVirtualDom(guest));
});

test("disposable guest DOM wrappers collect writes into one batch", () => {
  const store = createEditorDom("before");
  const facade = createGuestDomFacade(store);
  const mutation = facade.beginBatch();
  const input = facade.document.getElementById("input");
  input.value = "bulk";
  input.setSelectionRange(2, 4);
  const operations = mutation.finish();
  assert.equal(operations.length, 3);
  assert.equal(input.isConnected, false);
  applyBatch(store, { protocol: VIRTUAL_DOM_PROTOCOL, baseRevision: 0, revision: 1, operations });
  assert.equal(store.nodes.input.props.value, "bulk");
  assert.equal(store.nodes.input.props.selectionEnd, 4);
});
