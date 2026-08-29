const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function proxyHeaders(source) {
  const headers = new Headers(source);
  const connection = headers.get("connection");
  if (connection) {
    for (const name of connection.split(",")) headers.delete(name.trim());
  }
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);
  headers.delete("host");
  return headers;
}

export function validateProxyOptions(options, access = {}) {
  if (!options.proxy || typeof options.proxy !== "object" || Array.isArray(options.proxy)) {
    throw new Error("options.proxy must be an object");
  }
  const keys = Object.keys(options.proxy);
  if (keys.length !== 1 || keys[0] !== "origin") {
    throw new Error("options.proxy supports only an origin");
  }

  let upstream;
  try {
    upstream = new URL(options.proxy.origin);
  } catch {
    throw new Error("options.proxy.origin must be an absolute URL");
  }
  if (!["http:", "https:"].includes(upstream.protocol) || upstream.username || upstream.password ||
      upstream.pathname !== "/" || upstream.search || upstream.hash) {
    throw new Error("options.proxy.origin must be an HTTP(S) origin without credentials or a path");
  }

  const origin = upstream.origin;
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(upstream.hostname);
  const allowed = Array.isArray(access.networkOrigins) && access.networkOrigins.includes(origin);
  if (!loopback && !allowed) {
    throw new Error(`Proxy origin is not granted by access.networkOrigins: ${origin}`);
  }
  return origin;
}

export async function proxyAppHandler(request, app) {
  const origin = validateProxyOptions(app.options, app.access);
  const incoming = new URL(request.url);
  const target = new URL(`${incoming.pathname}${incoming.search}`, `${origin}/`);
  const init = {
    method: request.method,
    headers: proxyHeaders(request.headers),
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch {
    return new Response("Proxy upstream unavailable", { status: 502 });
  }

  const headers = proxyHeaders(upstream.headers);
  const location = headers.get("location");
  if (location) {
    try {
      const resolved = new URL(location, target);
      if (resolved.origin === origin) {
        headers.set("location", `${resolved.pathname}${resolved.search}${resolved.hash}`);
      }
    } catch {
      headers.delete("location");
    }
  }
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
