import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createResourcesBootstrapHandler } from "../edge/bootstrap.js";
import { createDeferredModuleLoader } from "../edge/deferred-loader.js";
import { storageRequest } from "../edge/models.js";

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

test("anonymous home defers default prewarming beyond Bunny's startup window", async () => {
  let scheduled;
  const handler = createResourcesBootstrapHandler({
    config,
    env: {},
    fetchImpl: async () => new Response("home"),
    deferredHandler: { async handle() {}, async prewarm() {} },
    schedule(callback, delay) { scheduled = { callback, delay }; },
  });
  await handler(new Request("https://resources.co/"));
  assert.equal(scheduled.delay, 750);
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
    request: () => storageRequest(config, "-/edge/resources-application.abc123.js"),
    expectedSha256,
    fetchImpl: async (request) => {
      fetched += 1;
      assert.equal(request.headers.get("accesskey"), "storage-secret");
      assert.equal(request.url, "https://storage.example.test/zone/resources-co-1234567/-/edge/resources-application.abc123.js");
      return new Response(source, { headers: { "content-length": String(source.byteLength) } });
    },
    async importModule(specifier) {
      imported = specifier;
      return { createResourcesDeferredHandler() {} };
    },
  });
  assert.equal(await loader.load(), await loader.load());
  assert.equal(fetched, 1);
  assert.match(imported, /^file:\/\/\/tmp\/resources-application-[a-f0-9]{16}\.mjs$/);
});

test("deferred loader rejects changed bytes before module evaluation", async () => {
  let imported = false;
  const loader = createDeferredModuleLoader({
    request: () => storageRequest(config, "-/edge/resources-application.abc123.js"),
    expectedSha256: "0".repeat(64),
    fetchImpl: async () => new Response("changed"),
    async importModule() { imported = true; return {}; },
  });
  await assert.rejects(loader.load(), /digest mismatch/);
  assert.equal(imported, false);
});

test("deferred loader reports evaluation errors without exposing its module URL", async () => {
  const source = new TextEncoder().encode("secret source that must not enter logs");
  const loader = createDeferredModuleLoader({
    request: () => storageRequest(config, "-/edge/resources-application.abc123.js"),
    expectedSha256: createHash("sha256").update(source).digest("hex"),
    fetchImpl: async () => new Response(source),
    async importModule(specifier) { throw new Error(`Syntax error at ${specifier}`); },
  });
  await assert.rejects(loader.load(), (error) => {
    assert.match(error.message, /^Deferred module evaluation failed: Error: Syntax error at <deferred-module>$/);
    assert.doesNotMatch(error.stack, /secret source|file:\/\/\/tmp|blob:|data:application/);
    return true;
  });
});
