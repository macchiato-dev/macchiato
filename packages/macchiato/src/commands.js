import { startServer, stopServer, runServer, isRunning } from "./server.js";
import { withDb } from "./db.js";
import { readFileSync } from "node:fs";
import { putFontAsset } from "@macchiato-dev/font-use";
import { deleteSiteRoutes, putSiteRoute } from "@macchiato-dev/site";

function parseServerOpts(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" || args[i] === "-p") opts.port = args[++i];
    else if (args[i] === "--host" || args[i] === "-b") opts.host = args[++i];
  }
  return opts;
}

function parsePageOpts(args) {
  const opts = {
    sandboxed: true,
    title: "",
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--title") opts.title = args[++i] ?? "";
    else if (arg === "--unsandboxed") opts.sandboxed = false;
    else if (arg === "--sandboxed") opts.sandboxed = true;
    else positional.push(arg);
  }
  return { opts, positional };
}

function parseRouteOpts(args) {
  const opts = {
    title: "",
    csp: "",
    headPath: "",
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--title") opts.title = args[++i] ?? "";
    else if (arg === "--csp") opts.csp = args[++i] ?? "";
    else if (arg === "--head") opts.headPath = args[++i] ?? "";
    else positional.push(arg);
  }
  return { opts, positional };
}

function parseFileSiteOpts(args) {
  const opts = {
    title: "",
    contentType: "",
    csp: "",
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--title") opts.title = args[++i] ?? "";
    else if (arg === "--content-type") opts.contentType = args[++i] ?? "";
    else if (arg === "--csp") opts.csp = args[++i] ?? "";
    else positional.push(arg);
  }
  return { opts, positional };
}

function readText(path) {
  return readFileSync(path, "utf-8");
}

function parseFontOpts(args) {
  const opts = {
    mimeType: "font/woff2",
    provider: "self",
    sourceUrl: "",
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--mime") opts.mimeType = args[++i] ?? opts.mimeType;
    else if (arg === "--provider") opts.provider = args[++i] ?? opts.provider;
    else if (arg === "--source-url") opts.sourceUrl = args[++i] ?? opts.sourceUrl;
    else positional.push(arg);
  }
  return { opts, positional };
}

function readSchemaArg(value) {
  if (String(value).startsWith("@")) return value;
  const text = readText(value);
  JSON.parse(text);
  return text;
}

function exit(code = 0) {
  if ("Deno" in globalThis) globalThis.Deno.exit(code);
  else process.exit(code);
}

