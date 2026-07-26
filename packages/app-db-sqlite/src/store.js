import { migrateAppDb } from "./migrations.js";
import { querySql } from "./sql.js";

const statementCaches = new WeakMap();

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

export function initSqliteStore(db) {
  migrateAppDb(db);
}

export function createSqliteStore(db) {
  const { serverLookups } = querySql;
  return {
    getDirectorySite: cachedStatement(db, serverLookups.directorySiteBySubdomain),
    getSchema: cachedStatement(db, serverLookups.schemaByName),
    getSitePage: cachedStatement(db, serverLookups.pageBySubdomain),
    getSiteFile: cachedStatement(db, serverLookups.fileBySubdomain),
  };
}

export function addSchema(db, name, json) {
  cachedStatement(db, querySql.schemaRows.upsert).run(name, json);
}

export function listSchemas(db) {
  return cachedStatement(db, querySql.schemaRows.list).all();
}

export function addDirectorySite(db, subdomain, directory) {
  cachedStatement(db, querySql.siteWrites.upsertDirectory).run(subdomain, directory);
}

export function addPageSite(db, site) {
  cachedStatement(db, querySql.siteWrites.upsertPage).run(
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
  cachedStatement(db, querySql.siteWrites.upsertFile).run(...fileSiteValues(site));
}

export function addFileSiteIfMissing(db, site) {
  cachedStatement(db, querySql.siteWrites.insertFileIfMissing).run(...fileSiteValues(site));
}

function fileSiteValues(site) {
  return [
    site.subdomain,
    site.title || site.subdomain,
    site.filePath,
    site.contentType || "",
    site.csp || "",
  ];
}

export function addAppConfigIfMissing(db, app) {
  writeAppConfig(db, querySql.appConfigs.insertIfMissing, app);
}

export function upsertAppConfig(db, app) {
  writeAppConfig(db, querySql.appConfigs.upsert, app);
}

function writeAppConfig(db, query, app) {
  cachedStatement(db, query).run(
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
  return cachedStatement(db, querySql.appConfigs.getBySubdomain).get(subdomain);
}

export function listVisibleAppConfigRows(db) {
  return cachedStatement(db, querySql.appConfigs.listVisible).all();
}

export function listAppConfigRows(db) {
  return cachedStatement(db, querySql.appConfigs.list).all();
}

export function removeAppConfig(db, subdomain) {
  cachedStatement(db, querySql.appConfigs.remove).run(subdomain);
}

export function listConfiguredSites(db) {
  const { siteLists } = querySql;
  return [
    ...cachedStatement(db, siteLists.configuredDirectories).all(),
    ...cachedStatement(db, siteLists.configuredPages).all(),
    ...cachedStatement(db, siteLists.configuredRawFiles).all(),
    ...cachedStatement(db, siteLists.configuredRoutes).all(),
  ];
}

export function listDirectoryRows(db) {
  return cachedStatement(db, querySql.siteLists.directoryRows).all();
}

export function listPageRows(db) {
  return cachedStatement(db, querySql.siteLists.pageRows).all();
}

export function listRawFileRows(db) {
  return cachedStatement(db, querySql.siteLists.rawFileRows).all();
}

export function listRouteRows(db) {
  return cachedStatement(db, querySql.siteLists.routeRows).all();
}

export function getRawFileConfig(db, subdomain) {
  return cachedStatement(db, querySql.siteConfig.rawFile).get(subdomain);
}

export function getPageConfig(db, subdomain) {
  return cachedStatement(db, querySql.siteConfig.page).get(subdomain);
}

export function getRouteConfig(db, subdomain) {
  return cachedStatement(db, querySql.siteConfig.route).get(subdomain);
}

export function getDirectoryConfig(db, subdomain) {
  return cachedStatement(db, querySql.siteConfig.directory).get(subdomain);
}

export function removeConfiguredSite(db, subdomain) {
  const { siteRemoval } = querySql;
  cachedStatement(db, siteRemoval.directory).run(subdomain);
  cachedStatement(db, siteRemoval.page).run(subdomain);
  cachedStatement(db, siteRemoval.file).run(subdomain);
}
