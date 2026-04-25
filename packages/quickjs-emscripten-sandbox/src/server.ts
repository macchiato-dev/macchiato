#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { runInSandbox } from "./index.js";

const args = "Deno" in globalThis
  ? (globalThis as unknown as { Deno: { args: string[] } }).Deno.args
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

function htmlPage(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>QuickJS Sandbox</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    textarea { width: 100%; height: 200px; font-family: monospace; font-size: 14px; }
    button { padding: 0.5rem 1rem; font-size: 16px; margin-top: 0.5rem; }
    pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; }
    .error { color: #c00; }
  </style>
</head>
<body>
  <h1>QuickJS Sandbox</h1>
  <textarea id="code">1 + 1</textarea>
  <br>
  <button onclick="run()">Run</button>
  <pre id="output"></pre>
  <script>
    async function run() {
      const code = document.getElementById('code').value;
      const res = await fetch('/run', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: code
      });
      const data = await res.json();
      const out = document.getElementById('output');
      if (data.ok) {
        out.className = '';
        out.textContent = JSON.stringify(data.value, null, 2);
      } else {
        out.className = 'error';
        out.textContent = data.error;
      }
    }
  </script>
</body>
</html>`;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    if (req.url === "/" || req.url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(htmlPage());
    } else if (req.url === "/run" && req.method === "POST") {
      const code = await readBody(req);
      const result = await runInSandbox(code);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    } else {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
    }
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
