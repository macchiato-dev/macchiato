import { sandboxHandler } from "@macchiato-dev/quickjs-emscripten-sandbox/handler";
import { dashboardHandler } from "@macchiato-dev/dashboard";
import { join, resolve } from "node:path";
import { domUseTodosHandler } from "../../../examples/dom-use-todos/handler.js";
import { resourcesWebsiteHandler, resourcesWebsiteSite } from "../../../examples/resources-website/handler.js";
import { resourcesEdgePreviewConfig, resourcesEdgePreviewHandler } from "../../../examples/resources-site/preview-handler.js";
import { todoMatrixHandler } from "../../../examples/todo-matrix/handler.js";
import { todoHistoryHandler } from "../../../examples/todo-history/handler.js";
import { httpSqliteCrudHandler, setupHttpSqliteCrud } from "../../../examples/http-sqlite-crud/handler.js";
import { codeAnnotatorFileAccess, codeAnnotatorHandler } from "./code-annotator.js";
import { codeEditorUseHandler } from "../../../examples/code-editor-use/handler.js";

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
    name: "Constrained CodeMirror",
    subdomain: "code-editor-use",
    kind: "sandboxed browser component",
    description: "CodeMirror 6 behind a shape-checked browser-use adapter and QuickJS controller.",
    handler: codeEditorUseHandler,
    sourceFiles: [
      "examples/code-editor-use/handler.js",
      "examples/code-editor-use/client.js",
      "examples/code-editor-use/controller.js",
      "examples/code-editor-use/style.css",
      "packages/browser-use/src/index.js",
      "packages/browser-use/src/quickjs-guest.js",
      "packages/code-editor-use/src/index.js",
    ],
    sandbox: {
      runtime: "QuickJS WASM controller + native constrained adapter",
      hostCapabilities: ["browser-use scoped DOM", "code-editor-use CodeMirror 6 subtree"],
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
      "examples/resources-site/runtime.js",
      "examples/resources-site/theme.js",
      "examples/resources-site/components/menu.js",
      "examples/resources-site/components/user-menu.js",
      "examples/resources-site/components/auth.js",
      "examples/resources-site/dom.schema.json",
      "examples/resources-site/css.schema.json",
    ],
    schemas: [
      { name: "dom", path: join(examplesRoot, "resources-site", "dom.schema.json") },
      { name: "css", path: join(examplesRoot, "resources-site", "css.schema.json") },
    ],
    site: {
      storage: "sqlite routes",
      runtimeProfile: "local",
      subdomain: "resources-co",
      routeSource: "examples/resources-site/seed.js",
    },
  },
  {
    name: "Resources.co Edge Preview",
    subdomain: resourcesEdgePreviewConfig.subdomain,
    kind: "adapted static site",
    description: "The Bunny edge profile running locally through an in-memory Storage adapter.",
    handler: resourcesEdgePreviewHandler,
    sourceFiles: [
      "examples/resources-site/artifacts.js",
      "examples/resources-site/i18n.js",
      "examples/resources-site/catalog-content.js",
      "examples/resources-site/content/en.md",
      "examples/resources-site/content/es.md",
      "examples/resources-site/content-space/README.md",
      "examples/resources-site/runtime.js",
      "examples/resources-site/theme.js",
      "examples/resources-site/components/menu.js",
      "examples/resources-site/components/user-menu.js",
      "examples/resources-site/components/auth.js",
      "examples/resources-site/preview-handler.js",
      "examples/resources-site/adapters/memory-storage.js",
      "examples/resources-site/edge/app.js",
      "examples/resources-site/edge/i18n.js",
      "examples/resources-site/edge/models.js",
    ],
    adapter: resourcesEdgePreviewConfig,
    environment: {
      PUBLIC_ORIGIN: { description: "Canonical origin used for OAuth callback URLs." },
      GITHUB_CLIENT_ID: { description: "GitHub OAuth application client ID." },
      GITHUB_CLIENT_SECRET: { secret: true, description: "GitHub OAuth application client secret." },
      GITLAB_CLIENT_ID: { description: "GitLab OAuth application ID." },
      GITLAB_CLIENT_SECRET: { secret: true, description: "GitLab OAuth application secret." },
      SESSION_SIGNING_KEY: { secret: true, description: "At least 32 random characters used to sign local sessions." },
    },
    site: {
      storage: "in-memory export manifest",
      productionStorage: "Bunny Storage",
      subdomain: resourcesEdgePreviewConfig.subdomain,
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
    name: "SQLite Notes",
    subdomain: "sqlite-notes",
    kind: "sandboxed app",
    description: "Small SQLite CRUD app behind a schema-bound HTTP capability.",
    handler: httpSqliteCrudHandler,
    setup: setupHttpSqliteCrud,
    sourceFiles: [
      "examples/http-sqlite-crud/backend.js",
      "examples/http-sqlite-crud/handler.js",
      "examples/http-sqlite-crud/server.js",
      "examples/http-sqlite-crud/client.js",
      "examples/http-sqlite-crud/sandbox.js",
    ],
    sandbox: {
      runtime: "QuickJS WASM",
      hostCapabilities: ["partial node:http", "partial node:sqlite", "http-use schemas"],
    },
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
    name: "Character History TODO",
    subdomain: "todo-history",
    kind: "history-backed app",
    description: "TODO list with character-timed history and swappable Markdown and SQLite dialects.",
    handler: todoHistoryHandler,
    sourceFiles: [
      "examples/todo-history/model.js",
      "examples/todo-history/markdown-dialect.js",
      "examples/todo-history/sqlite-dialect.js",
      "examples/todo-history/handler.js",
      "examples/todo-history/client.js",
      "examples/todo-history/style.css",
      "examples/todo-history/README.md",
    ],
    adapter: {
      profile: "character-history-v1",
      backends: ["sqlite", "markdown"],
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
