import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { sanitizeHTML } from "@macchiato-dev/html-use";
import { StyleUse } from "@macchiato-dev/style-use";

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const STYLE_RE = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
const LINK_RE = /<link\b([^>]*)>/gi;

function attribute(source, name) {
  const match = source.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function localPath(directory, value, label) {
  if (typeof value !== "string" || !value || /^(?:[a-z]+:|\/\/)/i.test(value)) throw new Error(`${label} must be a local path`);
  const path = resolve(directory, value.replace(/^\//, ""));
  if (path !== directory && !path.startsWith(`${directory}/`)) throw new Error(`${label} escapes the app directory`);
  return path;
}

export function validateStandardAppConfig(config) {
  if (!config || config.version !== 1 || config.format !== "standard-web-app") throw new Error("Expected standard-web-app configuration version 1");
  if (typeof config.entry !== "string") throw new Error("Configuration requires entry");
  if (!config.schemas?.html || !config.schemas?.css) throw new Error("Configuration requires HTML and CSS schemas");
  if (!config.runtime?.bootstrap) throw new Error("Configuration requires a trusted runtime bootstrap");
  return config;
}

export async function loadStandardWebApp(directory, config, { resolveScript } = {}) {
  directory = resolve(directory);
  validateStandardAppConfig(config);
  const [source, htmlSchema, cssSchema] = await Promise.all([
    readFile(localPath(directory, config.entry, "entry"), "utf8"),
    readFile(localPath(directory, config.schemas.html, "HTML schema"), "utf8").then(JSON.parse),
    readFile(localPath(directory, config.schemas.css, "CSS schema"), "utf8").then(JSON.parse),
  ]);
  const styles = [];
  for (const match of source.matchAll(STYLE_RE)) {
    styles.push({ source: `inline-${styles.length + 1}.css`, url: `/-/style/${styles.length}.css`, code: match[1] });
  }
  for (const match of source.matchAll(LINK_RE)) {
    if (attribute(match[1], "rel").toLowerCase() !== "stylesheet") continue;
    const href = attribute(match[1], "href");
    styles.push({ source: href, url: href.startsWith("/") ? href : `/${href}`, code: await readFile(localPath(directory, href, "stylesheet"), "utf8") });
  }
  const scripts = [];
  for (const match of source.matchAll(SCRIPT_RE)) {
    const src = attribute(match[1], "src");
    const code = src
      ? await (resolveScript?.(src) ?? readFile(localPath(directory, src, "script"), "utf8"))
      : match[2];
    scripts.push({ source: src || `inline-${scripts.length + 1}.js`, code: String(code), type: attribute(match[1], "type") || "text/javascript" });
  }
  const styleUse = new StyleUse(cssSchema);
  for (const style of styles) styleUse.validateStylesheet(style.code);
  const title = source.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.trim() || config.id || "Macchiato app";
  const body = source.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1] ?? source;
  const inert = body.replace(SCRIPT_RE, "").replace(STYLE_RE, "").replace(LINK_RE, "");
  const html = sanitizeHTML(inert, { schema: htmlSchema, styleUse });
  return Object.freeze({ config, title, html, styles: Object.freeze(styles), scripts: Object.freeze(scripts) });
}

function escape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function renderStandardWebApp(loaded, { importMap = null } = {}) {
  const styles = loaded.styles.map((style) => `<link rel="stylesheet" href="${escape(style.url)}">`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(loaded.title)}</title>${styles}${importMap ? `<script type="importmap">${importMap}</script>` : ""}</head><body>${loaded.html}<script type="module" src="/-/runtime.js"></script></body></html>`;
}

export async function createStandardWebAppHandler({ directory, config, resolveScript, importMap, assets }) {
  const loaded = await loadStandardWebApp(directory, config, { resolveScript });
  const page = renderStandardWebApp(loaded, { importMap });
  return async function handler(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/" || pathname === "/index.html") return new Response(page, { headers: { "content-type": "text/html; charset=utf-8", "x-macchiato-runtime": "browser-quickjs" } });
    const style = loaded.styles.find((entry) => entry.url === pathname);
    if (style) return new Response(style.code, { headers: { "content-type": "text/css; charset=utf-8", "x-content-type-options": "nosniff" } });
    if (pathname === "/-/app-manifest.json") return Response.json({ scripts: loaded.scripts.map(({ source, type }, index) => ({ source, type, url: `/-/guest/${index}.js` })) });
    const guest = pathname.match(/^\/-\/guest\/(\d+)\.js$/);
    if (guest && loaded.scripts[Number(guest[1])]) return new Response(loaded.scripts[Number(guest[1])].code, { headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff" } });
    if (pathname === "/-/runtime.js") return new Response(await readFile(localPath(directory, config.runtime.bootstrap, "runtime bootstrap"), "utf8"), { headers: { "content-type": "application/javascript; charset=utf-8" } });
    return await assets?.(request) || new Response("Not found", { status: 404 });
  };
}

export async function readStandardAppConfig(directory) {
  const path = join(resolve(directory), "macchiato.app.json");
  return validateStandardAppConfig(JSON.parse(await readFile(path, "utf8")));
}
