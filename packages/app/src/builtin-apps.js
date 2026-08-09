import { sandboxHandler } from "@macchiato-dev/quickjs-emscripten-sandbox/handler";
import { dashboardHandler } from "@macchiato-dev/dashboard";
import { join, resolve } from "node:path";
import { domUseTodosHandler } from "../../../examples/dom-use-todos/handler.js";
import { resourcesWebsiteHandler, resourcesWebsiteSite } from "../../../examples/resources-website/handler.js";
import { blogExamplesPreviewConfig, blogExamplesPreviewHandler, resourcesEdgePreviewConfig, resourcesEdgePreviewHandler } from "../../../packages/website/preview-handler.js";
import { todoMatrixHandler } from "../../../examples/todo-matrix/handler.js";
import { todoHistoryHandler } from "../../../examples/todo-history/handler.js";
import { httpSqliteCrudHandler, setupHttpSqliteCrud } from "../../../examples/http-sqlite-crud/handler.js";
import { codeAnnotatorFileAccess, codeAnnotatorHandler } from "./code-annotator.js";
import { codeEditorUseHandler } from "../../code-editor-use/examples/basic/handler.js";
import { terminalUseHandler } from "../../terminal-use/examples/basic/handler.js";
import { proseEditorUseHandler, wordgardEditorUseHandler } from "../../../examples/prose-editor-use/handler.js";
import { focusedAppHandler } from "../../../examples/focused-app/handler.js";
import { exportFocusedApp } from "../../../examples/focused-app/export-static.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const examplesRoot = join(repoRoot, "examples");
const websiteRoot = join(repoRoot, "packages", "website");

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
    name: "Focused App",
    pluginId: "focused-app",
    subdomain: "app",
    kind: "portable sandbox workspace",
    description: "A collapsible, storage-explicit workspace for running focused sandboxed apps.",
    handler: focusedAppHandler,
    commands: { export: { description: "Export the app as a static directory.", run: exportFocusedApp } },
    sourceFiles: [
      "examples/focused-app/index.html",
      "examples/focused-app/client.js",
      "examples/focused-app/model.js",
      "examples/focused-app/preview-runtime.js",
      "examples/focused-app/export-static.js",
      "examples/focused-app/style.css",
      "examples/focused-app/handler.js",
    ],
    sandbox: {
      runtime: "browser-native shell with per-document sandbox declarations",
      hostCapabilities: ["memory collections", "sessionStorage collections", "localStorage collections", "file import"],
    },
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
      "packages/code-editor-use/examples/basic/handler.js",
      "packages/code-editor-use/examples/basic/client.js",
      "packages/code-editor-use/examples/basic/controller.js",
      "packages/code-editor-use/examples/basic/style.css",
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
    name: "Constrained xterm.js",
    pluginId: "terminal-use",
    subdomain: "terminal-use",
    kind: "sandboxed browser component",
    description: "xterm.js in a dedicated QuickJS guest behind a bounded terminal surface.",
    handler: terminalUseHandler,
    sourceFiles: [
      "packages/terminal-use/examples/basic/handler.js",
      "packages/terminal-use/examples/basic/client.js",
      "packages/terminal-use/examples/basic/style.css",
      "packages/terminal-use/examples/basic/xterm.css",
      "packages/terminal-use/src/controller.js",
      "packages/terminal-use/src/guest.js",
      "packages/terminal-use/src/policy.js",
    ],
    sandbox: {
      runtime: "QuickJS WASM",
      hostCapabilities: ["browser-use scoped DOM", "terminal-use in-memory byte stream"],
    },
  },
  {
    name: "Constrained ProseMirror",
    subdomain: "prose-editor-use",
    kind: "sandboxed browser component",
    description: "A small ProseMirror message composer behind a shape-checked browser-use adapter and QuickJS controller.",
    handler: proseEditorUseHandler,
    sourceFiles: [
      "examples/prose-editor-use/handler.js",
      "examples/prose-editor-use/client.js",
      "examples/prose-editor-use/controller.js",
      "examples/prose-editor-use/controller-wordgard.js",
      "examples/prose-editor-use/style.css",
      "packages/browser-use/src/index.js",
      "packages/browser-use/src/quickjs-guest.js",
      "packages/prose-editor-use/src/index.js",
    ],
    sandbox: {
      runtime: "QuickJS WASM controller + native constrained adapter",
      hostCapabilities: ["browser-use scoped DOM", "prose-editor-use ProseMirror subtree"],
    },
  },
  {
    name: "Constrained Wordgard",
    subdomain: "wordgard-editor-use",
    kind: "sandboxed browser component",
    description: "The same constrained message composer with only its QuickJS controller selecting Wordgard.",
    handler: wordgardEditorUseHandler,
    sourceFiles: [
      "examples/prose-editor-use/handler.js",
      "examples/prose-editor-use/client.js",
      "examples/prose-editor-use/controller-wordgard.js",
      "examples/prose-editor-use/style.css",
      "packages/browser-use/src/index.js",
      "packages/browser-use/src/quickjs-guest.js",
      "packages/prose-editor-use/src/index.js",
    ],
    sandbox: {
      runtime: "QuickJS WASM controller + native constrained adapter",
      hostCapabilities: ["browser-use scoped DOM", "prose-editor-use allowlisted rich-text subtree"],
    },
  },
  {
    name: "Resources.co",
    subdomain: "resources-co",
    kind: "multi-page site",
    description: "SQLite-backed Resources.co routes with friendly paths and transitions.",
    seededRoute: true,
    sourceFiles: [
      "packages/website/seed.js",
      "packages/website/runtime.js",
      "packages/website/theme.js",
      "packages/website/components/menu.js",
      "packages/website/components/user-menu.js",
      "packages/website/components/auth.js",
      "packages/command-palette-use/src/index.js",
      "packages/command-palette-use/src/client.js",
      "packages/theme-use/src/client.js",
      "packages/website/dom.schema.json",
      "packages/website/css.schema.json",
    ],
    schemas: [
      { name: "dom", path: join(websiteRoot, "dom.schema.json") },
      { name: "css", path: join(websiteRoot, "css.schema.json") },
    ],
    site: {
      storage: "sqlite routes",
      runtimeProfile: "local",
      subdomain: "resources-co",
      routeSource: "packages/website/seed.js",
    },
  },
  {
    name: "Resources.co Edge Preview",
    subdomain: resourcesEdgePreviewConfig.subdomain,
    kind: "adapted static site",
    description: "The Bunny edge profile running locally through an in-memory Storage adapter.",
    handler: resourcesEdgePreviewHandler,
    sourceFiles: [
      "packages/website/artifacts.js",
      "packages/website/i18n.js",
      "packages/website/catalog-content.js",
      "packages/website/content/en.md",
      "packages/website/content/es.md",
      "packages/website/content-space/README.md",
      "packages/website/runtime.js",
      "packages/website/theme.js",
      "packages/website/components/menu.js",
      "packages/website/components/user-menu.js",
      "packages/website/components/auth.js",
      "packages/website/preview-handler.js",
      "packages/website/preview-application.js",
      "packages/website/adapters/memory-storage.js",
      "packages/website/edge/bootstrap.js",
      "packages/website/edge/app.js",
      "packages/website/edge/i18n.js",
      "packages/website/edge/models.js",
      "packages/command-palette-use/src/index.js",
      "packages/command-palette-use/src/client.js",
      "packages/theme-use/src/client.js",
    ],
    adapter: resourcesEdgePreviewConfig,
    environment: {
      PUBLIC_ORIGIN: { description: "Canonical origin used for OAuth callback URLs." },
      GITHUB_CLIENT_ID: { description: "GitHub OAuth application client ID." },
      GITHUB_CLIENT_SECRET: { secret: true, description: "GitHub OAuth application client secret." },
      GITLAB_CLIENT_ID: { description: "GitLab OAuth application ID." },
      GITLAB_CLIENT_SECRET: { secret: true, description: "GitLab OAuth application secret." },
      SESSION_SIGNING_KEY: { secret: true, description: "At least 32 random characters used to sign local sessions." },
      SIGNUPS_ENABLED: { description: "Registration is enabled by default; set to false to prevent unknown OAuth identities from creating accounts." },
    },
    site: {
      storage: "in-memory export manifest",
      productionStorage: "Bunny Storage",
      subdomain: resourcesEdgePreviewConfig.subdomain,
    },
  },
  {
    name: "Resources.co Blog Examples",
    subdomain: blogExamplesPreviewConfig.subdomain,
    kind: "sandboxed static examples",
    description: "A separate origin for tightly sandboxed Resources.co blog examples.",
    handler: blogExamplesPreviewHandler,
    sourceFiles: [
      "packages/website/blog-examples/vtv/dist/index.html",
      "packages/website/blog-examples/vtv/dist/app.js",
      "packages/website/blog-examples/vtv/dist/app.css",
      "packages/website/preview-handler.js",
    ],
    adapter: blogExamplesPreviewConfig,
    site: { storage: "validated static artifacts", subdomain: blogExamplesPreviewConfig.subdomain },
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
    aliases: ["todo"],
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
