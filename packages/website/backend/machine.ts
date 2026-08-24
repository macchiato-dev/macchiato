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
  async function machineAsset(path) {
    const response = await fetchImpl(storageRequest(config, `machines/${path}`));
    if (!response.ok) throw new Error(`Machine storage response for ${path}: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  async function bytecodeSet(path) {
    const manifestBytes = await machineAsset(`${path}/manifest.json`);
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    if (manifest?.format !== "microquickjs-bytecode-v1" ||
        !Array.isArray(manifest.chunks) || !manifest.chunks.length ||
        manifest.chunks.some(name => !/^[0-9]+\.bin$/.test(name))) {
      throw new Error(`Machine bytecode manifest for ${path} is invalid`);
    }
    const chunks = await Promise.all(manifest.chunks.map(name => machineAsset(`${path}/${name}`)));
    if (chunks.reduce((total, chunk) => total + chunk.length, 0) !== manifest.bytes) {
      throw new Error(`Machine bytecode size for ${path} is invalid`);
    }
    return chunks;
  }
  let runtimeModulePromise;
  function runtimeModule() {
    if (!runtimeModulePromise) runtimeModulePromise = machineAsset("microquickjs-server.wasm")
      .then(bytes => WebAssembly.compile(bytes)).catch((error) => {
        runtimeModulePromise = null;
        throw error;
      });
    return runtimeModulePromise;
  }
  let projectHistoryAssetsPromise;
  function projectHistoryAssets() {
    if (!projectHistoryAssetsPromise) {
      projectHistoryAssetsPromise = Promise.all([
        runtimeModule(),
        bytecodeSet("resources-project-version"),
      ]).then(([module, bytecodes]) => ({ module, bytecodes })).catch((error) => {
        projectHistoryAssetsPromise = null;
        throw error;
      });
    }
    return projectHistoryAssetsPromise;
  }
  function projectVersionPlanner(input) {
    return projectHistoryAssets().then(({ module, bytecodes }) =>
      createProjectVersionPlanner(module, bytecodes)(input));
  }
  function projectSnapshotDiffer(before, after) {
    return projectHistoryAssets().then(({ module, bytecodes }) =>
      createProjectSnapshotDiffer(module, bytecodes)(before, after));
  }
  function projectSnapshotValidator(snapshot) {
    return projectHistoryAssets().then(({ module, bytecodes }) =>
      createProjectSnapshotValidator(module, bytecodes)(snapshot));
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
      const [module, bytecodes] = await Promise.all([
        runtimeModule(),
        bytecodeSet("resources-server"),
      ]);
      return createResourcesServerMachine(module, {
        bytecodes, databaseClient, readDatabaseClient: readOnlyDatabaseClient,
        authConfig, contentStore,
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
