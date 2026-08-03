const MODULE_PATH = /^\/[A-Za-z0-9._~/-]+\.(?:js|mjs|ts)$/;

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
  if (!MODULE_PATH.test(decoded) || decoded.includes("//")) return null;
  const segments = decoded.slice(1).split("/");
  if (segments.some((part) => part === "." || part === "..")) return null;
  return segments.join("/");
}

function contentType(pathname) {
  if (pathname.endsWith(".ts")) return "application/typescript; charset=utf-8";
  return "application/javascript; charset=utf-8";
}

export function createModuleOriginHandler(env = {}, fetchImpl = fetch) {
  const token = required(env, "MODULE_IMPORT_TOKEN");
  const storageKey = required(env, "STORAGE_API_KEY");
  const prefix = required(env, "MODULE_BUCKET_PREFIX").replace(
    /^\/+|\/+$/g,
    "",
  );
  if (
    !prefix.split("/").every((part) =>
      /^[A-Za-z0-9._~-]+$/.test(part) && part !== "." && part !== ".."
    )
  ) {
    throw new Error("MODULE_BUCKET_PREFIX is invalid");
  }
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
    const key = moduleKey(requestUrl.pathname);
    const authorization = request.headers.get("authorization") || "";
    if (
      !key || requestUrl.search || !safeEqual(authorization, `Bearer ${token}`)
    ) {
      return new Response("Not found", {
        status: 404,
        headers: { "cache-control": "no-store" },
      });
    }

    const upstreamUrl = new URL(
      `${prefix}/${key}`,
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
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: 200,
      headers: {
        "content-type": contentType(key),
        "cache-control": "private, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  };
}
