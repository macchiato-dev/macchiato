import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { join, dirname } from "node:path";

const HTML = await readFile(new URL("./index.html", import.meta.url), "utf-8");

function getHomeDir() {
  if ("Deno" in globalThis) {
    return globalThis.Deno.env.get("HOME") || globalThis.Deno.env.get("USERPROFILE") || "";
  }
  return process.env.HOME || process.env.USERPROFILE || "";
}

function withDb(fn) {
  const home = getHomeDir();
  const dbPath = join(home, ".macchiato", "default", "macchiato.sqlite3");
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("CREATE TABLE IF NOT EXISTS sites (subdomain TEXT PRIMARY KEY, directory TEXT NOT NULL)");
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export async function dashboardHandler(request) {
  const url = new URL(request.url);

  if (url.pathname === "/api/sites") {
    if (request.method === "GET") {
      const rows = withDb((db) => db.prepare("SELECT subdomain, directory FROM sites").all());
      return Response.json(rows);
    }
    if (request.method === "POST") {
      const { subdomain, directory } = await request.json();
      if (!subdomain || !directory) {
        return new Response("Bad request", { status: 400 });
      }
      withDb((db) => {
        db.prepare("INSERT OR REPLACE INTO sites VALUES (?, ?)").run(subdomain, directory);
      });
      return new Response("OK", { status: 201 });
    }
    if (request.method === "DELETE") {
      const { subdomain } = await request.json();
      if (!subdomain) {
        return new Response("Bad request", { status: 400 });
      }
      withDb((db) => {
        db.prepare("DELETE FROM sites WHERE subdomain = ?").run(subdomain);
      });
      return new Response("OK", { status: 200 });
    }
    return new Response("Method not allowed", { status: 405 });
  }

  if (url.pathname === "/") {
    return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  return new Response("Not found", { status: 404 });
}
