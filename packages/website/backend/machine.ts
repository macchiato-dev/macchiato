// @ts-nocheck -- migrated machine composition; capability types follow separately.
import { createClient } from "@libsql/client/http";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createMigrationRunner } from "@macchiato-dev/hub/migrations";
import { createOrganizationStore } from "@macchiato-dev/hub/organizations";
import { createAuthConfig } from "../auth/github.js";
import { createGitlabAuthConfig } from "../auth/gitlab.js";
import { createResourcesEdgeHandler } from "../edge/app.js";
import { createResourcesBootstrapHandler } from "../edge/bootstrap.js";
import { createEdgeConfig, storageRequest } from "../edge/models.js";
import { createResourcesServerMachine } from "../resources-server-machine.js";
import { createProjectSnapshotDiffer, createProjectSnapshotValidator,
  createProjectVersionPlanner } from "../project-version-machine.js";
import { createAccountSqlUseClient } from "../account-sql-policy.js";
import { createOrganizationSqlUseClient } from "../organization-sql-policy.js";
import { createContentSqlUseClient } from "../content-sql-policy.js";
import { createMigrationSqlUseClient } from "../migration-sql-policy.js";

// The server delays calling this factory until a database-backed route needs
// it. Keeping construction synchronous and side-effect free lets the static
// anonymous-home handler register before any database client is initialized.
export function createResourcesApplicationHandler(env, { fetchImpl = fetch } = {}) {
  const storagePrefix = "resources-co-__MACCHIATO_GIT_REVISION__";
  const config = createEdgeConfig({ ...env, BUNNY_BUCKET_PREFIX: storagePrefix });
  const authConfig = createAuthConfig(env);
  const gitlabAuthConfig = createGitlabAuthConfig(env, authConfig);
  const databaseClient = createClient({
    url: env.BUNNY_DATABASE_URL,
    authToken: env.BUNNY_DATABASE_AUTH_TOKEN,
  });
  const readOnlyDatabaseClient = createClient({
    url: env.BUNNY_DATABASE_URL,
    authToken: env.BUNNY_DATABASE_READ_ONLY_AUTH_TOKEN,
  });
  const accountStore = createAccountStore(createAccountSqlUseClient({
    read: readOnlyDatabaseClient,
    write: databaseClient,
  }));
  let projectHistoryModulePromise;
  function projectHistoryModule() {
    if (!projectHistoryModulePromise) {
      projectHistoryModulePromise = (async () => {
        const response = await fetchImpl(storageRequest(config,
          "machines/resources-project-version-microquickjs.wasm"));
        if (!response.ok) {
          throw new Error(`Project version machine storage response: ${response.status}`);
        }
        return WebAssembly.compile(await response.arrayBuffer());
      })().catch((error) => {
        projectHistoryModulePromise = null;
        throw error;
      });
    }
    return projectHistoryModulePromise;
  }
  function projectVersionPlanner(input) {
    return projectHistoryModule().then((module) => createProjectVersionPlanner(module)(input));
  }
  function projectSnapshotDiffer(before, after) {
    return projectHistoryModule().then((module) =>
      createProjectSnapshotDiffer(module)(before, after));
  }
  function projectSnapshotValidator(snapshot) {
    return projectHistoryModule().then((module) =>
      createProjectSnapshotValidator(module)(snapshot));
  }
  const contentStore = createContentStore(createContentSqlUseClient({
    read: readOnlyDatabaseClient,
    write: databaseClient,
  }), { versionPlanner: projectVersionPlanner, snapshotDiffer: projectSnapshotDiffer,
    snapshotValidator: projectSnapshotValidator });
  const organizationStore = createOrganizationStore(createOrganizationSqlUseClient({
    read: readOnlyDatabaseClient,
    write: databaseClient,
  }));
  const migrations = createMigrationRunner(createMigrationSqlUseClient({
    read: readOnlyDatabaseClient,
    write: databaseClient,
  }));
  let serverMachinePromise;
  function serverMachine() {
    if (!serverMachinePromise) serverMachinePromise = (async () => {
      const response = await fetchImpl(storageRequest(config, "machines/resources-server-microquickjs.wasm"));
      if (!response.ok) throw new Error(`Server machine storage response: ${response.status}`);
      const module = await WebAssembly.compile(await response.arrayBuffer());
      return createResourcesServerMachine(module, {
        databaseClient, readDatabaseClient: readOnlyDatabaseClient, authConfig, contentStore,
      });
    })().catch((error) => {
      serverMachinePromise = null;
      throw error;
    });
    return serverMachinePromise;
  }
  const handler = createResourcesEdgeHandler({
    config,
    authConfig,
    gitlabAuthConfig,
    accountStore,
    contentStore,
    organizationStore,
    blogExamplesOrigin: env.BLOG_EXAMPLES_ORIGIN,
    fetchImpl,
  });

  let databaseReadyPromise;
  function databaseReady() {
    if (!databaseReadyPromise) {
      databaseReadyPromise = migrations.ready()
        .then(() => Promise.all([accountStore.initialize(), contentStore.initialize(), organizationStore.initialize()]))
        .catch((error) => {
          databaseReadyPromise = null;
          throw error;
        });
    }
    return databaseReadyPromise;
  }

  return async function resourcesApplicationRequest(request) {
    try {
      await databaseReady();
      return (await serverMachine()).handle(request, {
        documentHandler: () => handler(request),
      });
    } catch (error) {
      console.error("resources-edge deferred initialization", error?.message || String(error));
      return new Response("Edge content unavailable", {
        status: 503,
        headers: { "cache-control": "no-store" },
      });
    }
  };
}

// The deployable controller stays tiny. Static anonymous-home selection is
// registered before this lazily constructed application touches the database.
export function createResourcesRequestHandler(environment, { fetchImpl = fetch } = {}) {
  const storagePrefix = "resources-co-__MACCHIATO_GIT_REVISION__";
  const config = createEdgeConfig({ ...environment, BUNNY_BUCKET_PREFIX: storagePrefix });
  let application;
  return createResourcesBootstrapHandler({
    config,
    env: { ...environment, DEFERRED_PREWARM_DELAY_MS: "0" },
    deferredHandler: {
      async prewarm() {},
      handle(request) {
        application ||= createResourcesApplicationHandler(environment, { fetchImpl });
        return application(request);
      },
    },
  });
}
