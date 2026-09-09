import assert from "node:assert/strict";
import test from "node:test";
import { ServerMachineController } from "../../server-use/src/machine-controller.js";
import { accountSqlOperations } from "../account-sql-policy.js";
import { CONTENT_QUERIES } from "../../hub/src/content.js";
import { policyModule as module, policyBytecodes as bytecodes } from "./server-machine-assets.js";

test("the policy machine owns SQL selection and result shaping", async () => {
  const calls = [];
  const policy = new ServerMachineController(module, { bytecodes, devices: {
    database: async (operation, input) => {
      calls.push([operation, input]);
      return [["ready"], [[1]], 0];
    },
  } });

  assert.deepEqual(await policy.request(["sql", "system.ready", []]), ["ok", [[1]]]);
  assert.equal(calls[0][0], "read");
  assert.match(calls[0][1][0], /SELECT 1/);
  const rejected = await policy.request(["sql", "system.not-allowed", []]);
  assert.equal(rejected[0], 500);
  assert.match(rejected[2], /is not allowed/);
});

test("compatibility stores cross the same policy machine", async () => {
  const policy = new ServerMachineController(module, { bytecodes, devices: {
    database: async () => [["id", "display_name", "username"],
      [["u1", "Example", "example"]], 0],
  } });
  const operation = accountSqlOperations["account.get"];

  const result = await policy.request(["database-client", "execute",
    [operation.sql, ["u1"]]]);
  assert.deepEqual(result, ["ok", [["id", "display_name", "username"],
    [["u1", "Example", "example"]], 0]]);
  const rejected = await policy.request(["database-client", "execute",
    ["SELECT secret FROM nowhere", []]]);
  assert.equal(rejected[0], 500);
  assert.match(rejected[2], /not allowed/);
});

test("SQL policy carries multi-megabyte projects without a fixed routing-buffer limit", async () => {
  const snapshot = "猫 🀄\n".repeat(600_000);
  const row = [["snapshot_json"], [[snapshot]], 0];
  const policy = new ServerMachineController(module, {
    bytecodes, maxMessageBytes: 128 * 1024 * 1024,
    devices: { database: async () => row },
  });
  const result = await policy.request(["database-client", "execute",
    [CONTENT_QUERIES.ownedWorkspace, ["owner", "tour", "user-id"]]]);
  assert.deepEqual(result, ["ok", row]);
  // A large delivery must not corrupt the next request or weaken SQL checks.
  const rejected = await policy.request(["database-client", "execute", ["DROP TABLE users", []]]);
  assert.equal(rejected[0], 500);
  assert.match(rejected[2], /not allowed/);
});
