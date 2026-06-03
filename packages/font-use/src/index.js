import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const SAFE_PATH = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,255}$/;

export const FONT_ASSETS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS font_assets (
    name TEXT NOT NULL,
    asset_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    content BLOB NOT NULL,
    provider TEXT NOT NULL DEFAULT 'self',
    source_url TEXT NOT NULL DEFAULT '',
    sha256 TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (name, asset_path)
  )
`;

export function initFontCache(db) {
  db.exec(FONT_ASSETS_SCHEMA);
}

function validateName(name) {
  const value = String(name || "");
  if (!SAFE_NAME.test(value)) {
    throw new Error(`Invalid font cache name: ${value}`);
  }
  return value;
}

function validateAssetPath(assetPath) {
  const value = String(assetPath || "").replace(/^\/+/, "");
  if (!SAFE_PATH.test(value) || value.includes("..") || value.includes("//")) {
    throw new Error(`Invalid font asset path: ${assetPath}`);
  }
  return value;
}

function hashContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

function toBuffer(content) {
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  return Buffer.from(String(content));
}

export function putFontAsset(db, asset) {
  const name = validateName(asset.name);
  const assetPath = validateAssetPath(asset.assetPath);
  const content = toBuffer(asset.content);
  const mimeType = asset.mimeType || "font/woff2";
  const provider = asset.provider || "self";
  const sourceUrl = asset.sourceUrl || "";
  const sha256 = asset.sha256 || hashContent(content);

  db.prepare(`
    INSERT INTO font_assets
      (name, asset_path, mime_type, content, provider, source_url, sha256, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(name, asset_path) DO UPDATE SET
      mime_type = excluded.mime_type,
      content = excluded.content,
      provider = excluded.provider,
      source_url = excluded.source_url,
      sha256 = excluded.sha256,
      updated_at = CURRENT_TIMESTAMP
  `).run(name, assetPath, mimeType, content, provider, sourceUrl, sha256);

  return { name, assetPath, mimeType, provider, sourceUrl, sha256 };
}

export function getFontAsset(db, name, assetPath) {
  return db.prepare(`
    SELECT name, asset_path AS assetPath, mime_type AS mimeType, content, provider, source_url AS sourceUrl, sha256
    FROM font_assets
    WHERE name = ? AND asset_path = ?
  `).get(validateName(name), validateAssetPath(assetPath));
}

export function fontAssetUrl(name, assetPath) {
  const safeName = encodeURIComponent(validateName(name));
  const safePath = validateAssetPath(assetPath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/-/fonts/${safeName}/${safePath}`;
}

export function parseFontAssetUrl(pathname) {
  const prefix = "/-/fonts/";
  if (!pathname.startsWith(prefix)) return null;
  const remainder = pathname.slice(prefix.length);
  const slash = remainder.indexOf("/");
  if (slash < 0) return null;
  const name = decodeURIComponent(remainder.slice(0, slash));
  const assetPath = remainder.slice(slash + 1)
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
  return {
    name: validateName(name),
    assetPath: validateAssetPath(assetPath),
  };
}

export function fontFace({ family, name, weight, style = "normal", display = "swap", subsets }) {
  return subsets.map((subset) => `@font-face {
  font-family: ${JSON.stringify(family)};
  font-style: ${style};
  font-weight: ${weight};
  font-display: ${display};
  src: url("${fontAssetUrl(name, subset.assetPath)}") format("${subset.format || "woff2"}");
  unicode-range: ${subset.unicodeRange};
}`).join("\n");
}
