import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createMigrationRunner } from "@macchiato-dev/hub/migrations";
import { createOrganizationStore } from "@macchiato-dev/hub/organizations";
import { createNodeSqliteClient } from "./adapters/node-sqlite-client.js";
import { createAuthConfig } from "./auth/github.js";
import { createGitlabAuthConfig } from "./auth/gitlab.js";
import { createResourcesEdgeHandler } from "./edge/app.js";

// This is the local counterpart of bunny-application.js. Keeping it behind a
// dynamic import makes resources-edge exercise the same deferred application,
// migration wait, shared initialization, and retry boundary as Bunny.
export function createResourcesPreviewApplication({ config, environment, db, fetchImpl, blogExamplesOrigin }) {
  const authConfig = createAuthConfig({ ...environment, AUTH_ALLOW_INSECURE_LOCALHOST: "true" });
  const gitlabAuthConfig = createGitlabAuthConfig(environment, authConfig);
  const client = db ? createNodeSqliteClient(db) : null;
  const accountStore = client ? createAccountStore(client) : null;
  const contentStore = client ? createContentStore(client) : null;
  const organizationStore = client ? createOrganizationStore(client) : null;
  const migrations = client ? createMigrationRunner(client) : null;
  const handler = createResourcesEdgeHandler({
    config, authConfig, gitlabAuthConfig, accountStore, contentStore,
    organizationStore, fetchImpl, blogExamplesOrigin,
  });
  let readyPromise;
  async function ready() {
    if (!readyPromise) {
      readyPromise = (migrations ? migrations.ready() : Promise.resolve()).catch((error) => {
        readyPromise = null;
        throw error;
      });
    }
    return readyPromise;
  }
  return async (request) => {
    try {
      await ready();
      return await handler(request);
    } catch (error) {
      console.error("resources-edge preview initialization", error?.message || String(error));
      return new Response("Edge content unavailable", { status: 503, headers: { "cache-control": "no-store" } });
    }
  };
}
