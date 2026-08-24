import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { ServerMachineController } from "../../server-use/src/machine-controller.js";
import { accountSqlOperations } from "../account-sql-policy.js";

const generated = new URL("../generated/", import.meta.url);
const module = await WebAssembly.compile(await readFile(new URL(
  "microquickjs-server.wasm", generated)));
const bytecodeDirectory = new URL("resources-policy-bytecode/", generated);
const bytecodes = await Promise.all((await readdir(bytecodeDirectory))
  .filter(name => name.endsWith(".bin")).sort()
  .map(name => readFile(new URL(name, bytecodeDirectory))));

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
