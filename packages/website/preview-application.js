import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createMigrationRunner } from "@macchiato-dev/hub/migrations";
import { createOrganizationStore } from "@macchiato-dev/hub/organizations";
import { readFileSync } from "node:fs";
import { createNodeSqliteClient } from "./adapters/node-sqlite-client.js";
import { createAuthConfig } from "./auth/github.js";
import { createGitlabAuthConfig } from "./auth/gitlab.js";
import { createResourcesEdgeHandler } from "./edge/app.js";
import { createResourcesServerMachine } from "./resources-server-machine.js";
import { createProjectSnapshotDiffer, createProjectSnapshotValidator,
  createProjectVersionPlanner } from "./project-version-machine.js";
import { createAccountSqlUseClient } from "./account-sql-policy.js";
import { createOrganizationSqlUseClient } from "./organization-sql-policy.js";
import { createContentSqlUseClient } from "./content-sql-policy.js";
import { createMigrationSqlUseClient } from "./migration-sql-policy.js";

const serverModule = new WebAssembly.Module(readFileSync(
  new URL("./generated/resources-server-microquickjs.wasm", import.meta.url)));
const projectVersionModule = new WebAssembly.Module(readFileSync(
  new URL("./generated/resources-project-version-microquickjs.wasm", import.meta.url)));

// This is the local counterpart of backend/machine.ts. Keeping it behind a
// dynamic import makes resources-edge exercise the same deferred application,
// migration wait, shared initialization, and retry boundary as Bunny.
export function createResourcesPreviewApplication({ config, environment, db, fetchImpl, blogExamplesOrigin }) {
  const authConfig = createAuthConfig({ ...environment, AUTH_ALLOW_INSECURE_LOCALHOST: "true" });
  const gitlabAuthConfig = createGitlabAuthConfig(environment, authConfig);
  const client = db ? createNodeSqliteClient(db) : null;
  const accountStore = client ? createAccountStore(createAccountSqlUseClient({ read: client, write: client })) : null;
  const versionPlanner = createProjectVersionPlanner(projectVersionModule);
  const snapshotDiffer = createProjectSnapshotDiffer(projectVersionModule);
  const snapshotValidator = createProjectSnapshotValidator(projectVersionModule);
  const contentStore = client ? createContentStore(createContentSqlUseClient({
    read: client, write: client,
  }), { versionPlanner, snapshotDiffer, snapshotValidator }) : null;
  const organizationStore = client ? createOrganizationStore(createOrganizationSqlUseClient({
    read: client, write: client,
  })) : null;
  const migrations = client ? createMigrationRunner(createMigrationSqlUseClient({
    read: client, write: client,
  })) : null;
  const machine = client ? createResourcesServerMachine(serverModule, {
    databaseClient: client, authConfig, contentStore,
  }) : null;
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
      if (machine) return machine.handle(request, {
        documentHandler: () => handler(request),
      });
      return await handler(request);
    } catch (error) {
      console.error("resources-edge preview initialization", error?.message || String(error));
      return new Response("Edge content unavailable", { status: 503, headers: { "cache-control": "no-store" } });
    }
  };
}
