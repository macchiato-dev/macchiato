#!/usr/bin/env node
import { createServer } from "node:http";
import { sandboxHandler } from "@macchiato-dev/quickjs-emscripten-sandbox/handler";

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
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function route(request) {
  const hostHeader = request.headers.get("host") || "localhost";
  const subdomain = getSubdomain(hostHeader);

  if (subdomain === "macchiato-quickjs-emscripten-sandbox") {
    return sandboxHandler(request);
  }

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
    (req) => route(req)
  );
} else {
  const server = createServer(async (req, res) => {
    try {
      const hostHeader = req.headers.host || "localhost";
      const body = req.method !== "GET" && req.method !== "HEAD"
        ? await new Promise((resolve, reject) => {
            const chunks = [];
            req.on("data", (c) => chunks.push(c));
            req.on("end", () => resolve(Buffer.concat(chunks)));
            req.on("error", reject);
          })
        : undefined;

      const request = new Request(`http://${hostHeader}${req.url}`, {
        method: req.method,
        headers: new Headers(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
        body,
      });

      const response = await route(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(String(err));
    }
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
