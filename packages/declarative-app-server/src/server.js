import { createServer } from "node:http";
import { renderDeclarativeApp, standardLayoutCss } from "./render.js";

export function createDeclarativeAppHandler(app, options = {}) {
  const html = renderDeclarativeApp(app, options);
  return async function handle(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/" || pathname === "/index.html") return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (pathname === "/-/app.css") return new Response(standardLayoutCss, { headers: { "content-type": "text/css; charset=utf-8" } });
    const asset = await options.assets?.(request);
    return asset || new Response("Not found", { status: 404 });
  };
}

export async function serveDeclarativeApp(app, options = {}) {
  const handler = createDeclarativeAppHandler(app, options);
  return serveHttpHandler(handler, options);
}

export async function serveHttpHandler(handler, options = {}) {
  const requestedPort = options.port ?? (process.env.PORT ? Number(process.env.PORT) : 0);
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) throw new TypeError("PORT must be a valid TCP port");
  const host = options.host || process.env.HOST || "127.0.0.1";
  const server = createServer(async (incoming, outgoing) => {
    try {
      const request = new Request(`http://${incoming.headers.host || `${host}:${requestedPort}`}${incoming.url}`, { method: incoming.method, headers: incoming.headers });
      const response = await handler(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" }); outgoing.end("Internal server error");
      options.onError?.(error);
    }
  });
  await new Promise((resolve, reject) => server.once("error", reject).listen(requestedPort, host, resolve));
  const address = server.address();
  return { server, host, port: address.port, url: `http://${host}:${address.port}`, handler };
}
