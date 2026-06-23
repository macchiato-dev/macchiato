import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";

const execFileAsync = promisify(execFile);
const BROWSER_ASSET_SETS = [quickJsEmscriptenSandboxBrowserAssets];
const MAX_FILE_BYTES = 240_000;

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
    rewritten = rewritten.replace(/\/\/# sourceMappingURL=.*$/m, `//# sourceMappingURL=${asset.publicPath}.map`);
  }
  return rewritten;
}

async function serveProviderAsset(pathname) {
  const match = providerAsset(pathname);
  if (!match) return null;
  try {
    const content = await readFile(match.asset.filePath, "utf8");
    const body = pathname.endsWith(".js") ? rewriteAsset(content, match.asset) : content;
    return new Response(body, { headers: { "content-type": contentType(pathname) } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function normalizeGrant(grant) {
  if (!grant || grant.type !== "git") throw new Error("Code annotator requires git file access.");
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
  if (ext === "mjs" || ext === "cjs") return "js";
  if (ext === "md") return "markdown";
  if (ext === "yml") return "yaml";
  return ext || "plain";
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

async function moduleManifest(grant) {
  const { gitRoot, root } = normalizeGrant(grant);
  const files = await gitVisibleFiles(grant);
  const moduleDirs = new Map();
  for (const file of files) {
    const parts = file.split("/");
    if (parts.length < 2 || parts[0] !== root) continue;
    const moduleDir = `${parts[0]}/${parts[1]}`;
    if (!moduleDirs.has(moduleDir)) moduleDirs.set(moduleDir, []);
    moduleDirs.get(moduleDir).push(file);
  }
  const modules = await Promise.all([...moduleDirs.entries()].map(async ([dir, moduleFiles]) => ({
    dir,
    name: await readPackageName(gitRoot, dir, moduleFiles),
    fileCount: moduleFiles.length,
    files: moduleFiles
      .filter((file) => /\.(?:js|mjs|json|md|css|html|ts|tsx|jsx|yml|yaml)$/i.test(file))
      .map((file) => ({ path: file, language: languageFor(file) }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  })));
  return {
    type: "git-visible-code-modules",
    root,
    generatedAt: new Date().toISOString(),
    modules: modules.filter((mod) => mod.files.length).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

async function readGrantedFile(grant, path) {
  const { gitRoot, root } = normalizeGrant(grant);
  const files = await gitVisibleFiles(grant);
  const requested = String(path || "");
  if (!files.includes(requested) || !requested.startsWith(`${root}/`)) {
    return { status: 404, body: { error: "File is not granted to this app." } };
  }
  const absolute = resolve(gitRoot, requested);
  if (!assertInside(gitRoot, absolute)) return { status: 404, body: { error: "Invalid file path." } };
  const content = await readFile(absolute, "utf8");
  if (content.length > MAX_FILE_BYTES) {
    return { status: 413, body: { error: "File is too large for the browser annotator." } };
  }
  return {
    status: 200,
    body: {
      path: requested,
      language: languageFor(requested),
      content,
      lines: content.split(/\r?\n/).length,
    },
  };
}

function page() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Code Notes</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #0b1020;
    --panel: #111936;
    --panel-2: #172046;
    --ink: #edf4ff;
    --muted: #a8b4ca;
    --line: rgba(183, 198, 230, 0.18);
    --accent: #64d8cb;
    --accent-2: #f2c14e;
    --danger: #ff7d7d;
    --code: #090e1d;
    --shadow: 0 18px 48px rgba(0, 0, 0, 0.34);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    color: var(--ink);
    background: linear-gradient(145deg, #09101f, #121b42 58%, #17265f);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  #app { min-height: 100vh; }
  #app[data-status="loading"] {
    display: grid;
    place-items: center;
    color: var(--muted);
  }
  .shell {
    width: min(1540px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 24px 0;
    display: grid;
    gap: 16px;
  }
  .workspace {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr) 360px;
    gap: 14px;
    align-items: start;
  }
  .panel {
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: rgba(17, 25, 54, 0.92);
    box-shadow: var(--shadow);
  }
  .module-list, .notes-panel { overflow: hidden; }
  .module-button, .file-button {
    display: grid;
    width: 100%;
    gap: 4px;
    padding: 11px 12px;
    border: 0;
    border-bottom: 1px solid var(--line);
    color: inherit;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  .file-button { padding-left: 22px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
  .module-button[aria-current="true"], .file-button[aria-current="true"] {
    background: rgba(100, 216, 203, 0.13);
    box-shadow: inset 4px 0 0 var(--accent);
  }
  .name { font-weight: 760; }
  .meta { color: var(--muted); font-size: 12px; }
  .viewer { display: grid; grid-template-rows: auto minmax(0, 1fr); }
  .viewer-head, .notes-head {
    padding: 14px 16px;
    border-bottom: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }
  h1, h2 { margin: 0; letter-spacing: 0; }
  h1 { font-size: 22px; }
  h2 { font-size: 16px; }
  .range-form {
    display: grid;
    grid-template-columns: 72px 72px minmax(180px, 1fr) auto;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line);
    background: rgba(9, 14, 29, 0.5);
  }
  input, textarea {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--ink);
    background: rgba(7, 11, 24, 0.78);
    font: inherit;
  }
  input { height: 36px; padding: 0 9px; }
  textarea { min-height: 86px; padding: 9px; resize: vertical; }
  .note-input { min-height: 36px; resize: vertical; }
  button {
    border: 1px solid rgba(100, 216, 203, 0.46);
    border-radius: 6px;
    color: var(--ink);
    background: rgba(100, 216, 203, 0.14);
    font-weight: 760;
    cursor: pointer;
  }
  .code-scroll { max-height: calc(100vh - 190px); overflow: auto; background: var(--code); }
  .code-table { width: 100%; border-collapse: collapse; font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  .line-button {
    width: 100%;
    min-width: 48px;
    padding: 0 10px;
    border: 0;
    border-radius: 0;
    color: #7f8aa3;
    background: #0d1326;
    text-align: right;
    font: inherit;
  }
  .code-line.is-selected .line-button { color: var(--code); background: var(--accent-2); }
  .code-line.is-annotated .line-button { color: var(--ink); background: rgba(100, 216, 203, 0.28); }
  .source { padding: 0 14px; white-space: pre; }
  .tok-key { color: #ffb86c; }
  .tok-str { color: #7ee787; }
  .tok-com { color: #8b9bb8; }
  .tok-num { color: #bd93f9; }
  .notes-body { display: grid; gap: 12px; padding: 14px; }
  .annotation { border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: rgba(9, 14, 29, 0.55); }
  .annotation code { color: var(--accent); overflow-wrap: anywhere; }
  .annotation p { margin: 7px 0 0; color: var(--muted); }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .secondary { border-color: var(--line); background: rgba(255, 255, 255, 0.06); }
  .danger { border-color: rgba(255, 125, 125, 0.5); color: var(--danger); background: rgba(255, 125, 125, 0.1); }
  .empty { padding: 28px; color: var(--muted); }
  @media (max-width: 1100px) {
    .workspace { grid-template-columns: 1fr; }
    .code-scroll { max-height: 62vh; }
  }
</style>
<script type="importmap">
${importMap()}
</script>
</head>
<body>
<main id="app" data-status="loading">Loading code annotator...</main>
<script type="module" src="/client.js"></script>
</body>
</html>`;
}

const clientJs = `import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";

const app = document.querySelector("#app");
const storageKey = "code-annotator-markdown";

function showError(error) {
  app.dataset.status = "error";
  app.textContent = error?.message || String(error);
}

function render(result) {
  app.dataset.status = "ready";
  app.innerHTML = result.html;
  if (result.markdown !== undefined) localStorage.setItem(storageKey, result.markdown);
}

async function openFile(sandbox, path) {
  const response = await fetch("/api/file?path=" + encodeURIComponent(path));
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Could not load file.");
  render(sandbox.callJsonFunction("__annotatorOpenFile", payload));
}

function formPayload() {
  return {
    start: app.querySelector("#range-start")?.value || "",
    end: app.querySelector("#range-end")?.value || "",
    note: app.querySelector("#annotation-note")?.value || "",
  };
}

try {
  const [manifestResponse, sandboxResponse] = await Promise.all([
    fetch("/api/manifest"),
    fetch("/sandbox.js"),
  ]);
  if (!manifestResponse.ok) throw new Error("Could not load module manifest.");
  if (!sandboxResponse.ok) throw new Error("Could not load sandbox code.");
  const manifest = await manifestResponse.json();
  const sandboxCode = await sandboxResponse.text();
  const sandbox = await createSandbox();
  sandbox.evalGlobal(sandboxCode, "code-annotator-sandbox.js");
  render(sandbox.callJsonFunction("__annotatorBoot", { manifest, markdown: localStorage.getItem(storageKey) || "" }));

  app.addEventListener("click", async (event) => {
    const moduleButton = event.target.closest("[data-module-dir]");
    if (moduleButton) {
      render(sandbox.callJsonFunction("__annotatorSelectModule", { dir: moduleButton.dataset.moduleDir }));
      return;
    }
    const fileButton = event.target.closest("[data-file-path]");
    if (fileButton) {
      await openFile(sandbox, fileButton.dataset.filePath);
      return;
    }
    const lineButton = event.target.closest("[data-line]");
    if (lineButton) {
      render(sandbox.callJsonFunction("__annotatorPickLine", { line: Number(lineButton.dataset.line) }));
      return;
    }
    const removeButton = event.target.closest("[data-remove-annotation]");
    if (removeButton) {
      render(sandbox.callJsonFunction("__annotatorRemove", { id: removeButton.dataset.removeAnnotation }));
      return;
    }
    if (event.target.closest("#add-annotation")) {
      render(sandbox.callJsonFunction("__annotatorAdd", formPayload()));
      return;
    }
    if (event.target.closest("#download-markdown")) {
      const markdown = sandbox.callJsonFunction("__annotatorMarkdown", {}).markdown;
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "code-annotations.md";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (event.target.closest("#import-markdown")) {
      render(sandbox.callJsonFunction("__annotatorImport", { markdown: app.querySelector("#markdown-import")?.value || "" }));
    }
  });
} catch (error) {
  showError(error);
}
`;

const sandboxJs = `let manifest = null;
let selectedModule = "";
let selectedFile = "";
let filePayload = null;
let range = { start: 1, end: 1 };
let annotations = [];

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function moduleByDir(dir) {
  return manifest.modules.find((mod) => mod.dir === dir) || manifest.modules[0] || null;
}

function currentModule() {
  return moduleByDir(selectedModule);
}

function currentFile() {
  const mod = currentModule();
  return mod?.files.find((file) => file.path === selectedFile) || mod?.files[0] || null;
}

function annotationId() {
  return String(Date.now()) + "-" + String(Math.random()).slice(2);
}

function parseMarkdown(markdown) {
  const text = String(markdown || "");
  const parsed = [];
  const re = /^### (.+)#L(\\d+)(?:-L(\\d+))?\\n\\n([\\s\\S]*?)(?=\\n\\n### |$)/gm;
  let match;
  while ((match = re.exec(text))) {
    parsed.push({
      id: annotationId(),
      file: match[1],
      start: Number(match[2]),
      end: Number(match[3] || match[2]),
      note: match[4].trim(),
    });
  }
  return parsed;
}

function markdown() {
  if (!annotations.length) return "# Code annotations\\n";
  return "# Code annotations\\n\\n" + annotations.map((item) => {
    const suffix = item.start === item.end ? "#L" + item.start : "#L" + item.start + "-L" + item.end;
    return "### " + item.file + suffix + "\\n\\n" + item.note.trim();
  }).join("\\n\\n");
}

function highlight(line, language) {
  function emit(cls, text) {
    return '<span class="' + cls + '">' + esc(text) + '</span>';
  }
  if (language === "js" || language === "ts" || language === "jsx" || language === "tsx") {
    const commentAt = line.indexOf("//");
    const code = commentAt >= 0 ? line.slice(0, commentAt) : line;
    const comment = commentAt >= 0 ? line.slice(commentAt) : "";
    const tokenRe = /("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')|\\b(const|let|var|function|return|import|export|from|if|else|for|while|class|new|await|async|try|catch)\\b|\\b(\\d+(?:\\.\\d+)?)\\b/g;
    let out = "";
    let index = 0;
    let match;
    while ((match = tokenRe.exec(code))) {
      out += esc(code.slice(index, match.index));
      out += emit(match[1] ? "tok-str" : match[2] ? "tok-key" : "tok-num", match[0]);
      index = match.index + match[0].length;
    }
    out += esc(code.slice(index));
    if (comment) out += emit("tok-com", comment);
    return out || " ";
  }
  if (language === "json") {
    const tokenRe = /("(?:\\\\.|[^"\\\\])*")(\\s*:)?|\\b(true|false|null|\\d+(?:\\.\\d+)?)\\b/g;
    let out = "";
    let index = 0;
    let match;
    while ((match = tokenRe.exec(line))) {
      out += esc(line.slice(index, match.index));
      if (match[1]) out += emit("tok-str", match[1]) + esc(match[2] || "");
      else out += emit("tok-num", match[0]);
      index = match.index + match[0].length;
    }
    out += esc(line.slice(index));
    return out || " ";
  }
  return esc(line) || " ";
}

function moduleButtons(active) {
  return manifest.modules.map((mod) => {
    const current = mod.dir === active.dir ? ' aria-current="true"' : "";
    return '<button class="module-button" type="button" data-module-dir="' + esc(mod.dir) + '"' + current + '>' +
      '<span class="name">' + esc(mod.name) + '</span>' +
      '<span class="meta">' + esc(mod.dir) + ' / ' + mod.files.length + ' code files</span>' +
      '</button>';
  }).join("");
}

function fileButtons(mod, activePath) {
  return mod.files.map((file) => {
    const current = file.path === activePath ? ' aria-current="true"' : "";
    return '<button class="file-button" type="button" data-file-path="' + esc(file.path) + '"' + current + '>' +
      esc(file.path.slice(mod.dir.length + 1)) +
      '<span class="meta">' + esc(file.language) + '</span>' +
      '</button>';
  }).join("");
}

function lineClass(number) {
  const selected = number >= range.start && number <= range.end;
  const annotated = annotations.some((item) => item.file === selectedFile && number >= item.start && number <= item.end);
  return ' class="code-line' + (selected ? " is-selected" : "") + (annotated ? " is-annotated" : "") + '"';
}

function codeRows() {
  if (!filePayload) return '<div class="empty">Select a file to load its code.</div>';
  return '<div class="code-scroll"><table class="code-table"><tbody>' + filePayload.content.split(/\\r?\\n/).map((line, index) => {
    const number = index + 1;
    return '<tr' + lineClass(number) + '>' +
      '<td><button class="line-button" type="button" data-line="' + number + '">' + number + '</button></td>' +
      '<td class="source">' + highlight(line, filePayload.language) + '</td>' +
      '</tr>';
  }).join("") + '</tbody></table></div>';
}

function annotationsHtml() {
  if (!annotations.length) return '<p class="empty">No annotations yet.</p>';
  return annotations.map((item) => '<article class="annotation">' +
    '<code>' + esc(item.file) + '#L' + item.start + (item.end === item.start ? "" : '-L' + item.end) + '</code>' +
    '<p>' + esc(item.note) + '</p>' +
    '<button class="danger" type="button" data-remove-annotation="' + esc(item.id) + '">Remove</button>' +
  '</article>').join("");
}

function render() {
  const mod = currentModule();
  if (!mod) return { html: '<section class="shell"><p class="empty">No modules are available.</p></section>', markdown: markdown() };
  const file = currentFile();
  const fileTitle = selectedFile || file?.path || "No file selected";
  return {
    markdown: markdown(),
    html: '<section class="shell">' +
      '<div class="workspace">' +
        '<nav class="panel module-list" aria-label="Modules">' + moduleButtons(mod) + fileButtons(mod, selectedFile) + '</nav>' +
        '<section class="panel viewer">' +
          '<div class="viewer-head"><h1>' + esc(fileTitle) + '</h1><span class="meta">Click line numbers to set a range</span></div>' +
          '<div class="range-form">' +
            '<input id="range-start" aria-label="Start line" value="' + range.start + '">' +
            '<input id="range-end" aria-label="End line" value="' + range.end + '">' +
            '<textarea id="annotation-note" class="note-input" aria-label="Annotation note" placeholder="Annotation"></textarea>' +
            '<button id="add-annotation" type="button">Add</button>' +
          '</div>' +
          codeRows() +
        '</section>' +
        '<aside class="panel notes-panel">' +
          '<div class="notes-head"><h2>Annotations</h2><div class="actions"><button id="download-markdown" type="button">Download</button></div></div>' +
          '<div class="notes-body">' + annotationsHtml() +
            '<textarea id="markdown-import" aria-label="Import markdown" placeholder="Paste saved markdown"></textarea>' +
            '<button id="import-markdown" class="secondary" type="button">Import markdown</button>' +
          '</div>' +
        '</aside>' +
      '</div>' +
    '</section>',
  };
}

globalThis.__annotatorBoot = (payload) => {
  const data = JSON.parse(payload);
  manifest = data.manifest;
  annotations = parseMarkdown(data.markdown);
  selectedModule = manifest.modules[0]?.dir || "";
  selectedFile = currentModule()?.files[0]?.path || "";
  return JSON.stringify(render());
};

globalThis.__annotatorSelectModule = (payload) => {
  const data = JSON.parse(payload);
  if (manifest.modules.some((mod) => mod.dir === data.dir)) {
    selectedModule = data.dir;
    selectedFile = currentModule()?.files[0]?.path || "";
    filePayload = null;
    range = { start: 1, end: 1 };
  }
  return JSON.stringify(render());
};

globalThis.__annotatorOpenFile = (payload) => {
  filePayload = JSON.parse(payload);
  selectedFile = filePayload.path;
  selectedModule = manifest.modules.find((mod) => mod.files.some((file) => file.path === selectedFile))?.dir || selectedModule;
  range = { start: 1, end: 1 };
  return JSON.stringify(render());
};

globalThis.__annotatorPickLine = (payload) => {
  const line = Number(JSON.parse(payload).line);
  if (!Number.isFinite(line)) return JSON.stringify(render());
  if (range.start !== range.end) range = { start: line, end: line };
  else range = { start: Math.min(range.start, line), end: Math.max(range.start, line) };
  return JSON.stringify(render());
};

globalThis.__annotatorAdd = (payload) => {
  const data = JSON.parse(payload);
  const start = Math.max(1, Number(data.start || range.start));
  const end = Math.max(start, Number(data.end || range.end));
  const note = String(data.note || "").trim();
  if (selectedFile && note) annotations.push({ id: annotationId(), file: selectedFile, start, end, note });
  return JSON.stringify(render());
};

globalThis.__annotatorRemove = (payload) => {
  const id = JSON.parse(payload).id;
  annotations = annotations.filter((item) => item.id !== id);
  return JSON.stringify(render());
};

globalThis.__annotatorMarkdown = () => JSON.stringify({ markdown: markdown() });

globalThis.__annotatorImport = (payload) => {
  annotations = parseMarkdown(JSON.parse(payload).markdown);
  return JSON.stringify(render());
};
`;

export async function codeAnnotatorHandler(request, app) {
  const url = new URL(request.url);
  const asset = await serveProviderAsset(url.pathname);
  if (asset) return asset;
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(page(), { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  if (url.pathname === "/client.js") {
    return new Response(clientJs, { headers: { "content-type": "application/javascript; charset=utf-8" } });
  }
  if (url.pathname === "/sandbox.js") {
    return new Response(sandboxJs, { headers: { "content-type": "application/javascript; charset=utf-8" } });
  }
  if (url.pathname === "/api/manifest") {
    try {
      return Response.json(await moduleManifest(app.fileAccess));
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }
  if (url.pathname === "/api/file") {
    try {
      const result = await readGrantedFile(app.fileAccess, url.searchParams.get("path"));
      return Response.json(result.body, { status: result.status });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }
  return new Response("Not found", { status: 404 });
}

export const codeAnnotatorFileAccess = {
  type: "git",
  root: "packages",
};
