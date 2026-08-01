const SAFE_SEGMENT = /^[A-Za-z0-9._~-]+$/;
const CONTENT_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
});

function required(value, name) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function stripSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function validateOrigin(value) {
  const url = new URL(required(value, "BUNNY_STORAGE_ORIGIN"));
  if (url.protocol !== "https:") throw new Error("BUNNY_STORAGE_ORIGIN must use https");
  if (url.username || url.password || url.search || url.hash) throw new Error("BUNNY_STORAGE_ORIGIN must not contain credentials, query, or fragment");
  url.pathname = `/${stripSlashes(url.pathname)}`;
  return url.href.replace(/\/$/, "");
}

function validatePrefix(value) {
  const prefix = stripSlashes(value || "resources-co");
  if (!prefix || !prefix.split("/").every((part) => SAFE_SEGMENT.test(part) && part !== "." && part !== "..")) {
    throw new Error("BUNNY_BUCKET_PREFIX contains an unsafe segment");
  }
  return prefix;
}

export function createEdgeConfig(env = {}) {
  const requestedTtl = Number(env.MANIFEST_TTL_MS || 30_000);
  if (!Number.isFinite(requestedTtl)) throw new Error("MANIFEST_TTL_MS must be a number");
  return Object.freeze({
    storageOrigin: validateOrigin(env.BUNNY_STORAGE_ORIGIN || env.BUNNY_ORIGIN),
    bucketPrefix: validatePrefix(env.BUNNY_BUCKET_PREFIX),
    storageAccessKey: required(env.STORAGE_API_KEY, "STORAGE_API_KEY"),
    manifestTtlMs: Math.max(1_000, Math.min(300_000, requestedTtl)),
  });
}

export function pathToObjectKey(pathname) {
  if (/%(?:2f|5c)/i.test(pathname)) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.includes("\\") || decoded.includes("\0")) return null;
  const parts = decoded.split("/").filter(Boolean);
  if (!parts.every((part) => SAFE_SEGMENT.test(part) && part !== "." && part !== "..")) return null;
  if (parts.length === 0) return "index.html";
  const path = parts.join("/");
  return path.includes(".") ? path : `${path}/index.html`;
}

export function normalizeExportManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid export manifest");
  if (value.subdomain !== "resources-co") throw new Error("Unexpected export manifest subdomain");
  if (value.securityProfile !== "document-navigation-v1") throw new Error("Unexpected export security profile");
  if (!Array.isArray(value.validatedWith) || !["dom-use", "style-use", "html-use", "theme-use"].every((name) => value.validatedWith.includes(name))) {
    throw new Error("Export manifest is missing use-* validation evidence");
  }
  if (value.defaultLocale !== "en" || !Array.isArray(value.locales) || value.locales.join(",") !== "en,es") {
    throw new Error("Export manifest has invalid locales");
  }
  if (!value.messages || typeof value.messages !== "object" || Array.isArray(value.messages)) {
    throw new Error("Export manifest has invalid locale messages");
  }
  const messages = {};
  for (const locale of value.locales) {
    const source = value.messages[locale];
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error(`Missing locale messages: ${locale}`);
    const entries = Object.entries(source);
    if (!entries.length || entries.length > 500 || entries.some(([key, message]) => !/^[A-Za-z][A-Za-z0-9.]+$/.test(key) || typeof message !== "string" || message.length > 2_000)) {
      throw new Error(`Invalid locale messages: ${locale}`);
    }
    messages[locale] = Object.freeze({ ...source });
  }
  if (!Array.isArray(value.files) || value.files.length > 2_000) throw new Error("Invalid export manifest files");
  const files = new Set();
  for (const file of value.files) {
    if (typeof file !== "string" || !file.startsWith("/")) throw new Error("Invalid export manifest file");
    const key = pathToObjectKey(file);
    if (!key || file.endsWith("/") || `/${key}` !== file) throw new Error(`Unsafe export manifest file: ${file}`);
    if (files.has(key)) throw new Error(`Duplicate export manifest file: ${file}`);
    files.add(key);
  }
  if (!value.artifacts || typeof value.artifacts !== "object" || Array.isArray(value.artifacts)) throw new Error("Invalid export manifest artifacts");
  const artifacts = new Map();
  for (const file of value.files) {
    const artifact = value.artifacts[file];
    if (!artifact || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 0 || !/^[a-f0-9]{64}$/.test(artifact.sha256 || "")) {
      throw new Error(`Invalid export artifact evidence: ${file}`);
    }
    artifacts.set(pathToObjectKey(file), Object.freeze({ bytes: artifact.bytes, sha256: artifact.sha256 }));
  }
  if (Object.keys(value.artifacts).length !== files.size) throw new Error("Export manifest artifacts do not match files");
  return Object.freeze({
    generatedAt: String(value.generatedAt || ""),
    files,
    artifacts,
    defaultLocale: value.defaultLocale,
    locales: Object.freeze([...value.locales]),
    messages: Object.freeze(messages),
  });
}

export function storageObjectUrl(config, key) {
  const parts = [...config.bucketPrefix.split("/"), ...String(key).split("/")];
  if (!parts.every((part) => SAFE_SEGMENT.test(part) && part !== "." && part !== "..")) throw new Error("Unsafe storage object key");
  return `${config.storageOrigin}/${parts.map(encodeURIComponent).join("/")}`;
}

export function storageRequest(config, key) {
  return new Request(storageObjectUrl(config, key), {
    method: "GET",
    headers: { AccessKey: config.storageAccessKey },
    redirect: "manual",
  });
}

function extension(key) {
  const index = key.lastIndexOf(".");
  return index === -1 ? "" : key.slice(index).toLowerCase();
}

export function publicResponseHeaders(key, upstreamHeaders = new Headers()) {
  const headers = new Headers();
  headers.set("content-type", CONTENT_TYPES[extension(key)] || "application/octet-stream");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("cross-origin-resource-policy", key.startsWith("-/blog-examples/") ? "cross-origin" : "same-origin");
  if (key.startsWith("-/blog-examples/")) headers.set("access-control-allow-origin", "*");
  headers.set("content-security-policy", key.startsWith("-/blog-examples/")
    ? "sandbox allow-scripts; default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; img-src 'self' data:; frame-src 'self' https://codesandbox.io https://blog-examples.resources.co https://staging-blog-examples.resources.co http://blog-examples.localhost:*; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  headers.set("cache-control", key.endsWith(".html") ? "public, max-age=30, stale-while-revalidate=60" : "public, max-age=31536000, immutable");
  const etag = upstreamHeaders.get("etag");
  const lastModified = upstreamHeaders.get("last-modified");
  if (etag) headers.set("etag", etag);
  if (lastModified) headers.set("last-modified", lastModified);
  return headers;
}
