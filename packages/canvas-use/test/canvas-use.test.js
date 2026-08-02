import assert from "node:assert/strict";
import test from "node:test";
import { CanvasUseHost } from "../src/index.js";

function fixture() {
  const calls = [];
  const context = new Proxy({}, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => calls.push([property, ...args]);
    },
    set(target, property, value) { target[property] = value; calls.push([property, value]); return true; },
  });
  const canvas = { localName: "canvas", getContext: () => context };
  return { calls, host: new CanvasUseHost({ remoteNode: () => canvas }) };
}

test("canvas-use forwards its bounded 2D subset", () => {
  const { calls, host } = fixture();
  host.dispatch({ id: "1", contextType: "2d", action: "set", property: "fillStyle", value: "#30d5c8" });
  host.dispatch({ id: "1", contextType: "2d", action: "call", method: "fillRect", args: [1, 2, 3, 4] });
  assert.deepEqual(calls, [["fillStyle", "#30d5c8"], ["fillRect", 1, 2, 3, 4]]);
  assert.deepEqual(host.inspect(), { commands: 2, canvases: 1 });
});

test("canvas-use rejects capabilities outside its declaration", () => {
  const { host } = fixture();
  assert.throws(() => host.dispatch({ id: "1", contextType: "webgl", action: "call", method: "drawArrays", args: [] }), /only grants a 2D/);
  assert.throws(() => host.dispatch({ id: "1", contextType: "2d", action: "call", method: "drawImage", args: [] }), /rejected method/);
  assert.throws(() => host.dispatch({ id: "1", contextType: "2d", action: "set", property: "fillStyle", value: "url(https://example.com)" }), /rejected color/);
});
