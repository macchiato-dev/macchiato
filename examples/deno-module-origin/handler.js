// Every public module is immutable and visibly tied to the source deployment.
// Examples: app-7c3b59e.js, packages/dom-use-7c3b59e.js.
const MODULE_PATH = /^\/[A-Za-z0-9._~/-]+-[0-9a-f]{7}\.(?:js|mjs|ts)$/;
const IMPORT_KEY_PLACEHOLDER = "__MACCHIATO_MODULE_IMPORT_KEY__";
const MAX_MODULE_BYTES = 1_000_000;

function required(env, name) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function safeEqual(left, right) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index % (a.length || 1)] || 0) ^
      (b[index % (b.length || 1)] || 0);
  }
  return difference === 0;
}

function moduleKey(pathname) {
  if (/%(?:2f|5c)/i.test(pathname)) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("//")) return null;
  const segments = decoded.slice(1).split("/");
  if (segments.length < 2) return null;
  const suppliedKey = segments.shift();
  const modulePath = `/${segments.join("/")}`;
  if (!MODULE_PATH.test(modulePath)) return null;
  if (segments.some((part) => part === "." || part === "..")) return null;
  return { suppliedKey, storageKey: segments.join("/") };
}

function contentType(pathname) {
  if (pathname.endsWith(".ts")) return "application/typescript; charset=utf-8";
  return "application/javascript; charset=utf-8";
}

export function createModuleOriginHandler(env = {}, fetchImpl = fetch) {
  const token = required(env, "MODULE_IMPORT_TOKEN");
  const storageKey = required(env, "STORAGE_API_KEY");
  const origin = new URL(required(env, "BUNNY_STORAGE_ORIGIN"));
  if (
    origin.protocol !== "https:" || origin.username || origin.password ||
    origin.search || origin.hash
  ) {
    throw new Error(
      "BUNNY_STORAGE_ORIGIN must be a credential-free HTTPS origin",
    );
  }

  return async function moduleOrigin(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Not found", { status: 404 });
    }
    const requestUrl = new URL(request.url);
    const moduleRequest = moduleKey(requestUrl.pathname);
    if (
      !moduleRequest || requestUrl.search ||
      !safeEqual(moduleRequest.suppliedKey, token)
    ) {
      return new Response("Not found", {
        status: 404,
        headers: { "cache-control": "no-store" },
      });
    }
    const key = moduleRequest.storageKey;

    const upstreamUrl = new URL(
      key,
      origin.href.endsWith("/") ? origin : `${origin.href}/`,
    );
    const upstream = await fetchImpl(upstreamUrl, {
      method: request.method,
      headers: { AccessKey: storageKey },
      redirect: "manual",
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      return new Response("Storage unavailable", { status: 502 });
    }
    if (upstream.status === 404) {
      return new Response("Not found", { status: 404 });
    }
    if (!upstream.ok) {
      return new Response("Storage unavailable", { status: 502 });
    }
    if (request.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: {
          "content-type": contentType(key),
          "cache-control": "public, max-age=31536000, immutable",
          "x-content-type-options": "nosniff",
        },
      });
    }
    const source = await upstream.text();
    if (new TextEncoder().encode(source).byteLength > MAX_MODULE_BYTES) {
      return new Response("Module too large", { status: 502 });
    }
    const servedSource = source.replaceAll(
      IMPORT_KEY_PLACEHOLDER,
      encodeURIComponent(token),
    );
    return new Response(servedSource, {
      status: 200,
      headers: {
        "content-type": contentType(key),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  };
}
