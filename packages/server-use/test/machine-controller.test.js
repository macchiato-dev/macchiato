import assert from "node:assert/strict";
import test from "node:test";
import { createServerMachineBridge } from "../src/machine-controller.js";
import { decodeMachineValue, encodeMachineValue } from "../src/wire.js";

const magic = Uint8Array.of(87, 87, 77, 83);

function fakeGuest(bridge, receive) {
  const memory = new WebAssembly.Memory({ initial: 2 });
  const instance = { exports: {
    memory,
    onmsg(length) {
      if (!length) return;
      const bytes = new Uint8Array(memory.buffer);
      bytes.fill(0, 0, length);
      const actual = bridge.imports.host.msg(0, length);
      receive(decodeMachineValue(bytes.slice(0, actual)), value => {
        const output = encodeMachineValue(value);
        bytes.set(magic, 0); bytes.set(output, magic.length);
        bridge.imports.host.msg(0, magic.length + output.length);
      });
    },
  } };
  bridge.connect(instance);
}

test("round trips a controller request through the msg/onmsg ABI", async () => {
  const bridge = createServerMachineBridge();
  fakeGuest(bridge, (message, reply) => {
    if (message[0] === 0) reply([1, message[1], { status: 200, body: "hello" }]);
  });
  assert.deepEqual(await bridge.request({ route: "home" }), { status: 200, body: "hello" });
});

test("completes an asynchronous named device call before the response", async () => {
  const bridge = createServerMachineBridge({
    devices: { sql: async (operation, input) => ({ operation, id: input.id, name: "Project" }) },
  });
  let request;
  fakeGuest(bridge, (message, reply) => {
    if (message[0] === 0) {
      request = message;
      reply([2, 9, "sql", "project.get", { id: 3 }]);
    } else if (message[0] === 3) {
      assert.deepEqual(message, [3, 9, true, { operation: "project.get", id: 3, name: "Project" }]);
      reply([1, request[1], { status: 200, body: message[3].name }]);
    }
  });
  assert.deepEqual(await bridge.request({ route: "project" }), { status: 200, body: "Project" });
});

test("serializes requests through a single synchronous guest context", async () => {
  const bridge = createServerMachineBridge();
  const order = [];
  fakeGuest(bridge, (message, reply) => {
    if (message[0] === 0) {
      order.push(message[2]);
      reply([1, message[1], message[2]]);
    }
  });
  // The bridge itself remains the low-level one-delivery primitive. A
  // ServerMachineController adds the queue around a real WebAssembly module.
  assert.equal(await bridge.request("first"), "first");
  assert.equal(await bridge.request("second"), "second");
  assert.deepEqual(order, ["first", "second"]);
});

test("limits request-scoped devices to their active request", async () => {
  const bridge = createServerMachineBridge({
    devices: { body: () => { throw new Error("global body device must not run"); } },
  });
  let request;
  fakeGuest(bridge, (message, reply) => {
    if (message[0] === 0) {
      request = message;
      reply([2, 17, "body", "read", [4]]);
    } else if (message[0] === 3) {
      reply([1, request[1], message[3]]);
    }
  });
  const chunk = Uint8Array.of(1, 2, 3, 4);
  assert.deepEqual(await bridge.request("stream", {
    devices: { body: async (operation, input) => {
      assert.equal(operation, "read");
      assert.deepEqual(input, [4]);
      return chunk;
    } },
  }), chunk);
});
