import { sandboxHandler } from "@macchiato-dev/quickjs-emscripten-sandbox/handler";
import { dashboardHandler } from "@macchiato-dev/dashboard";
import { domUseTodosHandler } from "../../../examples/dom-use-todos/handler.js";
import { resourcesWebsiteHandler, resourcesWebsiteSite } from "../../../examples/resources-website/handler.js";

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
    name: "Resources.co",
    subdomain: "resources-co",
    kind: "multi-page site",
    description: "SQLite-backed Resources.co routes with friendly paths and transitions.",
    seededRoute: true,
  },
  {
    name: "Resources Website",
    subdomain: "resources-website",
    kind: "static site",
    description: "Declarative static Resources.co source page and assets.",
    handler: resourcesWebsiteHandler,
    setup: resourcesWebsiteSite.setup,
  },
  {
    name: "DOM Use Todos",
    subdomain: "dom-use-todos",
    kind: "sandboxed app",
    description: "QuickJS guest DOM todo app with schema-bound rendering.",
    handler: domUseTodosHandler,
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
