import assert from "node:assert/strict";
import test from "node:test";
import { createConstrainedFetch, createProjectFetch } from "../project-machines.js";

test("project fetch is origin constrained, credentialless, and bounded", async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response("small response", { status: 200 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const fetchResource = createConstrainedFetch(["https://assets.example"], 32);
  assert.deepEqual(await fetchResource("https://assets.example/app.txt"), {
    status: 200,
    headers: [["content-type", "text/plain;charset=UTF-8"]],
    body: "small response",
    resourceUrl: "data:text/plain;base64,c21hbGwgcmVzcG9uc2U=",
  });
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.referrerPolicy, "no-referrer");
  assert.equal(calls[0].options.redirect, "error");
  await assert.rejects(fetchResource("https://other.example/app.txt"), /Fetch blocked/);

  globalThis.fetch = async () => new Response("x".repeat(33));
  await assert.rejects(fetchResource("https://assets.example/large.txt"), /exceeds 32 bytes/);
});

test("project fetch resolves relative files without network access", async () => {
  const fetchResource = createProjectFetch([
    { path: "tiles/flower.svg", content: "<svg viewBox=\"0 0 1 1\"></svg>" },
    { path: "game.json", content: '{"tiles":144}' },
  ]);
  assert.deepEqual(await fetchResource("./game.json"), {
    status: 200,
    headers: [["content-type", "application/json"]],
    body: '{"tiles":144}',
    resourceUrl: "data:application/json;base64,eyJ0aWxlcyI6MTQ0fQ==",
  });
  assert.match((await fetchResource("tiles/flower.svg")).resourceUrl,
    /^data:image\/svg\+xml;base64,/);
  await assert.rejects(fetchResource("../secret.txt"), /path is invalid/);
  await assert.rejects(fetchResource("missing.svg"), /not found/);
});

test("REST requests preserve explicit bodies, response status and headers but no ambient authority", async t => {
  const original = globalThis.fetch, calls = [];
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response('{"error":"invalid"}', { status: 422,
      headers: { "content-type": "application/json", "x-request-id": "example" } });
  };
  const request = createConstrainedFetch(["https://api.example"], 128);
  const result = await request("https://api.example/item", { method: "POST",
    headers: [["Content-Type", "application/json"], ["Authorization", "Bearer explicit"]],
    body: '{"name":"test"}', credentials: "include", redirect: "follow" });
  assert.equal(result.status, 422);
  assert.equal(result.body, '{"error":"invalid"}');
  assert.equal(new Map(result.headers).get("x-request-id"), "example");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.body, '{"name":"test"}');
  assert.equal(calls[0].init.headers.get("authorization"), "Bearer explicit");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.redirect, "error");
  for (const options of [{ method: "CONNECT" }, { headers: { Cookie: "secret" } },
    { headers: { "Sec-Fetch-Site": "same-origin" } }, { method: "POST", body: "x".repeat(129) },
    { method: "GET", body: "payload" }]) await assert.rejects(request("https://api.example/", options));
  await assert.rejects(request("https://user:password@api.example/"), /blocked/);
  await assert.rejects(request("http://api.example/"), /blocked/);
  assert.throws(() => createConstrainedFetch(["https://api.example/path"]), /origins/);
  assert.equal(calls.length, 1);
});

test("streamed responses stop at the cap rather than buffering the whole response", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let cancelled = false;
  globalThis.fetch = async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(20)); },
    cancel() { cancelled = true; },
  }));
  await assert.rejects(createConstrainedFetch(["https://api.example"], 32)("https://api.example/"), /exceeds/);
  assert.equal(cancelled, true);
});
