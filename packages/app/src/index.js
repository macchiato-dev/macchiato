#!/usr/bin/env node
import { createServer } from "node:http";

const args = "Deno" in globalThis
  ? globalThis.Deno.args
  : process.argv.slice(2);

/**
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {string} host
 * @returns {string}
 */
function getSubdomain(host) {
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

/**
 * @param {string} hostHeader
 * @returns {Response}
 */
function respond(hostHeader) {
  const subdomain = getSubdomain(hostHeader);
  return new Response(
    `<!DOCTYPE html><html><body><h1>${escapeHtml(subdomain)}</h1></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

if ("Deno" in globalThis) {
  const denoHost = host === "0.0.0.0" ? "::" : host;
  console.log(`Server running on http://${host === "0.0.0.0" ? "0.0.0.0" : denoHost}:${port}`);
  globalThis.Deno.serve(
    { port, hostname: denoHost },
    (req) => respond(req.headers.get("host") || "localhost")
  );
} else {
  const server = createServer((req, res) => {
    respond(req.headers.host || "localhost").text().then((body) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
    });
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
}
