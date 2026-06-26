export function initDeclarativeAppsDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_configs (
      subdomain TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      handler TEXT NOT NULL,
      permissions_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(permissions_json)),
      access_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(access_json)),
      options_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(options_json)),
      directory INTEGER NOT NULL DEFAULT 1 CHECK (directory IN (0, 1))
    )
  `);
}
