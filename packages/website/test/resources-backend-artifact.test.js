import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decodeResourceArtifact } from "../../wasm-web-container/src/resource-bundle.js";

test("the Resources backend artifact contains its application and policy machines", async () => {
  const bytes = new Uint8Array(await readFile(new URL(
    "../generated/resources-backend.bin", import.meta.url)));
  const files = await decodeResourceArtifact(bytes);

  assert.ok(files.get("runtime.wasm")?.length);
  assert.ok(files.get("application-runtime.wasm")?.length);
  assert.ok(files.get("resources-application/application.bin")?.length);
  for (const name of ["resources-server", "resources-policy", "resources-document"]) {
    const manifest = JSON.parse(new TextDecoder().decode(files.get(`${name}/manifest.json`)));
    assert.equal(manifest.format, "microquickjs-bytecode-v1");
    assert.ok(manifest.chunks.length);
    assert.equal(manifest.bytes, manifest.chunks.reduce((total, chunk) =>
      total + files.get(`${name}/${chunk}`).length, 0));
  }
  assert.equal(files.has("resources-project-version/manifest.json"), false);
  assert.equal(files.size, 17);
});
