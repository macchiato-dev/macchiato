import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const socketPath = process.argv[2];
const directory = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(directory, "../..");
const execFileAsync = promisify(execFile);
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]], ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/client.js", ["client.js", "application/javascript; charset=utf-8"]],
  ["/terminal-workspace.js", ["terminal-workspace.js", "application/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]], ["/workspace.css", ["workspace.css", "text/css; charset=utf-8"]],
  ["/xterm.js", ["../../node_modules/@xterm/xterm/lib/xterm.mjs", "application/javascript; charset=utf-8"]],
  ["/xterm-addon-fit.js", ["../../node_modules/@xterm/addon-fit/lib/addon-fit.mjs", "application/javascript; charset=utf-8"]],
  ["/xterm.css", ["../../node_modules/@xterm/xterm/css/xterm.css", "text/css; charset=utf-8"]],
]);
const csp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://workspace").pathname;
    if (pathname === "/-/app/health") return response.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
    if (pathname === "/api/changes") {
      const [{ stdout: status }, { stdout: log }] = await Promise.all([
        execFileAsync("git", ["status", "--short"], { cwd: repoRoot, maxBuffer: 256 * 1024 }),
        execFileAsync("git", ["log", "-3", "--pretty=format:%h%x09%s"], { cwd: repoRoot, maxBuffer: 64 * 1024 }),
      ]);
      const value = { files: status.trim().split("\n").filter(Boolean).slice(0, 30).map((line) => ({ state: line.slice(0, 2), path: line.slice(3) })), commits: log.trim().split("\n").filter(Boolean).map((line) => { const [hash, ...message] = line.split("\t"); return { hash, message: message.join("\t") }; }) };
      return response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(value));
    }
    if (pathname.startsWith("/agent-app/")) {
      const name = pathname.slice(11) || "index.html";
      if (!/^[a-zA-Z0-9._/-]+$/.test(name) || name.split("/").includes("..")) return response.writeHead(404).end("Not found");
      const type = name.endsWith(".html") ? "text/html; charset=utf-8" : name.endsWith(".css") ? "text/css; charset=utf-8" : name.endsWith(".js") ? "application/javascript; charset=utf-8" : "application/octet-stream";
      const body = await readFile(join(directory, "agent-app", name));
      response.writeHead(200, { "content-type": type, "cache-control": "no-store", "content-security-policy": csp });
      return response.end(request.method === "HEAD" ? null : body);
    }
    const asset = assets.get(pathname);
    if (!asset) return response.writeHead(404).end("Not found");
    const body = await readFile(join(directory, asset[0]));
    response.writeHead(200, { "content-type": asset[1], "cache-control": "no-store", "content-security-policy": csp, "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" });
    response.end(request.method === "HEAD" ? null : body);
  } catch (error) { response.writeHead(500).end(error.message); }
});
server.listen(socketPath);
