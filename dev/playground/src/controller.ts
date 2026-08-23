import { SingleFileProjectCompiler } from "../../../packages/project-editor/src/single-file-compiler.js";
import { encodeResourceBundle, gzipResourceBundle } from
  "../../../packages/wasm-web-container/src/resource-bundle.js";

const port = Number(Deno.env.get("MACHINE_CONTROLLER_PORT") || "3041");
const routes = new Map([
  ["cat-memory", { kind: "container-example", example: "cat-memory" }],
  ["codemirror", { kind: "codemirror" }],
  ["mahjong", { kind: "container-example", example: "mahjong" }],
  ["microquickjs", { kind: "microquickjs" }],
  ["prosemirror", { kind: "browser-editor", example: "prosemirror" }],
  ["quickjs", { kind: "codemirror" }],
  ["sqlite-book", { kind: "sqlite-book" }],
  ["wordgard", { kind: "browser-editor", example: "wordgard" }],
  ["xterm", { kind: "xterm" }],
  ["container", { kind: "container-index" }],
]);
const projectCompiler = new SingleFileProjectCompiler();
const repository = new URL("../../../", import.meta.url);
const machineModule = new URL("dev/wasm-web-machine/dist/module/wasm-web-machine.js", repository);
const containerPages = new URL("dev/wasm-web-runtimes/dist/pages/", repository);
const containerIndex = new URL("packages/wasm-web-container/examples/index.html", repository);
const codeMirrorFiles = new URL("dev/wasm-web-runtimes/examples/codemirror/", repository);
const browserEditorFiles = new URL("dev/wasm-web-runtimes/examples/browser-editors/", repository);
const contentTypes = new Map([
  ["bin", "application/octet-stream"], ["css", "text/css; charset=utf-8"],
  ["html", "text/html; charset=utf-8"], ["js", "text/javascript; charset=utf-8"],
  ["json", "application/json; charset=utf-8"], ["map", "application/json"],
  ["png", "image/png"], ["svg", "image/svg+xml"], ["wasm", "application/wasm"],
  ["webm", "video/webm"], ["woff2", "font/woff2"],
]);

function page() {
  const links = ["editor", ...routes.keys()].map((name) => `<li><a href="/${name}">${name}</a></li>`).join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Macchiato machine examples</title><body><main><h1>Macchiato machine examples</h1><p>Requests on this subdomain pass through the supervised Deno Machine Controller.</p><ul>${links}</ul></main></body></html>`;
}

function editorPage() {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Playground</title><body><main id="playground"></main><script type="module" src="/editor/browser-controller.js"></script></body></html>`;
}

async function asset(name: string, type: string) {
  try {
    const body = await Deno.readFile(new URL(`../dist/${name}`, import.meta.url));
    return new Response(body, { headers: { "content-type": type, "cache-control": "no-cache" } });
  } catch (error) {
    console.error(JSON.stringify({ event: "asset-error", name, message: error.message }));
    return new Response("Build the playground first", { status: 503 });
  }
}

