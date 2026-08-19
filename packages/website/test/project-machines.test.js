import assert from "node:assert/strict";
import test from "node:test";
import { createConstrainedFetch } from "../project-machines.js";

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
