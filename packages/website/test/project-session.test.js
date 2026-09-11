import assert from "node:assert/strict";
import test from "node:test";
import { DRAFT_KEY, hasProjectRecovery, pendingProjectSnapshotKey } from "../project-session.js";

test("only the applicable session recovery candidate defers first output", () => {
  const pending = pendingProjectSnapshotKey("project-a");
  const values = new Map([[pending, "pending snapshot"], [DRAFT_KEY, "draft history"]]);
  const storage = { getItem: key => values.get(key) ?? null };
  for (const [options, expected] of [
    [{ projectId: "project-a" }, true],
    [{ projectId: "project-b" }, false],
    [{}, false],
    [{ projectId: "project-a", readOnly: true }, false],
    [{ projectId: "project-a", persistence: "memory" }, false],
    [{ persistence: "session", navigationType: "navigate" }, false],
    [{ persistence: "session", navigationType: "reload" }, true],
    [{ persistence: "session", navigationType: "back_forward" }, true],
  ]) assert.equal(hasProjectRecovery(options, storage), expected, JSON.stringify(options));
  // Even malformed data waits: the editor will discard it and render the
  // saved state. The outer guest must not implement another snapshot parser.
  values.set(pending, "{");
  assert.equal(hasProjectRecovery({ projectId: "project-a" }, storage), true);
  assert.equal(hasProjectRecovery({ projectId: "project-a" }, {
    getItem() { throw new Error("Storage unavailable"); },
  }), false);
});
