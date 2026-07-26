import assert from "node:assert/strict";
import test from "node:test";
import { createResourcesEdgeHandler } from "../../../examples/resources-site/edge/app.js";
import {
  createEdgeConfig,
  normalizeExportManifest,
  pathToObjectKey,
  storageObjectUrl,
} from "../../../examples/resources-site/edge/models.js";
import { createAuthConfig } from "../../../examples/resources-site/auth/github.js";
import { createGitlabAuthConfig } from "../../../examples/resources-site/auth/gitlab.js";
import { seal } from "../../../examples/resources-site/auth/session.js";

const config = createEdgeConfig({
  BUNNY_STORAGE_ORIGIN: "https://storage.example.test/zone",
  BUNNY_BUCKET_PREFIX: "public/resources-co",
  STORAGE_API_KEY: "test-secret",
  MANIFEST_TTL_MS: "30000",
});

const manifest = {
  subdomain: "resources-co",
  generatedAt: "2026-07-21T00:00:00.000Z",
  securityProfile: "document-navigation-v1",
  validatedWith: ["dom-use", "style-use", "html-use", "theme-use"],
  files: ["/index.html", "/about/index.html", "/-/fonts/resourcesco-space-grotesk/space-grotesk-latin.woff2"],
  artifacts: {
    "/index.html": { bytes: 10, sha256: "a".repeat(64) },
    "/about/index.html": { bytes: 14, sha256: "b".repeat(64) },
    "/-/fonts/resourcesco-space-grotesk/space-grotesk-latin.woff2": { bytes: 20, sha256: "c".repeat(64) },
  },
};

test("edge request and storage models reject ambiguous paths and origins", () => {
  assert.equal(pathToObjectKey("/"), "index.html");
  assert.equal(pathToObjectKey("/about"), "about/index.html");
  assert.equal(pathToObjectKey("/about/index.html"), "about/index.html");
  assert.equal(pathToObjectKey("/%2e%2e/secret"), null);
  assert.equal(pathToObjectKey("/%E0%A4%A"), null);
  assert.equal(pathToObjectKey("/a%2Fb"), null);
  assert.equal(pathToObjectKey("/a\\b"), null);
  assert.throws(() => createEdgeConfig({ BUNNY_STORAGE_ORIGIN: "http://storage.test", STORAGE_API_KEY: "x" }), /must use https/);
  assert.throws(() => createEdgeConfig({ BUNNY_STORAGE_ORIGIN: "https://user@storage.test", STORAGE_API_KEY: "x" }), /must not contain credentials/);
  assert.throws(() => createEdgeConfig({ BUNNY_STORAGE_ORIGIN: "https://storage.test", STORAGE_API_KEY: "x", MANIFEST_TTL_MS: "later" }), /must be a number/);
  assert.equal(storageObjectUrl(config, "about/index.html"), "https://storage.example.test/zone/public/resources-co/about/index.html");
});

test("edge manifest is a strict allowlist", () => {
  const model = normalizeExportManifest(manifest);
  assert.equal(model.files.has("index.html"), true);
  assert.equal(model.files.has("private.txt"), false);
  assert.equal(model.artifacts.get("about/index.html").bytes, 14);
  assert.throws(() => normalizeExportManifest({ ...manifest, subdomain: "other" }), /Unexpected/);
  assert.throws(() => normalizeExportManifest({ ...manifest, files: ["/../secret"] }), /Unsafe/);
});

