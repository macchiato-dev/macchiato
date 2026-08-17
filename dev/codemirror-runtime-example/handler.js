import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname);
const canonicalHost = resolve(root,
  "../wasm-web-container/examples/web/wasm-web-container.js");
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".wasm", "application/wasm"],
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
