#!/usr/bin/env node
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createResourcesArtifactSet } from "./artifacts.js";

const directory = dirname(fileURLToPath(import.meta.url));
const defaultOut = join(directory, "exported");

function parseArgs(args) {
  const options = { out: defaultOut, clean: true };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out") options.out = resolve(args[++i] || defaultOut);
    else if (args[i] === "--no-clean") options.clean = false;
    else if (args[i] === "--help" || args[i] === "-h") {
      console.log("Usage: node examples/resources-site/export-static.js [--out <dir>] [--no-clean]");
      process.exit(0);
    } else throw new Error(`Unknown option: ${args[i]}`);
  }
  return options;
}

export async function exportResourcesSite({ out = defaultOut, clean = true, theme = {} } = {}) {
  const outDir = resolve(out);
  if (clean) await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const artifactSet = createResourcesArtifactSet({ theme });
  for (const [file, content] of artifactSet.files) {
    const target = join(outDir, file.slice(1));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(artifactSet.manifest, null, 2)}\n`, "utf8");
  return { outDir, routes: artifactSet.routes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await exportResourcesSite(parseArgs(process.argv.slice(2)));
  console.log(`Exported ${result.routes} routes to ${result.outDir}`);
}
