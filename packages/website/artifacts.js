import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSiteRoute } from "@macchiato-dev/site";
import { buildResourcesSiteRoutesForRuntime } from "./seed.js";
import { DEFAULT_RESOURCE_LOCALE, loadResourcesLocales, RESOURCE_LOCALES } from "./i18n.js";
import { commandPaletteUseBrowserAssets } from "@macchiato-dev/command-palette-use/browser-assets";
import { themeUseBrowserAssets } from "@macchiato-dev/theme-use/browser-assets";
import { userMenuUseBrowserAssets } from "@macchiato-dev/user-menu-use/browser-assets";

const directory = dirname(fileURLToPath(import.meta.url));
const hubSourceDirectory = join(directory, "..", "hub", "src");
const fontDirectory = join(directory, "..", "..", "examples", "resources-website", "assets", "fonts");
const vtvExampleDirectory = join(directory, "blog-examples", "vtv", "dist");
const markdownEditorExampleDirectory = join(directory, "blog-examples", "markdown-editor", "dist");
const codeTourExampleDirectory = join(directory, "blog-examples", "dom-use-tour", "dist");
const generatedDirectory = join(directory, "generated");
const blogImageDirectory = join(directory, "assets", "blog");
const fontNames = ["space-grotesk-latin.woff2", "space-grotesk-latin-ext.woff2", "space-grotesk-vietnamese.woff2"];
const blogImageNames = ["webassembly-capability-container.png", "webassembly-container-surfaces.png"];

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

function version(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

export function createResourcesArtifactSet({ theme = {}, generatedAt = new Date().toISOString(), blogExamplesOrigin = "" } = {}) {
  const messages = loadResourcesLocales();
  const routesByLocale = Object.fromEntries(RESOURCE_LOCALES.map((locale) => [
    locale,
    buildResourcesSiteRoutesForRuntime({ runtime: "edge", theme, locale, blogExamplesOrigin }),
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
  for (const name of blogImageNames) {
    files.set(`/-/blog-images/${name}`, bytes(readFileSync(join(blogImageDirectory, name))));
  }
  for (const set of [commandPaletteUseBrowserAssets, themeUseBrowserAssets, userMenuUseBrowserAssets]) {
    for (const asset of set.files) {
      files.set(`/-/${set.namespace}/${asset.publicPath}`, bytes(readFileSync(asset.filePath)));
    }
  }
  const editorGuest = bytes(readFileSync(join(generatedDirectory, "project-editor-guest.js")));
  const editorRuntime = bytes(readFileSync(join(generatedDirectory, "project-editor-runtime.js"), "utf8")
    .replace("/-/resources-site/project-editor-guest.js", `/-/resources-site/project-editor-guest.js?v=${version(editorGuest)}`));
  const contentForm = bytes(readFileSync(join(directory, "content-form-client.js"), "utf8")
    .replace("/-/resources-site/project-editor-runtime.js", `/-/resources-site/project-editor-runtime.js?v=${version(editorRuntime)}`));
  files.set("/-/resources-site/content-form.js", contentForm);
  files.set("/-/resources-site/project-editor-runtime.js", editorRuntime);
  files.set("/-/resources-site/presentation-runner.js", bytes(readFileSync(join(generatedDirectory, "presentation-runner.js"))));
  files.set("/-/resources-site/presentation-runner.html", bytes(readFileSync(join(directory, "../../packages/presentation-use/runner.html"))));
  files.set("/-/resources-site/project-editor-guest.js", editorGuest);
  files.set("/-/resources-site/project-history.js", bytes(readFileSync(join(hubSourceDirectory, "project-history.js"))));
  files.set("/-/resources-site/url-pattern.js", bytes(readFileSync(join(hubSourceDirectory, "url-pattern.js"))));
  files.set("/-/resources-site/container-elements.js", bytes(readFileSync(join(hubSourceDirectory, "container-elements.js"))));
  files.set("/-/resources-site/project-archive.js", bytes(readFileSync(join(hubSourceDirectory, "project-archive.js"))));
  for (const [slug, source] of [["vtv", vtvExampleDirectory], ["markdown-editor", markdownEditorExampleDirectory], ["dom-use-tour", codeTourExampleDirectory]]) {
    for (const name of readdirSync(source)) {
      files.set(`/-/blog-examples/${slug}/${name}`, bytes(readFileSync(join(source, name))));
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
