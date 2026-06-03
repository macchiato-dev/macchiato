import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DomUse } from "@macchiato-dev/dom-use";
import { parseHTML, serializeHTML } from "@macchiato-dev/html-use";
import { StyleUse } from "@macchiato-dev/style-use";

const __dirname = dirname(fileURLToPath(import.meta.url));

let assetsPromise = null;

async function readAsset(path) {
  return readFile(join(__dirname, path), "utf8");
}

async function assets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      readAsset("page.html"),
      readAsset("styles.css"),
      readAsset("dom.schema.json"),
      readAsset("css.schema.json"),
    ]).then(([pageHtml, css, domSchema, cssSchema]) => ({
      pageHtml,
      css,
      domSchema: JSON.parse(domSchema),
      cssSchema: JSON.parse(cssSchema),
    }));
  }
  return assetsPromise;
}

function renderPage(loaded) {
  const styleUse = new StyleUse({
    ...loaded.cssSchema,
    selectors: new RegExp(loaded.cssSchema.selectors),
  });
  styleUse.validateStylesheet(loaded.css);
  const domUse = new DomUse({
    ...loaded.domSchema,
    urls: {
      href: new RegExp(loaded.domSchema.urls.href),
    },
  }, styleUse);
  const doc = domUse.createDocument();
  const fragment = parseHTML(loaded.pageHtml, {
    createElement: (tag) => doc.createElement(tag),
    createTextNode: (text) => doc.createTextNode(text),
    schema: domUse.schema,
    styleUse,
  });
  const body = serializeHTML(fragment);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Resources.co</title>
  <style>
${loaded.css}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function resourcesWebsiteHandler(request) {
  const url = new URL(request.url);
  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    return new Response("Not found", { status: 404 });
  }

  try {
    const loaded = await assets();
    return new Response(renderPage(loaded), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(`Sandbox error: ${err.message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
