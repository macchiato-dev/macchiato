export function table(name) {
  return {
    name,
    select(columns = "*") {
      return selectFrom(name, columns);
    },
    insertOrReplace(columns) {
      return insertInto(name, columns, { conflict: "OR REPLACE" });
    },
    insertOrIgnore(columns) {
      return insertInto(name, columns, { conflict: "OR IGNORE" });
    },
    deleteWhere(where) {
      return `DELETE FROM ${name} ${where}`;
    },
  };
}

export function selectFrom(name, columns = "*") {
  const selected = Array.isArray(columns) ? columns.join(", ") : columns;
  return `SELECT ${selected} FROM ${name}`;
}

export function insertInto(name, columns, { conflict = "" } = {}) {
  const names = columns.join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const conflictSql = conflict ? ` ${conflict}` : "";
  return `INSERT${conflictSql} INTO ${name} (${names}) VALUES (${placeholders})`;
}

export function whereEquals(column) {
  return `WHERE ${column} = ?`;
}

export function orderBy(column) {
  return `ORDER BY ${column}`;
}

export function distinct(columns) {
  return `DISTINCT ${columns}`;
}

export const tables = {
  migrations: table("app_db_migrations"),
  sites: table("sites"),
  schemas: table("schemas"),
  sitePages: table("site_pages"),
  siteFiles: table("site_files"),
  appConfigs: table("app_configs"),
  siteRoutes: table("site_routes"),
};

export const where = {
  subdomain: whereEquals("subdomain"),
  name: whereEquals("name"),
};

export const schemaSql = {
  migrations: `
    CREATE TABLE IF NOT EXISTS app_db_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  sites: `
    CREATE TABLE IF NOT EXISTS sites (
      subdomain TEXT PRIMARY KEY,
      directory TEXT NOT NULL
    )
  `,
  schemas: `
    CREATE TABLE IF NOT EXISTS schemas (
      name TEXT PRIMARY KEY,
      json TEXT NOT NULL
    )
  `,
  sitePages: `
    CREATE TABLE IF NOT EXISTS site_pages (
      subdomain TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      html TEXT NOT NULL,
      css TEXT NOT NULL DEFAULT '',
      dom_schema_json TEXT NOT NULL,
      css_schema_json TEXT NOT NULL,
      sandboxed INTEGER NOT NULL DEFAULT 1
    )
  `,
  siteFiles: `
    CREATE TABLE IF NOT EXISTS site_files (
      subdomain TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      file_path TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT '',
      csp TEXT NOT NULL DEFAULT ''
    )
  `,
  appConfigs: `
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
  `,
};

export const querySql = {
  migrations: {
    listVersions: tables.migrations.select("version"),
    insertIfMissing: tables.migrations.insertOrIgnore(["version", "name"]),
    currentVersion: "SELECT MAX(version) AS version FROM app_db_migrations",
  },
  serverLookups: {
    directorySiteBySubdomain: `${tables.sites.select("directory")} ${where.subdomain}`,
    schemaByName: `${tables.schemas.select("json")} ${where.name}`,
    pageBySubdomain: `${tables.sitePages.select("subdomain, title, html, css, dom_schema_json, css_schema_json, sandboxed")} ${where.subdomain}`,
    fileBySubdomain: `${tables.siteFiles.select("subdomain, title, file_path AS path, content_type AS contentType, csp")} ${where.subdomain}`,
  },
  schemaRows: {
    upsert: tables.schemas.insertOrReplace(["name", "json"]),
    list: `${tables.schemas.select("name")} ${orderBy("name")}`,
  },
  siteWrites: {
    upsertDirectory: tables.sites.insertOrReplace(["subdomain", "directory"]),
    upsertPage: tables.sitePages.insertOrReplace(["subdomain", "title", "html", "css", "dom_schema_json", "css_schema_json", "sandboxed"]),
    upsertFile: tables.siteFiles.insertOrReplace(["subdomain", "title", "file_path", "content_type", "csp"]),
    insertFileIfMissing: tables.siteFiles.insertOrIgnore(["subdomain", "title", "file_path", "content_type", "csp"]),
  },
  appConfigs: {
    insertIfMissing: tables.appConfigs.insertOrIgnore(["subdomain", "name", "kind", "description", "handler", "permissions_json", "access_json", "options_json", "directory"]),
    getBySubdomain: `${tables.appConfigs.select("subdomain, name, kind, description, handler, permissions_json, access_json, options_json, directory")} ${where.subdomain}`,
    listVisible: `${tables.appConfigs.select("subdomain, name, kind, description, handler, permissions_json, access_json, options_json, directory")} WHERE directory != 0 ${orderBy("subdomain")}`,
  },
  siteLists: {
    configuredDirectories: tables.sites.select("subdomain, 'directory' AS kind, directory, NULL AS sandboxed"),
    configuredPages: tables.sitePages.select("subdomain, 'page' AS kind, NULL AS directory, sandboxed"),
    configuredRawFiles: tables.siteFiles.select("subdomain, 'raw site' AS kind, file_path AS directory, NULL AS sandboxed"),
    configuredRoutes: tables.siteRoutes.select(`${distinct("subdomain")}, 'routes' AS kind, NULL AS directory, NULL AS sandboxed`),
    directoryRows: tables.sites.select("subdomain, subdomain AS title, 'directory site' AS kind, directory AS source"),
    pageRows: tables.sitePages.select("subdomain, title, 'sqlite page' AS kind, 'site_pages' AS source"),
    rawFileRows: tables.siteFiles.select("subdomain, title, 'raw site' AS kind, file_path AS source"),
    routeRows: tables.siteRoutes.select(`${distinct("subdomain")}, subdomain AS title, 'sqlite routes' AS kind, 'site_routes' AS source`),
  },
  siteConfig: {
    rawFile: `${tables.siteFiles.select("subdomain, title, file_path AS filePath, content_type AS contentType, csp")} ${where.subdomain}`,
    page: `${tables.sitePages.select("subdomain, title, sandboxed")} ${where.subdomain}`,
    route: `${tables.siteRoutes.select(distinct("subdomain"))} ${where.subdomain}`,
    directory: `${tables.sites.select("subdomain, directory")} ${where.subdomain}`,
  },
  siteRemoval: {
    directory: tables.sites.deleteWhere(where.subdomain),
    page: tables.sitePages.deleteWhere(where.subdomain),
    file: tables.siteFiles.deleteWhere(where.subdomain),
  },
};
