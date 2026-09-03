#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { request } from "node:http";
import { join } from "node:path";

const [command, ...args] = process.argv.slice(2);
const port = Number(process.env.WORKSPACE_PORT || 3030);
const dataDir = process.env.WORKSPACE_DATA_DIR || join(process.env.HOME, ".macchiato", "default");
const { apiKey } = JSON.parse(await readFile(join(dataDir, ".workspace-dev-auth.json"), "utf8"));
const session = createHash("sha256").update(`workspace-dev-cookie\0${apiKey}`).digest("base64url");
const cookie = `workspace_dev_session=${session}`;

function api(path, { method = "GET", body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = request({ hostname: "127.0.0.1", port, path, method, headers: {
      host: `workspace-dev.localhost:${port}`, cookie,
      ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
    } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`${response.statusCode}: ${text}`));
        resolve(text ? JSON.parse(text) : null);
      });
    });
    req.on("error", reject);
    if (payload) req.end(payload); else req.end();
  });
}

async function activeId() {
  const { id } = await api("/api/terminal/active");
  if (!id) throw new Error("No shared terminal exists; open or refresh workspace-dev first");
  return id;
}

if (command === "active") console.log(await activeId());
else if (command === "create") console.log((await api("/api/terminal/session", { method: "POST" })).id);
else if (command === "write") await api("/api/terminal/input", { method: "POST", body: { id: await activeId(), data: args.join(" ") } });
else if (command === "read") console.log(JSON.stringify(await api(`/api/terminal/output?id=${encodeURIComponent(await activeId())}&cursor=${Number(args[0]) || 0}`)));
else if (command === "chat") await api("/api/activity", { method: "POST", body: { text: args.join(" ") } });
else if (command === "activity") console.log(JSON.stringify(await api("/api/activity"), null, 2));
else if (command === "status") console.log(JSON.stringify(await api("/-/wrapper/health"), null, 2));
else if (command === "restart-app") console.log(JSON.stringify(await api("/-/app/restart", { method: "POST" }), null, 2));
else if (command === "agent-status") console.log(JSON.stringify(await api("/api/agent/status"), null, 2));
else if (command === "agent-prompt") console.log(JSON.stringify(await api("/api/agent/prompt", { method: "POST", body: { text: args.join(" ") } }), null, 2));
else throw new Error("Usage: workspace-terminal <active|create|write DATA|read [CURSOR]|chat TEXT|activity|status|restart-app|agent-status|agent-prompt TEXT>");
