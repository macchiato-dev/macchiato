import { access, readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const types = new Map([
  [".bin", "application/octet-stream"], [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".wasm", "application/wasm"], [".woff2", "font/woff2"],
]);

export async function wasmWebContainerExampleHandler(request) {
  let pathname = decodeURIComponent(new URL(request.url).pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const relative = normalize(pathname).replace(/^[/\\]+/, "");
  if (!relative || relative.startsWith("..") || relative.includes("\\")) {
    return new Response("Not found", { status: 404 });
  }
  const type = types.get(extname(relative));
  if (!type) return new Response("Not found", { status: 404 });
  try {
    return new Response(request.method === "HEAD" ? null :
      await readFile(join(root, "dist/pages", relative)), {
      headers: { "content-type": type, "cache-control": "no-store" },
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      if (await access(join(root, "dist/pages")).then(() => true, () => false)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("Build wasm-web-container with examples/scripts/build.sh first.", {
        status: 503,
      });
    }
    throw error;
  }
}
