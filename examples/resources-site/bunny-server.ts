const encoder = new TextEncoder();

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

const port = Number(Deno.env.get("PORT") || "8000");
const staticRoot = Deno.env.get("STATIC_ROOT") || new URL("./exported/", import.meta.url).pathname;
const bunnyOrigin = trimSlash(Deno.env.get("BUNNY_ORIGIN") || "");
const bunnyPrefix = trimSlash(Deno.env.get("BUNNY_BUCKET_PREFIX") || "resources-co");
const bunnyAccessKey = Deno.env.get("BUNNY_ACCESS_KEY") || "";

function trimSlash(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function extension(pathname: string): string {
  const dot = pathname.lastIndexOf(".");
  return dot === -1 ? "" : pathname.slice(dot).toLowerCase();
}

function contentType(pathname: string): string {
  return MIME_TYPES[extension(pathname)] || "application/octet-stream";
}

function cleanPath(pathname: string): string {
  const decoded = decodeURIComponent(pathname);
  const parts = decoded.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) throw new Error("Invalid path");
  return `/${parts.join("/")}`;
}

function objectPath(pathname: string): string {
  const path = cleanPath(pathname);
  if (path === "/") return "index.html";
  if (extension(path)) return path.slice(1);
  return `${path.slice(1)}/index.html`;
}

function cacheControl(objectKey: string): string {
  if (objectKey.endsWith(".html")) return "public, max-age=30";
  if (objectKey.endsWith(".json")) return "public, max-age=60";
  return "public, max-age=31536000, immutable";
}

function notFound(): Response {
  return new Response(encoder.encode("Not found"), {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

async function serveFromLocal(objectKey: string): Promise<Response> {
  const filePath = `${staticRoot.replace(/\/+$/, "")}/${objectKey}`;
  try {
    const file = await Deno.open(filePath, { read: true });
    return new Response(file.readable, {
      headers: {
        "content-type": contentType(objectKey),
        "cache-control": cacheControl(objectKey),
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return notFound();
    throw err;
  }
}

async function serveFromBunny(objectKey: string): Promise<Response> {
  const path = [bunnyPrefix, objectKey].filter(Boolean).map(encodePath).join("/");
  const url = `${bunnyOrigin}/${path}`;
  const headers = new Headers();
  if (bunnyAccessKey) headers.set("AccessKey", bunnyAccessKey);
  const upstream = await fetch(url, { headers });
  if (upstream.status === 404) return notFound();

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("content-type", contentType(objectKey));
  responseHeaders.set("cache-control", cacheControl(objectKey));
  responseHeaders.set("x-content-type-options", "nosniff");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

Deno.serve({ port }, async (request) => {
  try {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
    const key = objectPath(url.pathname);
    return bunnyOrigin ? serveFromBunny(key) : serveFromLocal(key);
  } catch (err) {
    if (err instanceof URIError || String(err).includes("Invalid path")) return notFound();
    console.error(err);
    return new Response("Internal server error", { status: 500 });
  }
});
