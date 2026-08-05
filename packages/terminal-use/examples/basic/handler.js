import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";
import { createStandardWebAppHandler, readStandardAppConfig } from "@macchiato-dev/declarative-app-server";

const directory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(directory, "../../../..");
let guestBundlePromise;
let hostBundlePromise;
const type = (path) => path.endsWith(".wasm") ? "application/wasm" : path.endsWith(".map") ? "application/json; charset=utf-8" : "application/javascript; charset=utf-8";

export function terminalUseImportMap() {
  const imports = {};
  for (const [specifier, path] of Object.entries(quickJsEmscriptenSandboxBrowserAssets.imports)) imports[specifier] = `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/${path}`;
  imports["@macchiato-dev/browser-use/quickjs-dom-guest"] = "/browser-use-quickjs-dom-guest.js";
  imports["@macchiato-dev/terminal-use/controller"] = "/terminal-controller.js";
  return JSON.stringify({ imports });
}

async function providerAsset(pathname) {
  const prefix = `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/`;
  if (!pathname.startsWith(prefix) || pathname.includes("..") || pathname.includes("\\")) return null;
  const publicPath = pathname.slice(prefix.length);
  const asset = quickJsEmscriptenSandboxBrowserAssets.files.find((entry) => entry.publicPath === publicPath || `${entry.publicPath}.map` === publicPath);
  if (!asset) return new Response("Not found", { status: 404 });
  const sourceMap = `${asset.publicPath}.map` === publicPath;
  try {
    let body = await readFile(sourceMap ? asset.sourceMapPath : asset.filePath, "utf8");
    if (!sourceMap) for (const [from, to] of Object.entries(asset.rewrites || {})) body = body.replaceAll(from, to);
    return new Response(body, { headers: { "content-type": type(pathname) } });
  } catch { return new Response("Not found", { status: 404 }); }
}

function guestBundle() {
  return guestBundlePromise ||= build({ entryPoints: [join(repoRoot, "packages/terminal-use/src/guest.js")], bundle: true, format: "iife", platform: "browser", write: false }).then((result) => result.outputFiles[0].text);
}
function hostBundle() {
  return hostBundlePromise ||= build({ entryPoints: [join(repoRoot, "packages/terminal-use/src/controller.js")], bundle: true, format: "esm", platform: "browser", write: false, external: ["@macchiato-dev/browser-use/quickjs-dom-guest", "@macchiato-dev/quickjs-emscripten-sandbox"] }).then((result) => result.outputFiles[0].text);
}

export async function terminalUseAssetHandler(request) {
  const { pathname } = new URL(request.url);
  const provided = await providerAsset(pathname);
  if (provided) return provided;
  if (pathname === "/browser-use-quickjs-dom-guest.js") return new Response(await readFile(join(repoRoot, "packages/browser-use/src/quickjs-dom-guest.js"), "utf8"), { headers: { "content-type": type(pathname) } });
  if (pathname === "/terminal-guest.js") return new Response(await guestBundle(), { headers: { "content-type": type(pathname) } });
  if (pathname === "/terminal-controller.js") return new Response(await hostBundle(), { headers: { "content-type": type(pathname) } });
  if (pathname === "/style.css") return new Response(await readFile(join(directory, "style.css"), "utf8"), { headers: { "content-type": "text/css; charset=utf-8" } });
  return new Response("Not found", { status: 404 });
}

const standardHandler = createStandardWebAppHandler({
  directory, config: await readStandardAppConfig(directory), importMap: terminalUseImportMap(),
  resolveScript: async (source) => source === "/terminal-guest.js" ? guestBundle() : Promise.reject(new Error(`Undeclared guest script: ${source}`)),
  assets: terminalUseAssetHandler,
});

export async function terminalUseHandler(request) {
  const response = await (await standardHandler)(request);
  const headers = new Headers(response.headers);
  headers.set("content-security-policy", "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  headers.set("x-content-type-options", "nosniff");
  return new Response(response.body, { status: response.status, headers });
}
