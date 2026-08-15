import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { wasmWebContainerExampleHandler as prototypeHandler } from
  "../../../dev/wasm-web-container/examples/handler.js";

const index = new URL("./index.html", import.meta.url);
const packageRoot = new URL("../", import.meta.url);
const types = new Map([
  [".html", "text/html; charset=utf-8"], [".json", "application/json"],
  [".wasm", "application/wasm"]
]);

export async function wasmWebContainerExampleHandler(request) {
  const url = new URL(request.url);
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(await readFile(index), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
  if (url.pathname.startsWith("/sqlite-book/")) {
    let pathname = url.pathname;
    if (pathname.endsWith("/")) pathname += "index.html";
    const relative = normalize(pathname).replace(/^[/\\]+/, "");
    const type = types.get(extname(relative));
    if (!type || relative.startsWith("..") || relative.includes("\\")) {
      return new Response("Not found", { status: 404 });
    }
    try {
      return new Response(await readFile(join(packageRoot.pathname, "dist/pages", relative)), {
        headers: { "content-type": type, "cache-control": "no-store" }
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return new Response("Run npm run build:sqlite-book in packages/wasm-web-container.", {
          status: 503
        });
      }
      throw error;
    }
  }
  return prototypeHandler(request);
}
