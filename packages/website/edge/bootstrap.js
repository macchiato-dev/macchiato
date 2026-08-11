import { negotiateLocale } from "./i18n.js";
import { publicResponseHeaders, storageRequest } from "./models.js";

function hasSession(request) {
  return /(?:^|;\s*)(?:__Host-resources_session|resources_session)=/.test(request.headers.get("cookie") || "");
}

function signupsEnabled(env) {
  return String(env.SIGNUPS_ENABLED || "true").toLowerCase() !== "false";
}

export function createResourcesBootstrapHandler({
  config,
  env,
  fetchImpl = fetch,
  deferredHandler,
  schedule = setTimeout,
} = {}) {
  let prewarmScheduled = false;
  const requestedDelay = Number(env.DEFERRED_PREWARM_DELAY_MS ?? 75);
  const prewarmDelayMs = Number.isFinite(requestedDelay) ? Math.max(0, Math.min(5_000, requestedDelay)) : 75;

  function schedulePrewarm() {
    if (prewarmScheduled || prewarmDelayMs === 0) return;
    prewarmScheduled = true;
    schedule(() => deferredHandler.prewarm().catch((error) => {
      prewarmScheduled = false;
      console.error("resources-edge deferred prewarm", error?.message || String(error));
    }), prewarmDelayMs);
  }

  return async function bootstrapRequest(request) {
    const url = new URL(request.url);
    const fastHome = (request.method === "GET" || request.method === "HEAD")
      && url.pathname === "/"
      && !url.search
      && !hasSession(request);
    if (!fastHome) return deferredHandler.handle(request);

    try {
      const locale = negotiateLocale(request);
      const signupState = signupsEnabled(env) ? "open" : "closed";
      const key = `fast/locales/${locale}/home-${signupState}.html`;
      const upstream = await fetchImpl(storageRequest(config, key));
      if (!upstream.ok) return deferredHandler.handle(request);
      // Finish the only fast-path subrequest before arming prewarm. This keeps
      // module download/import work from contending with Storage on a cold
      // anonymous home request.
      const body = request.method === "HEAD" ? null : await upstream.arrayBuffer();
      const headers = publicResponseHeaders(key, upstream.headers);
      headers.set("content-language", locale);
      headers.set("vary", "accept-language, cookie");
      headers.set("x-resources-edge-tier", "bootstrap");
      const response = new Response(body, { status: 200, headers });
      schedulePrewarm();
      return response;
    } catch (error) {
      console.error("resources-edge bootstrap", error?.message || String(error));
      return deferredHandler.handle(request);
    }
  };
}
