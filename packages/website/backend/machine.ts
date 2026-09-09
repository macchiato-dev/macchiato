// @ts-nocheck -- migrated machine composition; capability types follow separately.
import { createClient } from "@libsql/client/http";
import { createAuthConfig } from "../auth/github.js";
import { createGitlabAuthConfig } from "../auth/gitlab.js";
import { createResourcesEdgeHandler } from "../edge/app.js";
import { createResourcesBootstrapHandler } from "../edge/bootstrap.js";
import { createEdgeConfig, storageRequest } from "../edge/models.js";
import { createResourcesServerMachine } from "../resources-server-machine.js";
import { ResourcesApplicationMachine } from "../resources-application-machine.js";
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
      applicationRuntimeModule(), backendAssets(),
    ]).then(([module, assets]) => {
      const bytecode = assets.get("resources-policy/application.bin");
      if (!bytecode) throw new Error("Backend artifact lacks resources-policy/application.bin");
      return new ServerMachineController(module, {
        bytecodes: [bytecode], maxMessageBytes: 128 * 1024 * 1024,
        devices: { database: databaseDevice },
      });
    }).catch((error) => {
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
      return new ResourcesApplicationMachine(module, {
        bytecode: application,
        sqlDevice: (operation, input) => policyRequest([
          "database-client", operation, input,
        ]),
      });
    }).catch((error) => {
      applicationMachinePromise = null;
      throw error;
    });
    return applicationMachinePromise;
  }
  async function applicationStoreCall(store, method, args) {
    return (await applicationMachine()).store(store, method, args);
  }
  async function applicationDocumentPlan(input) {
    return (await applicationMachine()).documentPlan(input);
  }
  const accountStore = Object.freeze({
    initialize: () => applicationMachine().then(machine => machine.initialize()),
    getAccount: userId => applicationStoreCall("account", "getAccount", [userId]),
    authenticateIdentity: (identity, options) => applicationStoreCall(
      "account", "authenticateIdentity", [identity, options]),
  });
  const projectStore = Object.freeze({
    createProject: (...args) => applicationStoreCall("content", "createProject", args),
    getProject: (...args) => applicationStoreCall("content", "getProject", args),
    getProjectWorkspace: (...args) => applicationStoreCall(
      "content", "getProjectWorkspace", args),
    getPublicProjectWorkspace: (...args) => applicationStoreCall(
      "content", "getPublicProjectWorkspace", args),
    getProjectVersion: (...args) => applicationStoreCall(
      "content", "getProjectVersion", args),
    saveProjectSnapshot: (...args) => applicationStoreCall(
      "content", "saveProjectSnapshot", args),
    restoreProjectVersion: (...args) => applicationStoreCall(
      "content", "restoreProjectVersion", args),
    revertProjectToPublished: (...args) => applicationStoreCall(
      "content", "revertProjectToPublished", args),
    updateProject: (...args) => applicationStoreCall("content", "updateProject", args),
    publishProject: (...args) => applicationStoreCall("content", "publishProject", args),
    deleteProject: (...args) => applicationStoreCall("content", "deleteProject", args),
  });
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
        authConfig, contentStore: projectStore,
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
    documentPlan: applicationDocumentPlan,
    blogExamplesOrigin: env.BLOG_EXAMPLES_ORIGIN,
    documentRenderer,
    fetchImpl,
  });

  let databaseReadyPromise;
  function databaseReady() {
    if (!databaseReadyPromise) {
      databaseReadyPromise = applicationMachine().then(machine => machine.initialize())
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
