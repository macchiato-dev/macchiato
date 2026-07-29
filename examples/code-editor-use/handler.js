import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";

const directory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(directory, "../..");
let bundlePromise;

function contentType(pathname) {
  if (pathname.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (pathname.endsWith(".wasm")) return "application/wasm";
  if (pathname.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function importMap() {
  const imports = {};
  for (const [specifier, publicPath] of Object.entries(quickJsEmscriptenSandboxBrowserAssets.imports)) {
    imports[specifier] = `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/${publicPath}`;
  }
  imports["@macchiato-dev/browser-use/quickjs-guest"] = "/browser-use-quickjs-guest.js";
  return JSON.stringify({ imports });
}

async function providerAsset(pathname) {
  const prefix = `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/`;
  if (!pathname.startsWith(prefix) || pathname.includes("..") || pathname.includes("\\")) return null;
  const publicPath = pathname.slice(prefix.length);
  const asset = quickJsEmscriptenSandboxBrowserAssets.files.find((entry) =>
    entry.publicPath === publicPath || `${entry.publicPath}.map` === publicPath);
  if (!asset) return new Response("Not found", { status: 404 });
  const sourceMap = `${asset.publicPath}.map` === publicPath;
  try {
    let body = await readFile(sourceMap ? asset.sourceMapPath : asset.filePath, "utf8");
    if (!sourceMap) {
      for (const [from, to] of Object.entries(asset.rewrites || {})) body = body.replaceAll(from, to);
      if (asset.sourceMapPath) body = body.replace(/\/\/# sourceMappingURL=.*$/m, `//# sourceMappingURL=${asset.publicPath}.map`);
    }
    return new Response(body, { headers: { "content-type": contentType(pathname) } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Constrained CodeMirror</title>
  <link rel="stylesheet" href="/style.css">
  <script type="importmap">${importMap()}</script>
</head>
<body>
  <main>
    <p class="eyebrow">code-editor-use / browser-use</p>
    <h1>Constrained CodeMirror 6</h1>
    <p>CodeMirror owns one shape-checked browser subtree. A QuickJS controller sees it only through scoped JSON DOM handles.</p>
    <div class="editor-shell"><div id="editor" aria-label="Code editor"></div></div>
    <div class="runtime"><span id="status" role="status">Starting QuickJS…</span><span id="shape"></span></div>
    <details><summary>What is constrained?</summary><p>Tags, attributes, class families, selectors, readable properties, writable properties, depth, element count, and text size are declared by code-editor-use.</p></details>
  </main>
  <script type="module" src="/client.js"></script>
</body>
</html>`;
}

async function codeEditorBundle() {
  bundlePromise ||= build({
    entryPoints: [join(repoRoot, "packages/code-editor-use/src/index.js")],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    sourcemap: false,
  }).then((result) => result.outputFiles[0].text);
  return bundlePromise;
}

export async function codeEditorUseHandler(request) {
  const { pathname } = new URL(request.url);
  const asset = await providerAsset(pathname);
  if (asset) return asset;
  const headers = {
    "content-security-policy": "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src data:; connect-src 'self'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
  };
  if (pathname === "/" || pathname === "/index.html") {
    return new Response(page(), { headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
  }
  if (pathname === "/client.js") {
    return new Response(await readFile(join(directory, "client.js"), "utf8"), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/controller.js") {
    return new Response(await readFile(join(directory, "controller.js"), "utf8"), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/browser-use-quickjs-guest.js") {
    return new Response(await readFile(join(repoRoot, "packages/browser-use/src/quickjs-guest.js"), "utf8"), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/code-editor.js") {
    return new Response(await codeEditorBundle(), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/style.css") {
    return new Response(await readFile(join(directory, "style.css"), "utf8"), { headers: { "content-type": "text/css; charset=utf-8" } });
  }
  return new Response("Not found", { status: 404 });
}
