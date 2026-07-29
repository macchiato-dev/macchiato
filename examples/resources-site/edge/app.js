import {
  normalizeExportManifest,
  pathToObjectKey,
  publicResponseHeaders,
  storageRequest,
} from "./models.js";
import { localeCookie, localizedObjectKey, negotiateLocale, parseLanguageRoute } from "./i18n.js";
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

function message(messages, key, fallback) {
  return escapeHtml(messages?.[key] || fallback);
}

function authStatusHtml(session, messages = {}) {
  if (!session) {
    return `<aside class="box userbar edge-status" data-screen-label="runtime-status">
      <div class="ub-guest"><a class="ub-btn ub-btn--ghost" href="/login">${message(messages, "auth.login", "Log in")}</a><a class="ub-btn ub-btn--solid" href="/signup">${message(messages, "auth.signup", "Sign up")}</a></div>
    </aside>`;
  }
  const initials = session.login.slice(0, 2).toUpperCase();
  return `<aside class="box userbar edge-status" data-screen-label="runtime-status">
    <details class="edge-user-menu">
      <summary class="edge-user-menu__trigger" aria-label="${message(messages, "account.menu", "Account menu")}">
        <span class="ub-avatar">${escapeHtml(initials)}</span>
        <span class="edge-account-name">${escapeHtml(session.login)}</span>
        <svg class="ub-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg>
      </summary>
      <div class="popover edge-user-menu__panel">
        <div class="menu__acct"><span class="ub-avatar">${escapeHtml(initials)}</span><div class="menu__acct-meta"><b>${escapeHtml(session.name)}</b><span>@${escapeHtml(session.login)}</span></div></div>
        <div class="menu__sep"></div>
        <a class="item" href="/">${message(messages, "account.projects", "Your projects")}</a>
        <a class="item" href="/profile">${message(messages, "account.profile", "Your profile")}</a>
        <div class="menu__sep"></div>
        <a class="item" href="/settings">${message(messages, "account.settings", "Settings")}</a>
        <a class="item" href="/help">${message(messages, "account.help", "Help & docs")}</a>
        <div class="menu__sep"></div>
        <form method="post" action="/logout"><button class="item item--danger" type="submit">${message(messages, "account.signout", "Sign out")}</button></form>
      </div>
    </details>
  </aside>`;
}

function renderSessionHtml(html, session, messages) {
  return html.replace(/<aside class="box userbar edge-status"[\s\S]*?<\/aside>/, authStatusHtml(session, messages));
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
    const languageRoute = request.method === "GET" ? parseLanguageRoute(pathname) : null;
    if (languageRoute) {
      const targetKey = pathToObjectKey(languageRoute.pathname);
      if (!targetKey || languageRoute.pathname.startsWith("/language/")) return new Response("Not found", { status: 404 });
      return new Response(null, {
        status: 302,
        headers: {
          location: languageRoute.pathname,
          "set-cookie": localeCookie(languageRoute.locale, { secure: new URL(request.url).protocol === "https:" }),
          "cache-control": "private, no-store",
          vary: "cookie",
        },
      });
    }
    if (authConfig && request.method === "GET" && pathname === "/auth/github/link") {
      const session = await readSession(request, authConfig, now);
      if (!session) return new Response(null, { status: 302, headers: { location: "/login", "cache-control": "no-store" } });
      return startGithubAuth(authConfig, now, { linkToUserId: session.sub });
    }
    if (authConfig && gitlabAuthConfig && request.method === "GET" && pathname === "/auth/gitlab/link") {
      const session = await readSession(request, authConfig, now);
      if (!session) return new Response(null, { status: 302, headers: { location: "/login", "cache-control": "no-store" } });
      return startGitlabAuth(gitlabAuthConfig, now, { linkToUserId: session.sub });
    }
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
    const publicKey = pathToObjectKey(pathname);
    if (!publicKey || publicKey === MANIFEST_KEY) return new Response("Not found", { status: 404 });

    try {
      const manifest = await loadManifest();
      const locale = negotiateLocale(request, manifest);
      const key = localizedObjectKey(locale, publicKey);
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
      if (key.endsWith(".html")) headers.set("content-language", locale);
      let body = request.method === "HEAD" ? null : upstream.body;
      if (authConfig && key.endsWith(".html") && request.method !== "HEAD") {
        body = renderSessionHtml(
          await upstream.text(),
          await readSession(request, authConfig, now),
          manifest.messages[locale],
        );
        headers.set("cache-control", "private, no-store");
      }
      if (key.endsWith(".html")) headers.set("vary", "accept-language, cookie");
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
