#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DomUse } from "@macchiato-dev/dom-use";
import { domUseBrowserAssets } from "@macchiato-dev/dom-use/browser-assets";
import { getFontAsset, parseFontAssetUrl } from "@macchiato-dev/font-use";
import { htmlUseBrowserAssets } from "@macchiato-dev/html-use/browser-assets";
import { parseHTML, serializeHTML } from "@macchiato-dev/html-use";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";
import { getSiteRoute, hasSiteRoutes, renderSiteRoute } from "@macchiato-dev/site";
import { StyleUse } from "@macchiato-dev/style-use";
import { styleUseBrowserAssets } from "@macchiato-dev/style-use/browser-assets";
import { appDirectoryHandler } from "./app-directory.js";
import { getDeclarativeApp } from "./declarative-apps.js";
import { initializeAppsIfEmpty, installAppPlugins } from "./app-plugins.js";
import { fileAppHandler } from "./file-app.js";
import { createSqliteStore, initSqliteStore } from "@macchiato-dev/app-db-sqlite";

const args = "Deno" in globalThis
  ? globalThis.Deno.args
  : process.argv.slice(2);

let host = "127.0.0.1";
let port = 8765;
let dbPath = "";
let dataDir = "";
const appPlugins = [];
const appMappings = {};
let appInit = true;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--host" || arg === "-H" || arg === "-b") {
    host = args[++i] ?? host;
  } else if (arg === "--port" || arg === "-p") {
    port = parseInt(args[++i] ?? String(port), 10);
  } else if (arg === "--db" || arg === "-d") {
    dbPath = args[++i] ?? "";
  } else if (arg === "--data-dir") {
    dataDir = args[++i] ?? "";
  } else if (arg === "--app-plugin") {
    appPlugins.push(args[++i] ?? "");
  } else if (arg === "--app-map") {
    const mapping = args[++i] ?? "";
    const separator = mapping.indexOf("=");
    if (separator < 1) throw new Error(`Invalid --app-map: ${mapping}`);
    appMappings[mapping.slice(0, separator)] = mapping.slice(separator + 1);
  } else if (arg === "--no-app-init") {
    appInit = false;
  } else if (arg === "--help" || arg === "-h") {
    console.log("Usage: macchiato-app [--data-dir <dir>] [--host <host>] [--port <port>]");
    console.log("       macchiato-app --db <path> [--host <host>] [--port <port>]");
    console.log("       [--app-plugin <id|preset>] [--app-map <id=subdomain>] [--no-app-init]");
    process.exit(0);
  }
}

function getHomeDir() {
  if ("Deno" in globalThis) {
    return globalThis.Deno.env.get("HOME") || globalThis.Deno.env.get("USERPROFILE") || "";
  }
  return process.env.HOME || process.env.USERPROFILE || "";
}

if (dbPath) {
  // exact path specified — user manages parent directory
} else if (dataDir) {
  dbPath = join(dataDir, "macchiato.sqlite3");
} else {
  const home = getHomeDir();
  if (!home) {
    console.error("Error: could not determine home directory. Set HOME or use --data-dir <dir>");
    process.exit(1);
  }
  dataDir = join(home, ".macchiato", "default");
  dbPath = join(dataDir, "macchiato.sqlite3");
}

if (dataDir) {
  try {
    mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.error(`Error: cannot create data directory ${dataDir}`);
    console.error(`  ${err.message}`);
    console.error("Create it manually:");
    console.error(`  mkdir -p ${dataDir}`);
    console.error("Or specify a different location with --data-dir <dir>");
    process.exit(1);
  }
}

const db = new DatabaseSync(dbPath);
initSqliteStore(db);
if (appPlugins.length > 0) installAppPlugins(db, appPlugins, { mappings: appMappings });
else if (appInit) initializeAppsIfEmpty(db, ["core"], { mappings: appMappings });

const store = createSqliteStore(db);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

const BROWSER_ASSET_SETS = [
  quickJsEmscriptenSandboxBrowserAssets,
  domUseBrowserAssets,
  htmlUseBrowserAssets,
  styleUseBrowserAssets,
];

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hydrateCssSchema(schema) {
  return {
    ...schema,
    properties: hydratePropertyRules(schema.properties),
    definitions: hydrateStyleDefinitions(schema.definitions),
    selectors: typeof schema.selectors === "string" ? new RegExp(schema.selectors) : schema.selectors,
    urls: hydrateUrlRules(schema.urls),
    content: hydrateContentRules(schema.content),
  };
}

function hydratePropertyRules(rules = {}) {
  const properties = {};
  for (const [name, rule] of Object.entries(rules)) {
    properties[name] = typeof rule === "string" ? new RegExp(rule) : rule;
  }
  return properties;
}

