import test from "node:test";
import assert from "node:assert/strict";
import { decodeProjectArchive, encodeProjectArchive, isProjectImage, projectArchiveFilename } from "@macchiato-dev/hub/project-archive";

test("project archives round-trip text, binary images, and configuration", async () => {
  const snapshot = {
    files: [
      { path: "index.html", content: "<!doctype html><title>Slides</title>" },
      { path: "images/pixel.png", content: "data:image/png;base64,iVBORw0KGgo=" },
    ],
    config: { entry: "index.html", container: "presentation", template: "slides" },
  };
  const archive = encodeProjectArchive(snapshot);
  assert.equal(new DataView(archive.buffer).getUint32(0, true), 0x04034b50);
  const restored = await decodeProjectArchive(archive);
  assert.deepEqual(restored, snapshot);
  assert.equal(isProjectImage(restored.files[1]), true);
});

test("project archives enforce the portable artifact size limit", () => {
  const content = "x".repeat(50 * 1024 * 1024);
  assert.throws(() => encodeProjectArchive({ files: [{ path: "too-large.txt", content }], config: {} }), /50 MB/);
});

test("project archives use the project Name for downloads", () => {
  assert.equal(projectArchiveFilename("classic-chinese-mahjong"), "classic-chinese-mahjong.zip");
  assert.equal(projectArchiveFilename(""), "untitled-project.zip");
  assert.equal(projectArchiveFilename("Not a valid Name"), "untitled-project.zip");
});
