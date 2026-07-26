import { resolve } from "node:path";
import {
  getAppConfigRow,
  listAppConfigRows,
  listVisibleAppConfigRows,
  readAppEnvironment,
} from "@macchiato-dev/app-db-sqlite";
import { resolveAppHandler } from "./app-plugins.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const STORAGE_HANDLERS = new Set(["app-directory", "sqlite-routes", "sqlite-page", "raw-file", "directory"]);

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function safeRelativePath(value, label) {
  if (typeof value !== "string" || value.startsWith("/") || value.includes("..") || value.includes("\\")) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function validateConfig(config) {
  if (!STORAGE_HANDLERS.has(config.handler) && !resolveAppHandler(config.handler)) {
    throw new Error(`Unsupported app handler: ${config.handler}`);
  }
  assertObject(config.permissions, "permissions");
  assertObject(config.access, "access");
  assertObject(config.options, "options");
  if (config.options.sourceFiles !== undefined) {
    if (!Array.isArray(config.options.sourceFiles)) throw new Error("options.sourceFiles must be an array.");
    for (const file of config.options.sourceFiles) safeRelativePath(file, "source file");
  }
  if (config.options.dependencies !== undefined) {
    assertObject(config.options.dependencies, "options.dependencies");
    for (const subdomain of Object.values(config.options.dependencies)) safeRelativePath(subdomain, "dependency subdomain");
  }
  if (config.options.environment !== undefined) {
    assertObject(config.options.environment, "options.environment");
    for (const [name, declaration] of Object.entries(config.options.environment)) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new Error(`Invalid environment name: ${name}`);
      assertObject(declaration, `options.environment.${name}`);
      if (declaration.secret !== undefined && typeof declaration.secret !== "boolean") {
        throw new Error(`options.environment.${name}.secret must be boolean`);
      }
    }
  }
  if (config.access.fileAccess) {
    assertObject(config.access.fileAccess, "access.fileAccess");
    safeRelativePath(config.access.fileAccess.root, "file access root");
    if (config.access.fileAccess.gitRoot !== "$repo") throw new Error("Unsupported git root token.");
  }
}

function resolveAccess(access) {
  return access.fileAccess
    ? { ...access, fileAccess: { ...access.fileAccess, gitRoot: repoRoot } }
    : access;
}

export function declarativeAppFromRow(row, environment = {}) {
  if (!row) return null;
  const permissions = parseJson(row.permissions_json);
  const access = parseJson(row.access_json);
  const options = parseJson(row.options_json);
  validateConfig({ handler: row.handler, permissions, access, options });
  const handler = resolveAppHandler(row.handler);
  return {
    name: row.name,
    subdomain: row.subdomain,
    kind: row.kind,
    description: row.description,
    handlerName: row.handler,
    handler,
    permissions,
    access,
    options,
    environment,
    environmentSchema: options.environment || {},
    dependencies: options.dependencies || {},
    aliases: options.aliases || [],
    directory: Boolean(row.directory),
    fileAccess: resolveAccess(access).fileAccess,
    sourceFiles: options.sourceFiles || [],
    schemas: options.schemas || [],
    sandbox: permissions.sandbox ? {
      runtime: permissions.sandbox,
      hostCapabilities: permissions.capabilities || [],
    } : undefined,
    declarative: true,
  };
}

export function getDeclarativeApp(db, subdomain) {
  if (!db) return null;
  const direct = getAppConfigRow(db, subdomain);
  if (direct) return declarativeAppFromRow(direct, readAppEnvironment(db, direct.subdomain));
  return listAppConfigRows(db)
    .map(declarativeAppFromRow)
    .find((app) => app.aliases.includes(subdomain)) || null;
}

export function visibleDeclarativeApps(db) {
  if (!db) return [];
  return listVisibleAppConfigRows(db).map(declarativeAppFromRow);
}