function hydrateStyleDefinitions(definitions = {}) {
  const hydrated = {};
  for (const [name, definition] of Object.entries(definitions)) {
    hydrated[name] = {
      ...definition,
      properties: hydratePropertyRules(definition.properties || definition),
    };
  }
  return hydrated;
}

function hydrateContentRules(rules) {
  if (!rules || typeof rules !== "object") return rules;
  return {
    ...rules,
    allowedPattern: typeof rules.allowedPattern === "string" ? new RegExp(rules.allowedPattern) : rules.allowedPattern,
    rejectPattern: typeof rules.rejectPattern === "string" ? new RegExp(rules.rejectPattern) : rules.rejectPattern,
  };
}

function hydrateUrlRules(rules) {
  if (rules === undefined || typeof rules === "boolean") return rules;
  if (typeof rules === "string") return new RegExp(rules);
  if (Array.isArray(rules)) return rules.map((rule) => typeof rule === "string" ? new RegExp(rule) : rule);
  const hydrated = {};
  for (const [name, rule] of Object.entries(rules)) {
    hydrated[name] = hydrateUrlRules(rule);
  }
  return hydrated;
}

function hydrateDomSchema(schema) {
  const nodes = {};
  for (const [tag, rule] of Object.entries(schema.nodes || {})) {
    nodes[tag] = {
      ...rule,
      urls: hydrateUrlRules(rule.urls),
    };
  }
  const definitions = {};
  for (const [name, rule] of Object.entries(schema.definitions || {})) {
    definitions[name] = {
      ...rule,
      urls: hydrateUrlRules(rule.urls),
    };
  }
  return {
    ...schema,
    nodes,
    definitions,
    urls: hydrateUrlRules(schema.urls),
    content: hydrateContentRules(schema.content),
  };
}

function parseSchemaDocument(value) {
  const text = String(value || "").trim();
  if (text.startsWith("@")) {
    const row = store.getSchema.get(text);
    if (!row) throw new Error(`Schema not found: ${text}`);
    return JSON.parse(row.json);
  }
  return JSON.parse(text);
}

