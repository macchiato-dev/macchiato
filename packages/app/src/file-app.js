import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

export const DEFAULT_FILE_APP_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' blob:",
  "connect-src 'self' blob:",
  "worker-src 'self' blob:",
].join("; ");

export const DEFAULT_CLEAR_SITE_DATA = '"cache", "cookies", "storage"';

function contentTypeFor(filePath, configuredType) {
  return configuredType || CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}

function securityHeaders(app) {
  const file = app.file || {};
  const headers = new Headers({
    "content-type": contentTypeFor(file.path || "", file.contentType),
    "content-security-policy": file.csp || DEFAULT_FILE_APP_CSP,
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  const clearSiteData = file.clearSiteData === false ? "" : (file.clearSiteData || DEFAULT_CLEAR_SITE_DATA);
  if (clearSiteData) headers.set("clear-site-data", clearSiteData);
  return headers;
}

export async function fileAppHandler(request, app) {
  const url = new URL(request.url);
  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    return new Response("Not found", { status: 404 });
  }
  if (!app.file?.path) {
    return new Response("File app is missing file.path", { status: 500 });
  }
  try {
    const body = request.method === "HEAD" ? null : await readFile(app.file.path);
    return new Response(body, { headers: securityHeaders(app) });
  } catch (err) {
    return new Response(`File app error: ${err.message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
