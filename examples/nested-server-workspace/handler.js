import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const supervisors = new Map();
const ignoredHeaders = new Set(["connection", "host", "transfer-encoding"]);

function proxy(socketPath, request) {
  return new Promise(async (resolve, reject) => {
    const url = new URL(request.url);
    const headers = Object.fromEntries([...request.headers].filter(([name]) => !ignoredHeaders.has(name.toLowerCase())));
    const body = request.method === "GET" || request.method === "HEAD" ? null : Buffer.from(await request.arrayBuffer());
    if (body) headers["content-length"] = String(body.length);
    const outgoing = httpRequest({ socketPath, path: `${url.pathname}${url.search}`, method: request.method, headers }, (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.on("end", () => resolve(new Response(request.method === "HEAD" ? null : Buffer.concat(chunks), {
        status: incoming.statusCode,
        statusText: incoming.statusMessage,
        headers: Object.entries(incoming.headers).filter(([name]) => !ignoredHeaders.has(name.toLowerCase())).map(([name, value]) => [name, String(value)]),
      })));
    });
    outgoing.on("error", reject);
    outgoing.end(body);
  });
}

async function healthy(socketPath) {
  try {
    const response = await proxy(socketPath, new Request("http://workspace/-/wrapper/health"));
    return response.ok;
  } catch { return false; }
}

async function wrapper(dataDir) {
  const socketPath = join(dataDir, "workspace-wrapper.sock");
  if (await healthy(socketPath)) return socketPath;
  if (!supervisors.has(socketPath)) {
    supervisors.set(socketPath, (async () => {
      await mkdir(dataDir, { recursive: true });
      const child = spawn(process.execPath, [new URL("./wrapper-server.js", import.meta.url).pathname, socketPath, dataDir], {
        cwd: new URL("../..", import.meta.url).pathname,
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      const deadline = Date.now() + 5_000;
      while (!(await healthy(socketPath))) {
        if (Date.now() >= deadline) throw new Error("Workspace wrapper did not start");
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    })().finally(() => supervisors.delete(socketPath)));
  }
  await supervisors.get(socketPath);
  return socketPath;
}

export async function nestedServerWorkspaceHandler(request, _app, context) {
  return proxy(await wrapper(context.dataDir), request);
}
