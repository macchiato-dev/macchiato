import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMarkdownHistoryStore } from "./markdown-dialect.js";
import { createSqliteHistoryStore } from "./sqlite-dialect.js";

const directory = dirname(fileURLToPath(import.meta.url));
const sqliteStores = new WeakMap();
const markdownStores = new Map();

function page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Character History TODO</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header>
    <div><p class="eyebrow">Storage dialect proof of concept</p><h1>Character History TODO</h1></div>
    <label class="backend">Backend
      <select id="backend"><option value="sqlite">SQLite</option><option value="markdown">Markdown</option></select>
    </label>
  </header>
  <main>
    <section class="workbench">
      <form id="create-form"><label for="new-title">New task</label><div class="new-row"><input id="new-title" maxlength="500" required placeholder="Type a task"><button>Add task</button></div></form>
      <ul id="todos" aria-label="Tasks"></ul>
      <p id="empty">No tasks in this backend yet.</p>
    </section>
    <section class="history" aria-labelledby="history-title">
      <div class="history-heading"><div><p class="eyebrow">Character-level replay</p><h2 id="history-title">History</h2></div><output id="position">0 / 0</output></div>
      <div class="player">
        <button id="play" type="button" aria-label="Play history">Play</button>
        <button id="pause" type="button" aria-label="Pause history" disabled>Pause</button>
        <input id="timeline" type="range" min="0" max="0" value="0" aria-label="History timeline">
      </div>
      <div id="replay" class="replay" aria-live="polite"></div>
      <ol id="events" class="events"></ol>
    </section>
  </main>
  <footer><a href="/history.md">Inspect Markdown dialect</a><span>SQLite uses normalized event and edit-action tables.</span></footer>
  <script type="module" src="/client.js"></script>
</body>
</html>`;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function storesFor(context) {
  if (!context.db) throw new Error("TODO history requires the app SQLite context");
  let sqlite = sqliteStores.get(context.db);
  if (!sqlite) {
    sqlite = createSqliteHistoryStore(context.db);
    sqliteStores.set(context.db, sqlite);
  }
  const base = context.dataDir || dirname(context.dbPath);
  const markdownFile = join(base, "todo-history", "history.md");
  let markdown = markdownStores.get(markdownFile);
  if (!markdown) {
    markdown = createMarkdownHistoryStore(markdownFile);
    markdownStores.set(markdownFile, markdown);
  }
  return { sqlite, markdown };
}

function selectedStore(url, context) {
  const backend = url.searchParams.get("backend") || "sqlite";
  const store = storesFor(context)[backend];
  if (!store) throw new Error("Unknown history backend");
  return store;
}

export async function todoHistoryHandler(request, _app = {}, context = {}) {
  const url = new URL(request.url);
  try {
    if (request.method === "GET" && url.pathname === "/api/snapshot") {
      const store = selectedStore(url, context);
      const [todos, events] = await Promise.all([store.state(), store.listEvents()]);
      return json({ backend: store.kind, todos, events });
    }
    if (request.method === "POST" && url.pathname === "/api/events") {
      const length = Number(request.headers.get("content-length") || 0);
      if (length > 256_000) return json({ error: "Event is too large" }, 413);
      const store = selectedStore(url, context);
      const event = await store.append(await request.json());
      return json({ event }, 201);
    }
    if (request.method === "GET" && url.pathname === "/history.md") {
      const store = storesFor(context).markdown;
      await store.listEvents();
      return new Response(await readFile(store.file, "utf8"), {
        headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" },
      });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD, POST" } });
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(request.method === "HEAD" ? null : page(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'",
          "x-content-type-options": "nosniff",
        },
      });
    }
    const asset = url.pathname === "/client.js"
      ? "client.js"
      : url.pathname === "/model.js"
        ? "model.js"
        : url.pathname === "/style.css"
          ? "style.css"
          : null;
    if (asset) {
      return new Response(request.method === "HEAD" ? null : await readFile(join(directory, asset), "utf8"), {
        headers: { "content-type": asset.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8" },
      });
    }
    return new Response("Not found", { status: 404 });
  } catch (error) {
    return json({ error: error?.message || "History operation failed" }, 400);
  }
}
