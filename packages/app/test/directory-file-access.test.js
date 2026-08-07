import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { directoryWritableFileResponse } from "../src/directory-file-access.js";

test("directory apps can write only an exact size-limited declared file", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "macchiato-write-grant-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const app = { access: { writableFiles: { "notes.md": { maxBytes: 12 } } } };
  const url = "http://notes.localhost/-/writable-files/notes.md";
  const empty = await directoryWritableFileResponse(new Request(url), app, directory);
  assert.equal(await empty.text(), "");
  assert.equal(await directoryWritableFileResponse(new Request(url, { method: "PUT", body: "# Notes\n" }), app, directory).then((response) => response.status), 204);
  assert.equal(await readFile(join(directory, "notes.md"), "utf8"), "# Notes\n");
  assert.equal(await directoryWritableFileResponse(new Request(url, { method: "PUT", body: "this is too long" }), app, directory).then((response) => response.status), 413);
  assert.equal(await directoryWritableFileResponse(new Request("http://notes.localhost/-/writable-files/other.md"), app, directory), null);
});

test("directory apps can create immutable archive files within a total quota", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "macchiato-archive-grant-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const app = { access: { writableDirectories: { archives: { maxBytes: 12 } } } };
  const endpoint = "http://notes.localhost/-/writable-directories/archives";

  const first = await directoryWritableFileResponse(new Request(`${endpoint}/notes-1.md`, { method: "PUT", body: "notes" }), app, directory);
  assert.equal(first.status, 201);
  assert.equal(await readFile(join(directory, "archives", "notes-1.md"), "utf8"), "notes");
  assert.equal(await directoryWritableFileResponse(new Request(`${endpoint}/notes-1.md`, { method: "PUT", body: "again" }), app, directory).then((response) => response.status), 409);

  const second = await directoryWritableFileResponse(new Request(`${endpoint}/reading-1.json`, { method: "PUT", body: "1234567" }), app, directory);
  assert.equal(second.status, 201);
  assert.equal(await directoryWritableFileResponse(new Request(`${endpoint}/extra`, { method: "PUT", body: "x" }), app, directory).then((response) => response.status), 413);

  const listing = await directoryWritableFileResponse(new Request(endpoint), app, directory).then((response) => response.json());
  assert.deepEqual(listing, {
    files: [{ name: "notes-1.md", bytes: 5 }, { name: "reading-1.json", bytes: 7 }],
    usedBytes: 12,
    maxBytes: 12,
  });
  assert.equal(await directoryWritableFileResponse(new Request(`${endpoint}/notes-1.md`), app, directory).then((response) => response.text()), "notes");
  assert.equal(await directoryWritableFileResponse(new Request(`${endpoint}/../escape`, { method: "PUT", body: "x" }), app, directory), null);
});

test("writable archive directories reject symlinks", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "macchiato-archive-symlink-"));
  const outside = join(directory, "outside.md");
  context.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(outside, "private");
  await symlink(outside, join(directory, "archives"));
  const app = { access: { writableDirectories: { archives: { maxBytes: 1024 } } } };
  const response = await directoryWritableFileResponse(new Request("http://notes.localhost/-/writable-directories/archives/leak.md", { method: "PUT", body: "x" }), app, directory);
  assert.equal(response.status, 409);
});
