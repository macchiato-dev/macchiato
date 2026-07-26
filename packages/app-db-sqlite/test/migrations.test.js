import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  addAppConfigIfMissing,
  addDirectorySite,
  appDbVersion,
  createSqliteStore,
  initSqliteStore,
  listConfiguredSites,
} from "../src/index.js";

function tableNames(db) {
  return new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
}

test("linear migrations initialize an isolated app sqlite database", async () => {
  const dir = await mkdtemp(join(tmpdir(), "macchiato-app-db-"));
  const dbPath = join(dir, "macchiato.sqlite3");
  const db = new DatabaseSync(dbPath);

  try {
    initSqliteStore(db);
    assert.equal(appDbVersion(db), 2);

    const tables = tableNames(db);
    for (const name of ["app_db_migrations", "sites", "schemas", "site_pages", "site_files", "app_configs", "app_environment", "site_routes", "font_assets"]) {
      assert.equal(tables.has(name), true, `${name} table exists`);
    }

    addDirectorySite(db, "docs", "/tmp/docs");
    addAppConfigIfMissing(db, {
      subdomain: "packages",
      name: "Packages",
      kind: "sandboxed browser",
      description: "Test app",
      handler: "package-browser",
      permissions: { sandbox: "QuickJS WASM", capabilities: ["git-visible file read"] },
      access: { fileAccess: { type: "git", gitRoot: "$repo", root: "packages" } },
      options: {},
    });

    const store = createSqliteStore(db);
    assert.equal(store.getDirectorySite.get("docs").directory, "/tmp/docs");
    assert.ok(listConfiguredSites(db).some((site) => site.subdomain === "docs"));

    initSqliteStore(db);
    assert.equal(appDbVersion(db), 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM app_db_migrations").get().count, 2);
  } finally {
    db.close();
    await rm(dir, { recursive: true, force: true });
  }
});
