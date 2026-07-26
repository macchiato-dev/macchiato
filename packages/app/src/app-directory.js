import { readFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { getDeclarativeApp, visibleDeclarativeApps } from "./declarative-apps.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appHref(app, requestUrl) {
  const url = new URL(requestUrl);
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${app.subdomain}.localhost${port}/`;
}

function directoryHref(pathname, requestUrl) {
  const url = new URL(requestUrl);
  return `${url.origin}${pathname}`;
}

function configHref(app, requestUrl) {
  return directoryHref(`/config/${encodeURIComponent(app.subdomain)}`, requestUrl);
}

function summarizeFunction(fn) {
  return `[Function ${fn.name || "anonymous"}]`;
}

function sortObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

function serializeConfig(value, seen = new WeakSet()) {
  if (typeof value === "function") return summarizeFunction(value);
  if (value instanceof RegExp) return value.toString();
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => serializeConfig(item, seen));

  const entries = Object.entries(value)
    .filter(([key]) => !key.startsWith("_"))
    .map(([key, item]) => [key, serializeConfig(item, seen)]);
  return sortObject(Object.fromEntries(entries));
}

function publicSchemaDescriptor(schema) {
  const path = schema.path ? relative(repoRoot, schema.path) : undefined;
  return sortObject({
    name: schema.name,
    path,
    file: path ? basename(path) : undefined,
  });
}

async function loadSchemas(app) {
  const schemas = {};
  for (const schema of app.schemas || []) {
    if (!schema.path) continue;
    const name = schema.name || basename(schema.path);
    const text = await readFile(schema.path, "utf8");
    schemas[name] = {
      ...publicSchemaDescriptor(schema),
      json: JSON.parse(text),
    };
  }
  return sortObject(schemas);
}

async function appConfig(app) {
  const config = serializeConfig(app);
  delete config.handler;
  delete config.setup;
  delete config.environment;
  config.handler = app.handlerName;
  config.configuredEnvironment = Object.keys(app.environment || {}).sort();

  return sortObject({
    app: config,
    runtime: sortObject({
      handler: app.handler ? summarizeFunction(app.handler) : undefined,
      setup: app.setup ? summarizeFunction(app.setup) : undefined,
      directory: app.directory === false ? false : true,
    }),
    schemas: await loadSchemas(app),
  });
}

function renderAppRow({ name, subdomain, kind, description, href, config }) {
  return `<article class="app-row">
      <div>
        <h2><a href="${escapeHtml(href)}">${escapeHtml(name)}</a></h2>
        <p>${escapeHtml(description)}</p>
        <a class="config-link" href="${escapeHtml(config)}">View configuration</a>
      </div>
      <div class="meta">
        <span>${escapeHtml(kind)}</span>
        <code>${escapeHtml(subdomain)}.localhost</code>
      </div>
    </article>`;
}

function renderAppDirectory(request, { db } = {}) {
  const declarativeRows = visibleDeclarativeApps(db).map((app) => renderAppRow({
    name: app.name,
    subdomain: app.subdomain,
    kind: app.kind,
    description: app.description,
    href: appHref(app, request.url),
    config: configHref(app, request.url),
  }));
  const rows = declarativeRows.join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Macchiato Apps</title>
<style>
  body {
    margin: 0;
    color: #1b1e24;
    background: #f5f7fb;
    font-family: system-ui, sans-serif;
  }
  main {
    width: min(980px, calc(100vw - 40px));
    margin: 48px auto;
  }
  h1 {
    margin: 0 0 24px;
    font-size: 32px;
    line-height: 1.1;
  }
  .app-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 24px;
    align-items: center;
    padding: 18px 0;
    border-top: 1px solid #dce2ec;
  }
  .app-row:last-child {
    border-bottom: 1px solid #dce2ec;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 18px;
  }
  a {
    color: #1638d9;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  .config-link {
    display: inline-block;
    margin-top: 10px;
    font-size: 13px;
    font-weight: 650;
  }
  p {
    margin: 0;
    color: #586173;
    line-height: 1.5;
  }
  .meta {
    display: grid;
    gap: 6px;
    justify-items: end;
    color: #586173;
    font-size: 13px;
  }
  code {
    color: #2d3442;
    background: #e9edf5;
    border-radius: 6px;
    padding: 4px 7px;
  }
  @media (max-width: 680px) {
    main {
      margin: 28px auto;
    }
    .app-row {
      grid-template-columns: 1fr;
    }
    .meta {
      justify-items: start;
    }
  }
</style>
</head>
<body>
<main>
  <h1>Macchiato Apps</h1>
  ${rows}
</main>
</body>
</html>`;
}

