#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const [outputDirectory, storagePrefix, revision] = process.argv.slice(2);
if (!outputDirectory || !/^resources-co-[0-9a-f]{7}$/.test(storagePrefix || "") || !/^[0-9a-f]{7}$/.test(revision || "")) {
  throw new Error("Usage: finalize-resources-bunny.js <output-directory> <resources-co-xxxxxxx> <7-character-git-sha>");
}

const out = resolve(outputDirectory);
const applicationPath = join(out, "resources-application.js");
const revisionMarker = "__MACCHIATO_GIT_REVISION__";
const digestMarker = "__MACCHIATO_DEFERRED_SHA256________________________________";
const shortMarker = "__MACCHIATO_DEFERRED_SHORT__";

function replaceRequired(source, marker, value, label) {
  if (!source.includes(marker)) throw new Error(`${label} is missing ${marker}`);
  return source.replaceAll(marker, value);
}

let application = await readFile(applicationPath, "utf8");
application = replaceRequired(application, revisionMarker, revision, "Deferred application bundle");
await writeFile(applicationPath, application, "utf8");
const sha256 = createHash("sha256").update(application).digest("hex");
const short = sha256.slice(0, 12);
const objectPath = join(out, "site", storagePrefix, "-", "edge", `resources-application.${short}.js`);
await mkdir(dirname(objectPath), { recursive: true });
await copyFile(applicationPath, objectPath);

for (const filename of ["resources-bunny.js", "resources-bunny-module-origin.js"]) {
  const path = join(out, filename);
  let source = await readFile(path, "utf8");
  source = replaceRequired(source, revisionMarker, revision, filename);
  source = replaceRequired(source, digestMarker, sha256, filename);
  if (source.includes(shortMarker)) source = source.replaceAll(shortMarker, short);
  if (source.includes(revisionMarker) || source.includes(digestMarker) || source.includes(shortMarker)) {
    throw new Error(`${filename} still contains deployment markers`);
  }
  await writeFile(path, source, "utf8");
}

console.log(`Deferred application: ${objectPath}`);
console.log(`Deferred SHA-256: ${sha256}`);