function renderStoredPage(row) {
  let body = row.html;
  const css = row.css || "";

  if (row.sandboxed) {
    const domSchema = hydrateDomSchema(parseSchemaDocument(row.dom_schema_json));
    const cssSchema = hydrateCssSchema(parseSchemaDocument(row.css_schema_json));
    const styleUse = new StyleUse(cssSchema);
    styleUse.validateStylesheet(css);
    const domUse = new DomUse(domSchema, styleUse);
    const doc = domUse.createDocument();
    const fragment = parseHTML(body, {
      createElement: (tag) => doc.createElement(tag),
      createTextNode: (text) => doc.createTextNode(text),
      schema: domSchema,
      styleUse,
    });
    body = serializeHTML(fragment);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<title>${escapeHtml(row.title || row.subdomain)}</title>
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function serveStoredPage(row) {
  try {
    return new Response(renderStoredPage(row), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(`Sandbox error: ${err.message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

function serveSiteRoute(row, status = 200) {
  try {
    return new Response(renderSiteRoute(row), {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(`Site route error: ${err.message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

function getSubdomain(hostHeader) {
  const name = hostHeader.split(":")[0];
  if (name === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(name) || name.includes(":")) return "";
  if (name.endsWith(".localhost")) return name.slice(0, -".localhost".length);
  return name.split(".")[0] || "";
}

function contentTypeFor(filePath) {
  return CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}

function safeJoin(root, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const target = resolve(root, relative.replace(/^[/\\]+/, ""));
  const resolvedRoot = resolve(root);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}/`)) {
    throw new Error("Path escapes root");
  }
  return target;
}

async function serveFile(directory, pathname = "/index.html") {
  const localPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = safeJoin(directory, localPath);
  try {
    const content = await readFile(filePath);
    return new Response(content, {
      headers: { "content-type": contentTypeFor(filePath) },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function serveCachedFont(pathname) {
  const ref = parseFontAssetUrl(pathname);
  if (!ref) return null;
  const row = getFontAsset(db, ref.name, ref.assetPath);
  if (!row) return new Response("Font not found", { status: 404 });
  return new Response(row.content, {
    headers: {
      "content-type": row.mimeType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

function browserAsset(pathname) {
  if (!pathname.startsWith("/-/")) return null;
  const relative = pathname.slice("/-/".length);
  if (relative.includes("..") || relative.includes("\\")) return null;
  for (const set of BROWSER_ASSET_SETS) {
    if (!relative.startsWith(`${set.namespace}/`)) continue;
    const publicPath = relative.slice(set.namespace.length + 1);
    for (const asset of set.files || []) {
      if (publicPath === asset.publicPath) return asset;
      if (asset.sourceMapPath && publicPath === `${asset.publicPath}.map`) {
        return { ...asset, filePath: asset.sourceMapPath, rewrites: null, sourceMapPath: null };
      }
    }
  }
  return null;
}

function rewriteBrowserAsset(content, asset) {
  let rewritten = content;
  for (const [from, to] of Object.entries(asset.rewrites || {})) {
    rewritten = rewritten.replaceAll(from, to);
  }
  if (asset.sourceMapPath) {
    rewritten = rewritten.replace(/\/\/# sourceMappingURL=.*$/m, `//# sourceMappingURL=${asset.publicPath}.map`);
  }
  return rewritten;
}

async function serveBrowserAsset(pathname) {
  const asset = browserAsset(pathname);
  if (!asset) return null;
  try {
    const content = await readFile(asset.filePath, pathname.endsWith(".wasm") ? undefined : "utf8");
    const body = pathname.endsWith(".js") ? rewriteBrowserAsset(content, asset) : content;
    return new Response(body, {
      headers: { "content-type": contentTypeFor(pathname) },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function route(request) {
  const hostHeader = request.headers.get("host") || "localhost";
  const subdomain = getSubdomain(hostHeader);
  const url = new URL(request.url);
  const cachedFont = serveCachedFont(url.pathname);
  if (cachedFont) return cachedFont;
  const asset = await serveBrowserAsset(url.pathname);
  if (asset) return asset;

  const app = getDeclarativeApp(db, subdomain);
  if (!app) return new Response("App not configured", { status: 404 });

  if (app.handlerName === "app-directory") {
    return appDirectoryHandler(request, { db });
  }
  if (app.handler) {
    return app.handler(request, app);
  }

  if (app.handlerName === "sqlite-routes" && hasSiteRoutes(db, subdomain)) {
    const routePath = url.pathname === "/index.html" ? "/" : url.pathname;
    const siteRoute = getSiteRoute(db, subdomain, routePath);
    if (siteRoute) return serveSiteRoute(siteRoute);
    const notFoundRoute = getSiteRoute(db, subdomain, "/404");
    if (notFoundRoute) return serveSiteRoute(notFoundRoute, 404);
    return new Response("Not found", { status: 404 });
  }

  const page = app.handlerName === "sqlite-page" ? store.getSitePage.get(subdomain) : null;
  if (page && (url.pathname === "/" || url.pathname === "/index.html")) {
    return serveStoredPage(page);
  }
  if (page) {
    return new Response("Not found", { status: 404 });
  }

  const fileSite = app.handlerName === "raw-file" ? store.getSiteFile.get(subdomain) : null;
  if (fileSite) {
    return fileAppHandler(request, {
      name: fileSite.title || fileSite.subdomain,
      subdomain: fileSite.subdomain,
      file: {
        path: fileSite.path,
        contentType: fileSite.contentType,
        csp: fileSite.csp,
        cors: app.options.cors,
      },
    });
  }

  const row = app.handlerName === "directory" ? store.getDirectorySite.get(subdomain) : null;
  if (row) {
    return serveFile(row.directory, url.pathname);
  }

  return new Response("Configured app has no runnable handler", { status: 500 });
}

if ("Deno" in globalThis) {
  const denoHost = host === "0.0.0.0" ? "::" : host;
  console.log(`Server running on http://${host === "0.0.0.0" ? "0.0.0.0" : denoHost}:${port}`);
  globalThis.Deno.serve(
    { port, hostname: denoHost },
    (req) => route(req),
  );
} else {
  const server = createServer(async (req, res) => {
    try {
      const hostHeader = req.headers.host || "localhost";
      const body = req.method !== "GET" && req.method !== "HEAD"
        ? await new Promise((resolve, reject) => {
            const chunks = [];
            req.on("data", (c) => chunks.push(c));
            req.on("end", () => resolve(Buffer.concat(chunks)));
            req.on("error", reject);
          })
        : undefined;

      const request = new Request(`http://${hostHeader}${req.url}`, {
        method: req.method,
        headers: new Headers(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
        body,
      });

      const response = await route(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(String(err));
    }
  });

  if (host === "0.0.0.0") {
    server.listen(port, () => {
      console.log(`Server running on http://0.0.0.0:${port}`);
    });
  } else {
    server.listen(port, host, () => {
      console.log(`Server running on http://${host}:${port}`);
    });
  }
}
