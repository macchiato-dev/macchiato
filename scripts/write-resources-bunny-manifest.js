import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const [directoryArgument, revision] = process.argv.slice(2);
if (!directoryArgument || !/^[0-9a-f]{7}$/.test(revision || "")) {
  throw new Error("Usage: write-resources-bunny-manifest.js <build-directory> <7-character-git-sha>");
}
const directory = resolve(directoryArgument);
const files = [];
function visit(path) {
  for (const name of readdirSync(path).sort()) {
    const child = join(path, name);
    if (statSync(child).isDirectory()) visit(child);
    else if (!child.endsWith("deployment.json")) {
      const content = readFileSync(child);
      files.push({ path: relative(directory, child).replaceAll("\\", "/"),
        bytes: content.length, sha256: createHash("sha256").update(content).digest("hex") });
    }
  }
}
visit(directory);
writeFileSync(join(directory, "deployment.json"), `${JSON.stringify({
  format: "resources-bunny-deployment-v2",
  revision,
  edgeEntry: "edge/script.ts",
  storagePrefix: `site/resources-co-${revision}/`,
  files,
}, null, 2)}\n`);
