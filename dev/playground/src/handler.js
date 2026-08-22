import { machineControllerSupervisor } from "./supervisor.js";

const ignoredRequestHeaders = new Set(["connection", "host", "transfer-encoding"]);
const ignoredResponseHeaders = new Set(["connection", "content-encoding", "content-length", "transfer-encoding"]);

export async function machineControllerHandler(request, _app, context) {
  const supervisor = machineControllerSupervisor({ dataDir: context.dataDir });
  const url = new URL(request.url);
  if (url.pathname === "/-/controller/status") return Response.json(supervisor.status());
  if (url.pathname === "/-/controller/logs") return Response.json({ logs: supervisor.logs(url.searchParams.get("limit")) });
  if (url.pathname === "/-/controller/stop" && request.method === "POST") {
    supervisor.stop();
    return new Response(null, { status: 204 });
  }
  await supervisor.start();
  const headers = new Headers();
  for (const [name, value] of request.headers) if (!ignoredRequestHeaders.has(name.toLowerCase())) headers.set(name, value);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  if (body && body.byteLength > 16 * 1024 * 1024) return new Response("Request too large", { status: 413 });
  const response = await fetch(`http://127.0.0.1:${supervisor.status().port}${url.pathname}${url.search}`, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  });
  const responseHeaders = new Headers();
  for (const [name, value] of response.headers) if (!ignoredResponseHeaders.has(name.toLowerCase())) responseHeaders.set(name, value);
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
