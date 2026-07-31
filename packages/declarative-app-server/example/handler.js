import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createStandardWebAppHandler, readStandardAppConfig } from "@macchiato-dev/declarative-app-server";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";

const directory = dirname(fileURLToPath(import.meta.url));
const packages = resolve(directory, "../..");
let hostBundle;

function importMap() {
  const imports = {};
  for (const [specifier, path] of Object.entries(quickJsEmscriptenSandboxBrowserAssets.imports)) imports[specifier] = `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/${path}`;
  imports["@macchiato-dev/browser-use/quickjs-dom-guest"] = "/browser-use-quickjs-dom-guest.js";
  return JSON.stringify({ imports });
}

async function assets(request) {
  const pathname = new URL(request.url).pathname;
  const prefix = `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/`;
  if (pathname.startsWith(prefix) && !pathname.includes("..") && !pathname.includes("\\")) {
    const publicPath = pathname.slice(prefix.length);
    const sourceMap = publicPath.endsWith(".map");
    const asset = quickJsEmscriptenSandboxBrowserAssets.files.find((entry) => entry.publicPath === publicPath || `${entry.publicPath}.map` === publicPath);
    if (!asset) return new Response("Not found", { status: 404 });
    let body = await readFile(sourceMap ? asset.sourceMapPath : asset.filePath, "utf8");
    if (!sourceMap) for (const [from, to] of Object.entries(asset.rewrites || {})) body = body.replaceAll(from, to);
    return new Response(body, { headers: { "content-type": sourceMap ? "application/json" : "application/javascript; charset=utf-8" } });
  }
  if (pathname === "/browser-use-quickjs-dom-guest.js") return new Response(await readFile(resolve(packages, "browser-use/src/quickjs-dom-guest.js"), "utf8"), { headers: { "content-type": "application/javascript; charset=utf-8" } });
  if (pathname === "/browser-host.js") {
    hostBundle ||= build({ entryPoints: [resolve(packages, "browser-use/src/index.js")], bundle: true, format: "esm", platform: "browser", write: false }).then((result) => result.outputFiles[0].text);
    return new Response(await hostBundle, { headers: { "content-type": "application/javascript; charset=utf-8" } });
  }
  return null;
}

export const exampleHandler = await createStandardWebAppHandler({ directory, config: await readStandardAppConfig(directory), importMap: importMap(), assets });
