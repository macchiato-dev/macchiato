import assert from "node:assert/strict";
import test from "node:test";

import { evmPlaygroundHandler } from "../handler.js";

test("the EVM handler serves only its fixed playground assets", async () => {
  const page = await evmPlaygroundHandler(new Request("http://evm.localhost/"));
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(page.headers.get("cache-control"), "no-store");
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.match(await page.text(), /Ethereum, one/);

  const wasm = await evmPlaygroundHandler(
    new Request("http://evm.localhost/evm.wasm", { method: "HEAD" }),
  );
  assert.equal(wasm.status, 200);
  assert.equal(wasm.headers.get("content-type"), "application/wasm");
  assert.equal(await wasm.text(), "");

  assert.equal((await evmPlaygroundHandler(
    new Request("http://evm.localhost/src/machine.rs"),
  )).status, 404);
  assert.equal((await evmPlaygroundHandler(
    new Request("http://evm.localhost/", { method: "POST" }),
  )).status, 405);
});
