import assert from "node:assert/strict";
import test from "node:test";

test("the project workspace receives local editor values without a JSON round trip", async () => {
  const sent = [], local = [];
  const notify = text => sent.push(text);
  globalThis.__browserUseNotify = notify;
  globalThis.__resourcesEditorLocalReceive = message => local.push(message);
  await import("../project-editor-guest.js");
  assert.equal(globalThis.__browserUseNotify, notify, "the boundary notifier is not replaced");
  assert.deepEqual(sent.map(JSON.parse), [{ type: "editor-application-ready" }]);
  for (const type of ["change", "ready", "limit"]) {
    const message = { type, content: "const greeting = 'café 😀';\n" };
    // Identity proves this is the same-guest callback, not encode/decode of
    // an equivalent object. No engine-owned objects are attached to messages.
    globalThis.__codeEditorNotify(message);
    assert.equal(local.at(-1), message);
  }
  assert.equal(sent.length, 1);
  const error = { type: "language-error", language: "rust", message: "Unavailable" };
  globalThis.__codeEditorNotify(error);
  assert.deepEqual(JSON.parse(sent.at(-1)), error, "external notices still serialize");
});
