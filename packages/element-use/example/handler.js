import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { elementUseExampleSources, mahjongTileUrls } from "./manifest.js";

const directory = dirname(fileURLToPath(import.meta.url));
const repo = resolve(directory, "../../..");
const sources = new Set(elementUseExampleSources);
let project;
function type(path) {
  return path.endsWith(".css")
    ? "text/css; charset=utf-8"
    : path.endsWith(".js")
    ? "application/javascript; charset=utf-8"
    : "text/html; charset=utf-8";
}
function response(body, contentType) {
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "content-security-policy":
        "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; connect-src 'self'; img-src data:; frame-src 'self'; object-src 'none'; base-uri 'none'",
    },
  });
}
async function dataUrl(url) {
  const result = await fetch(url, { redirect: "error" });
  if (!result.ok) throw new Error(`Tile response ${result.status}`);
  const bytes = new Uint8Array(await result.arrayBuffer());
  const type =
    (result.headers.get("content-type") || "application/octet-stream").split(
      ";",
      1,
    )[0];
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}
export async function elementUseExampleHandler(request) {
  const { pathname } = new URL(request.url);
  if (pathname === "/") {
    return response(
      await readFile(join(directory, "index.html")),
      "text/html; charset=utf-8",
    );
  }
  if (["/client.js", "/style.css", "/manifest.js"].includes(pathname)) {
    return response(
      await readFile(join(directory, pathname.slice(1))),
      type(pathname),
    );
  }
  if (pathname === "/project.json") {
    project ||= Promise.all(mahjongTileUrls.map(dataUrl)).then(async (
      dataUrls,
    ) => ({
      title: "Classic Mahjong Solitaire",
      file: await readFile(join(repo, "examples/mahjong/index.html"), "utf8"),
      fetchResources: Object.fromEntries(
        mahjongTileUrls.map((
          url,
          index,
        ) => [url, { dataUrl: dataUrls[index] }]),
      ),
    }));
    return response(
      JSON.stringify(await project),
      "application/json; charset=utf-8",
    );
  }
  if (pathname.startsWith("/source/")) {
    const path = pathname.slice(8);
    if (sources.has(path)) {
      return response(
        await readFile(join(repo, path)),
        "text/plain; charset=utf-8",
      );
    }
  }
  return new Response("Not found", { status: 404 });
}
