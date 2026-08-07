import { startServer, stopServer, runServer, isRunning } from "./server.js";
import { withDb } from "./db.js";
import { readFileSync } from "node:fs";
import { putFontAsset } from "@macchiato-dev/font-use";
import { deleteSiteRoutes, putSiteRoute } from "@macchiato-dev/site";
import { appPluginIds, installAppPlugins } from "../../app/src/app-plugins.js";
import {
  addDirectorySite,
  addFileSite,
  addPageSite,
  addSchema,
  listConfiguredSites,
  listAppEnvironment,
  getAppConfigRow,
  removeAppEnvironmentValue,
  listSchemas,
  removeAppConfig,
  removeConfiguredSite,
  upsertAppConfig,
  setAppEnvironmentValue,
} from "@macchiato-dev/app-db-sqlite";

function registerSiteApp(db, subdomain, handler, kind, { access = {} } = {}) {
  upsertAppConfig(db, {
    subdomain,
    name: subdomain,
    kind,
    description: `Operator-configured ${kind}.`,
    handler,
    permissions: {},
    access,
    options: { plugin: "site-command", dependencies: {} },
  });
}

function parseServerOpts(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" || args[i] === "-p") opts.port = args[++i];
    else if (args[i] === "--host" || args[i] === "-b") opts.host = args[++i];
  }
  return opts;
}

function parsePageOpts(args) {
  const opts = {
    sandboxed: true,
    title: "",
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--title") opts.title = args[++i] ?? "";
    else if (arg === "--unsandboxed") opts.sandboxed = false;
    else if (arg === "--sandboxed") opts.sandboxed = true;
    else positional.push(arg);
  }
  return { opts, positional };
}

function parseRouteOpts(args) {
  const opts = {
    title: "",
    csp: "",
    headPath: "",
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--title") opts.title = args[++i] ?? "";
    else if (arg === "--csp") opts.csp = args[++i] ?? "";
    else if (arg === "--head") opts.headPath = args[++i] ?? "";
    else positional.push(arg);
  }
  return { opts, positional };
}

function parseFileSiteOpts(args) {
  const opts = {
    title: "",
    contentType: "",
    csp: "",
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--title") opts.title = args[++i] ?? "";
    else if (arg === "--content-type") opts.contentType = args[++i] ?? "";
    else if (arg === "--csp") opts.csp = args[++i] ?? "";
    else positional.push(arg);
  }
  return { opts, positional };
}

function readText(path) {
  return readFileSync(path, "utf-8");
}

function appEnvironmentDeclaration(row) {
  try {
    return JSON.parse(row?.options_json || "{}").environment || {};
  } catch {
    return {};
  }
}

function parseAppEnvironmentArgs(args) {
  const positional = [];
  let stdin = false;
  for (const arg of args) {
    if (arg === "--stdin") stdin = true;
    else positional.push(arg);
  }
  return { positional, stdin };
}

async function promptSecret(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error(`${label} requires an interactive terminal or --stdin`);
  }
  process.stdout.write(`${label}: `);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    function finish(error) {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }
    function onData(chunk) {
      for (const character of chunk) {
        if (character === "\u0003") return finish(new Error("Secret entry cancelled"));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
        } else if (character >= " ") {
          value += character;
        }
      }
    }
    process.stdin.on("data", onData);
  });
}

function parseAppInstallOpts(args) {
  const plugins = [];
  const mappings = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--map") {
      const value = args[++i] || "";
      const separator = value.indexOf("=");
      if (separator < 1) throw new Error(`Invalid --map: ${value}`);
      mappings[value.slice(0, separator)] = value.slice(separator + 1);
    } else {
      plugins.push(args[i]);
    }
  }
  return { plugins, mappings };
}

