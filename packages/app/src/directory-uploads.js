import { lstat, mkdir, open, readdir, realpath, unlink } from "node:fs/promises";
import { relative, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";

const queues = new Map();
const json = (body, status = 200) => Response.json(body, {
  status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
});

// A declarative upload grant is create-only storage, outside the served tree.
// No route serves these files; even an HTML export remains inert data.
export async function directoryUploadResponse(request, app, webRoot) {
  const url = new URL(request.url);
  const match = /^\/-\/uploads\/([a-z][a-z0-9-]*)$/.exec(url.pathname);
  const grant = match && app.access?.uploadDirectories?.[match[1]];
  if (!grant) return null;
  if (!["GET", "POST"].includes(request.method)) return json({ error: "Method not allowed" }, 405);
  if (request.method === "POST" && request.headers.get("origin") !== url.origin) {
    return json({ error: "Wrong origin" }, 403);
  }
  // Serialize quota accounting, including concurrent uploads to the same path.
  const prior = queues.get(grant.path) || Promise.resolve();
  const current = prior.catch(() => {}).then(async () => {
    await mkdir(grant.path, { recursive: true, mode: 0o700 });
    const root = await realpath(grant.path);
    if ((await lstat(grant.path)).isSymbolicLink()) throw new Error("Upload directory is a symlink");
    const within = relative(await realpath(webRoot), root);
    if (!within || (!isAbsolute(within) && within !== ".." && !within.startsWith("../"))) {
      throw new Error("Upload directory must be outside the served directory");
    }
    const files = [];
    let used = 0;
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (!entry.isFile()) throw new Error("Upload directory must contain only regular files");
      const info = await lstat(`${root}/${entry.name}`);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error("Invalid upload entry");
      used += info.size;
      files.push({ name: entry.name.replace(/^[a-f0-9-]{36}--/, ""),
        storedName: entry.name, size: info.size, uploaded: info.mtime.toISOString() });
    }
    if (request.method === "GET") {
      files.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
      return json({ files, usedBytes: used, maxBytes: grant.maxBytes });
    }
    const name = url.searchParams.get("name") || "";
    if (!name || name === "." || name === ".." || /[/\\\x00-\x1f\x7f]/.test(name) ||
        new TextEncoder().encode(name).length > 200) return json({ error: "Invalid filename" }, 422);
    const available = Math.min(grant.maxFileBytes, grant.maxBytes - used);
    if (!request.body || Number(request.headers.get("content-length")) > available) {
      return json({ error: "Upload exceeds the file limit or remaining directory quota" }, 413);
    }
    const storedName = `${randomUUID()}--${name}`;
    const path = `${root}/${storedName}`;
    const file = await open(path, "wx", 0o600);
    let size = 0;
    try {
      // Enforce the cap as bytes arrive, even without Content-Length.
      for await (const chunk of request.body) {
        size += chunk.byteLength;
        if (size > available) throw new RangeError("Upload exceeds the file limit or remaining directory quota");
        let offset = 0;
        while (offset < chunk.length) {
          const { bytesWritten } = await file.write(chunk, offset, chunk.length - offset);
          if (!bytesWritten) throw new Error("Upload write failed");
          offset += bytesWritten;
        }
      }
    } catch (error) {
      await file.close();
      await unlink(path);
      if (error instanceof RangeError) return json({ error: error.message }, 413);
      throw error;
    }
    await file.close();
    return json({ name, storedName, size }, 201);
  });
  queues.set(grant.path, current);
  try { return await current; }
  catch (error) {
    console.error("Directory upload:", error.message);
    return json({ error: "Upload directory unavailable; please retry." }, 500);
  } finally { if (queues.get(grant.path) === current) queues.delete(grant.path); }
}
