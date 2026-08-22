const port = Number(Deno.env.get("MACHINE_CONTROLLER_PORT") || "3041");
const upstreamPort = Number(Deno.env.get("MACCHIATO_UPSTREAM_PORT") || "3030");

const routes = new Map([
  ["codemirror", "codemirror-quickjs.localhost"],
  ["microquickjs", "codemirror-microquickjs.localhost"],
  ["prosemirror", "prosemirror-quickjs.localhost"],
  ["wordgard", "wordgard-quickjs.localhost"],
  ["xterm", "xterm-quickjs.localhost"],
  ["container", "wasm-web-container.localhost"],
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

function rewritten(text: string, prefix: string) {
  return text.replace(/(["'(])\/(?!\/)/g, `$1/${prefix}/`);
}

async function proxy(request: Request, name: string, rest: string) {
  const hostname = routes.get(name);
  if (!hostname) return new Response("Not found", { status: 404 });
  const incoming = new URL(request.url);
  const target = new URL(`http://${hostname}:${upstreamPort}/${rest}${incoming.search}`);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : request.body;
  const response = await fetch(target, { method: request.method, headers, body, redirect: "manual" });
  const type = response.headers.get("content-type") || "";
  if (!/^(?:text\/html|text\/css|text\/javascript|application\/javascript)/i.test(type)) return response;
  const headersOut = new Headers(response.headers);
  headersOut.delete("content-length");
  return new Response(rewritten(await response.text(), name), { status: response.status, headers: headersOut });
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
  const match = /^\/([a-z0-9-]+)\/(.*)$/.exec(url.pathname);
  if (!match) return new Response("Not found", { status: 404 });
  console.log(JSON.stringify({ event: "request", method: request.method, path: url.pathname }));
  return proxy(request, match[1], match[2]);
});
