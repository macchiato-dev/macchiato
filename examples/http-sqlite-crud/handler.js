import { readFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { createSandbox, nodeHttpModuleSource, nodeSqliteModuleSource } from "@macchiato-dev/quickjs-emscripten-sandbox";

const directory = dirname(fileURLToPath(import.meta.url));
const backendSource = readFileSync(join(directory, "backend.js"), "utf8");
const httpUseBackendSource = readFileSync(resolve(directory, "../../packages/http-use/src/backend.js"), "utf8");
let runtimePromise;

function jsonSafe(value) {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  return value;
}

async function createBackendRuntime() {
  const database = new DatabaseSync(":memory:");
  let serverId;
  const sandbox = await createSandbox({ modules: {
    "node:http": nodeHttpModuleSource(),
    "node:sqlite": nodeSqliteModuleSource(),
    "@macchiato-dev/http-use/backend": httpUseBackendSource,
  } });
  sandbox.installJsonHostFunction("__macchiatoHost", (message) => {
    if (message.op === "http.createServer") return { id: "http-use-example" };
    if (message.op === "http.listen") { serverId = message.id; return { listening: true, sandboxed: true }; }
    if (message.op === "http.close") return { closed: true };
    if (message.op === "sqlite.open") return { id: "notes" };
    if (message.op === "sqlite.close") return { closed: true };
    if (message.db !== "notes") throw new Error("SQLite database is not granted");
    if (message.op === "sqlite.exec") { database.exec(message.sql); return { ok: true }; }
    const statement = database.prepare(message.sql);
    if (message.op === "sqlite.all") return jsonSafe(statement.all(...message.params));
    if (message.op === "sqlite.get") return jsonSafe(statement.get(...message.params)) ?? null;
    if (message.op === "sqlite.run") return jsonSafe(statement.run(...message.params));
    throw new Error(`Unsupported backend capability: ${message.op}`);
  });
  sandbox.evalModule(backendSource, "http-sqlite-crud-backend.js");
  if (!serverId) throw new Error("Sandbox backend did not listen");
  return {
    dispatch(request, body) {
      return sandbox.callJsonFunction("__macchiatoHttpDispatch", {
        id: serverId,
        method: request.method,
        url: new URL(request.url).pathname,
        headers: Object.fromEntries(request.headers),
        body,
      });
    },
  };
}

export function setupHttpSqliteCrud() {
  runtimePromise ||= createBackendRuntime();
}

function page() {
  const imports = {
    "@macchiato-dev/quickjs-emscripten-sandbox": "/-/quickjs-emscripten-sandbox/index.js",
    "@jitl/quickjs-ffi-types": "/-/quickjs-emscripten-sandbox/ffi-types.js",
    "@jitl/quickjs-singlefile-browser-release-sync": "/-/quickjs-emscripten-sandbox/singlefile-browser-release-sync.js",
    "quickjs-emscripten-core": "/-/quickjs-emscripten-sandbox/quickjs-core.js",
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SQLite Notes</title><link rel="stylesheet" href="/style.css"><script type="importmap">${JSON.stringify({ imports })}</script></head><body><main><h1>SQLite notes</h1><p>One Node-style backend, currently hosted inside QuickJS/WASM.</p><p class="runtime"><strong>Backend:</strong> sandboxed backend.js → partial node:http → partial node:sqlite</p><form id="new-note"><input name="title" required maxlength="120" placeholder="A small thing to remember"><button>Add</button></form><ul id="notes"></ul><p id="status" role="status"></p><details><summary>Inspect the boundary</summary><p>The browser receives only named operations from <a href="/api/config">/api/config</a>. You can also <a href="/backend.js">read the unchanged backend source</a> evaluated by QuickJS.</p></details></main><script type="module" src="/client.js"></script></body></html>`;
}

export async function httpSqliteCrudHandler(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    setupHttpSqliteCrud();
    const body = request.method === "GET" || request.method === "HEAD" ? "" : await request.text();
    const response = (await runtimePromise).dispatch(request, body);
    return new Response(response.body, { status: response.status, headers: response.headers });
  }
  if (url.pathname === "/" || url.pathname === "/index.html") return new Response(page(), { headers: { "content-type": "text/html; charset=utf-8" } });
  const files = { "/client.js": "client.js", "/sandbox.js": "sandbox.js", "/http-use.js": "../../packages/http-use/src/index.js", "/style.css": "style.css", "/backend.js": "backend.js" };
  if (files[url.pathname]) {
    const body = await readFileAsync(join(directory, files[url.pathname]), "utf8");
    const type = url.pathname.endsWith(".css") ? "text/css" : "application/javascript";
    return new Response(body, { headers: { "content-type": `${type}; charset=utf-8` } });
  }
  return new Response("Not found", { status: 404 });
}
