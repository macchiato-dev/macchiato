import {
  normalizeExportManifest,
  pathToObjectKey,
  publicResponseHeaders,
  storageRequest,
} from "./models.js";
import { finishGithubAuth, readSession, signOut, startGithubAuth } from "../auth/github.js";
import { finishGitlabAuth, startGitlabAuth } from "../auth/gitlab.js";

const MANIFEST_KEY = "manifest.json";

async function fetchStorage(fetchImpl, request) {
  const response = await fetchImpl(request);
  if (response.status >= 300 && response.status < 400) throw new Error("Storage redirects are not allowed");
  return response;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function authStatusHtml(session) {
  if (!session) {
    return `<aside class="box userbar edge-status" data-screen-label="runtime-status">
      <span class="edge-status__dot"></span><span class="edge-status__label">Edge safe</span>
      <span class="ub-guest"><a class="ub-btn ub-btn--ghost" href="/login">Log in</a><a class="ub-btn ub-btn--solid" href="/signup">Sign up</a></span>
    </aside>`;
  }
  const initials = session.login.slice(0, 2).toUpperCase();
  return `<aside class="box userbar edge-status" data-screen-label="runtime-status">
    <span class="edge-status__dot"></span><span class="edge-status__label">${escapeHtml(session.login)}</span>
    <span class="ub-avatar">${escapeHtml(initials)}</span>
    <form method="post" action="/logout"><button class="ub-btn ub-btn--ghost" type="submit">Sign out</button></form>
  </aside>`;
}

function renderSessionHtml(html, session) {
  return html.replace(/<aside class="box userbar edge-status"[\s\S]*?<\/aside>/, authStatusHtml(session));
}

export function createResourcesEdgeHandler({ config, authConfig = null, gitlabAuthConfig = null, accountStore = null, fetchImpl = fetch, now = Date.now, logger = console } = {}) {
  if (!config) throw new Error("Edge handler requires config");
  let cachedManifest = null;
  let manifestExpiresAt = 0;
  let manifestPromise = null;

  async function loadManifest() {
    if (cachedManifest && now() < manifestExpiresAt) return cachedManifest;
    if (!manifestPromise) {
      manifestPromise = (async () => {
        const response = await fetchStorage(fetchImpl, storageRequest(config, MANIFEST_KEY));
        if (!response.ok) throw new Error(`Manifest storage response: ${response.status}`);
        const contentLength = Number(response.headers.get("content-length") || 0);
        if (contentLength > 256_000) throw new Error("Export manifest is too large");
        const manifest = normalizeExportManifest(await response.json());
        cachedManifest = manifest;
        manifestExpiresAt = now() + config.manifestTtlMs;
        return manifest;
      })().finally(() => { manifestPromise = null; });
    }
    return manifestPromise;
  }

  return async function resourcesEdgeHandler(request) {
    const pathname = new URL(request.url).pathname;
    if (authConfig && request.method === "GET" && pathname === "/auth/github/start") {
      return startGithubAuth(authConfig, now);
    }
    if (authConfig && request.method === "GET" && pathname === "/auth/github/callback") {
      return finishGithubAuth(request, authConfig, { fetchImpl, now, accountStore });
    }
    if (gitlabAuthConfig && request.method === "GET" && pathname === "/auth/gitlab/start") {
      return startGitlabAuth(gitlabAuthConfig, now);
    }
    if (gitlabAuthConfig && request.method === "GET" && pathname === "/auth/gitlab/callback") {
      return finishGitlabAuth(request, gitlabAuthConfig, { fetchImpl, now, accountStore });
    }
    if (authConfig && request.method === "POST" && pathname === "/logout") return signOut(authConfig);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    const key = pathToObjectKey(pathname);
    if (!key || key === MANIFEST_KEY) return new Response("Not found", { status: 404 });

    try {
      const manifest = await loadManifest();
      if (!manifest.files.has(key)) return new Response("Not found", { status: 404 });
      const upstream = await fetchStorage(fetchImpl, storageRequest(config, key));
      if (upstream.status === 404) return new Response("Not found", { status: 404 });
      if (!upstream.ok) return new Response("Storage unavailable", { status: 502 });
      const expected = manifest.artifacts.get(key);
      const receivedLength = Number(upstream.headers.get("content-length") || 0);
      if (receivedLength && receivedLength !== expected.bytes) {
        throw new Error(`Storage length mismatch for ${key}`);
      }
      const headers = publicResponseHeaders(key, upstream.headers);
      let body = request.method === "HEAD" ? null : upstream.body;
      if (authConfig && key.endsWith(".html") && request.method !== "HEAD") {
        body = renderSessionHtml(await upstream.text(), await readSession(request, authConfig, now));
        headers.set("cache-control", "private, no-store");
        headers.set("vary", "cookie");
      }
      return new Response(body, {
        status: 200,
        headers,
      });
    } catch (error) {
      logger.error("resources-edge", error?.message || String(error));
      return new Response("Edge content unavailable", { status: 503, headers: { "cache-control": "no-store" } });
    }
  };
}
