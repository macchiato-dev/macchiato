import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";

const directory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(directory, "../../../..");
let guestBundle;
let hostBundle;

function type(path) {
  if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (path.endsWith(".wasm")) return "application/wasm";
  if (path.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

async function bundle(entry, options = {}) {
  return (await build({
    entryPoints: [entry], bundle: true, write: false, sourcemap: false,
    define: {
      __VUE_OPTIONS_API__: "false",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
    },
    ...options,
  })).outputFiles[0].text;
}

async function providerAsset(pathname) {
  const prefix = `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/`;
  if (!pathname.startsWith(prefix) || pathname.includes("..")) return null;
  const publicPath = pathname.slice(prefix.length);
  const asset = quickJsEmscriptenSandboxBrowserAssets.files.find((entry) => entry.publicPath === publicPath || `${entry.publicPath}.map` === publicPath);
  if (!asset) return new Response("Not found", { status: 404 });
  const sourceMap = `${asset.publicPath}.map` === publicPath;
  let body = await readFile(sourceMap ? asset.sourceMapPath : asset.filePath, "utf8");
  if (!sourceMap) for (const [from, to] of Object.entries(asset.rewrites || {})) body = body.replaceAll(from, to);
  return new Response(body, { headers: { "content-type": type(pathname) } });
}

export async function vueDomEditorHandler(request) {
  const { pathname } = new URL(request.url);
  const provider = await providerAsset(pathname);
  if (provider) return provider;
  if (pathname === "/") {
    const imports = Object.fromEntries(Object.entries(quickJsEmscriptenSandboxBrowserAssets.imports).map(([key, value]) => [key, `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/${value}`]));
    const html = (await readFile(join(directory, "index.html"), "utf8")).replace("__IMPORT_MAP__", JSON.stringify({ imports }));
    return response(html, "text/html; charset=utf-8");
  }
  if (pathname === "/client.js") return response(await readFile(join(directory, "client.js"), "utf8"), type(pathname));
  if (pathname === "/style.css") return response(await readFile(join(directory, "style.css"), "utf8"), "text/css; charset=utf-8");
  if (pathname === "/vue-dom-guest.js") {
    guestBundle ||= bundle(join(repoRoot, "packages/vue-dom-use/src/guest.js"), { format: "iife", platform: "neutral" });
    return response(await guestBundle, type(pathname));
  }
  if (pathname === "/vue-dom-controller.js") {
    hostBundle ||= bundle(join(repoRoot, "packages/vue-dom-use/src/controller.js"), { format: "esm", platform: "browser", external: ["@macchiato-dev/quickjs-emscripten-sandbox"] });
    return response(await hostBundle, type(pathname));
  }
  return new Response("Not found", { status: 404 });
}

function response(body, contentType) {
  return new Response(body, { headers: {
    "content-type": contentType,
    "content-security-policy": "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self'; connect-src 'self'; img-src data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
  } });
}
