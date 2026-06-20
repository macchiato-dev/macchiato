import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const fileBodyCache = new Map();

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

function dataUrl(mime, bytes) {
  return `data:${mime || "application/octet-stream"};base64,${Buffer.from(bytes).toString("base64")}`;
}

function scriptJson(html, type) {
  const escaped = type.replace("/", "\\/");
  return html.match(new RegExp(`<script\\s+type="${escaped}"[^>]*>\\s*([\\s\\S]*?)\\s*<\\/script>`))?.[1] || "";
}

function expandStandaloneBundle(html) {
  const manifestText = scriptJson(html, "__bundler/manifest");
  const templateText = scriptJson(html, "__bundler/template");
  if (!manifestText || !templateText) return html;

  const manifest = JSON.parse(manifestText);
  let template = JSON.parse(templateText);
  const urls = {};
  for (const [uuid, entry] of Object.entries(manifest)) {
    if (entry.compressed) return html;
    urls[uuid] = dataUrl(entry.mime, Buffer.from(entry.data, "base64"));
  }
  for (const [uuid, url] of Object.entries(urls)) {
    template = template.split(uuid).join(url);
  }
  template = template.replace(/\s+integrity="[^"]*"/gi, "").replace(/\s+crossorigin="[^"]*"/gi, "");

  const extResourcesText = scriptJson(html, "__bundler/ext_resources");
  const extResources = extResourcesText ? JSON.parse(extResourcesText) : [];
  const resourceMap = {};
  for (const entry of extResources) {
    if (urls[entry.uuid]) resourceMap[entry.id] = urls[entry.uuid];
  }
  const resourceScript = `<script>window.__resources = ${JSON.stringify(resourceMap).replaceAll("</script>", "<\\/script>")};</script>`;
  const headOpen = template.match(/<head[^>]*>/i);
  if (!headOpen) return `${resourceScript}${template}`;
  const index = headOpen.index + headOpen[0].length;
  return template.slice(0, index) + resourceScript + template.slice(index);
}

async function fileBody(file, method) {
  if (method === "HEAD") return null;
  const cacheKey = `${file.path}\0${file.renderMode || "raw"}`;
  const info = await stat(file.path);
  const cached = fileBodyCache.get(cacheKey);
  if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) return cached.body;

  const body = await readFile(file.path);
  if (file.renderMode !== "expanded-bundle") return body;
  const expanded = expandStandaloneBundle(body.toString("utf8"));
  fileBodyCache.set(cacheKey, {
    body: expanded,
    mtimeMs: info.mtimeMs,
    size: info.size,
  });
  return expanded;
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
    const body = await fileBody(app.file, request.method);
    return new Response(body, { headers: securityHeaders(app) });
  } catch (err) {
    return new Response(`File app error: ${err.message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
