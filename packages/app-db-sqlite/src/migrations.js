import { initFontCache } from "@macchiato-dev/font-use";
import { initSiteDb } from "@macchiato-dev/site";
import { querySql, schemaSql } from "./sql.js";

export const APP_DB_SQLITE_VERSION = 1;

export const migrations = [
  {
    version: 1,
    name: "create initial app database tables",
    up(db) {
      db.exec(schemaSql.sites);
      db.exec(schemaSql.schemas);
      db.exec(schemaSql.sitePages);
      db.exec(schemaSql.siteFiles);
      db.exec(schemaSql.appConfigs);
      initFontCache(db);
      initSiteDb(db);
    },
  },
];

export function migrateAppDb(db) {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(schemaSql.migrations);

  const applied = new Set(
    db.prepare(querySql.migrations.listVersions).all().map((row) => row.version),
  );
  const insert = db.prepare(querySql.migrations.insertIfMissing);

  db.exec("BEGIN");
  try {
    for (const migration of migrations) {
      if (applied.has(migration.version)) continue;
      migration.up(db);
      insert.run(migration.version, migration.name);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function appDbVersion(db) {
  db.exec(schemaSql.migrations);
  const row = db.prepare(querySql.migrations.currentVersion).get();
  return row?.version || 0;
}
