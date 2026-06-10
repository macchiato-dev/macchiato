import { readFile } from "node:fs/promises";
import { extname, normalize, resolve } from "node:path";

const DEFAULT_CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function contentType(pathname, contentTypes = {}) {
  return {
    ...DEFAULT_CONTENT_TYPES,
    ...contentTypes,
  }[extname(pathname).toLowerCase()] || "application/octet-stream";
}

function safeJoin(root, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const target = resolve(root, relative.replace(/^[/\\]+/, ""));
  const resolvedRoot = resolve(root);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}/`)) {
    throw new Error("Path escapes root");
  }
  return target;
}

function normalizePath(pathname) {
  if (!pathname.startsWith("/")) return `/${pathname}`;
  return pathname;
}

function expandRoutes(routes = []) {
  const expanded = [];
  for (const route of routes) {
    expanded.push(route);
    for (const alias of route.aliases || []) {
      expanded.push({ ...route, path: alias, aliases: [] });
    }
  }
  return expanded;
}

export function withStaticFiles({ routes = [], mounts = [] } = {}) {
  return (site) => ({
    ...site,
    routes: [...(site.routes || []), ...routes],
    mounts: [...(site.mounts || []), ...mounts],
  });
}

export function withSetup(setup) {
  return (site) => ({
    ...site,
    setup: [...(site.setup || []), setup].filter(Boolean),
  });
}

export function defineStaticSite(definition = {}) {
  let site = {
    root: definition.root,
    contentTypes: definition.contentTypes || {},
    routes: definition.routes || [],
    mounts: definition.mounts || [],
    setup: definition.setup || [],
  };

  for (const mixin of definition.mixins || []) {
    site = mixin(site);
  }

  async function serveFile(pathname, file) {
    try {
      const content = await readFile(safeJoin(site.root, file));
      return new Response(content, {
        headers: { "content-type": contentType(file || pathname, site.contentTypes) },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  return {
    ...site,
    setup(db) {
      for (const setup of site.setup || []) setup(db, site);
    },
    async handle(request) {
      const url = new URL(request.url);
      const pathname = normalizePath(url.pathname);

      for (const route of expandRoutes(site.routes)) {
        if (normalizePath(route.path) === pathname) {
          return serveFile(pathname, route.file);
        }
      }

      for (const mount of site.mounts || []) {
        const prefix = normalizePath(mount.path);
        if (!pathname.startsWith(prefix)) continue;
        const relative = pathname.slice(prefix.length);
        if (!relative || relative.includes("..")) break;
        return serveFile(pathname, `${mount.directory}/${relative}`);
      }

      return new Response("Not found", { status: 404 });
    },
  };
}
