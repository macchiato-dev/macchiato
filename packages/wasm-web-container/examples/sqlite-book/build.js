import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "../..");
const workspace = resolve(packageRoot, "../..");
const legacy = join(workspace, "dev/dom-use-lite/examples");
const configuration = JSON.parse(await readFile(join(here, "reproducibility.json"), "utf8"));
const archive = join(packageRoot, "vendor/sqlite-doc-3530400.zip");
const build = join(packageRoot, "dist/build/sqlite-book");
const output = join(packageRoot, configuration.output.file);
const pages = [
  "about.html", "quickstart.html", "datatype3.html", "lockingv3.html",
  "wal.html", "queryplanner.html", "json1.html", "fts5.html", "limits.html"
];

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest("hex");
}

function decode(text) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] || "";
    const hex = entity[1].toLowerCase() === "x";
    return String.fromCodePoint(parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
  });
}

function text(html) {
  return decode(html.replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function identifier(attributes, fallback) {
  const found = /\bid=["']?([a-z][a-z0-9_.:-]*)/i.exec(attributes)?.[1];
  return (found || fallback.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "section")
    .slice(0, 96).replace(/-+$/g, "");
}

function extract(name, html) {
  const title = text(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] || name);
  const start = html.search(/<h1\b/i);
  const source = start < 0 ? html : html.slice(start);
  const tokens = [];
  const pattern = /<(h[1-3]|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const value = text(match[3]);
    if (value.length >= 2) tokens.push({ tag: match[1], attrs: match[2], value });
  }
  const sections = [];
  for (const token of tokens) {
    if (token.tag[0] === "h") {
      if (sections.length >= 32) break;
      sections.push({ id: identifier(token.attrs, token.value), title: token.value, paragraphs: [] });
    } else if (sections.length && sections.at(-1).paragraphs.length < 16) {
      sections.at(-1).paragraphs.push(token.value.slice(0, 3000));
    }
  }
  return {
    name, title, sections,
    source: `https://sqlite.org/${name}`
  };
}

async function download() {
  let bytes;
  try { bytes = await readFile(archive); }
  catch {
    const response = await fetch(configuration.input.url, { redirect: "error" });
    if (!response.ok) throw new Error(`SQLite archive response ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    await mkdir(dirname(archive), { recursive: true });
    await writeFile(archive, bytes);
  }
  const actual = digest(configuration.input.algorithm, bytes);
  if (actual !== configuration.input.hash) throw new Error(`SQLite archive hash ${actual}`);
}

function unzip(name) {
  return execFileSync("unzip", ["-p", archive, `sqlite-doc-3530400/${name}`], {
    encoding: "utf8", maxBuffer: 8 * 1024 * 1024
  });
}

await download();
await mkdir(build, { recursive: true });
const book = pages.map((name) => extract(name, unzip(name)));
const runtime = join(legacy, "microquickjs-guest-runtime");
const mqjs = join(runtime, "microquickjs/mqjs");
const target = join(runtime,
  "target/wasm32-unknown-unknown/release/dom_use_lite_example_runtime.wasm");
if (!await readFile(target).catch(() => null)) {
  execFileSync("sh", [join(legacy, "scripts/build.sh")], { stdio: "inherit" });
}
await copyFile(join(legacy, "web/dom-use-lite.js"),
  join(workspace, "dev/dom-use-lite/dist/pages/dom-use-lite.js"));
await copyFile(join(legacy, "web/wasm-runner.js"),
  join(workspace, "dev/dom-use-lite/dist/pages/wasm-runner.js"));
const runtimeSource = [
  `var DOCUMENT_TITLE=${JSON.stringify("SQLite Documentation Reader")};`,
  `var APPLICATION_SCRIPT=${JSON.stringify("sqlite-book.js")};`,
  "var FONT_RESOURCES={};",
  `var RUNTIME_RESOURCES={files:{"index.html":${JSON.stringify(await readFile(join(here,
    "index.html"), "utf8"))},"style.css":${JSON.stringify(await readFile(join(here,
    "style.css"), "utf8"))}}};\n`,
  await readFile(join(runtime, "guest-runtime.js"), "utf8")
].join("");
const applicationSource = `var BOOK_PAGES=${JSON.stringify(book)};\n` +
  await readFile(join(here, "application.js"), "utf8");
await writeFile(join(build, "runtime.js"), runtimeSource);
await writeFile(join(build, "application.js"), applicationSource);
execFileSync(mqjs, ["-m32", "-o", join(build, "runtime.bin"), join(build, "runtime.js")]);
execFileSync(mqjs, ["-m32", "-o", join(build, "application.bin"), join(build, "application.js")]);
await rm(dirname(output), { recursive: true, force: true });
await mkdir(dirname(output), { recursive: true });
execFileSync(process.execPath, [join(legacy, "scripts/stamp-wasm.js"), target, output,
  `runtime.bin=${join(build, "runtime.bin")}`,
  `application.bin=${join(build, "application.bin")}`]);
await writeFile(join(dirname(output), "index.html"),
  await readFile(join(legacy, "web/wasm-example.html")));
const outputHash = digest(configuration.output.algorithm, await readFile(output));
if (configuration.output.hash && outputHash !== configuration.output.hash) {
  throw new Error(`output hash ${outputHash}`);
}
await writeFile(join(dirname(output), "build.json"), JSON.stringify({
  input: configuration.input.hash, output: outputHash, pages
}, null, 2) + "\n");
console.log(`${output}\n${configuration.output.algorithm}: ${outputHash}`);
