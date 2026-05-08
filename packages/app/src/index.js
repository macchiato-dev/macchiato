#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { sandboxHandler } from "@macchiato-dev/quickjs-emscripten-sandbox/handler";

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

const getSite = db.prepare("SELECT directory FROM sites WHERE subdomain = ?");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSubdomain(hostHeader) {
  const name = hostHeader.split(":")[0];
  return name.split(".")[0] || "default";
}

async function serveIndex(directory) {
  const filePath = directory.endsWith("/") ? directory + "index.html" : directory + "/index.html";
  try {
    const content = await readFile(filePath);
    return new Response(content, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function route(request) {
  const hostHeader = request.headers.get("host") || "localhost";
  const subdomain = getSubdomain(hostHeader);

  if (subdomain === "macchiato-quickjs-emscripten-sandbox") {
    return sandboxHandler(request);
  }

  const row = getSite.get(subdomain);
  if (row) {
    return serveIndex(row.directory);
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
