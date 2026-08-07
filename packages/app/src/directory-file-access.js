import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const endpointPrefix = "/-/writable-files/";
const directoryEndpointPrefix = "/-/writable-directories/";
const directoryQueues = new Map();

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

function safeSegment(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
}

function directoryGrant(app, pathname) {
  if (!pathname.startsWith(directoryEndpointPrefix)) return null;
  const encoded = pathname.slice(directoryEndpointPrefix.length).replace(/\/$/, "");
  const parts = encoded.split("/");
  if (parts.length < 1 || parts.length > 2) return null;
  let directoryName;
  let fileName;
  try {
    directoryName = decodeURIComponent(parts[0]);
    fileName = parts[1] ? decodeURIComponent(parts[1]) : null;
  } catch { return null; }
  if (!safeSegment(directoryName) || (fileName !== null && !safeSegment(fileName))) return null;
  const declaration = app.access?.writableDirectories?.[directoryName];
  if (!declaration) return null;
  return { directoryName, fileName, maxBytes: declaration.maxBytes };
}

async function existingDirectory(path) {
  try {
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Writable archive path is not a regular directory");
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function archiveEntries(path) {
  if (!await existingDirectory(path)) return [];
  const entries = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (!entry.isFile() || entry.isSymbolicLink()) throw new Error("Writable archive directories may contain only regular files");
    const info = await lstat(resolve(path, entry.name));
    entries.push({ name: entry.name, bytes: info.size });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

async function queued(directoryPath, operation) {
  const prior = directoryQueues.get(directoryPath) || Promise.resolve();
  const current = prior.catch(() => {}).then(operation);
  directoryQueues.set(directoryPath, current);
  try { return await current; }
  finally { if (directoryQueues.get(directoryPath) === current) directoryQueues.delete(directoryPath); }
}

async function directoryArchiveResponse(request, grant, directory) {
  const directoryPath = resolve(directory, grant.directoryName);
  if (grant.fileName === null) {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    try {
      const entries = await archiveEntries(directoryPath);
      const body = JSON.stringify({ files: entries, usedBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0), maxBytes: grant.maxBytes });
      return new Response(request.method === "HEAD" ? null : body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
    } catch (error) { return new Response(error.message, { status: 409 }); }
  }
  const path = resolve(directoryPath, grant.fileName);
  if (request.method === "GET" || request.method === "HEAD") {
    try {
      const info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink()) return new Response("Archive entry is not a regular file", { status: 409 });
      const body = request.method === "HEAD" ? null : await readFile(path);
      return new Response(body, { headers: { "content-type": "application/octet-stream", "content-length": String(info.size), "cache-control": "no-store" } });
    } catch (error) {
      if (error?.code === "ENOENT") return new Response("Not found", { status: 404 });
      throw error;
    }
  }
  if (request.method !== "PUT") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD, PUT" } });
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > grant.maxBytes) return new Response("Directory quota exceeded", { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > grant.maxBytes) return new Response("Directory quota exceeded", { status: 413 });
  return queued(directoryPath, async () => {
    let entries;
    try { entries = await archiveEntries(directoryPath); }
    catch (error) { return new Response(error.message, { status: 409 }); }
    const usedBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
    if (usedBytes + bytes.byteLength > grant.maxBytes) return new Response("Directory quota exceeded", { status: 413 });
    if (!await existingDirectory(directoryPath)) await mkdir(directoryPath, { recursive: false });
    try { await writeFile(path, bytes, { flag: "wx" }); }
    catch (error) {
      if (error?.code === "EEXIST") return new Response("Archive entry already exists", { status: 409 });
      throw error;
    }
    return new Response(null, { status: 201, headers: { "cache-control": "no-store" } });
  });
}

export async function directoryWritableFileResponse(request, app, directory) {
  const pathname = new URL(request.url).pathname;
  const archiveGrant = directoryGrant(app, pathname);
  if (archiveGrant) return directoryArchiveResponse(request, archiveGrant, directory);
  const grant = fileGrant(app, pathname);
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

export { directoryEndpointPrefix as writableDirectoryEndpointPrefix, endpointPrefix as writableFileEndpointPrefix };
