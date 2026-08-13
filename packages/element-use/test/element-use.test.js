import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertElementUseStylesheet,
  ELEMENT_USE_POLICY,
} from "../src/policy.js";

const mahjong = readFileSync(
  new URL("../../../examples/mahjong/index.html", import.meta.url),
  "utf8",
);

test("keeps the Mahjong element contract deliberately small", () => {
  assert.deepEqual(ELEMENT_USE_POLICY.elements, [
    "main",
    "header",
    "h1",
    "section",
    "div",
    "span",
    "button",
    "footer",
    "img",
  ]);
  assert.equal(ELEMENT_USE_POLICY.rateLimit, 10_000);
  assert.equal(ELEMENT_USE_POLICY.imageLimit, 50 * 1024 * 1024);
  assert.equal(ELEMENT_USE_POLICY.maxElements, 320);
  assert.equal(ELEMENT_USE_POLICY.maxAttributeLength, 512);
  assert.equal(ELEMENT_USE_POLICY.maxImageBytes, 8 * 1024 * 1024);
  assert.deepEqual(ELEMENT_USE_POLICY.events, ["click"]);
});

test("accepts the game CSS but rejects resource-loading CSS", () => {
  const css = [...mahjong.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join("\n");
  assert.equal(assertElementUseStylesheet(css), css);
  assert.throws(
    () =>
      assertElementUseStylesheet(
        ".tile{background:url(https://example.test/a.png)}",
      ),
    /cannot load resources/,
  );
  assert.throws(
    () => assertElementUseStylesheet("@font-face{font-family:x}"),
    /cannot load resources/,
  );
});

test("accepts only bounded base64 image data URLs", () => {
  assert.match("data:image/png;base64,AA==", ELEMENT_USE_POLICY.imageDataUrl);
  assert.doesNotMatch(
    "https://example.test/tile.png",
    ELEMENT_USE_POLICY.imageDataUrl,
  );
  assert.doesNotMatch(
    "data:text/html;base64,AA==",
    ELEMENT_USE_POLICY.imageDataUrl,
  );
  assert.doesNotMatch(
    "data:image/svg+xml,<svg/>",
    ELEMENT_USE_POLICY.imageDataUrl,
  );
});
