import { readFile } from "node:fs/promises";
import { domUseLiteExampleHandler } from "../../../dev/dom-use-lite/examples/handler.js";

const index = new URL("./index.html", import.meta.url);

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
  return domUseLiteExampleHandler(request);
}
