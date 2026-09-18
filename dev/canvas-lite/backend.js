const root = new URL("./", import.meta.url);
const decoder = new TextDecoder("utf-8", { fatal: true });
let host, guest, page;
function text(memory, ptr, len) {
  return decoder.decode(new Uint8Array(memory.buffer, ptr, len));
}

({ instance: { exports: host } } = await WebAssembly.instantiate(
  await Deno.readFile(new URL("dist/backend-host.wasm", root)),
  {
    runner: {
      exec(code, codeLen, data, dataLen) {
        // The host is trusted and can use the runner's full Deno authority.
        const run = new Function("data", text(host.memory, code, codeLen));
        page = run(text(host.memory, data, dataLen));
      },
    },
    guest: { run: () => guest.run() },
  },
));
({ instance: { exports: guest } } = await WebAssembly.instantiate(
  await Deno.readFile(new URL("dist/backend-guest.wasm", root)),
  {
    host: {
      msg(ptr, len) {
        if ((len >>> 0) > host.inbox_capacity()) throw Error("Host inbox full");
        const bytes = new Uint8Array(guest.memory.buffer, ptr >>> 0, len >>> 0);
        new Uint8Array(host.memory.buffer, host.inbox_ptr(), bytes.length).set(bytes);
        host.onmsg(bytes.length);
      },
    },
  },
));

// Explicit routes only: request paths never become filesystem paths.
const assets = new Map([
  ["/frontend.js", ["frontend.js", "text/javascript"]],
  ["/frontend-host.wasm", ["dist/frontend-host.wasm", "application/wasm"]],
  ["/frontend-guest.wasm", ["dist/frontend-guest.wasm", "application/wasm"]],
]);

Deno.serve({ hostname: "127.0.0.1", port: 8788 }, async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }
  const path = new URL(request.url).pathname;
  const headers = { "Cache-Control": "no-store" };
  if (path === "/") {
    host.start();
    return new Response(page, {
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  }
  const asset = assets.get(path);
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(await Deno.readFile(new URL(asset[0], root)), {
    headers: { ...headers, "Content-Type": asset[1] },
  });
});
