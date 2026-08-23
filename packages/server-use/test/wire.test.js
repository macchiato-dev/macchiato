import assert from "node:assert/strict";
import test from "node:test";
import { decodeMachineValue, encodeMachineValue, MachineWtf8String } from "../src/wire.js";

test("round trips JSON-shaped data plus Uint8Array and integers", () => {
  const value = { route: "home", ok: true, missing: null, count: -7,
    body: new Uint8Array([0, 127, 255]), values: [1, false, "text"] };
  assert.deepEqual(decodeMachineValue(encodeMachineValue(value)), value);
});

test("rejects floats, prototype keys, trailing data, and oversized output", () => {
  assert.throws(() => encodeMachineValue(1.5), /safe integers/);
  assert.throws(() => encodeMachineValue({ body: "long" }, { maxBytes: 2 }), /byte limit/);
  const encoded = encodeMachineValue({ ok: true });
  const trailing = new Uint8Array(encoded.length + 1);
  trailing.set(encoded);
  assert.throws(() => decodeMachineValue(trailing), /trailing data/);
  assert.throws(() => decodeMachineValue(Uint8Array.of(8, 1, 9,
    ...new TextEncoder().encode("__proto__"), 0)), /unsafe object key/);
});

test("round trips explicitly typed WTF-8 bytes without interpreting them on the host", () => {
  const value = new MachineWtf8String(Uint8Array.of(0x61, 0xed, 0xa0, 0x80));
  assert.deepEqual(decodeMachineValue(encodeMachineValue(value)), value);
});