test("edge handler serves only exported artifacts with hardened headers", async () => {
  const requests = [];
  const fetchImpl = async (request) => {
    requests.push(request);
    assert.equal(request.headers.get("AccessKey"), "test-secret");
    assert.equal(request.redirect, "manual");
    if (request.url.endsWith("/manifest.json")) return Response.json(manifest);
    if (request.url.endsWith("/about/index.html")) return new Response("<h1>About</h1>", { headers: { etag: '"about-v1"' } });
    return new Response("missing", { status: 404 });
  };
  const handler = createResourcesEdgeHandler({ config, fetchImpl, now: () => 1_000 });

  const response = await handler(new Request("https://resources.example/about"));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<h1>About</h1>");
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-security-policy"), /script-src 'none'/);
  assert.equal(response.headers.get("etag"), '"about-v1"');
  assert.equal(requests.length, 2);

  const head = await handler(new Request("https://resources.example/about", { method: "HEAD" }));
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal(requests.length, 3, "cached manifest avoids a second manifest subrequest");

  assert.equal((await handler(new Request("https://resources.example/private.txt"))).status, 404);
  assert.equal((await handler(new Request("https://resources.example/manifest.json"))).status, 404);
  const method = await handler(new Request("https://resources.example/about", { method: "POST" }));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "GET, HEAD");
});

test("edge handler fails closed on storage redirects and manifest failures", async () => {
  const redirectHandler = createResourcesEdgeHandler({
    config,
    fetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://attacker.test" } }),
    logger: { error() {} },
  });
  assert.equal((await redirectHandler(new Request("https://resources.example/about"))).status, 503);

  const invalidHandler = createResourcesEdgeHandler({
    config,
    fetchImpl: async () => Response.json({ ...manifest, files: ["/../secret"] }),
    logger: { error() {} },
  });
  assert.equal((await invalidHandler(new Request("https://resources.example/about"))).status, 503);
});

test("edge HTML renders escaped session identity without executable browser code", async () => {
  const authConfig = createAuthConfig({
    PUBLIC_ORIGIN: "https://resources.example",
    GITHUB_CLIENT_ID: "client",
    GITHUB_CLIENT_SECRET: "secret",
    SESSION_SIGNING_KEY: "a-production-secret-must-be-longer-than-this",
  });
  const session = await seal({
    v: 1,
    sub: "github:42",
    login: "<script>alert(1)</script>",
    name: "Unsafe",
    iat: 1,
    exp: 20_000,
  }, authConfig.sessionSecret);
  const html = `<main><aside class="box userbar edge-status" data-screen-label="runtime-status"><div>Guest account controls</div></aside></main>`;
  const handler = createResourcesEdgeHandler({
    config,
    authConfig,
    now: () => 10_000,
    fetchImpl: async (request) => request.url.endsWith("/manifest.json")
      ? Response.json(manifest)
      : new Response(html),
  });
  const response = await handler(new Request("https://resources.example/", {
    headers: { cookie: `__Host-resources_session=${session}` },
  }));
  const body = await response.text();
  assert.match(body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(body, /<script>/);
  assert.match(body, /method="post" action="\/logout"/);
  assert.match(body, /@&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/span>/);
  assert.doesNotMatch(body, / · (?:GitHub|GitLab)/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "cookie");
});

test("provider linking requires a signed-in account and starts a fresh provider authorization", async () => {
  const authConfig = createAuthConfig({
    PUBLIC_ORIGIN: "https://resources.example",
    GITHUB_CLIENT_ID: "client",
    GITHUB_CLIENT_SECRET: "secret",
    SESSION_SIGNING_KEY: "a-production-secret-must-be-longer-than-this",
  });
  const gitlabAuthConfig = createGitlabAuthConfig({
    GITLAB_CLIENT_ID: "gitlab-client",
    GITLAB_CLIENT_SECRET: "gitlab-secret",
  }, authConfig);
  const handler = createResourcesEdgeHandler({ config, authConfig, gitlabAuthConfig, now: () => 10_000 });

  const guest = await handler(new Request("https://resources.example/auth/gitlab/link"));
  assert.equal(guest.status, 302);
  assert.equal(guest.headers.get("location"), "/login");

  const session = await seal({
    v: 1,
    sub: "user-1",
    login: "latte",
    name: "Latte",
    iat: 1,
    exp: 20_000,
  }, authConfig.sessionSecret);
  const response = await handler(new Request("https://resources.example/auth/gitlab/link", {
    headers: { cookie: `__Host-resources_session=${session}` },
  }));
  const target = new URL(response.headers.get("location"));
  assert.equal(target.origin, "https://gitlab.com");
  assert.equal(target.searchParams.get("client_id"), "gitlab-client");
});
