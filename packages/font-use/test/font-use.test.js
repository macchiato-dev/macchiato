import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  fontAssetUrl,
  fontFace,
  getFontAsset,
  initFontCache,
  parseFontAssetUrl,
  putFontAsset,
} from "../src/index.js";

test("stores and serves font assets from the cache table", () => {
  const db = new DatabaseSync(":memory:");
  initFontCache(db);

  const result = putFontAsset(db, {
    name: "space-grotesk",
    assetPath: "latin.woff2",
    content: Buffer.from("font bytes"),
    sourceUrl: "https://example.test/font.woff2",
  });

  assert.equal(result.sha256.length, 64);
  assert.equal(fontAssetUrl("space-grotesk", "latin.woff2"), "/-/fonts/space-grotesk/latin.woff2");
  assert.deepEqual(parseFontAssetUrl("/-/fonts/space-grotesk/latin.woff2"), {
    name: "space-grotesk",
    assetPath: "latin.woff2",
  });

  const row = getFontAsset(db, "space-grotesk", "latin.woff2");
  assert.equal(row.mimeType, "font/woff2");
  assert.equal(row.provider, "self");
  assert.equal(Buffer.from(row.content).toString(), "font bytes");
  assert.equal(row.sourceUrl, "https://example.test/font.woff2");

  db.close();
});

test("rejects unsafe font cache names and paths", () => {
  const db = new DatabaseSync(":memory:");
  initFontCache(db);

  assert.throws(() => fontAssetUrl("../font", "latin.woff2"), /Invalid font cache name/);
  assert.throws(() => fontAssetUrl("space", "../latin.woff2"), /Invalid font asset path/);
  assert.throws(() => parseFontAssetUrl("/-/fonts/space/latin//bad.woff2"), /Invalid font asset path/);
  assert.throws(() => putFontAsset(db, {
    name: "space",
    assetPath: "https://example.test/font.woff2",
    content: "font",
  }), /Invalid font asset path/);

  db.close();
});

test("generates local font-face declarations from cached asset references", () => {
  const css = fontFace({
    family: "Space Grotesk",
    name: "space-grotesk",
    weight: "400 700",
    subsets: [{
      assetPath: "latin.woff2",
      unicodeRange: "U+0000-00FF",
    }],
  });

  assert.match(css, /font-family: "Space Grotesk"/);
  assert.match(css, /font-weight: 400 700/);
  assert.match(css, /url\("\/-\/fonts\/space-grotesk\/latin\.woff2"\)/);
  assert.match(css, /unicode-range: U\+0000-00FF/);
});
