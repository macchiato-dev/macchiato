import assert from "node:assert/strict";
import test from "node:test";
import { nodeResponseHeaders } from "../src/node-response.js";

test("Node response adapter preserves multiple Set-Cookie fields", () => {
  const headers = new Headers({ location: "http://example.test/" });
  headers.append("set-cookie", "session=sealed; Path=/; HttpOnly; SameSite=Lax");
  headers.append("set-cookie", "flow=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");

  assert.deepEqual(nodeResponseHeaders(headers), {
    location: "http://example.test/",
    "set-cookie": [
      "session=sealed; Path=/; HttpOnly; SameSite=Lax",
      "flow=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    ],
  });
});
