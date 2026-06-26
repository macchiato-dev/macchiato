import { initFontCache } from "@macchiato-dev/font-use";
import { initSiteDb } from "@macchiato-dev/site";

const statementCaches = new WeakMap();

// Statement cache
export function cachedStatement(db, text) {
  let cache = statementCaches.get(db);
  if (!cache) {
    cache = new Map();
    statementCaches.set(db, cache);
  }
  let statement = cache.get(text);
  if (!statement) {
    statement = db.prepare(text);
    cache.set(text, statement);
  }
  return statement;
}

// Schema initialization
export function initSqliteStore(db) {
  db.exec("PRAGMA journal_mode = WAL");
  initCoreSiteTables(db);
  initDeclarativeAppsDb(db);
  initFontCache(db);
  initSiteDb(db);
}

export function initCoreSiteTables(db) {
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_files (
      subdomain TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      file_path TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT '',
      csp TEXT NOT NULL DEFAULT ''
    )
  `);
}

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

// Server lookup statements
export function createSqliteStore(db) {
  return {
    getDirectorySite: cachedStatement(db, "SELECT directory FROM sites WHERE subdomain = ?"),
    getSchema: cachedStatement(db, "SELECT json FROM schemas WHERE name = ?"),
    getSitePage: cachedStatement(db, `
      SELECT subdomain, title, html, css, dom_schema_json, css_schema_json, sandboxed
      FROM site_pages
      WHERE subdomain = ?
    `),
    getSiteFile: cachedStatement(db, `
      SELECT subdomain, title, file_path AS path, content_type AS contentType, csp
      FROM site_files
      WHERE subdomain = ?
    `),
  };
}

// Schema rows
export function addSchema(db, name, json) {
  cachedStatement(db, "INSERT OR REPLACE INTO schemas VALUES (?, ?)").run(name, json);
}

export function listSchemas(db) {
  return cachedStatement(db, "SELECT name FROM schemas ORDER BY name").all();
}

// Site writes
export function addDirectorySite(db, subdomain, directory) {
  cachedStatement(db, "INSERT OR REPLACE INTO sites VALUES (?, ?)").run(subdomain, directory);
}

export function addPageSite(db, site) {
  cachedStatement(db, `
    INSERT OR REPLACE INTO site_pages
      (subdomain, title, html, css, dom_schema_json, css_schema_json, sandboxed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    site.subdomain,
    site.title || site.subdomain,
    site.html,
    site.css || "",
    site.domSchema,
    site.cssSchema,
    site.sandboxed ? 1 : 0,
  );
}

export function addFileSite(db, site) {
  cachedStatement(db, `
    INSERT OR REPLACE INTO site_files
      (subdomain, title, file_path, content_type, csp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    site.subdomain,
    site.title || site.subdomain,
    site.filePath,
    site.contentType || "",
    site.csp || "",
  );
}

export function addFileSiteIfMissing(db, site) {
  cachedStatement(db, `
    INSERT OR IGNORE INTO site_files
      (subdomain, title, file_path, content_type, csp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    site.subdomain,
    site.title || site.subdomain,
    site.filePath,
    site.contentType || "",
    site.csp || "",
  );
}

// Declarative app config rows
export function addAppConfigIfMissing(db, app) {
  cachedStatement(db, `
    INSERT OR IGNORE INTO app_configs
      (subdomain, name, kind, description, handler, permissions_json, access_json, options_json, directory)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    app.subdomain,
    app.name,
    app.kind,
    app.description,
    app.handler,
    JSON.stringify(app.permissions || {}),
    JSON.stringify(app.access || {}),
    JSON.stringify(app.options || {}),
    app.directory === false ? 0 : 1,
  );
}

export function getAppConfigRow(db, subdomain) {
  return cachedStatement(db, `
    SELECT subdomain, name, kind, description, handler, permissions_json, access_json, options_json, directory
    FROM app_configs
    WHERE subdomain = ?
  `).get(subdomain);
}

export function listVisibleAppConfigRows(db) {
  return cachedStatement(db, `
    SELECT subdomain, name, kind, description, handler, permissions_json, access_json, options_json, directory
    FROM app_configs
    WHERE directory != 0
    ORDER BY subdomain
  `).all();
}

// Site lists
export function listConfiguredSites(db) {
  return [
    ...cachedStatement(db, "SELECT subdomain, 'directory' AS kind, directory, NULL AS sandboxed FROM sites").all(),
    ...cachedStatement(db, "SELECT subdomain, 'page' AS kind, NULL AS directory, sandboxed FROM site_pages").all(),
    ...cachedStatement(db, "SELECT subdomain, 'raw site' AS kind, file_path AS directory, NULL AS sandboxed FROM site_files").all(),
    ...cachedStatement(db, "SELECT DISTINCT subdomain, 'routes' AS kind, NULL AS directory, NULL AS sandboxed FROM site_routes").all(),
  ];
}

export function listDirectoryRows(db) {
  return cachedStatement(db, "SELECT subdomain, subdomain AS title, 'directory site' AS kind, directory AS source FROM sites").all();
}

export function listPageRows(db) {
  return cachedStatement(db, "SELECT subdomain, title, 'sqlite page' AS kind, 'site_pages' AS source FROM site_pages").all();
}

export function listRawFileRows(db) {
  return cachedStatement(db, "SELECT subdomain, title, 'raw site' AS kind, file_path AS source FROM site_files").all();
}

export function listRouteRows(db) {
  return cachedStatement(db, "SELECT DISTINCT subdomain, subdomain AS title, 'sqlite routes' AS kind, 'site_routes' AS source FROM site_routes").all();
}

// Site config lookups
export function getRawFileConfig(db, subdomain) {
  return cachedStatement(db, "SELECT subdomain, title, file_path AS filePath, content_type AS contentType, csp FROM site_files WHERE subdomain = ?").get(subdomain);
}

export function getPageConfig(db, subdomain) {
  return cachedStatement(db, "SELECT subdomain, title, sandboxed FROM site_pages WHERE subdomain = ?").get(subdomain);
}

export function getRouteConfig(db, subdomain) {
  return cachedStatement(db, "SELECT DISTINCT subdomain FROM site_routes WHERE subdomain = ?").get(subdomain);
}

export function getDirectoryConfig(db, subdomain) {
  return cachedStatement(db, "SELECT subdomain, directory FROM sites WHERE subdomain = ?").get(subdomain);
}

// Site removal
export function removeConfiguredSite(db, subdomain) {
  cachedStatement(db, "DELETE FROM sites WHERE subdomain = ?").run(subdomain);
  cachedStatement(db, "DELETE FROM site_pages WHERE subdomain = ?").run(subdomain);
  cachedStatement(db, "DELETE FROM site_files WHERE subdomain = ?").run(subdomain);
}
