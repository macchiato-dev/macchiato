import { resolve } from "node:path";
import {
  addAppConfigIfMissing,
  getAppConfigRow,
  initSqliteStore,
  listVisibleAppConfigRows,
} from "@macchiato-dev/app-db-sqlite";
import { packageBrowserHandler } from "./package-browser.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);

const HANDLERS = {
  "package-browser": packageBrowserHandler,
};

const APP_TYPES = {
  "package-browser": {
    kind: "sandboxed browser",
    permissions: {
      sandbox: ["QuickJS WASM"],
      capabilities: ["git-visible file read"],
    },
    access: {
      fileAccess: {
        type: ["git"],
        gitRoot: ["$repo"],
        rootPattern: /^[A-Za-z0-9._/-]+$/,
      },
    },
  },
};

const SEEDED_APPS = [
  {
    name: "Packages",
    subdomain: "packages",
    kind: "sandboxed browser",
    description: "Browse package files granted by git-aware app configuration.",
    handler: "package-browser",
    permissions: {
      sandbox: "QuickJS WASM",
      capabilities: ["git-visible file read"],
    },
    access: {
      fileAccess: {
        type: "git",
        gitRoot: "$repo",
        root: "packages",
      },
    },
    options: {
      sourceFiles: [
        "packages/app/src/package-browser.js",
      ],
    },
  },
];

export function seedDeclarativeApps(db) {
  initSqliteStore(db);
  for (const app of SEEDED_APPS) {
    addAppConfigIfMissing(db, app);
  }
}

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertNoUnknownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label} contains unsupported key: ${key}`);
  }
}

function validateDeclarativeAppConfig(config) {
  const type = APP_TYPES[config.handler];
  if (!type || !HANDLERS[config.handler]) throw new Error(`Unsupported app handler: ${config.handler}`);
  if (config.kind !== type.kind) throw new Error(`Invalid kind for ${config.handler}: ${config.kind}`);

  assertPlainObject(config.permissions, "permissions");
  assertPlainObject(config.access, "access");
  assertPlainObject(config.options, "options");
  assertNoUnknownKeys(config.permissions, ["sandbox", "capabilities"], "permissions");
  assertNoUnknownKeys(config.access, ["fileAccess"], "access");
  assertNoUnknownKeys(config.options, ["sourceFiles"], "options");

  if (!type.permissions.sandbox.includes(config.permissions.sandbox)) {
    throw new Error(`Unsupported sandbox for ${config.handler}: ${config.permissions.sandbox}`);
  }

  const capabilities = config.permissions.capabilities || [];
  if (!Array.isArray(capabilities)) throw new Error("permissions.capabilities must be an array.");
  for (const capability of capabilities) {
    if (!type.permissions.capabilities.includes(capability)) {
      throw new Error(`Unsupported capability for ${config.handler}: ${capability}`);
    }
  }

  assertPlainObject(config.access.fileAccess, "access.fileAccess");
  assertNoUnknownKeys(config.access.fileAccess, ["type", "gitRoot", "root"], "access.fileAccess");
  if (!type.access.fileAccess.type.includes(config.access.fileAccess.type)) {
    throw new Error(`Unsupported file access type: ${config.access.fileAccess.type}`);
  }
  if (!type.access.fileAccess.gitRoot.includes(config.access.fileAccess.gitRoot)) {
    throw new Error(`Unsupported git root token: ${config.access.fileAccess.gitRoot}`);
  }
  if (
    typeof config.access.fileAccess.root !== "string" ||
    !config.access.fileAccess.root ||
    config.access.fileAccess.root.startsWith("/") ||
    config.access.fileAccess.root.includes("..") ||
    config.access.fileAccess.root.includes("\\") ||
    !type.access.fileAccess.rootPattern.test(config.access.fileAccess.root)
  ) {
    throw new Error(`Invalid file access root: ${config.access.fileAccess.root}`);
  }

  if (!Array.isArray(config.options.sourceFiles || [])) throw new Error("options.sourceFiles must be an array.");
  for (const file of config.options.sourceFiles || []) {
    if (typeof file !== "string" || file.startsWith("/") || file.includes("..") || file.includes("\\")) {
      throw new Error(`Invalid source file: ${file}`);
    }
  }
}

function resolveRepoToken(value) {
  return value === "$repo" ? repoRoot : value;
}

function resolveAccess(access) {
  const resolved = { ...access };
  if (resolved.fileAccess) {
    resolved.fileAccess = {
      ...resolved.fileAccess,
      gitRoot: resolveRepoToken(resolved.fileAccess.gitRoot),
    };
  }
  return resolved;
}

export function declarativeAppFromRow(row) {
  if (!row) return null;
  const handler = HANDLERS[row.handler];
  if (!handler) return null;
  const permissions = parseJson(row.permissions_json);
  const access = parseJson(row.access_json);
  const options = parseJson(row.options_json);
  validateDeclarativeAppConfig({
    kind: row.kind,
    handler: row.handler,
    permissions,
    access,
    options,
  });
  const resolvedAccess = resolveAccess(access);
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
    directory: Boolean(row.directory),
    fileAccess: resolvedAccess.fileAccess,
    sourceFiles: options.sourceFiles || [],
    sandbox: permissions.sandbox ? {
      runtime: permissions.sandbox,
      hostCapabilities: permissions.capabilities || [],
    } : undefined,
    declarative: true,
  };
}

export function getDeclarativeApp(db, subdomain) {
  if (!db) return null;
  return declarativeAppFromRow(getAppConfigRow(db, subdomain));
}

export function visibleDeclarativeApps(db) {
  if (!db) return [];
  return listVisibleAppConfigRows(db).map(declarativeAppFromRow).filter(Boolean);
}
