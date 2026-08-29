#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(new URL("playground", import.meta.url).pathname);
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/playground.js", ["playground.js", "text/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/evm.wasm", ["evm.wasm", "application/wasm"]],
]);

export function createEvmPlaygroundServer() {
  return createServer(async (request, response) => {
    const entry = files.get(new URL(request.url, "http://localhost").pathname);
    if (!entry || !["GET", "HEAD"].includes(request.method)) {
      response.writeHead(entry ? 405 : 404, { "content-type": "text/plain; charset=utf-8" });
      response.end(entry ? "Method not allowed" : "Not found");
      return;
    }
    try {
      const body = await readFile(resolve(root, entry[0]));
      response.writeHead(200, {
        "content-type": entry[1],
        "content-length": body.byteLength,
        "cache-control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.EVM_PLAYGROUND_PORT || 3042);
  const host = process.env.EVM_PLAYGROUND_HOST || "127.0.0.1";
  createEvmPlaygroundServer().listen(port, host, () => {
    console.log(`EVM playground running on http://${host}:${port}`);
  });
}
