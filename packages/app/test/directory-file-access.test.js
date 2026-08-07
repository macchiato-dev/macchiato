import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
