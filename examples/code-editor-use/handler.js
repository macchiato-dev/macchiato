import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";
import { renderDeclarativeApp, standardLayoutCss } from "@macchiato-dev/declarative-app-server";
import { app, renderCodeEditorBlock } from "./app.js";

const directory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(directory, "../..");
let guestBundlePromise;
let hostBundlePromise;

function contentType(pathname) {
  if (pathname.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (pathname.endsWith(".wasm")) return "application/wasm";
  if (pathname.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

export function codeEditorUseImportMap() {
  const imports = {};
  for (const [specifier, publicPath] of Object.entries(quickJsEmscriptenSandboxBrowserAssets.imports)) {
    imports[specifier] = `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/${publicPath}`;
  }
  imports["@macchiato-dev/browser-use/quickjs-guest"] = "/browser-use-quickjs-guest.js";
  imports["@macchiato-dev/browser-use/quickjs-dom-guest"] = "/browser-use-quickjs-dom-guest.js";
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
  return renderDeclarativeApp(app, {
    blocks: { "code-editor": (block, declaration) => renderCodeEditorBlock(block, declaration, codeEditorUseImportMap()) },
  });
}

async function codeEditorGuestBundle() {
  guestBundlePromise ||= build({
    entryPoints: [join(repoRoot, "packages/code-editor-use/src/guest.js")],
    bundle: true,
    format: "iife",
    platform: "neutral",
    write: false,
    sourcemap: false,
  }).then((result) => result.outputFiles[0].text);
  return guestBundlePromise;
}

async function codeEditorHostBundle() {
  hostBundlePromise ||= build({
    entryPoints: [join(repoRoot, "packages/code-editor-use/src/host.js")],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    sourcemap: false,
  }).then((result) => result.outputFiles[0].text);
  return hostBundlePromise;
}

export async function codeEditorUseHandler(request) {
  const { pathname } = new URL(request.url);
  if (pathname === "/" || pathname === "/index.html") {
    return new Response(page(), { headers: { ...securityHeaders, "content-type": "text/html; charset=utf-8" } });
  }
  return await codeEditorUseAssetHandler(request);
}

const securityHeaders = {
  "content-security-policy": "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src data:; connect-src 'self'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
};

export async function codeEditorUseAssetHandler(request) {
  const { pathname } = new URL(request.url);
  const asset = await providerAsset(pathname);
  if (asset) return asset;
  if (pathname === "/-/app.css") return new Response(standardLayoutCss, { headers: { "content-type": "text/css; charset=utf-8" } });
  if (pathname === "/client.js") {
    return new Response(await readFile(join(directory, "client.js"), "utf8"), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/controller.js") {
    return new Response(await readFile(join(directory, "controller.js"), "utf8"), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/browser-use-quickjs-guest.js") {
    return new Response(await readFile(join(repoRoot, "packages/browser-use/src/quickjs-guest.js"), "utf8"), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/browser-use-quickjs-dom-guest.js") {
    return new Response(await readFile(join(repoRoot, "packages/browser-use/src/quickjs-dom-guest.js"), "utf8"), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/code-editor-guest.js") {
    return new Response(await codeEditorGuestBundle(), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/code-editor-host.js") {
    return new Response(await codeEditorHostBundle(), { headers: { "content-type": contentType(pathname) } });
  }
  if (pathname === "/style.css") {
    return new Response(await readFile(join(directory, "style.css"), "utf8"), { headers: { "content-type": "text/css; charset=utf-8" } });
  }
  return new Response("Not found", { status: 404 });
}
