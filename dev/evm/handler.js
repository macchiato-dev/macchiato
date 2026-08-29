import { readFile } from "node:fs/promises";

const root = new URL("./playground/", import.meta.url);
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/playground.js", ["playground.js", "application/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/evm.wasm", ["evm.wasm", "application/wasm"]],
]);

export async function evmPlaygroundHandler(request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }
  const asset = assets.get(new URL(request.url).pathname);
  if (!asset) return new Response("Not found", { status: 404 });
  const body = request.method === "HEAD" ? null : await readFile(new URL(asset[0], root));
  return new Response(body, {
    headers: {
      "content-type": asset[1],
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