async function renderConfigPage(app, request) {
  const href = appHref(app, request.url);
  const directory = directoryHref("/", request.url);
  const config = await appConfig(app);
  const json = JSON.stringify(config, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(app.name)} Configuration</title>
<style>
  body {
    margin: 0;
    color: #1b1e24;
    background: #f5f7fb;
    font-family: system-ui, sans-serif;
  }
  main {
    width: min(1080px, calc(100vw - 40px));
    margin: 42px auto;
  }
  nav {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
    font-size: 14px;
  }
  a {
    color: #1638d9;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  h1 {
    margin: 0 0 8px;
    font-size: 32px;
    letter-spacing: 0;
  }
  p {
    margin: 0 0 22px;
    color: #586173;
    line-height: 1.5;
  }
  pre {
    margin: 0;
    overflow: auto;
    padding: 18px;
    border: 1px solid #dce2ec;
    border-radius: 8px;
    color: #202632;
    background: #ffffff;
    box-shadow: 0 10px 28px rgba(25, 31, 38, 0.14);
    font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
</style>
</head>
<body>
<main>
  <nav>
    <a href="${escapeHtml(directory)}">Apps</a>
    <a href="${escapeHtml(href)}">Open ${escapeHtml(app.name)}</a>
  </nav>
  <h1>${escapeHtml(app.name)} Configuration</h1>
  <p>${escapeHtml(app.description)}</p>
  <pre><code>${escapeHtml(json)}</code></pre>
</main>
</body>
</html>`;
}

function sqliteSiteConfig(db, subdomain) {
  if (!db) return null;
  const app = getDeclarativeApp(db, subdomain);
  if (app) {
    return {
      app: {
        name: app.name,
        subdomain: app.subdomain,
        kind: app.kind,
        description: app.description,
        handler: app.handlerName,
        declarative: true,
        permissions: app.permissions,
        access: app.access,
        options: app.options,
      },
      runtime: {
        directory: app.directory,
        handler: `[Function ${app.handlerName}]`,
      },
      schemas: {},
    };
  }
  return null;
}

async function renderSqliteConfigPage(config, request) {
  const site = config.app;
  const href = appHref(site, request.url);
  const directory = directoryHref("/", request.url);
  const json = JSON.stringify(config, null, 2);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(site.name || site.subdomain)} Configuration</title>
<style>
  body { margin: 0; color: #1b1e24; background: #f5f7fb; font-family: system-ui, sans-serif; }
  main { width: min(1080px, calc(100vw - 40px)); margin: 42px auto; }
  nav { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; font-size: 14px; }
  a { color: #1638d9; text-decoration: none; }
  a:hover { text-decoration: underline; }
  h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: 0; }
  p { margin: 0 0 22px; color: #586173; line-height: 1.5; }
  pre { margin: 0; overflow: auto; padding: 18px; border: 1px solid #dce2ec; border-radius: 8px; color: #202632; background: #ffffff; box-shadow: 0 10px 28px rgba(25, 31, 38, 0.14); font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
</style>
</head>
<body>
<main>
  <nav>
    <a href="${escapeHtml(directory)}">Apps</a>
    <a href="${escapeHtml(href)}">Open ${escapeHtml(site.name || site.subdomain)}</a>
  </nav>
  <h1>${escapeHtml(site.name || site.subdomain)} Configuration</h1>
  <p>${escapeHtml(site.description || `${site.kind} configured in SQLite.`)}</p>
  <pre><code>${escapeHtml(json)}</code></pre>
</main>
</body>
</html>`;
}

export async function appDirectoryHandler(request, options = {}) {
  const url = new URL(request.url);
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(renderAppDirectory(request, options), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const match = url.pathname.match(/^\/config\/([^/]+)$/);
  if (match) {
    const subdomain = decodeURIComponent(match[1]);
    const app = getDeclarativeApp(options.db, subdomain);
    if (app) {
      return new Response(await renderConfigPage(app, request), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    const siteConfig = sqliteSiteConfig(options.db, subdomain);
    if (!siteConfig) return new Response("Not found", { status: 404 });
    return new Response(await renderSqliteConfigPage(siteConfig, request), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

    return new Response("Not found", { status: 404 });
}
