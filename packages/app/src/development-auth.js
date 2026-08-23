import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function equal(left, right) {
  const a = digest(left);
  const b = digest(right);
  return timingSafeEqual(a, b);
}

function safeName(hostname) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(hostname)) throw new Error(`Invalid development subdomain: ${hostname}`);
  return hostname;
}

function readOrCreateAuth(dataDir, hostname) {
  const path = join(dataDir, `.${safeName(hostname)}-auth.json`);
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed.apiKey !== "string" || parsed.apiKey.length < 32) throw new Error("invalid API key");
    chmodSync(path, 0o600);
    return { apiKey: parsed.apiKey, path };
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error(`Cannot read ${path}: ${error.message}`);
    const apiKey = randomBytes(32).toString("base64url");
    writeFileSync(path, `${JSON.stringify({ apiKey }, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    chmodSync(path, 0o600);
    return { apiKey, path };
  }
}

function readAuth(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (typeof parsed.apiKey !== "string" || parsed.apiKey.length < 32) throw new Error(`Invalid development auth file: ${path}`);
  return parsed.apiKey;
}

function replaceAuth(dataDir, hostname) {
  const path = join(dataDir, `.${safeName(hostname)}-auth.json`);
  const apiKey = randomBytes(32).toString("base64url");
  writeFileSync(path, `${JSON.stringify({ apiKey }, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
  return { apiKey, path };
}

function cookieValue(hostname, apiKey) {
  return createHash("sha256").update(`${hostname}-cookie\0${apiKey}`).digest("base64url");
}

function cookies(request) {
  return new Map((request.headers.get("cookie") || "").split(";").map((part) => {
    const at = part.indexOf("=");
    return at < 0 ? [part.trim(), ""] : [part.slice(0, at).trim(), part.slice(at + 1).trim()];
  }));
}

function bootstrapPage(storageKey) {
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Development app</title>
<style>html,body{margin:0;min-height:100%;background:#f4f7fb}@media(prefers-color-scheme:dark){html,body{background:#171b23}}</style>
<script>
(() => {
  const storageKey = ${JSON.stringify(storageKey)};
  const fragmentKey = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : "";
  const apiKey = fragmentKey || localStorage.getItem(storageKey) || "";
  if (!apiKey) return;
  fetch("/-/development-auth", {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: apiKey,
    credentials: "same-origin"
  }).then((response) => {
    if (!response.ok) throw new Error("Development authentication failed");
    if (fragmentKey) localStorage.setItem(storageKey, fragmentKey);
    history.replaceState(history.state, "", location.pathname + location.search);
    location.reload();
  }).catch(() => {});
})();
</script>
</html>`;
}

export function createDevelopmentAuth({ dataDir, hostname, port }) {
  const name = safeName(hostname);
  const cookie = `${name.replaceAll("-", "_")}_session`;
  const storageKey = `${name}-api-key`;
  const initial = readOrCreateAuth(dataDir, name);
  const path = initial.path;
  let apiKey = initial.apiKey;
  let session = cookieValue(name, apiKey);

  function refresh() {
    const next = readAuth(path);
    if (next === apiKey) return;
    apiKey = next;
    session = cookieValue(name, apiKey);
  }

  return Object.freeze({
    hostname,
    path,
    get bootstrapUrl() {
      refresh();
      return `http://${hostname}.localhost:${port}/#${encodeURIComponent(apiKey)}`;
    },
    isAuthenticated(request) {
      refresh();
      const supplied = cookies(request).get(cookie);
      return typeof supplied === "string" && equal(supplied, session);
    },
    handle(request) {
      refresh();
      const url = new URL(request.url);
      if (url.pathname === "/-/development-auth" && request.method === "POST") {
        return request.text().then((supplied) => {
          if (!equal(supplied, apiKey)) return new Response(null, { status: 401 });
          return new Response(null, {
            status: 204,
            headers: {
              "cache-control": "no-store",
              "set-cookie": `${cookie}=${session}; Path=/; HttpOnly; SameSite=Strict`,
            },
          });
        });
      }
      const destination = request.headers.get("sec-fetch-dest");
      const acceptsHtml = request.headers.get("accept")?.includes("text/html");
      if (request.method === "GET" && (destination === "document" || acceptsHtml || url.pathname === "/")) {
        return new Response(bootstrapPage(storageKey), {
          headers: {
            "cache-control": "no-store",
            "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
            "content-type": "text/html; charset=utf-8",
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
          },
        });
      }
      return new Response(null, { status: 401, headers: { "cache-control": "no-store" } });
    },
  });
}

export function resetDevelopmentAuth(options) {
  replaceAuth(options.dataDir, options.hostname);
  return createDevelopmentAuth(options);
}
