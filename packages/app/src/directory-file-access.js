import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const endpointPrefix = "/-/writable-files/";

function fileGrant(app, pathname) {
  if (!pathname.startsWith(endpointPrefix)) return null;
  const encodedName = pathname.slice(endpointPrefix.length);
  if (!encodedName || encodedName.includes("/")) return null;
  let name;
  try { name = decodeURIComponent(encodedName); } catch { return null; }
  const declaration = app.access?.writableFiles?.[name];
  if (!declaration) return null;
  return { name, maxBytes: declaration.maxBytes };
}

export async function directoryWritableFileResponse(request, app, directory) {
  const grant = fileGrant(app, new URL(request.url).pathname);
  if (!grant) return null;
  const path = resolve(directory, grant.name);
  if (request.method === "GET" || request.method === "HEAD") {
    let body = "";
    try { body = await readFile(path, "utf8"); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
    return new Response(request.method === "HEAD" ? null : body, {
      headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (request.method !== "PUT") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD, PUT" } });
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > grant.maxBytes) return new Response("File exceeds declared byte limit", { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > grant.maxBytes) return new Response("File exceeds declared byte limit", { status: 413 });
  await writeFile(path, bytes, { flag: "w" });
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

export { endpointPrefix as writableFileEndpointPrefix };
