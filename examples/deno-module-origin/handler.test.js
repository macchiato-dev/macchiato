import test from "node:test";
import assert from "node:assert/strict";
import { createModuleOriginHandler } from "./handler.js";

const env = {
  MODULE_IMPORT_TOKEN: "module-secret",
  STORAGE_API_KEY: "storage-secret",
  BUNNY_STORAGE_ORIGIN: "https://storage.example.test/zone/",
};

test("serves an authenticated immutable module without exposing either key", async () => {
  let seen;
  const handler = createModuleOriginHandler(env, async (url, options) => {
    seen = { url: String(url), options };
    return new Response(
      'export { answer } from "https://modules.example.test/__MACCHIATO_MODULE_IMPORT_KEY__/pkg/answer-e599fb4.js";',
    );
  });
  const response = await handler(
    new Request(
      "https://modules.example.test/module-secret/pkg/mod-e599fb4.ts",
    ),
  );
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "application/typescript; charset=utf-8",
  );
  assert.equal(
    await response.text(),
    'export { answer } from "https://modules.example.test/module-secret/pkg/answer-e599fb4.js";',
  );
  assert.equal(
    response.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
  assert.equal(
    seen.url,
    "https://storage.example.test/zone/pkg/mod-e599fb4.ts",
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
      "https://modules.example.test/wrong/pkg/mod-e599fb4.ts",
      "https://modules.example.test/module-secret/pkg/mod-e599fb4.ts?version=1",
      "https://modules.example.test/module-secret/pkg%2fmod-e599fb4.ts",
      "https://modules.example.test/module-secret/pkg/data.json",
      "https://modules.example.test/module-secret/pkg/mod.ts",
    ]
  ) {
    const response = await handler(
      new Request(url),
    );
    assert.equal(response.status, 404);
  }
  assert.equal(calls, 0);
});

test("supports HEAD and refuses Storage redirects", async () => {
  const head = createModuleOriginHandler(env, async () => new Response("body"));
  const response = await head(
    new Request("https://modules.example.test/module-secret/mod-e599fb4.js", {
      method: "HEAD",
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
    new Request("https://modules.example.test/module-secret/mod-e599fb4.js"),
  );
  assert.equal(rejected.status, 502);
});
