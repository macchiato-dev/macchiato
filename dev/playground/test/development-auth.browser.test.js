import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { createDevelopmentAuth } from "../../../packages/app/src/development-auth.js";
import { nodeResponseHeaders } from "../../../packages/app/src/node-response.js";

test("fragment bootstrap restores an HttpOnly session without leaking its key", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "machines-development-auth-browser-"));
  let auth;
  const server = createServer(async (incoming, outgoing) => {
    const body = incoming.method === "POST"
      ? await new Promise((resolve) => {
          const chunks = [];
          incoming.on("data", (chunk) => chunks.push(chunk));
          incoming.on("end", () => resolve(Buffer.concat(chunks)));
        })
      : undefined;
    const request = new Request(`http://${incoming.headers.host}${incoming.url}`, {
      method: incoming.method,
      headers: new Headers(Object.entries(incoming.headers).map(([name, value]) => [name, String(value)])),
      body,
    });
    const response = auth.isAuthenticated(request)
      ? new Response("<!doctype html><title>Protected</title><p>Authenticated application</p>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        })
      : await auth.handle(request);
    outgoing.writeHead(response.status, nodeResponseHeaders(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  auth = createDevelopmentAuth({ dataDir, hostname: "machines-dev", port });
  const key = decodeURIComponent(new URL(auth.bootstrapUrl).hash.slice(1));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => requests.push([request.url(), request.headers().referer || ""]));

  try {
    await page.goto(`http://127.0.0.1:${port}/#${encodeURIComponent(key)}`, { waitUntil: "domcontentloaded" });
    await page.getByText("Authenticated application").waitFor();
    assert.equal(page.url(), `http://127.0.0.1:${port}/`);
    assert.equal(await page.evaluate(() => localStorage.getItem("machines-dev-api-key")), key);
    assert.ok(requests.every((parts) => parts.every((value) => !value.includes(key))));
    assert.equal((await context.cookies()).find((cookie) => cookie.name === "machines_dev_session").httpOnly, true);

    await context.clearCookies();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("Authenticated application").waitFor();
    assert.equal(page.url(), `http://127.0.0.1:${port}/`);
    assert.ok((await context.cookies()).some((cookie) => cookie.name === "machines_dev_session"));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
