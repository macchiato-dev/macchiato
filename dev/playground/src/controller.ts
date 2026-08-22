const port = Number(Deno.env.get("MACHINE_CONTROLLER_PORT") || "3041");
const upstreamPort = Number(Deno.env.get("MACCHIATO_UPSTREAM_PORT") || "3030");

const routes = new Map([
  ["cat-memory", { hostname: "wasm-web-container.localhost", base: "cat-memory" }],
  ["codemirror", { hostname: "codemirror-quickjs.localhost", base: "" }],
  ["mahjong", { hostname: "wasm-web-container.localhost", base: "mahjong" }],
  ["microquickjs", { hostname: "codemirror-microquickjs.localhost", base: "" }],
  ["prosemirror", { hostname: "prosemirror-quickjs.localhost", base: "" }],
  ["quickjs", { hostname: "codemirror-quickjs.localhost", base: "" }],
  ["sqlite-book", { hostname: "wasm-web-container.localhost", base: "sqlite-book" }],
  ["wordgard", { hostname: "wordgard-quickjs.localhost", base: "" }],
  ["xterm", { hostname: "xterm-quickjs.localhost", base: "" }],
  ["container", { hostname: "wasm-web-container.localhost", base: "" }],
]);

function page() {
  const links = ["editor", ...routes.keys()].map((name) => `<li><a href="/${name}/">${name}</a></li>`).join("");
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

function rewrittenHtml(text: string, prefix: string, target: URL) {
  const directory = target.pathname.endsWith("/") ? target.pathname : target.pathname.replace(/[^/]*$/, "");
  const base = `<base href="/${prefix}/@${directory}">`;
  const rewritten = text.replace(/\b(src|href|action)=(['"])\/(?!\/)/gi, `$1=$2/${prefix}/@/`);
  if (/<head(?:\s[^>]*)?>/i.test(rewritten)) {
    return rewritten.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${base}`);
  }
  if (/<html(?:\s[^>]*)?>/i.test(rewritten)) {
    return rewritten.replace(/<html(?:\s[^>]*)?>/i, (html) => `${html}${base}`);
  }
  return `${base}${rewritten}`;
}

async function proxy(request: Request, name: string, rest: string) {
  const route = routes.get(name);
  if (!route) return new Response("Not found", { status: 404 });
  const incoming = new URL(request.url);
  const path = rest.startsWith("@/") ? rest.slice(2) : route.base ? `${route.base}/${rest}` : rest;
  const target = new URL(`http://${route.hostname}:${upstreamPort}/${path}${incoming.search}`);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : request.body;
  const response = await fetch(target, { method: request.method, headers, body, redirect: "manual" });
  const type = response.headers.get("content-type") || "";
  if (!/^text\/html/i.test(type)) return response;
  const headersOut = new Headers(response.headers);
  headersOut.delete("content-length");
  return new Response(rewrittenHtml(await response.text(), name, target), { status: response.status, headers: headersOut });
}

console.log(JSON.stringify({ event: "starting", port, upstreamPort, routes: [...routes.keys()] }));
Deno.serve({ hostname: "127.0.0.1", port }, async (request) => {
  const url = new URL(request.url);
  if (url.pathname === "/-/health") return Response.json({ ok: true, runtime: "deno", routes: [...routes.keys()] });
  if (url.pathname === "/") return new Response(page(), { headers: { "content-type": "text/html; charset=utf-8" } });
  if (url.pathname === "/editor" || url.pathname === "/editor/") {
    return new Response(editorPage(), { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  if (url.pathname === "/editor/browser-controller.js") return asset("browser-controller.js", "text/javascript; charset=utf-8");
  if (url.pathname === "/editor/browser-controller.js.map") return asset("browser-controller.js.map", "application/json");
  if (url.pathname === "/-/resources-site/project-editor-quickjs-runtime.wasm") return asset("project-editor-quickjs-runtime.wasm", "application/wasm");
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
        return proxy(request, referrerRoute, `@/${url.pathname.slice(1)}`);
      }
    } catch {}
  }
  const match = /^\/([a-z0-9-]+)\/(.*)$/.exec(url.pathname);
  if (!match) return new Response("Not found", { status: 404 });
  console.log(JSON.stringify({ event: "request", method: request.method, path: url.pathname }));
  return proxy(request, match[1], match[2]);
});
