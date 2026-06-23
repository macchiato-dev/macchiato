import { sandboxHandler } from "@macchiato-dev/quickjs-emscripten-sandbox/handler";
import { dashboardHandler } from "@macchiato-dev/dashboard";
import { join, resolve } from "node:path";
import { domUseTodosHandler } from "../../../examples/dom-use-todos/handler.js";
import { resourcesWebsiteHandler, resourcesWebsiteSite } from "../../../examples/resources-website/handler.js";
import { todoMatrixHandler } from "../../../examples/todo-matrix/handler.js";
import { codeAnnotatorFileAccess, codeAnnotatorHandler } from "./code-annotator.js";
import { packageBrowserFileAccess, packageBrowserHandler } from "./package-browser.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const examplesRoot = join(repoRoot, "examples");

export const BUILTIN_APPS = [
  {
    name: "Macchiato Apps",
    subdomain: "apps",
    aliases: ["projects", ""],
    kind: "directory",
    description: "A directory of local Macchiato apps and projects.",
    directory: false,
  },
  {
    name: "Packages",
    subdomain: "packages",
    kind: "sandboxed browser",
    description: "Browse package files granted by git-aware app configuration.",
    handler: packageBrowserHandler,
    fileAccess: {
      ...packageBrowserFileAccess,
      gitRoot: repoRoot,
    },
    sourceFiles: [
      "packages/app/src/package-browser.js",
    ],
  },
  {
    name: "Code Notes",
    subdomain: "code-notes",
    kind: "sandboxed browser",
    description: "Annotate git-visible module code in a QuickJS-rendered interface.",
    handler: codeAnnotatorHandler,
    fileAccess: {
      ...codeAnnotatorFileAccess,
      gitRoot: repoRoot,
    },
    sourceFiles: [
      "packages/app/src/code-annotator.js",
    ],
    sandbox: {
      runtime: "QuickJS WASM",
      hostCapabilities: ["git-visible file read", "localStorage", "download"],
    },
  },
  {
    name: "Resources.co",
    subdomain: "resources-co",
    kind: "multi-page site",
    description: "SQLite-backed Resources.co routes with friendly paths and transitions.",
    seededRoute: true,
    sourceFiles: [
      "examples/resources-site/seed.js",
      "examples/resources-site/dom.schema.json",
      "examples/resources-site/css.schema.json",
    ],
    schemas: [
      { name: "dom", path: join(examplesRoot, "resources-site", "dom.schema.json") },
      { name: "css", path: join(examplesRoot, "resources-site", "css.schema.json") },
    ],
    site: {
      storage: "sqlite routes",
      subdomain: "resources-co",
      routeSource: "examples/resources-site/seed.js",
    },
  },
  {
    name: "Resources Website",
    subdomain: "resources-website",
    kind: "static site",
    description: "Declarative static Resources.co source page and assets.",
    handler: resourcesWebsiteHandler,
    setup: resourcesWebsiteSite.setup,
    sourceFiles: [
      "examples/resources-website/handler.js",
      "examples/resources-website/declarative-site.js",
      "examples/resources-website/dom.schema.json",
      "examples/resources-website/css.schema.json",
    ],
    schemas: [
      { name: "dom", path: join(examplesRoot, "resources-website", "dom.schema.json") },
      { name: "css", path: join(examplesRoot, "resources-website", "css.schema.json") },
    ],
    site: resourcesWebsiteSite,
  },
  {
    name: "DOM Use Todos",
    subdomain: "dom-use-todos",
    kind: "sandboxed app",
    description: "QuickJS guest DOM todo app with schema-bound rendering.",
    handler: domUseTodosHandler,
    sourceFiles: [
      "examples/dom-use-todos/handler.js",
      "examples/dom-use-todos/client.js",
      "examples/dom-use-todos/dom.schema.json",
      "examples/dom-use-todos/css.schema.json",
    ],
    schemas: [
      { name: "dom", path: join(examplesRoot, "dom-use-todos", "dom.schema.json") },
      { name: "css", path: join(examplesRoot, "dom-use-todos", "css.schema.json") },
    ],
    sandbox: {
      runtime: "QuickJS WASM",
      hostCapabilities: ["dom-use", "style-use", "html-use"],
    },
  },
  {
    name: "Todo Matrix",
    subdomain: "todo-matrix",
    kind: "sandboxed app",
    description: "QuickJS todo matrix with schema-bound rendering and localStorage state.",
    handler: todoMatrixHandler,
    sourceFiles: [
      "examples/todo-matrix/handler.js",
      "examples/todo-matrix/client.js",
      "examples/todo-matrix/source.html",
      "examples/todo-matrix/styles.css",
      "examples/todo-matrix/dom.schema.json",
      "examples/todo-matrix/css.schema.json",
    ],
    schemas: [
      { name: "dom", path: join(examplesRoot, "todo-matrix", "dom.schema.json") },
      { name: "css", path: join(examplesRoot, "todo-matrix", "css.schema.json") },
    ],
    sandbox: {
      runtime: "QuickJS WASM",
      hostCapabilities: ["dom-use", "style-use", "html-use", "localStorage"],
    },
  },
  {
    name: "Dashboard",
    subdomain: "macchiato",
    kind: "tool",
    description: "Macchiato dashboard.",
    handler: dashboardHandler,
  },
  {
    name: "QuickJS Sandbox",
    subdomain: "macchiato-quickjs-emscripten-sandbox",
    kind: "tool",
    description: "QuickJS Emscripten sandbox demo.",
    handler: sandboxHandler,
  },
];

export function setupBuiltinApps(db) {
  for (const app of BUILTIN_APPS) app.setup?.(db);
}

export function visibleBuiltinApps() {
  return BUILTIN_APPS.filter((app) => app.directory !== false);
}

export function findBuiltinApp(subdomain) {
  return BUILTIN_APPS.find((app) => app.subdomain === subdomain || app.aliases?.includes(subdomain));
}
