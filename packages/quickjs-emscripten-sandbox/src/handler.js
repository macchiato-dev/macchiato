import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInSandbox } from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HTML = `<!DOCTYPE html>
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

/**
 * @param {string} pathname
 * @returns {Promise<Response>}
 */
async function serveFile(pathname) {
  try {
    const filePath = join(__dirname, pathname);
    const content = await readFile(filePath);
    const type = pathname.endsWith(".map")
      ? "application/json"
      : pathname.endsWith(".js")
        ? "application/javascript"
        : "application/octet-stream";
    return new Response(content, { headers: { "content-type": type } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function sandboxHandler(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/" || pathname === "/index.html") {
    return new Response(HTML, { headers: { "content-type": "text/html" } });
  }

  if (pathname === "/run" && request.method === "POST") {
    const code = await request.text();
    const result = await runInSandbox(code);
    return Response.json(result);
  }

  if (pathname.endsWith(".js") || pathname.endsWith(".map")) {
    return serveFile(pathname);
  }

  return new Response("Not found", { status: 404 });
}
