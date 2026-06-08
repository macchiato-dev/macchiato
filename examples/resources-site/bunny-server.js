import * as BunnySDK from "https://esm.sh/@bunny.net/edgescript-sdk@0.11";
import process from "node:process";

const ORIGIN = stripSlashes(process.env.BUNNY_ORIGIN || "");
const PREFIX = stripSlashes(process.env.BUNNY_BUCKET_PREFIX || "resources-co");
const STORAGE_API_KEY = process.env.STORAGE_API_KEY || "";

function stripSlashes(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

function objectKey(pathname) {
  const parts = decodeURIComponent(pathname).split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) return null;
  if (parts.length === 0) return "index.html";
  const path = parts.join("/");
  return path.includes(".") ? path : `${path}/index.html`;
}

function contentType(key) {
  if (key.endsWith(".html")) return "text/html; charset=utf-8";
  if (key.endsWith(".json")) return "application/json; charset=utf-8";
  if (key.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

BunnySDK.net.http.serve(async (request) => {
  if (!ORIGIN) return new Response("BUNNY_ORIGIN is required", { status: 500 });
  if (!STORAGE_API_KEY) return new Response("STORAGE_API_KEY is required", { status: 500 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const key = objectKey(new URL(request.url).pathname);
  if (!key) return new Response("Not found", { status: 404 });

  const url = `${ORIGIN}/${[PREFIX, key].filter(Boolean).map(encodePath).join("/")}`;
  const headers = new Headers();
  headers.set("AccessKey", STORAGE_API_KEY);

  const upstream = await fetch(url, { headers });
  if (upstream.status === 404) return new Response("Not found", { status: 404 });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("content-type", contentType(key));
  responseHeaders.set("x-content-type-options", "nosniff");
  responseHeaders.set("cache-control", key.endsWith(".html") ? "public, max-age=30" : "public, max-age=31536000, immutable");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
});

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}
