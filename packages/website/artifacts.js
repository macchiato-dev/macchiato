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
import { styleUseBrowserAssets } from "@macchiato-dev/style-use/browser-assets";
import { renderFastAnonymousHome } from "./edge/app.js";

const directory = dirname(fileURLToPath(import.meta.url));
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
  const embeddedFonts = new Map(fontNames.map((name) => [
    `/-/fonts/resourcesco-space-grotesk/${name}`,
    `data:font/woff2;base64,${Buffer.from(readFileSync(join(fontDirectory, name))).toString("base64")}`,
  ]));
  const routesByLocale = Object.fromEntries(RESOURCE_LOCALES.map((locale) => [
    locale,
    buildResourcesSiteRoutesForRuntime({ runtime: "edge", theme, locale, blogExamplesOrigin }),
  ]));
  const routes = routesByLocale[DEFAULT_RESOURCE_LOCALE];
  const files = new Map();
  for (const locale of RESOURCE_LOCALES) {
    for (const route of routesByLocale[locale]) {
      let content = renderSiteRoute(routeRow(route));
      for (const [url, data] of embeddedFonts) content = content.replaceAll(url, data);
      files.set(routeFile(route, locale), bytes(content));
    }
  }
  for (const name of blogImageNames) {
    files.set(`/-/blog-images/${name}`, bytes(readFileSync(join(blogImageDirectory, name))));
  }
  for (const set of [commandPaletteUseBrowserAssets, themeUseBrowserAssets, userMenuUseBrowserAssets, { ...styleUseBrowserAssets, namespace: "style-use" }]) {
    for (const asset of set.files) {
      files.set(`/-/${set.namespace}/${asset.publicPath}`, bytes(readFileSync(asset.filePath)));
    }
  }
  const projectRuntime = bytes(readFileSync(join(generatedDirectory, "project-quickjs-runtime.wasm")));
  const projectBuilder = bytes(readFileSync(join(generatedDirectory, "project-builder-quickjs-runtime.wasm")));
  const editorMachine = bytes(readFileSync(join(generatedDirectory, "project-editor-quickjs-runtime.wasm")));
  const frontendMachine = bytes(readFileSync(join(generatedDirectory, "resources-frontend-microquickjs.wasm")));
  const browserMachine = bytes(readFileSync(join(directory, "frontend", "machine.js")));
  files.set("/-/resources-site/machine.js", browserMachine);
  const machineController = bytes(readFileSync(join(directory, "frontend", "controller.js"), "utf8")
    .replace("/-/resources-site/resources-frontend-microquickjs.wasm",
      `/-/resources-site/resources-frontend-microquickjs.wasm?v=${version(frontendMachine)}`));
  files.set("/-/resources-site/controller.js", machineController);
  files.set("/-/resources-site/resources-frontend-microquickjs.wasm", frontendMachine);
  const outputFrameController = readFileSync(join(generatedDirectory, "project-output-frame-controller.js"), "utf8");
  const outputFrame = readFileSync(join(directory, "project-output-frame.html"), "utf8")
    .replace("/* PROJECT_OUTPUT_FRAME_CONTROLLER */", () => outputFrameController);
  files.set("/-/resources-site/project-output-frame.html", bytes(outputFrame));
  files.set("/-/resources-site/project-quickjs-runtime.wasm", projectRuntime);
  files.set("/-/resources-site/project-builder-quickjs-runtime.wasm", projectBuilder);
  files.set("/-/resources-site/project-editor-quickjs-runtime.wasm", editorMachine);
  for (const [slug, source] of [["vtv", vtvExampleDirectory], ["markdown-editor", markdownEditorExampleDirectory], ["dom-use-tour", codeTourExampleDirectory]]) {
    for (const name of readdirSync(source)) {
      files.set(`/-/blog-examples/${slug}/${name}`, bytes(readFileSync(join(source, name))));
    }
  }
  const controllerVersion = version(files.get("/-/resources-site/controller.js"));
  for (const locale of RESOURCE_LOCALES) {
    const home = new TextDecoder().decode(files.get(`/locales/${locale}/index.html`));
    for (const signupsEnabled of [true, false]) {
      const state = signupsEnabled ? "open" : "closed";
      files.set(`/fast/locales/${locale}/home-${state}.html`, bytes(renderFastAnonymousHome(
        home,
        messages[locale],
        { locale, signupsEnabled, controllerVersion },
      )));
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
