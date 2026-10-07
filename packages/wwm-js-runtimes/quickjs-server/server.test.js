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

test("round-trips large resources and Unicode through the byte protocol", async () => {
  const machine = new ServerMachineController(module, { bytecodes: [bytecode] });
  const samples = ["", "zero\0byte", "café 日本語 🐈", "resource ".repeat(100000)];
  for (const text of samples) assert.equal(await machine.request(["echo", text]), text);
  const units = [[], [0], [0xd800], [0xdc00], [0xd83d, 0xdc08], [0xd800, 65]];
  const expected = units.map(value => new TextEncoder().encode(String.fromCharCode(...value)));
  assert.deepEqual(await machine.request(["utf8", units]), expected);
});
