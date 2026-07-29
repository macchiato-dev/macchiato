import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSiteRoute } from "@macchiato-dev/site";
import { buildResourcesSiteRoutesForRuntime } from "./seed.js";
import { DEFAULT_RESOURCE_LOCALE, loadResourcesLocales, RESOURCE_LOCALES } from "./i18n.js";
import { commandPaletteUseBrowserAssets } from "@macchiato-dev/command-palette-use/browser-assets";
import { themeUseBrowserAssets } from "@macchiato-dev/theme-use/browser-assets";

const directory = dirname(fileURLToPath(import.meta.url));
const fontDirectory = join(directory, "..", "resources-website", "assets", "fonts");
const fontNames = ["space-grotesk-latin.woff2", "space-grotesk-latin-ext.woff2", "space-grotesk-vietnamese.woff2"];

function routeRow(route) {
  return { ...route, navJson: JSON.stringify(route.nav || []), transitionJson: JSON.stringify(route.transition || {}) };
}

function routeFile(route, locale) {
  const path = route.path === "/" ? "index.html" : `${route.path.slice(1)}/index.html`;
  return `/locales/${locale}/${path}`;
}

function bytes(value) {
  return typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
}

export function createResourcesArtifactSet({ theme = {}, generatedAt = new Date().toISOString() } = {}) {
  const messages = loadResourcesLocales();
  const routesByLocale = Object.fromEntries(RESOURCE_LOCALES.map((locale) => [
    locale,
    buildResourcesSiteRoutesForRuntime({ runtime: "edge", theme, locale }),
  ]));
  const routes = routesByLocale[DEFAULT_RESOURCE_LOCALE];
  const files = new Map();
  for (const locale of RESOURCE_LOCALES) {
    for (const route of routesByLocale[locale]) {
      files.set(routeFile(route, locale), bytes(renderSiteRoute(routeRow(route))));
    }
  }
  for (const name of fontNames) {
    files.set(`/-/fonts/resourcesco-space-grotesk/${name}`, bytes(readFileSync(join(fontDirectory, name))));
  }
  for (const set of [commandPaletteUseBrowserAssets, themeUseBrowserAssets]) {
    for (const asset of set.files) {
      files.set(`/-/${set.namespace}/${asset.publicPath}`, bytes(readFileSync(asset.filePath)));
    }
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
    defaultLocale: DEFAULT_RESOURCE_LOCALE,
    locales: RESOURCE_LOCALES,
    messages,
    routes: routes.map((route) => route.path),
    files: [...files.keys()],
    artifacts,
  });
  return Object.freeze({ routes: routes.length, files, manifest });
}
