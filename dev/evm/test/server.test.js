import assert from "node:assert/strict";
import test from "node:test";
import { createEvmPlaygroundServer } from "../server.js";

test("the standalone EVM server exposes only playground assets", async (t) => {
  const server = createEvmPlaygroundServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Ethereum, one/);
  assert.equal((await fetch(`${origin}/evm.wasm`)).headers.get("content-type"), "application/wasm");
  assert.equal((await fetch(`${origin}/src/machine.rs`)).status, 404);
  assert.equal((await fetch(origin, { method: "POST" })).status, 405);
});
