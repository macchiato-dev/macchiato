import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".wasm", "application/wasm"],
]);

export async function quickjsCodeMirrorHandler(request) {
  const pathname = new URL(request.url).pathname;
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
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
        "content-security-policy": "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; style-src 'unsafe-inline'",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
