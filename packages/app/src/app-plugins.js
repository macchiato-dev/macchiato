import { join, resolve } from "node:path";
import { addFileSiteIfMissing, listAppConfigRows, upsertAppConfig } from "@macchiato-dev/app-db-sqlite";
import { seedResourcesSite } from "../../../examples/resources-site/seed.js";
import { BUILTIN_APPS } from "./builtin-apps.js";
import { packageBrowserHandler } from "./package-browser.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);

const handlerNames = new Map();
const handlers = new Map([["package-browser", packageBrowserHandler]]);

for (const app of BUILTIN_APPS) {
  if (!app.handler) continue;
  const name = `code:${app.subdomain}`;
  handlerNames.set(app.subdomain, name);
  handlers.set(name, app.handler);
}

function declarationForBuiltin(app) {
  const handler = app.subdomain === "apps"
    ? "app-directory"
    : app.subdomain === "resources-co"
      ? "sqlite-routes"
      : handlerNames.get(app.subdomain);
  const { aliases, setup, seededRoute, fileAccess, sourceFiles, schemas, sandbox, site, adapter, ...base } = app;
  return {
    ...base,
    handler,
    permissions: sandbox ? {
      sandbox: sandbox.runtime,
      capabilities: sandbox.hostCapabilities || [],
    } : {},
    access: fileAccess ? {
      fileAccess: {
        ...fileAccess,
        gitRoot: fileAccess.gitRoot === repoRoot ? "$repo" : fileAccess.gitRoot,
      },
    } : {},
    options: {
      aliases: aliases || [],
      sourceFiles: sourceFiles || [],
      schemas: schemas || [],
      site,
      adapter,
    },
  };
}

const apps = Object.fromEntries(BUILTIN_APPS.map((app) => [
  app.subdomain,
  {
    declaration: declarationForBuiltin(app),
    setup: app.subdomain === "resources-co" ? seedResourcesSite : app.setup,
    dependencies: app.subdomain === "resources-edge" ? ["resources-co"] : [],
  },
]));

apps.packages = {
  declaration: {
    name: "Packages",
    subdomain: "packages",
    kind: "sandboxed browser",
    description: "Browse package files granted by git-aware app configuration.",
    handler: "package-browser",
    permissions: { sandbox: "QuickJS WASM", capabilities: ["git-visible file read"] },
    access: { fileAccess: { type: "git", gitRoot: "$repo", root: "packages" } },
    options: { sourceFiles: ["packages/app/src/package-browser.js"] },
  },
  dependencies: [],
};

apps["resources-design"] = {
  declaration: {
    name: "Resources.co Design",
    subdomain: "resources-design",
    kind: "raw site",
    description: "Original Resources.co design reference.",
    handler: "raw-file",
    permissions: {},
    access: {},
    options: {
      file: "resourcesco-standalone-20260617.html",
      contentType: "text/html; charset=utf-8",
    },
  },
  setup(db, { subdomain }) {
    addFileSiteIfMissing(db, {
      subdomain,
      title: "Resources.co Design",
      filePath: join(repoRoot, "resourcesco-standalone-20260617.html"),
      contentType: "text/html; charset=utf-8",
    });
  },
  dependencies: [],
};

export const APP_PLUGIN_PRESETS = {
  core: ["apps"],
  development: [...Object.keys(apps)],
};

export function resolveAppHandler(name) {
  return handlers.get(name);
}

export function appPluginIds() {
  return Object.keys(apps).sort();
}

function expandPluginNames(names) {
  const expanded = [];
  for (const name of names) {
    const entries = APP_PLUGIN_PRESETS[name] || [name];
    for (const entry of entries) if (!expanded.includes(entry)) expanded.push(entry);
  }
  return expanded;
}

export function installAppPlugins(db, names, { mappings = {} } = {}) {
  const installed = [];
  const visiting = new Set();

  function install(id) {
    if (installed.includes(id)) return;
    if (visiting.has(id)) throw new Error(`Circular app dependency: ${[...visiting, id].join(" -> ")}`);
    const plugin = apps[id];
    if (!plugin) throw new Error(`Unknown app plugin: ${id}`);
    visiting.add(id);
    for (const dependency of plugin.dependencies || []) install(dependency);
    visiting.delete(id);

    const subdomain = mappings[id] || plugin.declaration.subdomain || id;
    const dependencies = Object.fromEntries(
      (plugin.dependencies || []).map((dependency) => [dependency, mappings[dependency] || apps[dependency].declaration.subdomain || dependency]),
    );
    plugin.setup?.(db, { subdomain, dependencies });
    upsertAppConfig(db, {
      ...plugin.declaration,
      subdomain,
      options: {
        ...plugin.declaration.options,
        plugin: id,
        dependencies,
      },
    });
    installed.push(id);
  }

  for (const id of expandPluginNames(names)) install(id);
  return installed;
}

export function initializeAppsIfEmpty(db, names = ["core"], options) {
  if (listAppConfigRows(db).length > 0) return [];
  return installAppPlugins(db, names, options);
}

export { repoRoot };
