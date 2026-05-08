import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

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

export function withDb(fn) {
  const dbPath = getDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("CREATE TABLE IF NOT EXISTS sites (subdomain TEXT PRIMARY KEY, directory TEXT NOT NULL)");
  try {
    return fn(db);
  } finally {
    db.close();
  }
}
