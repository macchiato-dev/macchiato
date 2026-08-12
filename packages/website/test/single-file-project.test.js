import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { StyleUse } from "@macchiato-dev/style-use";
import { singleFileSnapshot } from "../seed-single-file-project.js";

test("keeps a single-file project intact and separates runtime from display", () => {
  const source = `<!doctype html><body><style>body{color:red}.card{--tone:#fff}</style><button>Go</button><script>document.querySelector("button")</script></body>`;
  const snapshot = singleFileSnapshot(source);

  assert.deepEqual(snapshot.files, [{ path: "index.html", content: source }]);
  assert.equal(snapshot.config.container, "single-file-web-app");
  assert.equal(snapshot.config.containers.runtime.name, "single-file-html-runtime");
  assert.equal(snapshot.config.containers.runtime.scripts, "quickjs");
  assert.equal(snapshot.config.containers.display.name, "single-file-web-surface");
  assert.equal(snapshot.config.containers.display.dom, "dom-use");
  assert.equal(snapshot.config.containers.display.css, "style-use");
  assert.equal(snapshot.config.cssSchema.properties["--tone"], true);
  assert.equal(snapshot.config.capabilities.scroll, "vertical");
  assert.equal("externalResources" in snapshot.config, false);
  assert.equal("img" in snapshot.config.domSchema.nodes, false);
  const styles = new StyleUse(snapshot.config.cssSchema);
  assert.throws(() => styles.validateInline("background-image", "url(https://cdn.example/cat.svg)"), /not allowed/);
});

test("records exact constrained CDN fetch grants for the QuickJS runtime", () => {
  const url = "https://cdn.jsdelivr.net/npm/example@1.0.0/data.json";
  const snapshot = singleFileSnapshot("<!doctype html><p>Network fixture</p>", { fetchResources: [url] });
  assert.deepEqual(snapshot.config.capabilities.fetch.resources, [url]);
  assert.equal(snapshot.config.capabilities.fetch.limits.maxFiles, 10);
  assert.equal(snapshot.config.capabilities.fetch.limits.maxUrlLength, 100);
  assert.equal(snapshot.config.domSchema.limits.maxAttributeValueLength, 16_384);
  assert.equal(snapshot.config.domSchema.limits.maxAttributeValueLengths["img.src"], 1_500_000);
  assert.match(snapshot.config.domSchema.urls["img.src"], /data:image/);
  assert.equal(snapshot.config.sandbox.network, false);
});

test("Mahjong renders fetched artwork through image data URLs, not CSS", () => {
  const source = readFileSync(new URL("../../../examples/mahjong/index.html", import.meta.url), "utf8");
  assert.match(source, /document\.createElement\('img'\)/);
  assert.match(source, /response\.dataUrl\(\)/);
  assert.doesNotMatch(source, /--tiles|background-image:\s*var\(/);
});
