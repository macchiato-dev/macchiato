import { readFileSync } from "node:fs";
import { createNodeSqliteClient } from "./adapters/node-sqlite-client.js";
import { createAuthConfig } from "./auth/github.js";
import { createGitlabAuthConfig } from "./auth/gitlab.js";
import { createResourcesEdgeHandler, renderResourcesDocument } from "./edge/app.js";
import { ResourcesApplicationMachine } from "./resources-application-machine.js";
import { createResourcesServerMachine } from "./resources-server-machine.js";
import { ServerMachineController } from "../server-use/src/machine-controller.js";

const serverModule = new WebAssembly.Module(readFileSync(
  new URL("./generated/microquickjs-server.wasm", import.meta.url)));
function localBytecodes(directory) {
  const root = new URL(`./generated/${directory}/`, import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));
  return manifest.chunks.map(name => readFileSync(new URL(name, root)));
}
const serverBytecodes = localBytecodes("resources-server-bytecode");
const policyBytecodes = [readFileSync(new URL(
  "./generated/resources-policy-machine/application.bin", import.meta.url))];
const applicationModule = new WebAssembly.Module(readFileSync(new URL(
  "./generated/resources-application-machine/quickjs-server.wasm", import.meta.url)));
const applicationBytecode = readFileSync(new URL(
  "./generated/resources-application-machine/application.bin", import.meta.url));

// This is the local counterpart of backend/machine.ts. Keeping it behind a
// dynamic import makes resources-edge exercise the same deferred application,
// migration wait, shared initialization, and retry boundary as Bunny.
export function createResourcesPreviewApplication({ config, environment, db, fetchImpl, blogExamplesOrigin }) {
  const authConfig = createAuthConfig({ ...environment, AUTH_ALLOW_INSECURE_LOCALHOST: "true" });
  const gitlabAuthConfig = createGitlabAuthConfig(environment, authConfig);
  const client = db ? createNodeSqliteClient(db) : null;
  const databaseDevice = async (operation, input) => {
    if (operation === "batch") {
      return (await client.batch(input.map(([sql, args]) => ({ sql, args }))))
        .map(result => Number(result.rowsAffected) || 0);
    }
    const result = await client.execute({ sql: input[0], args: input[1] });
    const columns = Array.from(result.columns || Object.keys(result.rows?.[0] || {}), String);
    return [columns, result.rows.map(row => columns.map(column => row[column])),
      Number(result.rowsAffected) || 0];
  };
  const policy = client ? new ServerMachineController(applicationModule, {
    bytecodes: policyBytecodes, maxMessageBytes: 128 * 1024 * 1024,
    devices: { database: databaseDevice },
  }) : null;
  const policyRequest = async (input) => {
    const result = await policy.request(input);
    if (!Array.isArray(result) || result[0] !== "ok") {
      throw new Error(Array.isArray(result) ? result[2] : "SQL policy rejected the request");
    }
    return result[1];
  };
  const application = client ? new ResourcesApplicationMachine(applicationModule, {
    bytecode: applicationBytecode,
    sqlDevice: (operation, input) => policyRequest(["database-client", operation, input]),
  }) : null;
  const store = (name, method, args) => application.store(name, method, args);
  const accountStore = application ? Object.freeze({
    getAccount: userId => store("account", "getAccount", [userId]),
    authenticateIdentity: (identity, options) => store(
      "account", "authenticateIdentity", [identity, options]),
  }) : null;
  const projectStore = application ? Object.freeze({
    createProject: (...args) => store("content", "createProject", args),
    getProject: (...args) => store("content", "getProject", args),
    getProjectWorkspace: (...args) => store("content", "getProjectWorkspace", args),
    getPublicProjectWorkspace: (...args) => store(
      "content", "getPublicProjectWorkspace", args),
    getProjectVersion: (...args) => store("content", "getProjectVersion", args),
    saveProjectSnapshot: (...args) => store("content", "saveProjectSnapshot", args),
    restoreProjectVersion: (...args) => store("content", "restoreProjectVersion", args),
    revertProjectToPublished: (...args) => store(
      "content", "revertProjectToPublished", args),
    updateProject: (...args) => store("content", "updateProject", args),
    publishProject: (...args) => store("content", "publishProject", args),
    deleteProject: (...args) => store("content", "deleteProject", args),
  }) : null;
  const documentPlan = application
    ? input => application.documentPlan(input)
    : async input => input.routeOnly ? { directTryTemplate: "" }
      : input.shellOnly ? { accountShellPath: input.pathname }
      : ({ requestedProject: null, dynamicProject: null, projectOwner: false,
      dynamicNamespace: null, managedOrganization: null, accountContent: null,
      account: null, publicProjects: input.publicApi ? [] : null, notifications: [],
        kind: "static", csrfActions: [], shellPath: input.pathname, focused: false });
  const machine = client ? createResourcesServerMachine(serverModule, {
    bytecodes: serverBytecodes,
    sqlDevice: (operation, input) => policyRequest(["sql", operation, input]),
    authConfig, contentStore: projectStore,
  }) : null;
  const handler = createResourcesEdgeHandler({
    config, authConfig, gitlabAuthConfig, accountStore, fetchImpl,
    blogExamplesOrigin, documentPlan,
    documentRenderer: renderResourcesDocument,
  });
  let readyPromise;
  async function ready() {
    if (!readyPromise) {
      readyPromise = (application ? application.initialize() : Promise.resolve()).catch((error) => {
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
