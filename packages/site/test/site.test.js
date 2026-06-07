import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  chooseTransitionMode,
  createSitePolicy,
  createTransitionManifest,
  getSiteRoute,
  hasSiteRoutes,
  initSiteDb,
  isTrustedTransitionSource,
  listSiteRoutes,
  normalizeRoutePath,
  putSiteRoute,
  renderDocument,
  renderSiteRoute,
  validatePresanitizedCache,
} from "../src/index.js";

test("renders an SSR document with escaped title and authored CSP", () => {
  const html = renderDocument({
    title: "Resources <co>",
    csp: "default-src 'none'; font-src 'self'",
    head: '<link rel="stylesheet" href="/styles.css">',
    body: "<main><h1>Resources.co</h1></main>",
  });

  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<title>Resources &lt;co&gt;<\/title>/);
  assert.match(html, /Content-Security-Policy" content="default-src 'none'; font-src 'self'"/);
  assert.match(html, /<main><h1>Resources\.co<\/h1><\/main>/);
});

test("rejects unsafe header values in authored CSP", () => {
  assert.throws(
    () => renderDocument({ csp: "default-src 'none'\nscript-src 'none'" }),
    /Header value contains disallowed characters/,
  );
});

test("requires restricted write access for pre-sanitized HTML caches", () => {
  assert.throws(
    () => validatePresanitizedCache({ writeAccess: "public" }),
    /writeAccess must be restricted/,
  );
  assert.throws(
    () => validatePresanitizedCache({ required: true, writeAccess: "restricted", allowedWriters: [] }),
    /must declare allowedWriters/,
  );

  assert.doesNotThrow(() => validatePresanitizedCache({
    required: true,
    writeAccess: "restricted",
    allowedWriters: ["urn:macchiato:site-sanitizer"],
  }));
});

test("matches trusted transition source origins and prefixes", () => {
  const policy = createSitePolicy({
    trustedSources: [
      { type: "prefix", value: "https://objects.example.test/resources-site-presanitized/" },
      { type: "origin", value: "https://pages.example.test" },
    ],
  });

  assert.equal(
    isTrustedTransitionSource("https://objects.example.test/resources-site-presanitized/home.html", policy),
    true,
  );
  assert.equal(
    isTrustedTransitionSource("https://objects.example.test/resources-site-presanitized/nested/home.html", policy),
    true,
  );
  assert.equal(
    isTrustedTransitionSource("https://objects.example.test/other-bucket/home.html", policy),
    false,
  );
  assert.equal(
    isTrustedTransitionSource("https://pages.example.test/home.html", policy),
    true,
  );
});

test("chooses trusted swaps, client WASM fallback, or full document navigation", () => {
  const policy = createSitePolicy({
    trustedSources: [{ type: "prefix", value: "https://objects.example.test/resources-site-presanitized/" }],
  });

  assert.equal(chooseTransitionMode({
    requestUrl: "https://objects.example.test/resources-site-presanitized/about.html",
    currentOrigin: "https://objects.example.test",
    cacheHit: true,
    clientWasm: false,
    policy,
  }), "trusted-presanitized-swap");

  assert.equal(chooseTransitionMode({
    requestUrl: "https://objects.example.test/resources-site-presanitized/about.html",
    currentOrigin: "https://objects.example.test",
    cacheHit: false,
    clientWasm: true,
    policy,
  }), "client-wasm-sanitize");

  assert.equal(chooseTransitionMode({
    requestUrl: "https://untrusted.example.test/about.html",
    currentOrigin: "https://objects.example.test",
    cacheHit: true,
    clientWasm: true,
    policy,
  }), "document");
});

test("creates a transition manifest without cache writer metadata", () => {
  const manifest = createTransitionManifest({
    mode: "auto",
    trustedSources: [{ type: "prefix", value: "https://cdn.example.test/site/" }],
    presanitizedCache: {
      required: true,
      writeAccess: "restricted",
      allowedWriters: ["urn:macchiato:site-sanitizer"],
    },
  });

  assert.deepEqual(manifest, {
    mode: "auto",
    sameOrigin: true,
    wasmFallback: true,
    trustedSources: [{ type: "prefix", value: "https://cdn.example.test/site/" }],
  });
});

test("normalizes safe route paths and rejects unsafe paths", () => {
  assert.equal(normalizeRoutePath("browse/"), "/browse");
  assert.equal(normalizeRoutePath("//resources//containers//"), "/resources/containers");
  assert.throws(() => normalizeRoutePath("/../secret"), /Invalid site route path/);
  assert.throws(() => normalizeRoutePath("/search?q=1"), /Invalid site route path/);
});

test("stores and renders SQLite-backed site routes", () => {
  const db = new DatabaseSync(":memory:");
  initSiteDb(db);

  assert.equal(hasSiteRoutes(db, "resources-co"), false);
  const stored = putSiteRoute(db, {
    subdomain: "resources-co",
    path: "resources/containers",
    title: "Containers",
    html: '<main id="content"><h1>Containers</h1></main>',
    css: "body { color: CanvasText; }",
    nav: [{ path: "/", label: "Home" }],
    transition: { mode: "same-origin-ssr-swap" },
  });

  assert.deepEqual(stored, { subdomain: "resources-co", path: "/resources/containers" });
  assert.equal(hasSiteRoutes(db, "resources-co"), true);
  assert.deepEqual(listSiteRoutes(db, "resources-co").map((row) => ({ ...row })), [
    { subdomain: "resources-co", path: "/resources/containers", title: "Containers" },
  ]);

  const row = getSiteRoute(db, "resources-co", "/resources/containers");
  const html = renderSiteRoute(row);

  assert.match(html, /<title>Containers<\/title>/);
  assert.match(html, /<style>\nbody \{ color: CanvasText; \}\n<\/style>/);
  assert.match(html, /<main id="content"><h1>Containers<\/h1><\/main>/);
  assert.match(html, /"path":"\/resources\/containers"/);
  db.close();
});
