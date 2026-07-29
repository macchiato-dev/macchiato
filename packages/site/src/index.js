const DEFAULT_TRANSITION_POLICY = {
  mode: "auto",
  sameOrigin: true,
  trustedSources: [],
  presanitizedCache: {
    required: false,
    writeAccess: "restricted",
    allowedWriters: [],
  },
  wasmFallback: true,
};

export { readRepoProjectMetadata, repoMetadataTask } from "./repo-metadata-task.js";

const SAFE_HEADER_VALUE = /^[\t\x20-\x7e]*$/;
const SAFE_ROUTE_PATH = /^\/(?:[a-zA-Z0-9._~-]+\/?)*$/;

export const SITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS site_routes (
    subdomain TEXT NOT NULL,
    path TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    html TEXT NOT NULL,
    css TEXT NOT NULL DEFAULT '',
    head TEXT NOT NULL DEFAULT '',
    csp TEXT NOT NULL DEFAULT '',
    nav_json TEXT NOT NULL DEFAULT '[]',
    transition_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (subdomain, path)
  )
`;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function normalizeTrustedSource(source) {
  if (typeof source === "string") return { type: "prefix", value: source };
  if (!source || typeof source !== "object") throw new Error("Trusted source must be a string or object");
  if (!source.type || !source.value) throw new Error("Trusted source requires type and value");
  if (!["origin", "prefix"].includes(source.type)) {
    throw new Error(`Unsupported trusted source type: ${source.type}`);
  }
  return {
    type: source.type,
    value: String(source.value),
  };
}

export function createSitePolicy(policy = {}) {
  const merged = {
    ...DEFAULT_TRANSITION_POLICY,
    ...policy,
    trustedSources: (policy.trustedSources || DEFAULT_TRANSITION_POLICY.trustedSources).map(normalizeTrustedSource),
    presanitizedCache: {
      ...DEFAULT_TRANSITION_POLICY.presanitizedCache,
      ...(policy.presanitizedCache || {}),
    },
  };
  validateSitePolicy(merged);
  return merged;
}

export function initSiteDb(db) {
  db.exec(SITE_SCHEMA);
}

export function normalizeRoutePath(path = "/") {
  let value = String(path || "/").trim();
  if (!value.startsWith("/")) value = `/${value}`;
  value = value.replace(/\/+/g, "/");
  if (value.length > 1) value = value.replace(/\/$/, "");
  if (value.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Invalid site route path: ${path}`);
  }
  if (!SAFE_ROUTE_PATH.test(value)) throw new Error(`Invalid site route path: ${path}`);
  return value;
}

