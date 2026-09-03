import { spawn } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { closeTerminalSession, createTerminalSession, listTerminalSessions, readTerminalSession, writeTerminalSession } from "./terminal-sessions.js";
import { createPiAgent } from "./pi-agent.js";

const [socketPath, dataDir] = process.argv.slice(2);
const directory = new URL(".", import.meta.url).pathname;
const appSocket = `${socketPath}.app`;
mkdirSync(dataDir, { recursive: true });
rmSync(socketPath, { force: true });
rmSync(appSocket, { force: true });
const db = new DatabaseSync(join(dataDir, "workspace.sqlite"));
db.exec(`PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, text TEXT NOT NULL, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS terminal_runs(id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, stopped_at INTEGER);`);
const countActivity = db.prepare("SELECT count(*) AS count FROM activity");
const insertActivity = db.prepare("INSERT INTO activity(kind,text,created_at) VALUES (?,?,?)");
const recentActivity = db.prepare("SELECT id,kind,text,created_at AS createdAt FROM activity ORDER BY id DESC LIMIT 100");
const insertTerminal = db.prepare("INSERT OR REPLACE INTO terminal_runs(id,started_at,stopped_at) VALUES (?,?,NULL)");
const stopTerminal = db.prepare("UPDATE terminal_runs SET stopped_at=? WHERE id=?");
if (!countActivity.get().count) {
  insertActivity.run("system", "Workspace wrapper started", Date.now());
  insertActivity.run("log", "SQLite persistence enabled", Date.now());
}
let activeTerminalId = null;
let streamingAgentEntry = null;
const activityWaiters = new Map();
function activityValue() { return { activity: recentActivity.all().reverse().map((entry) => ({ ...entry, time: new Date(entry.createdAt).toISOString() })) }; }
function broadcastActivity() { const value = activityValue(); for (const [response, timeout] of activityWaiters) { clearTimeout(timeout); activityWaiters.delete(response); json(response, value); } }
const agent = createPiAgent({ cwd: join(directory, "agent-app"), dataDir, onEvent(event) {
  if (event.kind === "agent-delta") {
    if (!streamingAgentEntry) streamingAgentEntry = Number(insertActivity.run("agent-working", "", Date.now()).lastInsertRowid);
    db.prepare("UPDATE activity SET kind='agent', text=CASE WHEN kind='agent-working' THEN ? ELSE text || ? END WHERE id=?").run(event.text, event.text, streamingAgentEntry);
  } else if (event.kind === "agent-message") {
    if (streamingAgentEntry) db.prepare("UPDATE activity SET kind='agent', text=? WHERE id=?").run(event.text, streamingAgentEntry);
    else insertActivity.run("agent", event.text, Date.now());
    streamingAgentEntry = null;
  } else if (event.kind === "agent-end") {
    if (streamingAgentEntry) db.prepare("UPDATE activity SET kind='agent', text=CASE WHEN kind='agent-working' THEN 'Finished.' ELSE text END WHERE id=?").run(streamingAgentEntry);
    streamingAgentEntry = null;
  }
  else insertActivity.run(event.kind === "agent-tool" ? "tool" : "error", event.text, Date.now());
  broadcastActivity();
} });
let app = null;
let appStarting = null;
let appVersion = 0;
const watched = ["app-server.js", "index.html", "client.js", "terminal-workspace.js", "style.css", "workspace.css"];
function sourceVersion() { return Math.max(...watched.map((file) => statSync(join(directory, file)).mtimeMs)); }

