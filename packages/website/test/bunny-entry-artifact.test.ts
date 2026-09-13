// Exercise the exact single-file upload through the SDK's Deno adapter. No
// socket, database, real Storage key, or network permission is needed.
const directory = Deno.args[0];
if (!directory) throw new Error("Pass the exported resources-bunny directory");

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("Bunny entry registers first and serves exported home pages without starting WASM", async () => {
  const root = new URL("file:///");
  root.pathname = `${await Deno.realPath(directory)}/`;
  const revisions = [];
  for await (const item of Deno.readDir(new URL("site/", root))) {
    if (item.isDirectory && /^resources-co-[a-f0-9]+$/.test(item.name)) revisions.push(item.name);
  }
  assert(revisions.length === 1, "Expected one revision in the exported site");
  const revision = revisions[0];
  const environment = {
    BUNNY_STORAGE_ORIGIN: "https://storage.example.test/bucket",
    STORAGE_API_KEY: "test-only-not-a-deployment-key",
    SIGNUPS_ENABLED: "true",
  };
  const previous = Object.fromEntries(Object.keys(environment).map(key => [key, Deno.env.get(key)]));
  const originalServe = Deno.serve;
  const originalFetch = globalThis.fetch;
  const originalCompile = WebAssembly.compile;
  const originalInstantiate = WebAssembly.instantiate;
  const originalCompileStreaming = WebAssembly.compileStreaming;
  const originalInstantiateStreaming = WebAssembly.instantiateStreaming;
  type Handler = (request: Request) => Response | Promise<Response>;
  let handler: Handler | undefined;
  let registrations = 0;
  let requests = 0;
  let wasmStarts = 0;
  const rejectWasm = () => {
    wasmStarts++;
    throw new Error("Anonymous home must not start a WASM runtime");
  };
  try {
    for (const [key, value] of Object.entries(environment)) Deno.env.set(key, value);
    // Only intercept the platform boundary; the bundled SDK and request
    // handler still execute exactly as uploaded.
    Deno.serve = ((_options: unknown, callback: typeof handler) => {
      assert(typeof callback === "function", "SDK did not register a handler");
      handler = callback;
      registrations++;
      return {};
    }) as typeof Deno.serve;
    WebAssembly.compile = rejectWasm;
    WebAssembly.instantiate = rejectWasm;
    WebAssembly.compileStreaming = rejectWasm;
    WebAssembly.instantiateStreaming = rejectWasm;
    globalThis.fetch = async (input, init) => {
      requests++;
      assert(registrations > 0, "Storage was fetched before registering HTTP");
      const request = new Request(input, init);
      const url = new URL(request.url);
      assert(url.origin === "https://storage.example.test", "Unexpected network destination");
      assert(request.headers.get("AccessKey") === environment.STORAGE_API_KEY, "Missing Storage key");
      assert(request.headers.get("accept-encoding") === "identity", "Unexpected Storage encoding");
      assert(request.redirect === "manual", "Storage redirects must not forward credentials");
      assert(new RegExp(`^/bucket/${revision}/fast/locales/(en|es)/home-(open|closed)\\.html$`).test(url.pathname),
        `Unexpected fetch: ${url.pathname}`);
      const bytes = await Deno.readFile(new URL(`site/${url.pathname.slice("/bucket/".length)}`, root));
      return new Response(bytes, { headers: { etag: '"fixture-home"' } });
    };

    for (const state of ["open", "closed"]) {
      handler = undefined;
      Deno.env.set("SIGNUPS_ENABLED", state === "open" ? "true" : "false");
      const entry = new URL("edge/script.ts", root);
      entry.searchParams.set("fixture", `${state}-${crypto.randomUUID()}`);
      const before = requests;
      await import(entry.href);
      // Module evaluation calls the intercepted serve function; TypeScript
      // cannot see that assignment across the dynamic import.
      const serve = handler as Handler | undefined;
      assert(serve, "Bundle did not register its HTTP handler");
      assert(requests === before && wasmStarts === 0, "Startup performed deferred work");
      for (const locale of ["en", "es"]) {
        const expected = await Deno.readTextFile(new URL(`site/${revision}/fast/locales/${locale}/home-${state}.html`, root));
        for (const method of ["GET", "HEAD"]) {
          const count = requests;
          const response = await serve(new Request("https://staging.resources.co/", {
            method, headers: { "accept-language": locale },
          }));
          assert(response.status === 200, "Anonymous home failed");
          assert(requests === count + 1, "Home should need exactly one Storage request");
          assert(await response.text() === (method === "HEAD" ? "" : expected), "Wrong exported home variant");
          assert(response.headers.get("content-language") === locale, "Wrong locale");
          assert(response.headers.get("x-resources-edge-tier") === "bootstrap", "Missed static fast path");
          assert(response.headers.get("vary") === "accept-language, cookie", "Unsafe shared-cache variation");
          assert(response.headers.get("cache-control")?.includes("max-age=30"), "Missing short home cache");
          assert(response.headers.get("content-security-policy")?.includes("object-src 'none'"), "Missing CSP");
          assert(response.headers.get("etag") === '"fixture-home"', "Lost Storage validator");
        }
      }
    }
    assert(registrations === 2 && wasmStarts === 0, "Unexpected startup count");
  } finally {
    Deno.serve = originalServe;
    globalThis.fetch = originalFetch;
    WebAssembly.compile = originalCompile;
    WebAssembly.instantiate = originalInstantiate;
    WebAssembly.compileStreaming = originalCompileStreaming;
    WebAssembly.instantiateStreaming = originalInstantiateStreaming;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
