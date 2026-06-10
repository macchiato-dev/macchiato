import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { putFontAsset } from "@macchiato-dev/font-use";
import { defineStaticSite, withSetup, withStaticFiles } from "./declarative-site.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function seedResourcesWebsiteFonts(db) {
  const fontRoot = join(__dirname, "assets", "fonts");
  for (const assetPath of [
    "space-grotesk-latin.woff2",
    "space-grotesk-latin-ext.woff2",
    "space-grotesk-vietnamese.woff2",
  ]) {
    putFontAsset(db, {
      name: "resourcesco-space-grotesk",
      assetPath,
      content: readFileSync(join(fontRoot, assetPath)),
      provider: "self",
      sourceUrl: "https://github.com/floriankarsten/space-grotesk",
    });
  }
}

export const resourcesWebsiteSite = defineStaticSite({
  root: __dirname,
  mixins: [
    withStaticFiles({
      routes: [
        { path: "/", aliases: ["/index.html"], file: "index.html" },
        { path: "/styles.css", file: "styles.css" },
      ],
      mounts: [
        { path: "/assets/", directory: "assets" },
      ],
    }),
    withSetup(seedResourcesWebsiteFonts),
  ],
});

export async function resourcesWebsiteHandler(request) {
  return resourcesWebsiteSite.handle(request);
}
