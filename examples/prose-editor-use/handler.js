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

function page(engine) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Constrained ${engine}</title>
  <link rel="stylesheet" href="/style.css">
  <script type="importmap">${importMap()}</script>
</head>
<body>
  <main>
    <p class="eyebrow">prose-editor-use / browser-use</p>
    <h1>Write a message</h1>
    <p>A small ${engine} composer owns one shape-checked browser subtree. Its application controller runs inside QuickJS.</p>
    <section class="composer" aria-label="Message composer">
      <div class="toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" data-command="toggleStrong" aria-label="Bold" title="Bold (Ctrl-B)">B</button>
        <button type="button" data-command="toggleEmphasis" aria-label="Italic" title="Italic (Ctrl-I)"><em>I</em></button>
        <button type="button" data-command="toggleCode" aria-label="Inline code" title="Inline code (Ctrl-&#96;)">&lt;/&gt;</button>
        <button type="button" data-command="undo" aria-label="Undo" title="Undo">Undo</button>
        <button type="button" data-command="redo" aria-label="Redo" title="Redo">Redo</button>
      </div>
      <div id="editor"></div>
      <div class="actions"><button id="send" type="button">Send message</button></div>
    </section>
    <div class="runtime"><span id="status" role="status">Starting QuickJS…</span><span id="shape"></span></div>
    <output id="sent" hidden aria-label="Sent message"></output>
    <details><summary>What is constrained?</summary><p>The editor schema, commands, plugins, tags, attributes, class families, depth, element count, and text size are fixed by prose-editor-use.</p></details>
  </main>
  <script type="module" src="/client.js"></script>
</body>
</html>`;
}

async function proseEditorBundle() {
  bundlePromise ||= build({
    entryPoints: [join(repoRoot, "packages/prose-editor-use/src/index.js")],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    sourcemap: false,
  }).then((result) => result.outputFiles[0].text);
  return bundlePromise;
}

function createHandler({ engine, controller }) {
  return async function messageEditorUseHandler(request) {
  const { pathname } = new URL(request.url);
  const asset = await providerAsset(pathname);
  if (asset) return asset;
  const headers = {
    "content-security-policy": "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
  };
  if (pathname === "/" || pathname === "/index.html") {
    return new Response(page(engine), { headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
  }
  if (pathname === "/client.js" || pathname === "/style.css") {
    const type = pathname.endsWith(".css") ? "text/css; charset=utf-8" : contentType(pathname);
    return new Response(await readFile(join(directory, pathname.slice(1)), "utf8"), { headers: { "content-type": type } });
  }
  if (pathname === "/controller.js") {
    return new Response(await readFile(join(directory, controller), "utf8"), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/browser-use-quickjs-guest.js") {
    return new Response(await readFile(join(repoRoot, "packages/browser-use/src/quickjs-guest.js"), "utf8"), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/prose-editor.js") {
    return new Response(await proseEditorBundle(), { headers: { "content-type": contentType(pathname) } });
  }
  return new Response("Not found", { status: 404 });
  };
}

export const proseEditorUseHandler = createHandler({ engine: "ProseMirror", controller: "controller.js" });
export const wordgardEditorUseHandler = createHandler({ engine: "Wordgard", controller: "controller-wordgard.js" });