export function putSiteRoute(db, route) {
  const subdomain = String(route.subdomain || "").trim();
  if (!subdomain) throw new Error("Site route requires subdomain");
  const path = normalizeRoutePath(route.path || "/");
  const title = route.title || subdomain;
  const html = String(route.html ?? "");
  if (!html) throw new Error("Site route requires html");
  const navJson = JSON.stringify(route.nav || []);
  const transitionJson = JSON.stringify(route.transition || {});

  db.prepare(`
    INSERT INTO site_routes
      (subdomain, path, title, html, css, head, csp, nav_json, transition_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(subdomain, path) DO UPDATE SET
      title = excluded.title,
      html = excluded.html,
      css = excluded.css,
      head = excluded.head,
      csp = excluded.csp,
      nav_json = excluded.nav_json,
      transition_json = excluded.transition_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    subdomain,
    path,
    title,
    html,
    route.css || "",
    route.head || "",
    route.csp || "",
    navJson,
    transitionJson,
  );
  return { subdomain, path };
}

export function getSiteRoute(db, subdomain, path = "/") {
  const routePath = normalizeRoutePath(path);
  return db.prepare(`
    SELECT subdomain, path, title, html, css, head, csp, nav_json AS navJson, transition_json AS transitionJson
    FROM site_routes
    WHERE subdomain = ? AND path = ?
  `).get(String(subdomain), routePath);
}

export function hasSiteRoutes(db, subdomain) {
  const row = db.prepare("SELECT 1 AS found FROM site_routes WHERE subdomain = ? LIMIT 1").get(String(subdomain));
  return Boolean(row);
}

export function listSiteRoutes(db, subdomain) {
  return db.prepare(`
    SELECT subdomain, path, title
    FROM site_routes
    WHERE subdomain = ?
    ORDER BY path
  `).all(String(subdomain));
}

export function deleteSiteRoutes(db, subdomain) {
  db.prepare("DELETE FROM site_routes WHERE subdomain = ?").run(String(subdomain));
}

export function validateSitePolicy(policy) {
  if (!["auto", "trusted-only", "wasm-only", "document"].includes(policy.mode)) {
    throw new Error(`Unsupported transition mode: ${policy.mode}`);
  }
  if (typeof policy.sameOrigin !== "boolean") throw new Error("sameOrigin must be boolean");
  if (typeof policy.wasmFallback !== "boolean") throw new Error("wasmFallback must be boolean");
  validatePresanitizedCache(policy.presanitizedCache || {});
}

export function validatePresanitizedCache(cache = {}) {
  const writeAccess = cache.writeAccess || "restricted";
  if (writeAccess !== "restricted") {
    throw new Error("Pre-sanitized HTML cache writeAccess must be restricted");
  }
  if (!Array.isArray(cache.allowedWriters)) {
    throw new Error("Pre-sanitized HTML cache allowedWriters must be an array");
  }
  if (cache.allowedWriters.length === 0 && cache.required) {
    throw new Error("Required pre-sanitized cache must declare allowedWriters");
  }
}

export function trustedSourceMatches(source, requestUrl) {
  const url = new URL(requestUrl);
  if (source.type === "origin") return url.origin === source.value;
  if (source.type === "prefix") return requestUrl.startsWith(source.value);
  return false;
}

export function isTrustedTransitionSource(requestUrl, policy = createSitePolicy()) {
  return policy.trustedSources.some((source) => trustedSourceMatches(source, requestUrl));
}

export function chooseTransitionMode({
  requestUrl,
  currentOrigin = "",
  cacheHit = false,
  clientWasm = false,
  policy = createSitePolicy(),
} = {}) {
  if (policy.mode === "document") return "document";
  if (policy.sameOrigin && currentOrigin && requestUrl) {
    const nextOrigin = new URL(requestUrl).origin;
    if (nextOrigin !== currentOrigin) return "document";
  }
  if (policy.mode !== "wasm-only" && cacheHit && isTrustedTransitionSource(requestUrl, policy)) {
    return "trusted-presanitized-swap";
  }
  if (policy.mode !== "trusted-only" && policy.wasmFallback && clientWasm) {
    return "client-wasm-sanitize";
  }
  return "document";
}

export function renderDocument({
  title = "",
  lang = "en",
  head = "",
  body = "",
  csp = "",
  transitionManifest = null,
} = {}) {
  const cspMeta = csp ? `<meta http-equiv="Content-Security-Policy" content="${escapeAttr(assertHeaderValue(csp))}">` : "";
  const manifest = transitionManifest
    ? `<script type="application/json" id="macchiato-site-transitions">${escapeHtml(JSON.stringify(transitionManifest))}</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="${escapeAttr(lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${cspMeta}
<title>${escapeHtml(title)}</title>
${head}
</head>
<body>
${body}
${manifest}
</body>
</html>`;
}

export function renderSiteRoute(row) {
  const nav = JSON.parse(row.navJson || "[]");
  const transition = JSON.parse(row.transitionJson || "{}");
  const head = `${row.css ? `<style>\n${row.css}\n</style>` : ""}
${row.head || ""}`;
  return renderDocument({
    title: row.title || row.subdomain,
    lang: row.lang || "en",
    csp: row.csp || "",
    head,
    body: row.html,
    transitionManifest: {
      path: row.path,
      nav,
      ...transition,
    },
  });
}

function assertHeaderValue(value) {
  const text = String(value);
  if (!SAFE_HEADER_VALUE.test(text)) throw new Error("Header value contains disallowed characters");
  return text;
}

export function createTransitionManifest(policy) {
  const safePolicy = createSitePolicy(policy);
  return {
    mode: safePolicy.mode,
    sameOrigin: safePolicy.sameOrigin,
    wasmFallback: safePolicy.wasmFallback,
    trustedSources: safePolicy.trustedSources,
  };
}
