import test from "node:test";
import assert from "node:assert/strict";
import { createModuleOriginHandler } from "./handler.js";

const env = {
  MODULE_IMPORT_TOKEN: "module-secret",
  STORAGE_API_KEY: "storage-secret",
  MODULE_BUCKET_PREFIX: "modules-e599fb4",
  BUNNY_STORAGE_ORIGIN: "https://storage.example.test/zone/",
};

test("serves an authenticated immutable module without exposing either key", async () => {
  let seen;
  const handler = createModuleOriginHandler(env, async (url, options) => {
    seen = { url: String(url), options };
    return new Response("export const answer = 42;");
  });
  const response = await handler(
    new Request("https://modules.example.test/pkg/mod.ts", {
      headers: { authorization: "Bearer module-secret" },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "application/typescript; charset=utf-8",
  );
  assert.equal(await response.text(), "export const answer = 42;");
  assert.equal(
    seen.url,
    "https://storage.example.test/zone/modules-e599fb4/pkg/mod.ts",
  );
  assert.equal(seen.options.headers.AccessKey, "storage-secret");
  assert.doesNotMatch(JSON.stringify([...response.headers]), /secret/);
});

test("conceals modules from missing tokens and rejects unsafe paths", async () => {
  let calls = 0;
  const handler = createModuleOriginHandler(env, async () => {
    calls += 1;
    return new Response("no");
  });
  for (
    const url of [
      "https://modules.example.test/pkg/mod.ts",
      "https://modules.example.test/pkg/mod.ts?version=1",
      "https://modules.example.test/pkg/%2e%2e/mod.ts",
      "https://modules.example.test/pkg/data.json",
    ]
  ) {
    const response = await handler(
      new Request(url, { headers: { authorization: "Bearer wrong" } }),
    );
    assert.equal(response.status, 404);
  }
  assert.equal(calls, 0);
});

test("supports HEAD and refuses Storage redirects", async () => {
  const head = createModuleOriginHandler(env, async () => new Response("body"));
  const response = await head(
    new Request("https://modules.example.test/mod.js", {
      method: "HEAD",
      headers: { authorization: "Bearer module-secret" },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");

  const redirecting = createModuleOriginHandler(
    env,
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://attacker.test/" },
      }),
  );
  const rejected = await redirecting(
    new Request("https://modules.example.test/mod.js", {
      headers: { authorization: "Bearer module-secret" },
    }),
  );
  assert.equal(rejected.status, 502);
});
