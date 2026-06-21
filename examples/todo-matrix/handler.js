import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { domUseBrowserAssets } from "@macchiato-dev/dom-use/browser-assets";
import { htmlUseBrowserAssets } from "@macchiato-dev/html-use/browser-assets";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";
import { styleUseBrowserAssets } from "@macchiato-dev/style-use/browser-assets";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BROWSER_ASSET_SETS = [
  quickJsEmscriptenSandboxBrowserAssets,
  domUseBrowserAssets,
  htmlUseBrowserAssets,
  styleUseBrowserAssets,
];

let assetsPromise = null;

async function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      readFile(join(__dirname, "source.html"), "utf8"),
      readFile(join(__dirname, "styles.css"), "utf8"),
      readFile(join(__dirname, "client.js"), "utf8"),
      readFile(join(__dirname, "dom.schema.json"), "utf8"),
      readFile(join(__dirname, "css.schema.json"), "utf8"),
    ]).then(([sourceHtml, css, clientJs, domSchemaText, cssSchemaText]) => ({
      sourceHtml,
      css,
      clientJs,
      domSchemaText,
      cssSchemaText,
    }));
  }
  return assetsPromise;
}

function contentType(pathname) {
  if (pathname.endsWith(".mjs") || pathname.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (pathname.endsWith(".json") || pathname.endsWith(".map")) return "application/json; charset=utf-8";
  if (pathname.endsWith(".wasm")) return "application/wasm";
  return "application/octet-stream";
}

function assetUrl(set, publicPath) {
  return `/-/${set.namespace}/${publicPath}`;
}

function importMap() {
  const imports = {};
  for (const set of BROWSER_ASSET_SETS) {
    for (const [specifier, publicPath] of Object.entries(set.imports || {})) {
      imports[specifier] = assetUrl(set, publicPath);
    }
  }
  return JSON.stringify({ imports }, null, 2);
}

function providerAsset(pathname) {
  if (!pathname.startsWith("/-/")) return null;
  const relative = pathname.slice("/-/".length);
  if (relative.includes("..") || relative.includes("\\")) return null;
  for (const set of BROWSER_ASSET_SETS) {
    if (!relative.startsWith(`${set.namespace}/`)) continue;
    const publicPath = relative.slice(set.namespace.length + 1);
    for (const asset of set.files || []) {
      if (publicPath === asset.publicPath) return { asset };
      if (asset.sourceMapPath && publicPath === `${asset.publicPath}.map`) {
        return { asset: { ...asset, filePath: asset.sourceMapPath, rewrites: null, sourceMapPath: null } };
      }
    }
  }
  return null;
}

function rewriteAsset(content, asset) {
  let rewritten = content;
  for (const [from, to] of Object.entries(asset.rewrites || {})) {
    rewritten = rewritten.replaceAll(from, to);
  }
  if (asset.sourceMapPath) {
    rewritten = rewritten.replace(/\/\/# sourceMappingURL=.*$/m, `//# sourceMappingURL=${asset.publicPath}.map`);
  }
  return rewritten;
}

async function serveProviderAsset(pathname) {
  const match = providerAsset(pathname);
  if (!match) return null;
  try {
    const content = await readFile(match.asset.filePath, pathname.endsWith(".wasm") ? undefined : "utf8");
    const body = pathname.endsWith(".js") ? rewriteAsset(content, match.asset) : content;
    return new Response(body, { headers: { "content-type": contentType(pathname) } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function page() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Todo Matrix</title>
<style id="macchiato-loading-style">
html,
body {
  min-height: 100%;
  margin: 0;
  background: #10102a;
}
#app[data-status="loading"] {
  padding: 2rem;
  color: #f4f7ff;
  font-family: system-ui, sans-serif;
}
</style>
<script type="importmap">
${importMap()}
</script>
</head>
<body>
<div id="app" data-status="loading">Loading...</div>
<script type="module" src="/client.js"></script>
</body>
</html>`;
}

export async function todoMatrixHandler(request) {
  const url = new URL(request.url);
  const providerAsset = await serveProviderAsset(url.pathname);
  if (providerAsset) return providerAsset;
  const assets = await loadAssets();

  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(page(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (url.pathname === "/client.js") {
    return new Response(assets.clientJs, {
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }
  if (url.pathname === "/styles.css") {
    return new Response(assets.css, {
      headers: { "content-type": "text/css; charset=utf-8" },
    });
  }
  if (url.pathname === "/source.html") {
    return new Response(assets.sourceHtml, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (url.pathname === "/dom.schema.json") {
    return new Response(assets.domSchemaText, {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  if (url.pathname === "/css.schema.json") {
    return new Response(assets.cssSchemaText, {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  return new Response("Not found", { status: 404 });
}
