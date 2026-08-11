import assert from "node:assert/strict";
import test from "node:test";
import { createResourcesBootstrapHandler } from "../edge/bootstrap.js";

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

test("anonymous home schedules a short default prewarm after responding", async () => {
  let scheduled;
  const handler = createResourcesBootstrapHandler({
    config,
    env: {},
    fetchImpl: async () => new Response("home"),
    deferredHandler: { async handle() {}, async prewarm() {} },
    schedule(callback, delay) { scheduled = { callback, delay }; },
  });
  await handler(new Request("https://resources.co/"));
  assert.equal(scheduled.delay, 75);
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