function rewrittenHtml(text: string, prefix: string, publicPath: string) {
  const routePath = publicPath === `/${prefix}` ? `/${prefix}/` : publicPath;
  const directory = routePath.endsWith("/") ? routePath : `${routePath}/`;
  const base = `<base href="${directory}">`;
  const rewritten = text.replace(/\b(src|href|action)=(['"])\/(?!\/)/gi, `$1=$2/${prefix}/`);
  if (/<head(?:\s[^>]*)?>/i.test(rewritten)) {
    return rewritten.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${base}`);
  }
  if (/<html(?:\s[^>]*)?>/i.test(rewritten)) {
    return rewritten.replace(/<html(?:\s[^>]*)?>/i, (html) => `${html}${base}`);
  }
  return `${base}${rewritten}`;
}

function safePath(value: string) {
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { return null; }
  if (decoded.includes("\\") || decoded.split("/").some((part) => part === "..")) return null;
  return decoded.replace(/^\/+/, "");
}

function machineArtifact(path: string, base: URL) {
  if (path === "machine.js") return new URL("wasm-web-machine.js", base);
  if (path === "machine.js.map") return new URL("wasm-web-machine.js.map", base);
  return path === "wasm-web-machine.js" || path === "wasm-web-machine.js.map" ?
    new URL(path, base) : null;
}

function exampleFile(name: string, rest: string) {
  const route = routes.get(name);
  const path = safePath(rest);
  if (!route || path === null) return null;
  const documentPath = path && !path.endsWith("/") &&
    !path.split("/").at(-1)?.includes(".") ? `${path}/` : path;
  const filePath = documentPath.endsWith("/") ? `${documentPath}index.html` : documentPath;
  if (route.kind === "container-example") {
    const shared = machineArtifact(documentPath, containerPages);
    if (shared) return shared;
    return new URL(`${route.example}/${filePath || "index.html"}`, containerPages);
  }
  if (route.kind === "sqlite-book") {
    const shared = machineArtifact(documentPath, containerPages);
    if (shared) return shared;
    return new URL(`sqlite-book/${filePath || "index.html"}`, containerPages);
  }
  if (route.kind === "container-index") {
    if (!documentPath) return containerIndex;
    const shared = machineArtifact(documentPath, containerPages);
    if (shared) return shared;
    if (documentPath.startsWith("sqlite-book/")) return new URL(documentPath, containerPages);
    return new URL(documentPath, containerPages);
  }
  if (route.kind === "codemirror") {
    const shared = machineArtifact(documentPath, machineModule);
    if (shared) return shared;
    return new URL(filePath || "index.html", codeMirrorFiles);
  }
  if (route.kind === "microquickjs") {
    const shared = machineArtifact(documentPath, machineModule);
    if (shared) return shared;
    if (documentPath.startsWith("quickjs/")) return new URL(documentPath.slice(8), codeMirrorFiles);
    if (["benchmark.css", "benchmark.js", "benchmark-results.json"].includes(documentPath)) {
      return new URL(documentPath === "benchmark-results.json" ? documentPath : `microquickjs/${documentPath}`,
        codeMirrorFiles);
    }
    return new URL(`microquickjs/${filePath || "index.html"}`, codeMirrorFiles);
  }
  if (route.kind === "browser-editor") {
    const shared = machineArtifact(documentPath, machineModule);
    if (shared) return shared;
    if (documentPath === "host.js" || documentPath === "loading.css") {
      return new URL(documentPath, browserEditorFiles);
    }
    if (documentPath === `${route.example}.wasm`) {
      return new URL(`generated/${documentPath}`, browserEditorFiles);
    }
    return new URL(`${route.example}/${filePath || "index.html"}`, browserEditorFiles);
  }
  if (route.kind === "xterm") {
    const shared = machineArtifact(documentPath, machineModule);
    if (shared) return shared;
    if (documentPath === "host.js" || documentPath === "loading.css") {
      return new URL(documentPath, browserEditorFiles);
    }
    if (documentPath === "xterm.wasm" || documentPath === "xterm-terminal.wasm") {
      return new URL(`generated/${documentPath}`, browserEditorFiles);
    }
    if (!documentPath) return new URL("xterm/index.html", browserEditorFiles);
    if (documentPath === "pong/") return new URL("xterm/pong/index.html", browserEditorFiles);
    if (documentPath === "terminal/") return new URL("xterm/terminal/index.html", browserEditorFiles);
  }
  return null;
}

async function serveExample(request: Request, name: string, rest: string) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  const file = exampleFile(name, rest);
  if (!file || !file.href.startsWith(repository.href)) return new Response("Not found", { status: 404 });
  const extension = file.pathname.split(".").at(-1)?.toLowerCase() || "";
  const type = contentTypes.get(extension);
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const bytes = await Deno.readFile(file);
    if (extension !== "html") return new Response(request.method === "HEAD" ? null : bytes, {
      headers: { "content-type": type, "cache-control": "no-store" },
    });
    const html = rewrittenHtml(new TextDecoder().decode(bytes), name, new URL(request.url).pathname);
    return new Response(request.method === "HEAD" ? null : html, {
      headers: { "content-type": type, "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return new Response("Not found", { status: 404 });
    console.error(JSON.stringify({ event: "example-asset-error", name, file: file.pathname,
      message: error.message }));
    return new Response("Example build is unavailable", { status: 503 });
  }
}

console.log(JSON.stringify({ event: "starting", port, routes: [...routes.keys()] }));
Deno.serve({ hostname: "127.0.0.1", port }, async (request) => {
  const url = new URL(request.url);
  if (url.pathname === "/-/health") return Response.json({ ok: true, runtime: "deno", routes: [...routes.keys()] });
  if (url.pathname === "/") return new Response(page(), { headers: { "content-type": "text/html; charset=utf-8" } });
  if (url.pathname === "/editor" || url.pathname === "/editor/") {
    return new Response(editorPage(), { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  if (url.pathname === "/editor/browser-controller.js") return asset("browser-controller.js", "text/javascript; charset=utf-8");
  if (url.pathname === "/editor/browser-controller.js.map") return asset("browser-controller.js.map", "application/json");
  if (url.pathname === "/editor/compile" && request.method === "POST") {
    try {
      const length = Number(request.headers.get("content-length") || 0);
      if (length > 320_000) return Response.json({ error: "Project source is too large" }, { status: 413 });
      return Response.json(projectCompiler.compile(await request.text()));
    } catch (error) {
      return Response.json({ error: error.message }, { status: 422 });
    }
  }
  if ((url.pathname === "/editor/export.bin" || url.pathname === "/editor/export.bin.gz") &&
      request.method === "POST") {
    try {
      const length = Number(request.headers.get("content-length") || 0);
      if (length > 320_000) return Response.json({ error: "Project source is too large" }, { status: 413 });
      const source = await request.text();
      projectCompiler.compile(source);
      const bundle = encodeResourceBundle(new Map([["index.html", new TextEncoder().encode(source)]]));
      const gzip = url.pathname.endsWith(".gz");
      const body = gzip ? await gzipResourceBundle(new Map([
        ["index.html", new TextEncoder().encode(source)],
      ])) : bundle;
      return new Response(body, { headers: {
        "content-type": gzip ? "application/gzip" : "application/octet-stream",
        "content-disposition": `attachment; filename="untitled-project.bin${gzip ? ".gz" : ""}"`,
        "cache-control": "no-store",
      } });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 422 });
    }
  }
  if (url.pathname === "/-/resources-site/project-editor-quickjs-runtime.wasm") return asset("project-editor-quickjs-runtime.wasm", "application/wasm");
  if (url.pathname === "/-/resources-site/project-builder-quickjs-runtime.wasm") return asset("project-builder-quickjs-runtime.wasm", "application/wasm");
  if (url.pathname === "/-/resources-site/project-quickjs-runtime.wasm") return asset("project-quickjs-runtime.wasm", "application/wasm");
  const destination = request.headers.get("sec-fetch-dest") || "";
  const referrer = request.headers.get("referer");
  if (destination !== "document" && destination !== "iframe" && referrer) {
    try {
      const referrerUrl = new URL(referrer);
      const referrerRoute = /^\/([a-z0-9-]+)(?:\/|$)/.exec(referrerUrl.pathname)?.[1];
      const requestedRoute = /^\/([a-z0-9-]+)(?:\/|$)/.exec(url.pathname)?.[1];
      if (referrerUrl.origin === request.headers.get("x-macchiato-original-origin") &&
          referrerRoute && routes.has(referrerRoute) &&
          (!requestedRoute || !routes.has(requestedRoute))) {
        return serveExample(request, referrerRoute, url.pathname.slice(1));
      }
    } catch {}
  }
  const match = /^\/([a-z0-9-]+)(?:\/(.*))?$/.exec(url.pathname);
  if (!match) return new Response("Not found", { status: 404 });
  console.log(JSON.stringify({ event: "request", method: request.method, path: url.pathname }));
  return serveExample(request, match[1], match[2] || "");
});
