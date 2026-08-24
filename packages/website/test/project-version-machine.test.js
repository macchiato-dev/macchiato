import assert from "node:assert/strict";
import test from "node:test";
import { diffProjectSnapshots, planProjectVersionUpdate } from "@macchiato-dev/hub/project-history";
import { createProjectSnapshotDiffer, createProjectSnapshotValidator,
  createProjectVersionPlanner } from "../project-version-machine.js";
import { projectVersionBytecodes, serverModule } from "./server-machine-assets.js";

test("disposable MicroQuickJS version planners match the canonical policy", async () => {
  const planner = createProjectVersionPlanner(serverModule, projectVersionBytecodes);
  for (const changeEmpty of [false, true]) {
    for (const pendingCheckpointEmpty of [false, true]) {
      for (const destructive of [false, true]) {
        for (const reason of ["periodic", "manual", "restore"]) {
          for (const checkpointDue of [false, true]) {
            const input = { changeEmpty, pendingCheckpointEmpty, destructive, reason,
              checkpointDue, lastVersionSequence: 7 };
            assert.deepEqual(await planner(input), planProjectVersionUpdate(input));
          }
        }
      }
    }
  }
});

test("the version machine rejects invalid policy input", async () => {
  const planner = createProjectVersionPlanner(serverModule, projectVersionBytecodes);
  await assert.rejects(() => planner({
    changeEmpty: false, pendingCheckpointEmpty: true, destructive: false,
    reason: "invented", checkpointDue: false, lastVersionSequence: 1,
  }), /guest exception|planning input is invalid/);
});

test("MicroQuickJS computes exact file splice ranges through bounded UTF-16 chunks", async () => {
  const differ = createProjectSnapshotDiffer(serverModule, projectVersionBytecodes);
  const cases = [
    ["plain text", "plain text"],
    ["prefix suffix", "prefix changed suffix"],
    ["", "inserted"],
    ["deleted", ""],
    ["🙂 café 日本語", "🙂 café と日本語"],
    ["a".repeat(20_000) + "before" + "z".repeat(20_000),
      "a".repeat(20_000) + "after" + "z".repeat(20_000)],
  ];
  for (const [beforeText, afterText] of cases) {
    const before = { files: [{ path: "index.txt", content: beforeText }],
      config: { nested: { value: 1 } } };
    const after = { files: [{ path: "index.txt", content: afterText }],
      config: { nested: { value: 2 } } };
    assert.deepEqual(await differ(before, after), diffProjectSnapshots(before, after));
  }
});

test("MicroQuickJS validates bounded normalized snapshot metadata", async () => {
  const validate = createProjectSnapshotValidator(serverModule, projectVersionBytecodes);
  await validate({ files: [{ path: "src/index.js", content: "const value = '\ud800';" }],
    config: { entry: "src/index.js", nested: { enabled: true } } });
  await assert.rejects(() => validate({ files: [{ path: ".env", content: "x" }],
    config: {} }), /Invalid project file path/);
  await assert.rejects(() => validate({ files: [], config: null }),
    /configuration must be an object/);
});
