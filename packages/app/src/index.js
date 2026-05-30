#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { sandboxHandler } from "@macchiato-dev/quickjs-emscripten-sandbox/handler";
import { dashboardHandler } from "@macchiato-dev/dashboard";
import { DomUse } from "@macchiato-dev/dom-use";
import { parseHTML, serializeHTML } from "@macchiato-dev/html-use";
import { StyleUse } from "@macchiato-dev/style-use";
import { domUseTodosHandler } from "../../../examples/dom-use-todos/handler.js";

const args = "Deno" in globalThis
  ? globalThis.Deno.args
  : process.argv.slice(2);

let host = "127.0.0.1";
let port = 8765;
let dbPath = "";
let dataDir = "";

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
  } else if (arg === "--help" || arg === "-h") {
    console.log("Usage: macchiato-app [--data-dir <dir>] [--host <host>] [--port <port>]");
    console.log("       macchiato-app --db <path> [--host <host>] [--port <port>]");
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
db.exec("PRAGMA journal_mode = WAL");
db.exec("CREATE TABLE IF NOT EXISTS sites (subdomain TEXT PRIMARY KEY, directory TEXT NOT NULL)");
db.exec(`
  CREATE TABLE IF NOT EXISTS schemas (
    name TEXT PRIMARY KEY,
    json TEXT NOT NULL
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS site_pages (
    subdomain TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    html TEXT NOT NULL,
    css TEXT NOT NULL DEFAULT '',
    dom_schema_json TEXT NOT NULL,
    css_schema_json TEXT NOT NULL,
    sandboxed INTEGER NOT NULL DEFAULT 1
  )
`);

const getSite = db.prepare("SELECT directory FROM sites WHERE subdomain = ?");
const getSchema = db.prepare("SELECT json FROM schemas WHERE name = ?");
const getSitePage = db.prepare(`
  SELECT subdomain, title, html, css, dom_schema_json, css_schema_json, sandboxed
  FROM site_pages
  WHERE subdomain = ?
`);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hydrateCssSchema(schema) {
  const properties = {};
  for (const [name, rule] of Object.entries(schema.properties || {})) {
    properties[name] = typeof rule === "string" ? new RegExp(rule) : rule;
  }
  return {
    ...schema,
    properties,
    selectors: typeof schema.selectors === "string" ? new RegExp(schema.selectors) : schema.selectors,
    urls: hydrateUrlRules(schema.urls),
    content: hydrateContentRules(schema.content),
  };
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
  return {
    ...schema,
    nodes,
    urls: hydrateUrlRules(schema.urls),
    content: hydrateContentRules(schema.content),
  };
}

function parseSchemaDocument(value) {
  const text = String(value || "").trim();
  if (text.startsWith("@")) {
    const row = getSchema.get(text);
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

function getSubdomain(hostHeader) {
  const name = hostHeader.split(":")[0];
  return name.split(".")[0] || "default";
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

async function serveWorkspaceModule(pathname) {
  if (!pathname.startsWith("/@macchiato-dev/")) return null;

  const parts = pathname.split("/").filter(Boolean);
  const packageName = parts[1];
  const rest = parts.slice(2).join("/");
  if (!packageName || !rest || !rest.endsWith(".js")) {
    return new Response("Not found", { status: 404 });
  }

  const repoRoot = new URL("../../..", import.meta.url).pathname;
  return serveFile(join(repoRoot, "packages", packageName), `/${rest}`);
}

async function route(request) {
  const hostHeader = request.headers.get("host") || "localhost";
  const subdomain = getSubdomain(hostHeader);
  const url = new URL(request.url);

  const workspaceModule = await serveWorkspaceModule(url.pathname);
  if (workspaceModule) return workspaceModule;

  if (subdomain === "macchiato") {
    return dashboardHandler(request);
  }

  if (subdomain === "macchiato-quickjs-emscripten-sandbox") {
    return sandboxHandler(request);
  }

  if (subdomain === "dom-use-todos") {
    return domUseTodosHandler(request);
  }

  const page = getSitePage.get(subdomain);
  if (page && (url.pathname === "/" || url.pathname === "/index.html")) {
    return serveStoredPage(page);
  }
  if (page) {
    return new Response("Not found", { status: 404 });
  }

  const row = getSite.get(subdomain);
  if (row) {
    return serveFile(row.directory, url.pathname);
  }

  return new Response(
    `<!DOCTYPE html><html><body><h1>${escapeHtml(subdomain)}</h1></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
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
