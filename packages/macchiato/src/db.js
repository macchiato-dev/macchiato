import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { initFontCache } from "@macchiato-dev/font-use";

function getHomeDir() {
  if ("Deno" in globalThis) {
    return globalThis.Deno.env.get("HOME") || globalThis.Deno.env.get("USERPROFILE") || "";
  }
  return process.env.HOME || process.env.USERPROFILE || "";
}

export function getDbPath() {
  const home = getHomeDir();
  return join(home, ".macchiato", "default", "macchiato.sqlite3");
}

export function getDbPathForOptions(options = {}) {
  if (options.dbPath) return options.dbPath;
  if (options.dataDir) return join(options.dataDir, "macchiato.sqlite3");
  return getDbPath();
}

export function withDb(fn, options = {}) {
  const dbPath = getDbPathForOptions(options);
  mkdirSync(dirname(dbPath), { recursive: true });
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
  initFontCache(db);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}
