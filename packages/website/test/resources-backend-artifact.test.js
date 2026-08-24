import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decodeResourceArtifact } from "../../wasm-web-container/src/resource-bundle.js";

test("the Resources backend artifact contains both server machines", async () => {
  const bytes = new Uint8Array(await readFile(new URL(
    "../generated/resources-backend.bin", import.meta.url)));
  const files = await decodeResourceArtifact(bytes);

  assert.ok(files.get("runtime.wasm")?.length);
  for (const name of ["resources-server", "resources-policy", "resources-project-version"]) {
    const manifest = JSON.parse(new TextDecoder().decode(files.get(`${name}/manifest.json`)));
    assert.equal(manifest.format, "microquickjs-bytecode-v1");
    assert.ok(manifest.chunks.length);
    assert.equal(manifest.bytes, manifest.chunks.reduce((total, chunk) =>
      total + files.get(`${name}/${chunk}`).length, 0));
  }
});
