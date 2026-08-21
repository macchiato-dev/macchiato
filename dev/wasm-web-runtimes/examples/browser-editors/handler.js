import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname);
const machine = resolve(root, "../../../wasm-web-machine/dist/module/wasm-web-machine.js");
const types = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".wasm", "application/wasm"],
]);

function handlerFor(example) {
  return async request => {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/wasm-web-machine.js") {
      return new Response(await readFile(machine), {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    }
    const file = pathname === "/" ? "index.html" : pathname.slice(1);
    const shared = new Map([["host.js", "host.js"], ["loading.css", "loading.css"],
      [`${example}.wasm`, `generated/${example}.wasm`]]);
    const relative = shared.get(file) || `${example}/${file}`;
    if (relative.includes("..") || relative.includes("\\")) return new Response("Not found", { status: 404 });
    const path = resolve(root, relative);
    if (!path.startsWith(`${root}/`)) return new Response("Not found", { status: 404 });
    try {
      return new Response(await readFile(path), {
        headers: { "content-type": types.get(extname(path)) || "application/octet-stream" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  };
}

export const prosemirrorQuickjsHandler = handlerFor("prosemirror");
export const wordgardQuickjsHandler = handlerFor("wordgard");
export const xtermQuickjsHandler = handlerFor("xterm");
