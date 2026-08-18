import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname);
const comparisonRoot = resolve(process.env.HOME || "/root",
  "artifacts/codemirror-comparison");
const canonicalHost = resolve(root,
  "../wasm-web-container/examples/web/wasm-web-container.js");
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".webm", "video/webm"],
]);

export async function quickjsCodeMirrorHandler(request) {
  const pathname = new URL(request.url).pathname;
  if (pathname === "/wasm-web-container.js") {
    return new Response(await readFile(canonicalHost), {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  }
  const relative = pathname === "/"
    ? "index.html"
    : pathname.endsWith("/")
      ? `${pathname.slice(1)}index.html`
      : pathname.slice(1);
  if (relative.includes("..") || relative.includes("\\")) {
    return new Response("Not found", { status: 404 });
  }
  const path = resolve(root, relative);
  if (path !== root && !path.startsWith(`${root}/`)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    return new Response(await readFile(path), {
      headers: {
        "content-type": types.get(extname(path)) || "application/octet-stream",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export function instrumentedQuickjsCodeMirrorHandler(request) {
  const url = new URL(request.url);
  if (url.pathname === "/") url.pathname = "/instrumented/";
  return quickjsCodeMirrorHandler(new Request(url, request));
}

async function staticResponse(rootDirectory, relative) {
  if (relative.includes("..") || relative.includes("\\")) {
    return new Response("Not found", { status: 404 });
  }
  const path = resolve(rootDirectory, relative);
  if (path !== rootDirectory && !path.startsWith(`${rootDirectory}/`)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    return new Response(await readFile(path), {
      headers: { "content-type": types.get(extname(path)) || "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export function microQuickjsCodeMirrorHandler(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/comparisons/")) {
    const relative = url.pathname.slice("/comparisons/".length) || "index.html";
    return staticResponse(comparisonRoot,
      relative.endsWith("/") ? `${relative}index.html` : relative);
  }
  if (url.pathname === "/benchmark-results.json") {
    return staticResponse(root, "benchmark-results.json");
  }
  if (url.pathname.startsWith("/quickjs/")) {
    url.pathname = url.pathname.slice("/quickjs".length);
  } else if (url.pathname === "/" || url.pathname === "/full/" ||
      url.pathname === "/benchmark/") {
    url.pathname = `/microquickjs${url.pathname}`;
  } else if (url.pathname === "/benchmark.css" || url.pathname === "/benchmark.js") {
    url.pathname = `/microquickjs${url.pathname}`;
  }
  return quickjsCodeMirrorHandler(new Request(url, request));
}
