import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";

const directory = dirname(fileURLToPath(import.meta.url));
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/client.js", ["client.js", "application/javascript; charset=utf-8"]],
  ["/model.js", ["model.js", "application/javascript; charset=utf-8"]],
  ["/preview-runtime.js", ["preview-runtime.js", "application/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
]);

async function providerAsset(pathname) {
  if (pathname === "/browser-use-host.js") return new Response(await readFile(join(directory, "../../packages/browser-use/src/index.js")), { headers: { "content-type": "application/javascript; charset=utf-8" } });
  if (pathname === "/browser-use-quickjs-dom-guest.js") return new Response(await readFile(join(directory, "../../packages/browser-use/src/quickjs-dom-guest.js")), { headers: { "content-type": "application/javascript; charset=utf-8" } });
  const prefix = `/-/${quickJsEmscriptenSandboxBrowserAssets.namespace}/`;
  if (!pathname.startsWith(prefix) || pathname.includes("..") || pathname.includes("\\")) return null;
  const publicPath = pathname.slice(prefix.length);
  const sourceMap = publicPath.endsWith(".map");
  const asset = quickJsEmscriptenSandboxBrowserAssets.files.find((entry) => entry.publicPath === publicPath || `${entry.publicPath}.map` === publicPath);
  if (!asset) return new Response("Not found", { status: 404 });
  let body = await readFile(sourceMap ? asset.sourceMapPath : asset.filePath, "utf8");
  if (!sourceMap) for (const [from, to] of Object.entries(asset.rewrites || {})) body = body.replaceAll(from, to);
  return new Response(body, { headers: { "content-type": sourceMap ? "application/json" : "application/javascript; charset=utf-8" } });
}

export async function focusedAppHandler(request) {
  const { pathname } = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  const provided = await providerAsset(pathname);
  if (provided) return provided;
  const asset = assets.get(pathname);
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(request.method === "HEAD" ? null : await readFile(join(directory, asset[0])), {
    headers: {
      "content-type": asset[1],
      "cache-control": pathname === "/" || pathname === "/index.html" ? "no-cache" : "public, max-age=300",
      "content-security-policy": "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}
