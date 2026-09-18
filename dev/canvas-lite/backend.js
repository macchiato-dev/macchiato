const root = new URL("./", import.meta.url);
const { instance } = await WebAssembly.instantiate(
  await Deno.readFile(new URL("dist/backend.wasm", root)),
);
const wasm = instance.exports;

// Explicit routes only: request paths never become filesystem paths.
const assets = new Map([
  ["/frontend.js", ["frontend.js", "text/javascript"]],
  ["/frontend.wasm", ["dist/frontend.wasm", "application/wasm"]],
]);

Deno.serve({ hostname: "127.0.0.1", port: 8788 }, async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }
  const path = new URL(request.url).pathname;
  const headers = { "Cache-Control": "no-store" };
  if (path === "/") {
    const page = new Uint8Array(wasm.memory.buffer, wasm.text_ptr(), wasm.text_len());
    return new Response(page.slice(), {
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  }
  const asset = assets.get(path);
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(await Deno.readFile(new URL(asset[0], root)), {
    headers: { ...headers, "Content-Type": asset[1] },
  });
});
