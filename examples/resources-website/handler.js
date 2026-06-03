import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function contentType(pathname) {
  return CONTENT_TYPES[extname(pathname).toLowerCase()] || "application/octet-stream";
}

function safeJoin(root, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const target = resolve(root, relative.replace(/^[/\\]+/, ""));
  const resolvedRoot = resolve(root);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}/`)) {
    throw new Error("Path escapes root");
  }
  return target;
}

async function serveStaticAsset(pathname) {
  try {
    const filePath = safeJoin(__dirname, pathname.replace(/^\/+/, ""));
    const content = await readFile(filePath);
    return new Response(content, {
      headers: { "content-type": contentType(pathname) },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export async function resourcesWebsiteHandler(request) {
  const url = new URL(request.url);
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return serveStaticAsset("/index.html");
  }
  if (url.pathname === "/styles.css" || url.pathname.startsWith("/assets/")) {
    return serveStaticAsset(url.pathname);
  }
  return new Response("Not found", { status: 404 });
}
