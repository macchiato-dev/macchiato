#!/usr/bin/env node
import { createServer } from "node:http";
import { sandboxHandler } from "./handler.js";

const args = "Deno" in globalThis
  ? globalThis.Deno.args
  : process.argv.slice(2);

let host = "127.0.0.1";
let port = 8765;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--host" || arg === "-H" || arg === "-b") {
    host = args[++i] ?? host;
  } else if (arg === "--port" || arg === "-p") {
    port = parseInt(args[++i] ?? String(port), 10);
  } else if (arg === "--help" || arg === "-h") {
    console.log("Usage: macchiato-quickjs-emscripten-sandbox [-b|--host <host>] [--port <port>]");
    process.exit(0);
  }
}

async function toFetchResponse(req) {
  const hostHeader = req.headers.host || "localhost";
  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      })
    : undefined;

  return new Request(`http://${hostHeader}${req.url}`, {
    method: req.method,
    headers: new Headers(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
    body,
  });
}

const server = createServer(async (req, res) => {
  try {
    const request = await toFetchResponse(req);
    const response = await sandboxHandler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(String(err));
  }
});

if (host === "0.0.0.0") {
  server.listen(port, () => {
    console.log(`Sandbox server running on http://0.0.0.0:${port}`);
  });
} else {
  server.listen(port, host, () => {
    console.log(`Sandbox server running on http://${host}:${port}`);
  });
}
