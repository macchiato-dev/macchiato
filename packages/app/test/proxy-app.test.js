import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { proxyAppHandler, validateProxyOptions } from "../src/proxy-app.js";

async function upstream(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("proxy declarations require explicit access to remote origins", () => {
  assert.equal(validateProxyOptions({ proxy: { origin: "http://127.0.0.1:8000" } }),
    "http://127.0.0.1:8000");
  assert.throws(() => validateProxyOptions({ proxy: { origin: "https://example.com" } }),
    /networkOrigins/);
  assert.equal(validateProxyOptions(
    { proxy: { origin: "https://example.com" } },
    { networkOrigins: ["https://example.com"] },
  ), "https://example.com");
  assert.throws(() => validateProxyOptions({ proxy: { origin: "file:///etc/passwd" } }),
    /HTTP\(S\) origin/);
});

test("proxy apps preserve request semantics and stream the response", async (t) => {
  const seen = {};
  const server = await upstream(async (request, response) => {
    seen.method = request.method;
    seen.url = request.url;
    seen.body = "";
    for await (const chunk of request) seen.body += chunk;
    response.writeHead(201, { "content-type": "text/plain", "x-upstream": "yes" });
    response.end("proxied");
  });
  t.after(server.close);

  const response = await proxyAppHandler(new Request("http://demo.localhost/one?q=two", {
    method: "POST",
    body: "payload",
  }), {
    options: { proxy: { origin: server.origin } },
    access: {},
  });

  assert.deepEqual(seen, { method: "POST", url: "/one?q=two", body: "payload" });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-upstream"), "yes");
  assert.equal(await response.text(), "proxied");
});

test("proxy apps rewrite upstream redirects to the public app", async (t) => {
  const server = await upstream((request, response) => {
    response.writeHead(302, { location: "/next?from=proxy" });
    response.end();
  });
  t.after(server.close);

  const response = await proxyAppHandler(new Request("http://demo.localhost/start"), {
    options: { proxy: { origin: server.origin } },
    access: {},
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/next?from=proxy");
});
