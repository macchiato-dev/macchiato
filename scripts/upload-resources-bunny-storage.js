import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const directory = resolve(process.argv[2] || "dist/resources-bunny/site");
const origin = String(process.env.BUNNY_STORAGE_UPLOAD_ORIGIN || "").replace(/\/+$/, "");
const accessKey = process.env.BUNNY_STORAGE_UPLOAD_KEY;
if (!origin.startsWith("https://") || !accessKey) {
  throw new Error("BUNNY_STORAGE_UPLOAD_ORIGIN and BUNNY_STORAGE_UPLOAD_KEY are required");
}
const files = [];
async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await visit(child);
    else files.push(child);
  }
}
await visit(directory);
// The manifest is publication authority, so expose it only after every object
// it names has uploaded successfully.
files.sort((left, right) => Number(left.endsWith("manifest.json")) - Number(right.endsWith("manifest.json")));
for (const file of files) {
  const key = relative(directory, file).split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${origin}/${key}`, {
    method: "PUT",
    headers: { AccessKey: accessKey, "content-type": "application/octet-stream" },
    body: await readFile(file),
  });
  if (!response.ok) throw new Error(`Bunny Storage upload failed for ${key}: ${response.status}`);
}
console.log(`Uploaded ${files.length} revisioned Storage objects.`);
