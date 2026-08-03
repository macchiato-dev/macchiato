#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const [bundlePath, revision] = process.argv.slice(2);
if (!bundlePath || !/^[0-9a-f]{7}$/.test(revision || "")) {
  throw new Error("Usage: embed-resources-bunny-revision.js <bundle.js> <7-character-git-sha>");
}

const marker = "__MACCHIATO_GIT_REVISION__";
const bundle = await readFile(bundlePath, "utf8");
if (!bundle.includes(marker)) throw new Error("Bunny bundle is missing its storage revision marker");
const resolved = bundle.replaceAll(marker, revision);
if (resolved.includes(marker)) throw new Error("Bunny storage revision marker was not fully resolved");
await writeFile(bundlePath, resolved, "utf8");
