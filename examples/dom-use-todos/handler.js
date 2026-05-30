import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const nodeModulesRoot = join(repoRoot, "node_modules");
const SERVED_NODE_MODULES = [
  "@jitl/quickjs-ffi-types/",
  "@jitl/quickjs-singlefile-browser-release-sync/",
  "quickjs-emscripten-core/",
];

let assetsPromise = null;

async function readAsset(path) {
  return readFile(join(__dirname, path), "utf8");
}

function contentType(pathname) {
  if (pathname.endsWith(".mjs") || pathname.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (pathname.endsWith(".json") || pathname.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

async function serveNodeModule(pathname) {
  if (!pathname.startsWith("/node_modules/")) return null;
  const relative = pathname.slice("/node_modules/".length);
  if (!SERVED_NODE_MODULES.some((prefix) => relative.startsWith(prefix))) {
    return new Response("Not found", { status: 404 });
  }
  if (relative.includes("..") || relative.includes("\\")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const content = await readFile(join(nodeModulesRoot, relative));
    return new Response(content, {
      headers: { "content-type": contentType(pathname) },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function assets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      readFile(join(repoRoot, "examples", "todo", "index.html"), "utf8"),
      readAsset("guest.js"),
      readAsset("client.js"),
      readAsset("dom.schema.json"),
      readAsset("css.schema.json"),
    ]).then(([sourceHtml, guestJs, clientJs, domSchema, cssSchema]) => ({
      sourceHtml,
      guestJs,
      clientJs,
      domSchema,
      cssSchema,
    }));
  }
  return assetsPromise;
}

function page() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Todos</title>
<style id="macchiato-loading-style">
html,
body {
  min-height: 100%;
  margin: 0;
  background: #181a1f;
}

#app[data-status="loading"] {
  padding-top: 2rem;
  color: #c9d6df;
  font-family: system-ui, sans-serif;
  font-size: 3rem;
  font-weight: 300;
  text-align: center;
}

#app[data-status="loading"]::before {
  content: "Loading...";
  display: block;
  font-size: 3rem;
  opacity: 0;
  animation: macchiato-loading-fade 0.35s ease 0.5s forwards;
}

#app[data-status="loading"] {
  font-size: 0;
}

@keyframes macchiato-loading-fade {
  to {
    opacity: 1;
  }
}
</style>
<script type="importmap">
{
  "imports": {
    "@jitl/quickjs-ffi-types": "/node_modules/@jitl/quickjs-ffi-types/dist/index.mjs",
    "@jitl/quickjs-singlefile-browser-release-sync": "/node_modules/@jitl/quickjs-singlefile-browser-release-sync/dist/index.mjs",
    "@macchiato-dev/dom-use": "/@macchiato-dev/dom-use/src/index.js",
    "@macchiato-dev/html-use": "/@macchiato-dev/html-use/src/index.js",
    "@macchiato-dev/style-use": "/@macchiato-dev/style-use/src/index.js",
    "quickjs-emscripten-core": "/node_modules/quickjs-emscripten-core/dist/index.mjs"
  }
}
</script>
</head>
<body>
<div id="app" data-status="loading" aria-label="Loading"></div>
<script type="module" src="/client.js"></script>
</body>
</html>`;
}

export async function domUseTodosHandler(request) {
  const url = new URL(request.url);
  const nodeModule = await serveNodeModule(url.pathname);
  if (nodeModule) return nodeModule;

  const loaded = await assets();

  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(page(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (url.pathname === "/client.js") {
    return new Response(loaded.clientJs, {
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  if (url.pathname === "/guest.js") {
    return new Response(loaded.guestJs, {
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  if (url.pathname === "/source.html") {
    return new Response(loaded.sourceHtml, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (url.pathname === "/dom.schema.json") {
    return new Response(loaded.domSchema, {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  if (url.pathname === "/css.schema.json") {
    return new Response(loaded.cssSchema, {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return new Response("Not found", { status: 404 });
}
