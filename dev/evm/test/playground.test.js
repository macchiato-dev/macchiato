import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const root = new URL("../playground/", import.meta.url).pathname;
const types = new Map([
  [".css", "text/css"], [".html", "text/html"],
  [".js", "text/javascript"], [".wasm", "application/wasm"],
]);
let server;
let origin;

before(async () => {
  server = createServer(async (request, response) => {
    try {
      let path = new URL(request.url, "http://localhost").pathname;
      if (path === "/") path = "/index.html";
      const file = normalize(join(root, path));
      if (!file.startsWith(root)) throw new Error("outside playground");
      response.writeHead(200, { "content-type": types.get(extname(file)) ||
        "application/octet-stream" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end("not found");
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise(resolve => server.close(resolve)));

test("the no-import Wasm machine runs every playground example", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(origin, { waitUntil: "networkidle" });
    assert.equal(await page.locator("#runtime-status").textContent(),
      "Executed entirely inside WebAssembly.");
    const imports = await page.evaluate(async () => WebAssembly.Module.imports(
      await WebAssembly.compile(await (await fetch("./evm.wasm")).arrayBuffer())));
    assert.deepEqual(imports, []);

    const abi = await page.evaluate(async () => {
      const { instance } = await WebAssembly.instantiateStreaming(fetch("./evm.wasm"));
      const api = instance.exports;
      const invalid = api.evm_run(65537, 0, 1000n, 100);
      return {
        capacities: [api.evm_code_capacity(), api.evm_calldata_capacity()],
        invalid: [invalid, api.evm_stack_len(), api.evm_trace_len(),
          api.evm_output_len()],
      };
    });
    assert.deepEqual(abi.capacities, [65536, 65536]);
    assert.deepEqual(abi.invalid, [17, 0, 0, 0]);

    const expected = ["Returned", "Returned", "Returned", "Returned",
      "Returned", "Returned", "Returned", "Bad jump"];
    for (let index = 0; index < expected.length; index++) {
      await page.locator("#example").selectOption(String(index));
      await page.locator("#run").click();
      assert.equal(await page.locator("#exit").textContent(), expected[index]);
      assert.ok(await page.locator("#trace tr").count() > 0);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
