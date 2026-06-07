import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseTransitionMode,
  createSitePolicy,
  createTransitionManifest,
  isTrustedTransitionSource,
  renderDocument,
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
