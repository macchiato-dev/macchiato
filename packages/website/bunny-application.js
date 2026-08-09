import { createClient } from "@libsql/client/web";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createAuthConfig } from "./auth/github.js";
import { createGitlabAuthConfig } from "./auth/gitlab.js";
import { createResourcesEdgeHandler } from "./edge/app.js";
import { createEdgeConfig } from "./edge/models.js";

// This entrypoint is bundled into one import-free module stored beside the
// published site. It does not register a server: the small bootstrap owns the
// request socket and calls this factory only when a deferred route is needed.
export function createResourcesDeferredHandler(env, { fetchImpl = fetch } = {}) {
  const storagePrefix = "resources-co-__MACCHIATO_GIT_REVISION__";
  const config = createEdgeConfig({ ...env, BUNNY_BUCKET_PREFIX: storagePrefix });
  const authConfig = createAuthConfig(env);
  const gitlabAuthConfig = createGitlabAuthConfig(env, authConfig);
  const databaseClient = createClient({
    url: env.BUNNY_DATABASE_URL,
    authToken: env.BUNNY_DATABASE_AUTH_TOKEN,
  });
  const accountStore = createAccountStore(databaseClient);
  const contentStore = createContentStore(databaseClient);
  const handler = createResourcesEdgeHandler({
    config,
    authConfig,
    gitlabAuthConfig,
    accountStore,
    contentStore,
    blogExamplesOrigin: env.BLOG_EXAMPLES_ORIGIN,
    fetchImpl,
  });

  let databaseReadyPromise;
  function databaseReady() {
    if (!databaseReadyPromise) {
      databaseReadyPromise = accountStore.initialize()
        .then(() => contentStore.initialize())
        .catch((error) => {
          databaseReadyPromise = null;
          throw error;
        });
    }
    return databaseReadyPromise;
  }

  return async function deferredResourcesRequest(request) {
    try {
      await databaseReady();
      return await handler(request);
    } catch (error) {
      console.error("resources-edge deferred initialization", error?.message || String(error));
      return new Response("Edge content unavailable", {
        status: 503,
        headers: { "cache-control": "no-store" },
      });
    }
  };
}
