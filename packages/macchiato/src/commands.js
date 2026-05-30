import { startServer, stopServer, runServer, isRunning } from "./server.js";
import { withDb } from "./db.js";
import { readFileSync } from "node:fs";

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

function readText(path) {
  return readFileSync(path, "utf-8");
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

export function createCommands({ blocking = false } = {}) {
  return {
    help() {
      console.log("Commands:");
      console.log("  help                          Show this help");
      console.log("  exit, quit, q                 Exit the shell");
      console.log("  server start [opts]           Start the HTTP server");
      console.log("  server stop                   Stop the HTTP server");
      console.log("  server status                 Check server status");
      console.log("  schema add <name> <json>      Add a named schema");
      console.log("  schema list                   List named schemas");
      console.log("  site add <subdomain> <dir>    Add a site");
      console.log("  site add-page <subdomain> <html> <css> <dom-schema> <css-schema> [--title <title>] [--unsandboxed]");
      console.log("  site list                     List sites");
      console.log("  site remove <subdomain>       Remove a site");
    },

    exit() { stopServer(); exit(0); },
    quit() { stopServer(); exit(0); },
    q() { stopServer(); exit(0); },

    async "server start"(args) {
      const opts = parseServerOpts(args);
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
      });
      console.log(`Added schema: ${name}`);
    },

    "schema list"() {
      const rows = withDb((db) => db.prepare("SELECT name FROM schemas ORDER BY name").all());
      if (rows.length === 0) {
        console.log("No schemas configured");
        return;
      }
      for (const row of rows) console.log(`  ${row.name}`);
    },

    "site add"(args) {
      const [subdomain, directory] = args;
      if (!subdomain || !directory) {
        console.log("Usage: site add <subdomain> <directory>");
        return;
      }
      withDb((db) => {
        db.prepare("INSERT OR REPLACE INTO sites VALUES (?, ?)").run(subdomain, directory);
      });
      console.log(`Added site: ${subdomain} -> ${directory}`);
    },

    "site list"() {
      const rows = withDb((db) => [
        ...db.prepare("SELECT subdomain, 'directory' AS kind, directory, NULL AS sandboxed FROM sites").all(),
        ...db.prepare("SELECT subdomain, 'page' AS kind, NULL AS directory, sandboxed FROM site_pages").all(),
      ]);
      if (rows.length === 0) {
        console.log("No sites configured");
        return;
      }
      for (const row of rows) {
        if (row.kind === "page") {
          console.log(`  ${row.subdomain} -> sqlite page (${row.sandboxed ? "sandboxed" : "unsandboxed"})`);
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
      });
      console.log(`Added SQLite page: ${subdomain} (${opts.sandboxed ? "sandboxed" : "unsandboxed"})`);
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
      });
      console.log(`Removed site: ${subdomain}`);
    },
  };
}