export function createCommands({ blocking = false, dataDir = "", dbPath = "" } = {}) {
  const dbOptions = { dataDir, dbPath };

  return {
    help() {
      console.log("Commands:");
      console.log("  help                          Show this help");
      console.log("  exit, quit, q                 Exit the shell");
      console.log("  --data-dir <dir>              Use a specific SQLite data directory");
      console.log("  --db <path>                   Use a specific SQLite database path");
      console.log("  server start [opts]           Start the HTTP server");
      console.log("  server stop                   Stop the HTTP server");
      console.log("  server status                 Check server status");
      console.log("  schema add <name> <json>      Add a named schema");
      console.log("  schema list                   List named schemas");
      console.log("  font add <name> <asset-path> <file> [--mime <type>] [--provider <name>] [--source-url <url>]");
      console.log("  site add <subdomain> <dir>    Add a site");
      console.log("  site add-page <subdomain> <html> <css> <dom-schema> <css-schema> [--title <title>] [--unsandboxed]");
      console.log("  site add-file <subdomain> <file> [--title <title>] [--content-type <type>] [--csp <policy>]");
      console.log("  site add-route <subdomain> <route> <html> <css> [--title <title>] [--csp <policy>] [--head <file>]");
      console.log("  site list                     List sites");
      console.log("  site remove <subdomain>       Remove a site");
    },

    exit() { stopServer(); exit(0); },
    quit() { stopServer(); exit(0); },
    q() { stopServer(); exit(0); },

    async "server start"(args) {
      const opts = parseServerOpts(args);
      if (dataDir) opts.dataDir = dataDir;
      if (dbPath) opts.dbPath = dbPath;
      if (blocking) {
        await runServer(opts);
      } else {
        await startServer(opts);
      }
    },

    "server stop"() {
      stopServer();
    },

    "server status"() {
      console.log(isRunning() ? "Server is running" : "Server is not running");
    },

    "schema add"(args) {
      const [name, path] = args;
      if (!name || !path) {
        console.log("Usage: schema add <name> <json>");
        return;
      }
      const json = readText(path);
      JSON.parse(json);
      withDb((db) => {
        db.prepare("INSERT OR REPLACE INTO schemas VALUES (?, ?)").run(name, json);
      }, dbOptions);
      console.log(`Added schema: ${name}`);
    },

    "schema list"() {
      const rows = withDb((db) => db.prepare("SELECT name FROM schemas ORDER BY name").all(), dbOptions);
      if (rows.length === 0) {
        console.log("No schemas configured");
        return;
      }
      for (const row of rows) console.log(`  ${row.name}`);
    },

    "font add"(args) {
      const { opts, positional } = parseFontOpts(args);
      const [name, assetPath, path] = positional;
      if (!name || !assetPath || !path) {
        console.log("Usage: font add <name> <asset-path> <file> [--mime <type>] [--provider <name>] [--source-url <url>]");
        return;
      }
      const content = readFileSync(path);
      const result = withDb((db) => putFontAsset(db, {
        name,
        assetPath,
        content,
        mimeType: opts.mimeType,
        provider: opts.provider,
        sourceUrl: opts.sourceUrl,
      }), dbOptions);
      console.log(`Added font asset: /-/fonts/${result.name}/${result.assetPath}`);
      console.log(`  sha256 ${result.sha256}`);
    },

    "site add"(args) {
      const [subdomain, directory] = args;
      if (!subdomain || !directory) {
        console.log("Usage: site add <subdomain> <directory>");
        return;
      }
      withDb((db) => {
        db.prepare("INSERT OR REPLACE INTO sites VALUES (?, ?)").run(subdomain, directory);
      }, dbOptions);
      console.log(`Added site: ${subdomain} -> ${directory}`);
    },

    "site list"() {
      const rows = withDb((db) => [
        ...db.prepare("SELECT subdomain, 'directory' AS kind, directory, NULL AS sandboxed FROM sites").all(),
        ...db.prepare("SELECT subdomain, 'page' AS kind, NULL AS directory, sandboxed FROM site_pages").all(),
        ...db.prepare("SELECT subdomain, 'raw site' AS kind, file_path AS directory, NULL AS sandboxed FROM site_files").all(),
        ...db.prepare("SELECT DISTINCT subdomain, 'routes' AS kind, NULL AS directory, NULL AS sandboxed FROM site_routes").all(),
      ], dbOptions);
      if (rows.length === 0) {
        console.log("No sites configured");
        return;
      }
      for (const row of rows) {
        if (row.kind === "page") {
          console.log(`  ${row.subdomain} -> sqlite page (${row.sandboxed ? "sandboxed" : "unsandboxed"})`);
        } else if (row.kind === "raw site") {
          console.log(`  ${row.subdomain} -> raw site ${row.directory}`);
        } else if (row.kind === "routes") {
          console.log(`  ${row.subdomain} -> sqlite routes`);
        } else {
          console.log(`  ${row.subdomain} -> ${row.directory}`);
        }
      }
    },

    "site add-page"(args) {
      const { opts, positional } = parsePageOpts(args);
      const [subdomain, htmlPath, cssPath, domSchemaPath, cssSchemaPath] = positional;
      if (!subdomain || !htmlPath || !cssPath || !domSchemaPath || !cssSchemaPath) {
        console.log("Usage: site add-page <subdomain> <html> <css> <dom-schema> <css-schema> [--title <title>] [--unsandboxed]");
        return;
      }

      const html = readText(htmlPath);
      const css = readText(cssPath);
      const domSchema = readSchemaArg(domSchemaPath);
      const cssSchema = readSchemaArg(cssSchemaPath);

      withDb((db) => {
        db.prepare(`
          INSERT OR REPLACE INTO site_pages
            (subdomain, title, html, css, dom_schema_json, css_schema_json, sandboxed)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(subdomain, opts.title || subdomain, html, css, domSchema, cssSchema, opts.sandboxed ? 1 : 0);
      }, dbOptions);
      console.log(`Added SQLite page: ${subdomain} (${opts.sandboxed ? "sandboxed" : "unsandboxed"})`);
    },

    "site add-file"(args) {
      const { opts, positional } = parseFileSiteOpts(args);
      const [subdomain, filePath] = positional;
      if (!subdomain || !filePath) {
        console.log("Usage: site add-file <subdomain> <file> [--title <title>] [--content-type <type>] [--csp <policy>]");
        return;
      }

      withDb((db) => {
        db.prepare(`
          INSERT OR REPLACE INTO site_files
            (subdomain, title, file_path, content_type, csp)
          VALUES (?, ?, ?, ?, ?)
        `).run(subdomain, opts.title || subdomain, filePath, opts.contentType, opts.csp);
      }, dbOptions);
      console.log(`Added raw site: ${subdomain} -> ${filePath}`);
    },

    "site add-route"(args) {
      const { opts, positional } = parseRouteOpts(args);
      const [subdomain, routePath, htmlPath, cssPath] = positional;
      if (!subdomain || !routePath || !htmlPath || !cssPath) {
        console.log("Usage: site add-route <subdomain> <route> <html> <css> [--title <title>] [--csp <policy>] [--head <file>]");
        return;
      }

      const html = readText(htmlPath);
      const css = readText(cssPath);
      const head = opts.headPath ? readText(opts.headPath) : "";

      const route = withDb((db) => putSiteRoute(db, {
        subdomain,
        path: routePath,
        title: opts.title || subdomain,
        html,
        css,
        head,
        csp: opts.csp,
      }), dbOptions);
      console.log(`Added SQLite route: ${route.subdomain}${route.path}`);
    },

    "site remove"(args) {
      const [subdomain] = args;
      if (!subdomain) {
        console.log("Usage: site remove <subdomain>");
        return;
      }
      withDb((db) => {
        db.prepare("DELETE FROM sites WHERE subdomain = ?").run(subdomain);
        db.prepare("DELETE FROM site_pages WHERE subdomain = ?").run(subdomain);
        db.prepare("DELETE FROM site_files WHERE subdomain = ?").run(subdomain);
        deleteSiteRoutes(db, subdomain);
      }, dbOptions);
      console.log(`Removed site: ${subdomain}`);
    },
  };
}
