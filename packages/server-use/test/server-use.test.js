import assert from "node:assert/strict";
import test from "node:test";
import { ServerUse } from "../src/index.js";

test("sends bounded plain request data to a controller", async () => {
  let received;
  const server = new ServerUse({
    routes: [{ name: "project.save", method: "POST", path: "/project",
      requestHeaders: ["content-type"], responseHeaders: ["content-type"] }],
    async dispatch(message) {
      received = message;
      return { status: 201, headers: { "content-type": "text/plain" }, body: "saved" };
    },
  });
  const response = await server.handle(new Request("https://example.test/project?draft=1", {
    method: "POST", headers: { "content-type": "text/plain", authorization: "secret" }, body: "hello",
  }), { "actor-id": 7 });
  assert.equal(response.status, 201);
  assert.equal(await response.text(), "saved");
  assert.deepEqual(received.request.headers, { "content-type": "text/plain" });
  assert.equal(new TextDecoder().decode(received.request.body), "hello");
  assert.deepEqual(received.context, { "actor-id": 7 });
});

test("rejects oversized input and ungranted response headers", async () => {
  const oversized = new ServerUse({
    routes: [{ name: "save", method: "POST", path: "/", maxRequestBytes: 2 }],
    dispatch() { throw new Error("must not dispatch"); },
  });
  assert.equal((await oversized.handle(new Request("https://example.test/", {
    method: "POST", body: "long",
  }))).status, 413);
  const header = new ServerUse({
    routes: [{ name: "home", method: "GET", path: "/" }],
    dispatch() { return { headers: { "x-ungranted": "value" } }; },
  });
  await assert.rejects(header.handle(new Request("https://example.test/")), /cannot return header/);
});

test("does not dispatch unmatched routes", async () => {
  const server = new ServerUse({
    routes: [{ name: "home", method: "GET", path: "/" }],
    dispatch() { throw new Error("must not dispatch"); },
  });
  assert.equal((await server.handle(new Request("https://example.test/other"))).status, 404);
});

test("matches anchored parameterized routes and exposes captures", async () => {
  let captured;
  const use = new ServerUse({
    routes: [{ name: "project.versions", method: "GET",
      pathPattern: /^\/api\/projects\/([A-Za-z0-9-]+)\/versions$/ }],
    dispatch(value) { captured = value.request.params; return { status: 204 }; },
  });
  const request = new Request("https://example.test/api/projects/project-1/versions");
  assert.equal(use.accepts(request), true);
  assert.equal((await use.handle(request)).status, 204);
  assert.deepEqual(captured, ["project-1"]);
  assert.equal(use.accepts(new Request("https://example.test/api/projects/project-1/snapshot")), false);
});

test("decodes a bounded UTF-8 request body when a route asks for text", async () => {
  let body;
  const use = new ServerUse({
    routes: [{ name: "write", method: "POST", path: "/write", requestBody: "text" }],
    dispatch(value) { body = value.request.body; return { status: 204 }; },
  });
  assert.equal((await use.handle(new Request("https://example.test/write", {
    method: "POST", body: "café",
  }))).status, 204);
  assert.equal(body, "café");
  assert.equal((await use.handle(new Request("https://example.test/write", {
    method: "POST", body: Uint8Array.of(0xc3, 0x28),
  }))).status, 400);
});

test("exposes a large request body as bounded sequential chunks", async () => {
  const chunks = [];
  const use = new ServerUse({
    routes: [{ name: "snapshot", method: "POST", path: "/snapshot",
      requestBody: "resource", maxRequestBytes: 70 * 1024 * 1024 }],
    async dispatch({ request, resources }) {
      assert.equal(request.body, null);
      for (;;) {
        const chunk = await resources.body.read(3);
        if (!chunk.length) break;
        chunks.push(...chunk);
      }
      return { status: 204 };
    },
  });
  const response = await use.handle(new Request("https://example.test/snapshot", {
    method: "POST", body: "streamed body",
  }));
  assert.equal(response.status, 204);
  assert.equal(new TextDecoder().decode(Uint8Array.from(chunks)), "streamed body");
});

test("cancels an unread request body resource after dispatch", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(Uint8Array.of(1, 2, 3)); },
    cancel() { cancelled = true; },
  });
  const use = new ServerUse({
    routes: [{ name: "snapshot", method: "POST", path: "/snapshot",
      requestBody: "resource" }],
    dispatch() { return { status: 204 }; },
  });
  assert.equal((await use.handle(new Request("https://example.test/snapshot", {
    method: "POST", body: stream, duplex: "half",
  }))).status, 204);
  assert.equal(cancelled, true);
});
