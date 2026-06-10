import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";

const execFileAsync = promisify(execFile);
const BROWSER_ASSET_SETS = [quickJsEmscriptenSandboxBrowserAssets];

function contentType(pathname) {
  if (pathname.endsWith(".mjs") || pathname.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (pathname.endsWith(".json") || pathname.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function assetUrl(set, publicPath) {
  return `/-/${set.namespace}/${publicPath}`;
}

function importMap() {
  const imports = {};
  for (const set of BROWSER_ASSET_SETS) {
    for (const [specifier, publicPath] of Object.entries(set.imports || {})) {
      imports[specifier] = assetUrl(set, publicPath);
    }
  }
  return JSON.stringify({ imports }, null, 2);
}

function providerAsset(pathname) {
  if (!pathname.startsWith("/-/")) return null;
  const assetPath = pathname.slice("/-/".length);
  if (assetPath.includes("..") || assetPath.includes("\\")) return null;

  for (const set of BROWSER_ASSET_SETS) {
    if (!assetPath.startsWith(`${set.namespace}/`)) continue;
    const publicPath = assetPath.slice(set.namespace.length + 1);
    for (const asset of set.files || []) {
      if (publicPath === asset.publicPath) return { asset };
      if (asset.sourceMapPath && publicPath === `${asset.publicPath}.map`) {
        return { asset: { ...asset, filePath: asset.sourceMapPath, rewrites: null, sourceMapPath: null } };
      }
    }
  }

  return null;
}

function rewriteAsset(content, asset) {
  let rewritten = content;
  for (const [from, to] of Object.entries(asset.rewrites || {})) {
    rewritten = rewritten.replaceAll(from, to);
  }
  if (asset.sourceMapPath) {
    rewritten = rewritten.replace(
      /\/\/# sourceMappingURL=.*$/m,
      `//# sourceMappingURL=${asset.publicPath}.map`,
    );
  }
  return rewritten;
}

async function serveProviderAsset(pathname) {
  const match = providerAsset(pathname);
  if (!match) return null;
  try {
    const content = await readFile(match.asset.filePath, "utf8");
    const body = pathname.endsWith(".js") ? rewriteAsset(content, match.asset) : content;
    return new Response(body, {
      headers: { "content-type": contentType(pathname) },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function normalizeGrant(grant) {
  if (!grant || grant.type !== "git") throw new Error("Package browser requires git file access.");
  const gitRoot = resolve(grant.gitRoot);
  const root = grant.root.replace(/^\/+|\/+$/g, "");
  if (!root || root.includes("..") || root.includes("\\") || resolve(gitRoot, root) === gitRoot) {
    throw new Error("Invalid git file access root.");
  }
  return { gitRoot, root };
}

function assertInside(base, target) {
  const rel = relative(base, target);
  return rel && !rel.startsWith("..") && !rel.split(sep).includes("..");
}

async function gitVisibleFiles(grant) {
  const { gitRoot, root } = normalizeGrant(grant);
  const rootPath = resolve(gitRoot, root);
  if (!assertInside(gitRoot, rootPath)) throw new Error("Configured file access is outside git root.");

  const { stdout } = await execFileAsync(
    "git",
    ["-C", gitRoot, "ls-files", "-c", "-o", "--exclude-standard", "--", root],
    { maxBuffer: 8 * 1024 * 1024 },
  );

  return stdout
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => file === root || file.startsWith(`${root}/`))
    .filter((file) => !file.includes("/.git/") && !file.endsWith("/.git"));
}

function languageFor(file) {
  const ext = extname(file).slice(1).toLowerCase();
  if (!ext) return "plain";
  if (ext === "mjs" || ext === "cjs") return "js";
  if (ext === "md") return "markdown";
  if (ext === "yml") return "yaml";
  return ext;
}

async function readPackageName(gitRoot, packageDir, files) {
  const packageJson = `${packageDir}/package.json`;
  if (!files.includes(packageJson)) return packageDir.split("/").at(-1);
  try {
    const body = await readFile(join(gitRoot, packageJson), "utf8");
    const parsed = JSON.parse(body);
    return typeof parsed.name === "string" ? parsed.name : packageDir.split("/").at(-1);
  } catch {
    return packageDir.split("/").at(-1);
  }
}

async function packageManifest(grant) {
  const { gitRoot, root } = normalizeGrant(grant);
  const files = await gitVisibleFiles(grant);
  const packageDirs = new Map();

  for (const file of files) {
    const parts = file.split("/");
    if (parts.length < 2 || parts[0] !== root) continue;
    const packageDir = `${parts[0]}/${parts[1]}`;
    if (!packageDirs.has(packageDir)) packageDirs.set(packageDir, []);
    packageDirs.get(packageDir).push(file);
  }

  const packages = await Promise.all([...packageDirs.entries()].map(async ([dir, packageFiles]) => {
    const languages = {};
    for (const file of packageFiles) {
      const language = languageFor(file);
      languages[language] = (languages[language] || 0) + 1;
    }
    return {
      dir,
      name: await readPackageName(gitRoot, dir, packageFiles),
      fileCount: packageFiles.length,
      languages,
      files: packageFiles.sort(),
    };
  }));

  return {
    type: "git-visible-files",
    root,
    generatedAt: new Date().toISOString(),
    packages: packages.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function page() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Packages</title>
<style>
  :root {
    color-scheme: light;
    --bg: #f6f4ef;
    --ink: #22252b;
    --muted: #66707d;
    --line: #d8dde3;
    --panel: #ffffff;
    --accent: #0f6b63;
    --shadow: 0 10px 28px rgba(25, 31, 38, 0.14);
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    min-height: 100vh;
    color: var(--ink);
    background: var(--bg);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0 0 auto;
    height: 8px;
    background: #0f6b63;
  }
  #app {
    min-height: 100vh;
  }
  #app[data-status="loading"] {
    display: grid;
    place-items: center;
    padding: 32px;
  }
  #app[data-status="loading"]::before {
    content: "";
    width: min(760px, calc(100vw - 40px));
    height: 430px;
    border-radius: 8px;
    background:
      linear-gradient(90deg, transparent, rgba(255,255,255,.76), transparent) -45% 0 / 42% 100% no-repeat,
      linear-gradient(#ffffff, #ffffff) 0 0 / 100% 100% no-repeat;
    box-shadow: var(--shadow);
    animation: packages-loading 1.1s ease-in-out infinite;
  }
  #app[data-status="error"] {
    display: grid;
    place-items: center;
    min-height: 100vh;
    padding: 32px;
    color: #8d1f1f;
    font-weight: 700;
  }
  @keyframes packages-loading {
    to {
      background-position: 145% 0, 0 0;
    }
  }
  .shell {
    width: min(1180px, calc(100vw - 40px));
    margin: 0 auto;
    padding: 44px 0 34px;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: end;
    margin-bottom: 22px;
  }
  h1 {
    margin: 0 0 8px;
    font-size: clamp(30px, 4vw, 50px);
    line-height: 1;
    letter-spacing: 0;
  }
  .subtitle {
    margin: 0;
    color: var(--muted);
    line-height: 1.5;
  }
  .grant {
    display: grid;
    gap: 4px;
    justify-items: end;
    color: var(--muted);
    font-size: 13px;
  }
  .grant code {
    color: var(--ink);
    background: #e8ecef;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 4px 7px;
  }
  .browser {
    display: grid;
    grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
    gap: 18px;
  }
  .package-list,
  .details {
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    box-shadow: var(--shadow);
  }
  .package-list {
    overflow: hidden;
  }
  .package-button {
    display: grid;
    width: 100%;
    gap: 5px;
    padding: 13px 15px;
    border: 0;
    border-bottom: 1px solid var(--line);
    color: inherit;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  .package-button:last-child {
    border-bottom: 0;
  }
  .package-button[aria-current="true"] {
    background: #e7f2ef;
    box-shadow: inset 4px 0 0 var(--accent);
  }
  .package-name {
    font-weight: 750;
  }
  .package-meta,
  .file-meta {
    color: var(--muted);
    font-size: 12px;
  }
  .details {
    padding: 20px;
  }
  .details h2 {
    margin: 0 0 8px;
    font-size: 24px;
    letter-spacing: 0;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 14px 0 18px;
  }
  .stat {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 5px 9px;
    color: #2e3944;
    background: #f8fafb;
    font-size: 12px;
  }
  .file-list {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .file-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 9px 10px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: #fcfcfd;
  }
  .file-path {
    overflow-wrap: anywhere;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
  }
  @media (max-width: 760px) {
    .topbar,
    .browser {
      grid-template-columns: 1fr;
    }
    .topbar {
      display: grid;
    }
    .grant {
      justify-items: start;
    }
  }
</style>
<script type="importmap">
${importMap()}
</script>
</head>
<body>
<main id="app" data-status="loading" aria-label="Loading packages"></main>
<script type="module" src="/client.js"></script>
</body>
</html>`;
}

const clientJs = `import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";

const app = document.querySelector("#app");

function showError(error) {
  app.dataset.status = "error";
  app.textContent = error?.message || String(error);
}

function render(result) {
  app.dataset.status = "ready";
  app.innerHTML = result.html;
}

try {
  const [manifestResponse, sandboxResponse] = await Promise.all([
    fetch("/api/manifest"),
    fetch("/sandbox.js"),
  ]);
  if (!manifestResponse.ok) throw new Error("Could not load package manifest.");
  if (!sandboxResponse.ok) throw new Error("Could not load sandbox code.");

  const manifest = await manifestResponse.json();
  const sandboxCode = await sandboxResponse.text();
  const sandbox = await createSandbox();
  sandbox.evalGlobal(sandboxCode, "packages-browser-sandbox.js");
  render(sandbox.callJsonFunction("__packagesBoot", manifest));

  app.addEventListener("click", (event) => {
    const button = event.target.closest("[data-package-dir]");
    if (!button) return;
    render(sandbox.callJsonFunction("__packagesSelect", { dir: button.dataset.packageDir }));
  });
} catch (error) {
  showError(error);
}
`;

const sandboxJs = `let manifest = null;
let selectedDir = "";

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function currentPackage() {
  return manifest.packages.find((pkg) => pkg.dir === selectedDir) || manifest.packages[0] || null;
}

function languageStats(pkg) {
  return Object.entries(pkg.languages)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([name, count]) => '<span class="stat">' + esc(name) + ': ' + count + '</span>')
    .join("");
}

function packageButtons(active) {
  return manifest.packages.map((pkg) => {
    const current = pkg.dir === active.dir ? ' aria-current="true"' : "";
    return '<button class="package-button" type="button" data-package-dir="' + esc(pkg.dir) + '"' + current + '>' +
      '<span class="package-name">' + esc(pkg.name) + '</span>' +
      '<span class="package-meta">' + esc(pkg.dir) + ' / ' + pkg.fileCount + ' files</span>' +
      '</button>';
  }).join("");
}

function fileRows(pkg) {
  return pkg.files.map((file) => {
    const relative = file.slice(pkg.dir.length + 1);
    const ext = relative.includes(".") ? relative.split(".").pop() : "plain";
    return '<li class="file-row">' +
      '<span class="file-path">' + esc(relative) + '</span>' +
      '<span class="file-meta">' + esc(ext) + '</span>' +
      '</li>';
  }).join("");
}

function render() {
  const pkg = currentPackage();
  if (!pkg) {
    return { html: '<section class="shell"><h1>Packages</h1><p class="subtitle">No package files are available to this app.</p></section>' };
  }
  const html = '<section class="shell">' +
    '<div class="topbar">' +
      '<div><h1>Packages</h1><p class="subtitle">Client-side package browsing, rendered inside the QuickJS WASM sandbox.</p></div>' +
      '<div class="grant"><span>Configured file access</span><code>' + esc(manifest.root) + '</code></div>' +
    '</div>' +
    '<div class="browser">' +
      '<nav class="package-list" aria-label="Packages">' + packageButtons(pkg) + '</nav>' +
      '<section class="details" aria-live="polite">' +
        '<h2>' + esc(pkg.name) + '</h2>' +
        '<p class="subtitle">' + esc(pkg.dir) + ' contains ' + pkg.fileCount + ' non-ignored git-visible files.</p>' +
        '<div class="stats">' + languageStats(pkg) + '</div>' +
        '<ul class="file-list">' + fileRows(pkg) + '</ul>' +
      '</section>' +
    '</div>' +
  '</section>';
  return { html };
}

globalThis.__packagesBoot = (payload) => {
  manifest = JSON.parse(payload);
  selectedDir = manifest.packages[0]?.dir || "";
  return JSON.stringify(render());
};

globalThis.__packagesSelect = (payload) => {
  const message = JSON.parse(payload);
  if (manifest.packages.some((pkg) => pkg.dir === message.dir)) selectedDir = message.dir;
  return JSON.stringify(render());
};
`;

export async function packageBrowserHandler(request, app) {
  const url = new URL(request.url);
  const asset = await serveProviderAsset(url.pathname);
  if (asset) return asset;

  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(page(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (url.pathname === "/client.js") {
    return new Response(clientJs, {
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  if (url.pathname === "/sandbox.js") {
    return new Response(sandboxJs, {
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  if (url.pathname === "/api/manifest") {
    try {
      const manifest = await packageManifest(app.fileAccess);
      return Response.json(manifest);
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  return new Response("Not found", { status: 404 });
}

export const packageBrowserFileAccess = {
  type: "git",
  root: "packages",
};
