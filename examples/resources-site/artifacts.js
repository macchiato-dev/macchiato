import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSiteRoute } from "@macchiato-dev/site";
import { buildResourcesSiteRoutesForRuntime } from "./seed.js";

const directory = dirname(fileURLToPath(import.meta.url));
const fontDirectory = join(directory, "..", "resources-website", "assets", "fonts");
const fontNames = ["space-grotesk-latin.woff2", "space-grotesk-latin-ext.woff2", "space-grotesk-vietnamese.woff2"];

function routeRow(route) {
  return { ...route, navJson: JSON.stringify(route.nav || []), transitionJson: JSON.stringify(route.transition || {}) };
}

function routeFile(route) {
  return route.path === "/" ? "/index.html" : `${route.path}/index.html`;
}

function bytes(value) {
  return typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
}

export function createResourcesArtifactSet({ theme = {}, generatedAt = new Date().toISOString() } = {}) {
  const routes = buildResourcesSiteRoutesForRuntime({ runtime: "edge", theme });
  const files = new Map();
  for (const route of routes) files.set(routeFile(route), bytes(renderSiteRoute(routeRow(route))));
  for (const name of fontNames) {
    files.set(`/-/fonts/resourcesco-space-grotesk/${name}`, bytes(readFileSync(join(fontDirectory, name))));
  }
  const artifacts = {};
  for (const [file, content] of files) {
    artifacts[file] = { bytes: content.byteLength, sha256: createHash("sha256").update(content).digest("hex") };
  }
  const manifest = Object.freeze({
    subdomain: "resources-co",
    generatedAt,
    securityProfile: "document-navigation-v1",
    validatedWith: ["dom-use", "style-use", "html-use", "theme-use"],
    routes: routes.map((route) => route.path),
    files: [...files.keys()],
    artifacts,
  });
  return Object.freeze({ routes: routes.length, files, manifest });
}
