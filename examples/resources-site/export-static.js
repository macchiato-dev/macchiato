#!/usr/bin/env node
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResourcesSiteRoutes } from "./seed.js";
import { renderSiteRoute } from "@macchiato-dev/site";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultOut = join(__dirname, "exported");

function parseArgs(args) {
  const options = { out: defaultOut, clean: true };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--out") options.out = resolve(args[++i] || defaultOut);
    else if (arg === "--no-clean") options.clean = false;
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node examples/resources-site/export-static.js [--out <dir>] [--no-clean]");
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

function routeFilePath(outDir, routePath) {
  if (routePath === "/") return join(outDir, "index.html");
  return join(outDir, routePath.slice(1), "index.html");
}

function routeToRow(route) {
  return {
    ...route,
    navJson: JSON.stringify(route.nav || []),
    transitionJson: JSON.stringify(route.transition || {}),
  };
}

export async function exportResourcesSite({ out = defaultOut, clean = true } = {}) {
  const outDir = resolve(out);
  if (clean) await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const routes = buildResourcesSiteRoutes();
  for (const route of routes) {
    const filePath = routeFilePath(outDir, route.path);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, renderSiteRoute(routeToRow(route)), "utf8");
  }

  const fontSource = join(__dirname, "..", "resources-website", "assets", "fonts");
  const fontTarget = join(outDir, "-", "fonts", "resourcesco-space-grotesk");
  await mkdir(fontTarget, { recursive: true });
  await cp(fontSource, fontTarget, { recursive: true });

  const manifest = {
    subdomain: "resources-co",
    generatedAt: new Date().toISOString(),
    routes: routes.map((route) => route.path),
    files: [
      ...routes.map((route) => route.path === "/" ? "/index.html" : `${route.path}/index.html`),
      "/-/fonts/resourcesco-space-grotesk/space-grotesk-latin.woff2",
      "/-/fonts/resourcesco-space-grotesk/space-grotesk-latin-ext.woff2",
      "/-/fonts/resourcesco-space-grotesk/space-grotesk-vietnamese.woff2",
    ],
  };
  await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { outDir, routes: routes.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  const result = await exportResourcesSite(options);
  console.log(`Exported ${result.routes} routes to ${result.outDir}`);
}
