import assert from "node:assert/strict";
import test from "node:test";
import { acceptsGzip, withCompressedArtifacts } from "../artifact-compression.js";
import { createResourcesArtifactSet } from "../artifacts.js";
import { createResourcesEdgeHandler } from "../edge/app.js";
import { createEdgeConfig, normalizeExportManifest } from "../edge/models.js";
import { createResourcesDocumentPlanner } from "../resources-document-plan.js";
import { createMemoryStorageAdapter } from "../adapters/memory-storage.js";

test("gzip negotiation respects explicit refusals and malformed quality weights", () => {
  for (const [input, expected] of [
    [null, false], ["", false], ["br", false], ["gzip", true],
    ["br, gzip;q=0.5", true], ["GZip; q=1.000", true],
    ["*", true], ["*;q=0", false], ["*;q=1, gzip;q=0", false],
    ["gzip;q=0, *;q=1", false], ["gzip;q=no", false],
    ["gzip;q=2", false], ["gzip;q=-1", false], ["gzip;q=0.1234", false],
  ]) assert.equal(acceptsGzip(input), expected, String(input));
});

test("static gzip variants round-trip and serve through the actual edge handler", async () => {
  const original = createResourcesArtifactSet();
  const compressed = await withCompressedArtifacts(original);
  normalizeExportManifest(compressed.manifest);
  const variants = [...compressed.files.keys()].filter(path => !original.files.has(path));
  assert.ok(variants.length >= 16);
  for (const path of variants) {
    assert.match(path, /^\/-\/resources-site\/[^/]+\.(wasm|bin|js)\.gz$/);
    const bytes = compressed.files.get(path);
    const decoded = new Uint8Array(await new Response(new Blob([bytes]).stream()
      .pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    assert.deepEqual(decoded, original.files.get(path.slice(0, -3)), path);
    assert.ok(bytes.length < decoded.length);
    assert.equal(compressed.manifest.artifacts[path].bytes, bytes.length);
  }
  assert.equal(original.manifest.files.length, original.files.size, "input set is not mutated");
  const config = createEdgeConfig({ BUNNY_STORAGE_ORIGIN: "https://storage.test/zone",
    BUNNY_BUCKET_PREFIX: "site", STORAGE_API_KEY: "test-only" });
  const storage = createMemoryStorageAdapter({ config, artifactSet: compressed });
  const keys = [];
  const handler = createResourcesEdgeHandler({ config,
    documentPlan: createResourcesDocumentPlanner({ accounts: {}, content: {}, organizations: {} }),
    documentRenderer() { throw new Error("Static binary must not enter document rendering"); },
    fetchImpl(request) {
      assert.equal(request.headers.get("accept-encoding"), "identity");
      keys.push(new URL(request.url).pathname);
      return storage(request);
    },
  });
  const path = "/-/resources-site/project-builder-quickjs-runtime.wasm";
  for (const method of ["GET", "HEAD"]) for (const encoding of ["gzip", "identity", "gzip;q=0, *;q=1"]) {
    const response = await handler(new Request(`https://resources.test${path}`, {
      method, headers: { "accept-encoding": encoding },
    }));
    const zipped = encoding === "gzip";
    const expected = compressed.files.get(path + (zipped ? ".gz" : ""));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/wasm");
    assert.equal(response.headers.get("content-encoding"), zipped ? "gzip" : null);
    assert.equal(response.headers.get("content-length"), String(expected.length));
    assert.equal(response.headers.get("vary"), "accept-encoding");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(keys.at(-1).endsWith(path + (zipped ? ".gz" : "")));
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), method === "HEAD" ? new Uint8Array() : expected);
  }
});
