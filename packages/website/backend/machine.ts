// @ts-nocheck -- migrated machine composition; capability types follow separately.
import { createClient } from "@libsql/client/http";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createOrganizationStore } from "@macchiato-dev/hub/organizations";
import { createAuthConfig } from "../auth/github.js";
import { createGitlabAuthConfig } from "../auth/gitlab.js";
import { createResourcesEdgeHandler } from "../edge/app.js";
import { createResourcesBootstrapHandler } from "../edge/bootstrap.js";
import { createEdgeConfig, storageRequest } from "../edge/models.js";
import { createResourcesServerMachine } from "../resources-server-machine.js";
import { createProjectSnapshotDiffer, createProjectSnapshotValidator,
  createProjectVersionPlanner } from "../project-version-machine.js";
import { decodeResourceArtifact } from "../../wasm-web-container/src/resource-bundle.js";
import { ServerMachineController } from "../../server-use/src/machine-controller.js";

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
  let backendAssetsPromise;
  function backendAssets() {
    if (!backendAssetsPromise) backendAssetsPromise = (async () => {
      const response = await fetchImpl(storageRequest(config, "machines/backend.bin"));
      if (!response.ok) throw new Error(`Backend storage response: ${response.status}`);
      return decodeResourceArtifact(new Uint8Array(await response.arrayBuffer()));
    })().catch((error) => {
      backendAssetsPromise = null;
      throw error;
    });
    return backendAssetsPromise;
  }
  async function bytecodeSet(path) {
    const assets = await backendAssets();
    const manifestBytes = assets.get(`${path}/manifest.json`);
    if (!manifestBytes) throw new Error(`Backend artifact lacks ${path}/manifest.json`);
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    if (manifest?.format !== "microquickjs-bytecode-v1" ||
        !Array.isArray(manifest.chunks) || !manifest.chunks.length ||
        manifest.chunks.some(name => !/^[0-9]+\.bin$/.test(name))) {
      throw new Error(`Machine bytecode manifest for ${path} is invalid`);
    }
    const chunks = manifest.chunks.map(name => {
      const chunk = assets.get(`${path}/${name}`);
      if (!chunk) throw new Error(`Backend artifact lacks ${path}/${name}`);
      return chunk;
    });
    if (chunks.reduce((total, chunk) => total + chunk.length, 0) !== manifest.bytes) {
      throw new Error(`Machine bytecode size for ${path} is invalid`);
    }
    return chunks;
  }
  let runtimeModulePromise;
  function runtimeModule() {
    if (!runtimeModulePromise) runtimeModulePromise = backendAssets().then((assets) => {
      const runtime = assets.get("runtime.wasm");
      if (!runtime) throw new Error("Backend artifact lacks runtime.wasm");
      return WebAssembly.compile(runtime);
    })
      .catch((error) => {
        runtimeModulePromise = null;
        throw error;
      });
    return runtimeModulePromise;
  }
  let applicationRuntimeModulePromise;
  function applicationRuntimeModule() {
    if (!applicationRuntimeModulePromise) {
      applicationRuntimeModulePromise = backendAssets().then((assets) => {
        const runtime = assets.get("application-runtime.wasm");
        if (!runtime) throw new Error("Backend artifact lacks application-runtime.wasm");
        return WebAssembly.compile(runtime);
      }).catch((error) => {
        applicationRuntimeModulePromise = null;
        throw error;
      });
    }
    return applicationRuntimeModulePromise;
  }
  const databaseDevice = async (operation, input) => {
    if (!Array.isArray(input)) throw new Error("Database input is invalid");
    if (operation === "batch") {
      const result = await databaseClient.batch(input.map(([sql, args]) => ({ sql, args })));
      return result.map(item => Number(item.rowsAffected) || 0);
    }
    if ((operation !== "read" && operation !== "write") || input.length !== 2 ||
        typeof input[0] !== "string" || !Array.isArray(input[1])) {
      throw new Error("Database operation is not available");
    }
    const client = operation === "read" ? readOnlyDatabaseClient : databaseClient;
    const result = await client.execute({ sql: input[0], args: input[1] });
    const columns = Array.from(result.columns || [], String);
    const rows = Array.from(result.rows || [], row => columns.map((column) => {
      const value = row[column];
      return typeof value === "bigint" ? Number(value) : value;
    }));
    return [columns, rows, Number(result.rowsAffected) || 0];
  };
  let policyMachinePromise;
  function policyMachine() {
    if (!policyMachinePromise) policyMachinePromise = Promise.all([
      runtimeModule(), bytecodeSet("resources-policy"),
    ]).then(([module, bytecodes]) => new ServerMachineController(module, {
      bytecodes, devices: { database: databaseDevice },
    })).catch((error) => {
      policyMachinePromise = null;
      throw error;
    });
    return policyMachinePromise;
  }
  let documentMachinePromise;
  function documentMachine() {
    if (!documentMachinePromise) documentMachinePromise = Promise.all([
      runtimeModule(), bytecodeSet("resources-document"),
    ]).then(([module, bytecodes]) => new ServerMachineController(module, { bytecodes }))
      .catch((error) => {
        documentMachinePromise = null;
        throw error;
      });
    return documentMachinePromise;
  }
  async function documentRenderer(operation, args) {
    const result = await (await documentMachine()).request([operation, JSON.stringify(args)]);
    if (typeof result !== "string") {
      throw new Error(Array.isArray(result) && typeof result[2] === "string"
        ? result[2] : "Document machine rejected the request");
    }
    return result;
  }
  async function policyRequest(input) {
    const result = await (await policyMachine()).request(input);
    if (!Array.isArray(result) || result[0] !== "ok") {
      throw new Error(Array.isArray(result) && typeof result[2] === "string"
        ? result[2] : "SQL policy machine rejected the request");
    }
    return result[1];
  }
  let applicationMachinePromise;
  function applicationMachine() {
    if (!applicationMachinePromise) applicationMachinePromise = Promise.all([
      applicationRuntimeModule(), backendAssets(),
    ]).then(([module, assets]) => {
      const application = assets.get("resources-application/application.bin");
      if (!application) {
        throw new Error("Backend artifact lacks resources-application/application.bin");
      }
      return new ServerMachineController(module, {
        bytecodes: [application],
        devices: {
          sql: (operation, input) => policyRequest([
            "database-client", operation, input,
          ]),
        },
      });
    }).catch((error) => {
      applicationMachinePromise = null;
      throw error;
    });
    return applicationMachinePromise;
  }
  function compatibleResult(result) {
    const [columns, values, rowsAffected] = result;
    const rows = values.map(row => Object.fromEntries(
      columns.map((column, index) => [column, row[index]])));
    return { columns, rows, rowsAffected, lastInsertRowid: null };
  }
  const policyDatabaseClient = Object.freeze({
    async execute(query) {
      return compatibleResult(await policyRequest([
        "database-client", "execute", [query.sql, query.args || []],
      ]));
    },
    async batch(queries) {
      const affected = await policyRequest(["database-client", "batch",
        queries.map(query => [query.sql, query.args || []])]);
      return affected.map(rowsAffected => ({ columns: [], rows: [],
        rowsAffected, lastInsertRowid: null }));
    },
  });
  const accountStore = createAccountStore(policyDatabaseClient);
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
  const contentStore = createContentStore(policyDatabaseClient,
    { versionPlanner: projectVersionPlanner, snapshotDiffer: projectSnapshotDiffer,
    snapshotValidator: projectSnapshotValidator });
  const organizationStore = createOrganizationStore(policyDatabaseClient);
  let serverMachinePromise;
  function serverMachine() {
    if (!serverMachinePromise) serverMachinePromise = (async () => {
      const [module, bytecodes] = await Promise.all([
        runtimeModule(),
        bytecodeSet("resources-server"),
      ]);
      return createResourcesServerMachine(module, {
        bytecodes,
        sqlDevice: (operation, input) => policyRequest(["sql", operation, input]),
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
    documentRenderer,
    fetchImpl,
  });

  let databaseReadyPromise;
  function databaseReady() {
    if (!databaseReadyPromise) {
      databaseReadyPromise = applicationMachine()
        .then(machine => machine.request(["initialize"]))
        .then((result) => {
          if (!Array.isArray(result) || result[0] !== "ok") {
            throw new Error("Application machine initialization failed");
          }
        })
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
