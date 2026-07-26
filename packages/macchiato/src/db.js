import { DatabaseSync } from "node:sqlite";
import { chmodSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { initSqliteStore } from "@macchiato-dev/app-db-sqlite";

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
  mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  chmodSync(dirname(dbPath), 0o700);
  const db = new DatabaseSync(dbPath);
  chmodSync(dbPath, 0o600);
  initSqliteStore(db);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}
