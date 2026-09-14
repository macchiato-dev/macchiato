/** A local static preview; rebuilding dist/pages needs no server restart. */
const root = new URL("dist/pages/", import.meta.url);
const types: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  wasm: "application/wasm",
  md: "text/plain; charset=utf-8",
  hex: "text/plain; charset=utf-8",
};
Deno.serve(
  { hostname: "0.0.0.0", port: Number(Deno.args[0] ?? 8766) },
  async (request) => {
    try {
      const path = decodeURIComponent(new URL(request.url).pathname);
      if (
        path.includes("\\") || path.split("/").some((part) => part === "..")
      ) return new Response(null, { status: 404 });
      const name = path === "/" ? "index.html" : path.slice(1);
      const file = await Deno.readFile(new URL(name, root));
      return new Response(file, {
        headers: {
          "Content-Type": types[name.split(".").at(-1)!] ??
            "application/octet-stream",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      if (
        !(error instanceof Deno.errors.NotFound) &&
        !(error instanceof Deno.errors.IsADirectory)
      ) console.error(error);
      return new Response("Not found", { status: 404 });
    }
  },
);