function parseFontOpts(args) {
  const opts = {
    mimeType: "font/woff2",
    provider: "self",
    sourceUrl: "",
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--mime") opts.mimeType = args[++i] ?? opts.mimeType;
    else if (arg === "--provider") opts.provider = args[++i] ?? opts.provider;
    else if (arg === "--source-url") opts.sourceUrl = args[++i] ?? opts.sourceUrl;
    else positional.push(arg);
  }
  return { opts, positional };
}

function readSchemaArg(value) {
  if (String(value).startsWith("@")) return value;
  const text = readText(value);
  JSON.parse(text);
  return text;
}

function exit(code = 0) {
  if ("Deno" in globalThis) globalThis.Deno.exit(code);
  else process.exit(code);
}

export function createCommands({ blocking = false, dataDir = "", dbPath = "" } = {}) {
  const dbOptions = { dataDir, dbPath };

  return {
    help() {
      console.log("Commands:");
      console.log("  help                          Show this help");
      console.log("  exit, quit, q                 Exit the shell");
      console.log("  --data-dir <dir>              Use a specific SQLite data directory");
      console.log("  --db <path>                   Use a specific SQLite database path");
      console.log("  server start [opts]           Start the HTTP server");
      console.log("  server stop                   Stop the HTTP server");
      console.log("  server status                 Check server status");
      console.log("  schema add <name> <json>      Add a named schema");
      console.log("  schema list                   List named schemas");
      console.log("  font add <name> <asset-path> <file> [--mime <type>] [--provider <name>] [--source-url <url>]");
      console.log("  app install <id|preset>... [--map <id=subdomain>]");
      console.log("  app plugins                   List available app plugins and presets");
      console.log("  app env set <app> <name> [value|--stdin]");
      console.log("  app env list <app>            List configured names (values are never shown)");
      console.log("  app env unset <app> <name>    Remove an app-scoped value");
      console.log("  site add <subdomain> <dir>    Add a site");
      console.log("  site add-page <subdomain> <html> <css> <dom-schema> <css-schema> [--title <title>] [--unsandboxed]");
      console.log("  site add-file <subdomain> <file> [--title <title>] [--content-type <type>] [--csp <policy>]");
      console.log("  site add-route <subdomain> <route> <html> <css> [--title <title>] [--csp <policy>] [--head <file>]");
      console.log("  site list                     List sites");
      console.log("  site remove <subdomain>       Remove a site");
    },

    exit() { stopServer(); exit(0); },
    quit() { stopServer(); exit(0); },
    q() { stopServer(); exit(0); },

    async "server start"(args) {
      const opts = parseServerOpts(args);
      if (dataDir) opts.dataDir = dataDir;
      if (dbPath) opts.dbPath = dbPath;
      if (blocking) {
        await runServer(opts);
      } else {
        await startServer(opts);
      }
    },

    "server stop"() {
      stopServer();
    },

    "server status"() {
      console.log(isRunning() ? "Server is running" : "Server is not running");
    },

    "schema add"(args) {
      const [name, path] = args;
      if (!name || !path) {
        console.log("Usage: schema add <name> <json>");
        return;
      }
      const json = readText(path);
      JSON.parse(json);
      withDb((db) => {
        addSchema(db, name, json);
      }, dbOptions);
      console.log(`Added schema: ${name}`);
    },

    "schema list"() {
      const rows = withDb((db) => listSchemas(db), dbOptions);
      if (rows.length === 0) {
        console.log("No schemas configured");
        return;
      }
      for (const row of rows) console.log(`  ${row.name}`);
    },

    "font add"(args) {
      const { opts, positional } = parseFontOpts(args);
      const [name, assetPath, path] = positional;
      if (!name || !assetPath || !path) {
        console.log("Usage: font add <name> <asset-path> <file> [--mime <type>] [--provider <name>] [--source-url <url>]");
        return;
      }
      const content = readFileSync(path);
      const result = withDb((db) => putFontAsset(db, {
        name,
        assetPath,
        content,
        mimeType: opts.mimeType,
        provider: opts.provider,
        sourceUrl: opts.sourceUrl,
      }), dbOptions);
      console.log(`Added font asset: /-/fonts/${result.name}/${result.assetPath}`);
      console.log(`  sha256 ${result.sha256}`);
    },

    "app install"(args) {
      const { plugins, mappings } = parseAppInstallOpts(args);
      if (plugins.length === 0) {
        console.log("Usage: app install <id|preset>... [--map <id=subdomain>]");
        return;
      }
      const installed = withDb((db) => installAppPlugins(db, plugins, { mappings }), dbOptions);
      for (const id of installed) console.log(`Installed app plugin: ${id}${mappings[id] ? ` -> ${mappings[id]}` : ""}`);
    },

    "app plugins"() {
      console.log("Presets: core, development");
      for (const id of appPluginIds()) console.log(`  ${id}`);
    },

    async "app env"(args) {
      const [action, ...rest] = args;
      const { positional, stdin } = parseAppEnvironmentArgs(rest);
      const [subdomain, name, directValue] = positional;
      if (!["set", "list", "unset"].includes(action) || !subdomain) {
        console.log("Usage: app env <set|list|unset> <app-subdomain> [NAME] [value|--stdin]");
        return;
      }
      const row = withDb((db) => getAppConfigRow(db, subdomain), dbOptions);
      if (!row) throw new Error(`Declarative app is not installed: ${subdomain}`);
      const declaration = appEnvironmentDeclaration(row);

      if (action === "list") {
        const configured = withDb((db) => listAppEnvironment(db, subdomain), dbOptions);
        if (configured.length === 0) {
          console.log(`No environment values configured for ${subdomain}`);
          return;
        }
        for (const item of configured) console.log(`  ${item.name} (${item.secret ? "secret" : "value"})`);
        return;
      }

      if (!name || !Object.hasOwn(declaration, name)) {
        throw new Error(`Environment name is not declared by ${subdomain}: ${name || "(missing)"}`);
      }
      if (action === "unset") {
        withDb((db) => removeAppEnvironmentValue(db, subdomain, name), dbOptions);
        console.log(`Removed ${subdomain} environment: ${name}`);
        return;
      }

      const secret = declaration[name].secret === true;
      if (secret && directValue !== undefined) throw new Error(`Secret ${name} cannot be supplied as a command argument`);
      const value = stdin
        ? readFileSync(0, "utf8").replace(/\r?\n$/, "")
        : secret
          ? await promptSecret(name)
          : directValue;
      if (value === undefined || value === "") throw new Error(`Environment value is empty: ${name}`);
      withDb((db) => setAppEnvironmentValue(db, subdomain, name, value, { secret }), dbOptions);
      console.log(`Configured ${subdomain} environment: ${name} (${secret ? "secret" : "value"})`);
    },

    "site add"(args) {
      const [subdomain, directory] = args;
      if (!subdomain || !directory) {
        console.log("Usage: site add <subdomain> <directory> [--writable-file <name> --max-bytes <bytes>]");
        return;
      }
      const writableFiles = {};
      for (let index = 2; index < args.length; index += 1) {
        if (args[index] !== "--writable-file") throw new Error(`Unknown site add option: ${args[index]}`);
        const name = args[++index];
        if (!name) throw new Error("--writable-file requires a filename");
        let maxBytes = 65_536;
        if (args[index + 1] === "--max-bytes") {
          maxBytes = Number(args[index + 2]);
          index += 2;
        }
        if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 1_048_576) throw new Error(`Invalid --max-bytes: ${maxBytes}`);
        writableFiles[name] = { maxBytes };
      }
      withDb((db) => {
        addDirectorySite(db, subdomain, directory);
        registerSiteApp(db, subdomain, "directory", "directory site", {
          access: Object.keys(writableFiles).length ? { writableFiles } : {},
        });
      }, dbOptions);
      console.log(`Added site: ${subdomain} -> ${directory}`);
    },

    "site list"() {
      const rows = withDb((db) => listConfiguredSites(db), dbOptions);
      if (rows.length === 0) {
        console.log("No sites configured");
        return;
      }
      for (const row of rows) {
        if (row.kind === "page") {
          console.log(`  ${row.subdomain} -> sqlite page (${row.sandboxed ? "sandboxed" : "unsandboxed"})`);
        } else if (row.kind === "raw site") {
          console.log(`  ${row.subdomain} -> raw site ${row.directory}`);
        } else if (row.kind === "routes") {
          console.log(`  ${row.subdomain} -> sqlite routes`);
        } else {
          console.log(`  ${row.subdomain} -> ${row.directory}`);
        }
      }
    },

    "site add-page"(args) {
      const { opts, positional } = parsePageOpts(args);
      const [subdomain, htmlPath, cssPath, domSchemaPath, cssSchemaPath] = positional;
      if (!subdomain || !htmlPath || !cssPath || !domSchemaPath || !cssSchemaPath) {
        console.log("Usage: site add-page <subdomain> <html> <css> <dom-schema> <css-schema> [--title <title>] [--unsandboxed]");
        return;
      }

      const html = readText(htmlPath);
      const css = readText(cssPath);
      const domSchema = readSchemaArg(domSchemaPath);
      const cssSchema = readSchemaArg(cssSchemaPath);

      withDb((db) => {
        addPageSite(db, {
          subdomain,
          title: opts.title || subdomain,
          html,
          css,
          domSchema,
          cssSchema,
          sandboxed: opts.sandboxed,
        });
        registerSiteApp(db, subdomain, "sqlite-page", "SQLite page");
      }, dbOptions);
      console.log(`Added SQLite page: ${subdomain} (${opts.sandboxed ? "sandboxed" : "unsandboxed"})`);
    },

    "site add-file"(args) {
      const { opts, positional } = parseFileSiteOpts(args);
      const [subdomain, filePath] = positional;
      if (!subdomain || !filePath) {
        console.log("Usage: site add-file <subdomain> <file> [--title <title>] [--content-type <type>] [--csp <policy>]");
        return;
      }

      withDb((db) => {
        addFileSite(db, {
          subdomain,
          title: opts.title || subdomain,
          filePath,
          contentType: opts.contentType,
          csp: opts.csp,
        });
        registerSiteApp(db, subdomain, "raw-file", "raw site");
      }, dbOptions);
      console.log(`Added raw site: ${subdomain} -> ${filePath}`);
    },

    "site add-route"(args) {
      const { opts, positional } = parseRouteOpts(args);
      const [subdomain, routePath, htmlPath, cssPath] = positional;
      if (!subdomain || !routePath || !htmlPath || !cssPath) {
        console.log("Usage: site add-route <subdomain> <route> <html> <css> [--title <title>] [--csp <policy>] [--head <file>]");
        return;
      }

      const html = readText(htmlPath);
      const css = readText(cssPath);
      const head = opts.headPath ? readText(opts.headPath) : "";

      const route = withDb((db) => putSiteRoute(db, {
        subdomain,
        path: routePath,
        title: opts.title || subdomain,
        html,
        css,
        head,
        csp: opts.csp,
      }), dbOptions);
      withDb((db) => registerSiteApp(db, subdomain, "sqlite-routes", "SQLite routes"), dbOptions);
      console.log(`Added SQLite route: ${route.subdomain}${route.path}`);
    },

    "site remove"(args) {
      const [subdomain] = args;
      if (!subdomain) {
        console.log("Usage: site remove <subdomain>");
        return;
      }
      withDb((db) => {
        removeConfiguredSite(db, subdomain);
        deleteSiteRoutes(db, subdomain);
        removeAppConfig(db, subdomain);
      }, dbOptions);
      console.log(`Removed site: ${subdomain}`);
    },
  };
}
