function textBytes(value) {
  return new TextEncoder().encode(String(value));
}

function timingSafeTextEqual(left, right) {
  const a = textBytes(left);
  const b = textBytes(right);
  let different = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) different |= (a[index] || 0) ^ (b[index] || 0);
  return different === 0;
}

async function digest(bytes) {
  const value = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createModuleOriginHandler({ config, moduleKey, expectedSha256, apiKey, fetchImpl = fetch } = {}) {
  if (!moduleKey || !/^[a-f0-9]{64}$/.test(expectedSha256 || "") || !apiKey) {
    throw new Error("Module origin configuration is incomplete");
  }
  return async function moduleOriginRequest(request) {
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/resources-application.js") {
      return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
    }
    const authorization = request.headers.get("authorization") || "";
    if (!timingSafeTextEqual(authorization, `Bearer ${apiKey}`)) {
      return new Response("Unauthorized", { status: 401, headers: { "cache-control": "no-store" } });
    }
    const upstream = await fetchImpl(storageRequest(config, moduleKey));
    if (!upstream.ok) return new Response("Module unavailable", { status: 502, headers: { "cache-control": "no-store" } });
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (await digest(bytes) !== expectedSha256) {
      return new Response("Module integrity failure", { status: 502, headers: { "cache-control": "no-store" } });
    }
    return new Response(bytes, {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "content-length": String(bytes.byteLength),
        "cache-control": "private, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  };
}

import { storageRequest } from "./models.js";
