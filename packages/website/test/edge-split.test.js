import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createResourcesBootstrapHandler } from "../edge/bootstrap.js";
import { createDeferredModuleLoader } from "../edge/deferred-loader.js";
import { createModuleOriginHandler } from "../edge/module-origin.js";

const config = Object.freeze({
  storageOrigin: "https://storage.example.test/zone",
  bucketPrefix: "resources-co-1234567",
  storageAccessKey: "storage-secret",
});

test("anonymous home stays on the bootstrap tier and schedules deferred prewarming", async () => {
  let handled = 0;
  let prewarmed = 0;
  let scheduled;
  const handler = createResourcesBootstrapHandler({
    config,
    env: { SIGNUPS_ENABLED: "true", DEFERRED_PREWARM_DELAY_MS: "90" },
    fetchImpl: async (request) => {
      assert.equal(request.headers.get("accesskey"), "storage-secret");
      assert.match(request.url, /fast\/locales\/es\/home-open\.html$/);
      return new Response("<h1>Inicio</h1>", { status: 200 });
    },
    deferredHandler: {
      async handle() { handled += 1; return new Response("deferred"); },
      async prewarm() { prewarmed += 1; },
    },
    schedule(callback, delay) { scheduled = { callback, delay }; },
  });

  const response = await handler(new Request("https://staging.resources.co/", {
    headers: { "accept-language": "es" },
  }));
  assert.equal(await response.text(), "<h1>Inicio</h1>");
  assert.equal(response.headers.get("x-resources-edge-tier"), "bootstrap");
  assert.equal(handled, 0);
  assert.equal(prewarmed, 0);
  assert.equal(scheduled.delay, 90);
  await scheduled.callback();
  assert.equal(prewarmed, 1);
});

test("sessions and complex routes load the deferred handler", async () => {
  let handled = 0;
  const handler = createResourcesBootstrapHandler({
    config,
    env: {},
    fetchImpl: async () => { throw new Error("fast storage should not be fetched"); },
    deferredHandler: {
      async handle() { handled += 1; return new Response("application"); },
      async prewarm() {},
    },
  });
  assert.equal(await (await handler(new Request("https://resources.co/projects"))).text(), "application");
  assert.equal(await (await handler(new Request("https://resources.co/", {
    headers: { cookie: "__Host-resources_session=signed" },
  }))).text(), "application");
  assert.equal(handled, 2);
});

test("deferred loader authenticates, verifies, imports, and memoizes one bundle", async () => {
  const source = new TextEncoder().encode("export const marker = true;");
  const expectedSha256 = createHash("sha256").update(source).digest("hex");
  let fetched = 0;
  let imported = "";
  const loader = createDeferredModuleLoader({
    origin: "https://modules.example.test/resources-application.js",
    token: "shared-secret",
    expectedSha256,
    fetchImpl: async (request) => {
      fetched += 1;
      assert.equal(request.headers.get("authorization"), "Bearer shared-secret");
      return new Response(source, { headers: { "content-length": String(source.byteLength) } });
    },
    async importModule(specifier) {
      imported = specifier;
      return { createResourcesDeferredHandler() {} };
    },
  });
  assert.equal(await loader.load(), await loader.load());
  assert.equal(fetched, 1);
  assert.match(imported, /^data:application\/javascript;base64,/);
});

test("module origin requires the shared key and verifies storage bytes", async () => {
  const source = new TextEncoder().encode("export function createResourcesDeferredHandler() {}\n");
  const expectedSha256 = createHash("sha256").update(source).digest("hex");
  let storageFetches = 0;
  const handler = createModuleOriginHandler({
    config,
    moduleKey: "-/edge/resources-application.abc123.js",
    expectedSha256,
    apiKey: "shared-secret",
    fetchImpl: async (request) => {
      storageFetches += 1;
      assert.equal(request.headers.get("accesskey"), "storage-secret");
      return new Response(source);
    },
  });
  assert.equal((await handler(new Request("https://modules.example.test/resources-application.js"))).status, 401);
  assert.equal(storageFetches, 0);
  const response = await handler(new Request("https://modules.example.test/resources-application.js", {
    headers: { authorization: "Bearer shared-secret" },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, max-age=31536000, immutable");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), source);
});
