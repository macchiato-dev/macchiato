import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, test } from "node:test";
import { ServerMachineController } from "../../server-use/src/machine-controller.js";

let module;
let bytecode;
before(async () => {
  await import("./build.js");
  module = await WebAssembly.compile(readFileSync(
    new URL("generated/quickjs-server.wasm", import.meta.url)));
  bytecode = new Uint8Array(readFileSync(
    new URL("generated/application.bin", import.meta.url)));
});

test("runs asynchronous application code through a host device", async () => {
  const machine = new ServerMachineController(module, {
    bytecodes: [bytecode],
    devices: {
      sql: async (operation, input) => {
        assert.equal(operation, "site.title");
        assert.deepEqual(input, [7]);
        return [["Macchiato"]];
      },
    },
  });
  assert.deepEqual(await machine.request(["health"]), [200, [], "QuickJS ready"]);
  assert.deepEqual(await machine.request(["title", 7]), [200, [], "Macchiato"]);
});
