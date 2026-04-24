#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const args = "Deno" in globalThis
  ? (globalThis as unknown as { Deno: { args: string[] } }).Deno.args
  : process.argv.slice(2);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSubdomain(host: string): string {
  const name = host.split(":")[0];
  return name.split(".")[0] || "default";
}

let host = "127.0.0.1";
let port = 8765;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--host" || arg === "-H" || arg === "-b") {
    host = args[++i] ?? host;
  } else if (arg === "--port" || arg === "-p") {
    port = parseInt(args[++i] ?? String(port), 10);
  } else if (arg === "--help" || arg === "-h") {
    console.log("Usage: macchiato-app [-b|--host <host>] [--port <port>]");
    process.exit(0);
  }
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const hostHeader = req.headers.host || "localhost";
  const subdomain = getSubdomain(hostHeader);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html><html><body><h1>${escapeHtml(subdomain)}</h1></body></html>`);
});

if (host === "0.0.0.0") {
  server.listen(port, () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
} else {
  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
  });
}