function startApp() {
  if (appStarting) return appStarting;
  appStarting = (async () => {
    if (app) { app.kill("SIGTERM"); app = null; }
    rmSync(appSocket, { force: true });
    app = spawn(process.execPath, [join(directory, "app-server.js"), appSocket], { cwd: join(directory, "../.."), stdio: "ignore" });
    appVersion = sourceVersion();
    const deadline = Date.now() + 5_000;
    while (!statSafe(appSocket)) {
      if (Date.now() >= deadline) throw new Error("Workspace app child did not start");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  })().finally(() => { appStarting = null; });
  return appStarting;
}
function statSafe(path) { try { statSync(path); return true; } catch { return false; } }
async function ensureApp() { if (!app || app.exitCode !== null || sourceVersion() > appVersion) await startApp(); }
function json(response, value, status = 200) { response.writeHead(status, { "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(value)); }
async function requestBody(request) { const chunks = []; for await (const chunk of request) chunks.push(chunk); return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
function proxy(request, response) {
  const outgoing = httpRequest({ socketPath: appSocket, path: request.url, method: request.method, headers: request.headers }, (incoming) => { response.writeHead(incoming.statusCode, incoming.headers); incoming.pipe(response); });
  outgoing.on("error", (error) => { response.writeHead(502).end(error.message); }); request.pipe(outgoing);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://workspace");
    if (url.pathname === "/-/wrapper/health") return json(response, { ok: true, pid: process.pid, appPid: app?.pid || null, database: join(dataDir, "workspace.sqlite") });
    if (url.pathname === "/-/app/restart" && request.method === "POST") { await startApp(); return json(response, { ok: true, pid: app.pid }); }
    if (url.pathname === "/api/activity" && request.method === "GET") return json(response, activityValue());
    if (url.pathname === "/api/activity/wait" && request.method === "GET") { const current = activityValue(); const after = Number(url.searchParams.get("after")) || 0; if ((current.activity.at(-1)?.id || 0) > after) return json(response, current); const timeout = setTimeout(() => { activityWaiters.delete(response); json(response, activityValue()); }, 25_000); activityWaiters.set(response, timeout); response.once("close", () => { clearTimeout(timeout); activityWaiters.delete(response); }); return; }
    if (url.pathname === "/api/activity" && request.method === "POST") { const value = await requestBody(request); const text = String(value.text || "").trim().slice(0, 500); if (!text) return json(response, { error: "text is required" }, 400); const result = insertActivity.run("chat", text, Date.now()); broadcastActivity(); return json(response, { id: Number(result.lastInsertRowid), kind: "chat", text }, 201); }
    if (url.pathname === "/api/agent/status" && request.method === "GET") return json(response, agent.status());
    if (url.pathname === "/api/agent/prompt" && request.method === "POST") { const value = await requestBody(request); const text = String(value.text || "").trim().slice(0, 4000); if (!text) return json(response, { error: "text is required" }, 400); insertActivity.run("you", text, Date.now()); if (!streamingAgentEntry) streamingAgentEntry = Number(insertActivity.run("agent-working", "Working…", Date.now()).lastInsertRowid); broadcastActivity(); agent.prompt(text); return json(response, { accepted: true }, 202); }
    if (url.pathname === "/api/terminal/session" && request.method === "POST") { const created = createTerminalSession({ cwd: join(directory, "../..") }); activeTerminalId = created.id; insertTerminal.run(created.id, Date.now()); insertActivity.run("terminal", "Opened interactive shell", Date.now()); broadcastActivity(); return json(response, created, 201); }
    if (url.pathname === "/api/terminal/sessions" && request.method === "GET") return json(response, { sessions: listTerminalSessions(), activeTerminalId });
    if (url.pathname === "/api/terminal/active" && request.method === "GET") { const available = listTerminalSessions().filter((item) => !item.closed); return json(response, { id: available.some((item) => item.id === activeTerminalId) ? activeTerminalId : available.at(-1)?.id || null }); }
    if (url.pathname === "/api/terminal/active" && request.method === "POST") { const value = await requestBody(request); if (!listTerminalSessions().some((item) => item.id === value.id && !item.closed)) return json(response, { error: "terminal session not found" }, 404); activeTerminalId = value.id; response.writeHead(204).end(); return; }
    if (url.pathname === "/api/terminal/input" && request.method === "POST") { const value = await requestBody(request); writeTerminalSession(value.id, value.data); response.writeHead(204).end(); return; }
    if (url.pathname === "/api/terminal/output" && request.method === "GET") return json(response, readTerminalSession(url.searchParams.get("id"), Number(url.searchParams.get("cursor")) || 0));
    if (url.pathname === "/api/terminal/session" && request.method === "DELETE") { const value = await requestBody(request); closeTerminalSession(value.id); stopTerminal.run(Date.now(), value.id); if (activeTerminalId === value.id) activeTerminalId = null; response.writeHead(204).end(); return; }
    await ensureApp(); proxy(request, response);
  } catch (error) { json(response, { error: error.message }, 500); }
});
await startApp();
server.listen(socketPath);
