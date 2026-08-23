import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDevelopmentAuth, resetDevelopmentAuth } from "../src/development-auth.js";

test("development auth persists its key and exchanges it for an HttpOnly cookie", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "macchiato-development-auth-"));
  const auth = createDevelopmentAuth({ dataDir, hostname: "machines-dev", port: 3030 });
  const key = decodeURIComponent(new URL(auth.bootstrapUrl).hash.slice(1));
  const file = join(dataDir, ".machines-dev-auth.json");

  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(JSON.parse(readFileSync(file, "utf8")).apiKey, key);

  const shell = await auth.handle(new Request("http://machines-dev.localhost:3030/"));
  assert.equal(shell.status, 200);
  assert.match(await shell.text(), /history\.replaceState/);
  assert.equal(shell.headers.get("referrer-policy"), "no-referrer");

  const denied = await auth.handle(new Request("http://machines-dev.localhost:3030/editor/browser-controller.js"));
  assert.equal(denied.status, 401);

  const exchange = await auth.handle(new Request("http://machines-dev.localhost:3030/-/development-auth", {
    method: "POST",
    body: key,
  }));
  assert.equal(exchange.status, 204);
  assert.match(exchange.headers.get("set-cookie"), /^machines_dev_session=.*; Path=\/; HttpOnly; SameSite=Strict$/);
  const cookie = exchange.headers.get("set-cookie").split(";", 1)[0];
  assert.equal(auth.isAuthenticated(new Request("http://machines-dev.localhost:3030/", {
    headers: { cookie },
  })), true);

  const reloaded = createDevelopmentAuth({ dataDir, hostname: "machines-dev", port: 3030 });
  assert.equal(reloaded.bootstrapUrl, auth.bootstrapUrl);

  const oldBootstrapUrl = auth.bootstrapUrl;
  const reset = resetDevelopmentAuth({ dataDir, hostname: "machines-dev", port: 3030 });
  assert.notEqual(reset.bootstrapUrl, oldBootstrapUrl);
  assert.equal(auth.isAuthenticated(new Request("http://machines-dev.localhost:3030/", {
    headers: { cookie },
  })), false);
});

test("development auth uses independent credentials for static and dynamic subdomains", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "macchiato-development-auth-apps-"));
  const staticApp = createDevelopmentAuth({ dataDir, hostname: "docs-dev", port: 3030 });
  const dynamicApp = createDevelopmentAuth({ dataDir, hostname: "machines-dev", port: 3030 });
  assert.notEqual(staticApp.bootstrapUrl.split("#")[1], dynamicApp.bootstrapUrl.split("#")[1]);
  assert.equal(statSync(join(dataDir, ".docs-dev-auth.json")).mode & 0o777, 0o600);
  assert.equal(statSync(join(dataDir, ".machines-dev-auth.json")).mode & 0o777, 0o600);
});
