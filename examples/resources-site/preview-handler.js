import { createResourcesArtifactSet } from "./artifacts.js";
import { createResourcesEdgeHandler } from "./edge/app.js";
import { createEdgeConfig } from "./edge/models.js";
import { createMemoryStorageAdapter } from "./adapters/memory-storage.js";
import { createNodeSqliteClient } from "./adapters/node-sqlite-client.js";
import { createAuthConfig } from "./auth/github.js";
import { createGitlabAuthConfig } from "./auth/gitlab.js";
import { createAccountStore } from "./models/accounts.js";
import { createContentStore } from "./models/content.js";

export const resourcesEdgePreviewConfig = Object.freeze({
  subdomain: "resources-edge",
  runtime: "local edge simulation",
  adapter: "in-memory manifest storage",
  targetAdapter: "Bunny Storage fetch",
  profile: "document-navigation-v1",
  theme: {},
});

const config = createEdgeConfig({
  BUNNY_STORAGE_ORIGIN: "https://resources-memory.invalid/zone",
  BUNNY_BUCKET_PREFIX: "resources-co",
  STORAGE_API_KEY: "local-adapter-only",
  MANIFEST_TTL_MS: "300000",
});
const artifactSet = createResourcesArtifactSet({ theme: resourcesEdgePreviewConfig.theme, generatedAt: "local-preview" });
const storageFetch = createMemoryStorageAdapter({ config, artifactSet });
const fetchImpl = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  return url.origin === new URL(config.storageOrigin).origin
    ? storageFetch(input, init)
    : fetch(input, init);
};
const previewEnv = globalThis.process?.env || {};
let cachedEnvironmentKey = "";
let cachedHandler;
let cachedDatabase;

function handlerFor(environment = {}, db = null) {
  const effective = {
    PUBLIC_ORIGIN: environment.PUBLIC_ORIGIN || previewEnv.RESOURCES_PREVIEW_ORIGIN || "http://resources-edge.localhost:3030",
    GITHUB_CLIENT_ID: environment.GITHUB_CLIENT_ID || previewEnv.RESOURCES_PREVIEW_GITHUB_CLIENT_ID || "local-preview",
    GITHUB_CLIENT_SECRET: environment.GITHUB_CLIENT_SECRET || previewEnv.RESOURCES_PREVIEW_GITHUB_CLIENT_SECRET || "local-preview-not-a-provider-secret",
    GITLAB_CLIENT_ID: environment.GITLAB_CLIENT_ID || previewEnv.RESOURCES_PREVIEW_GITLAB_CLIENT_ID || "local-preview",
    GITLAB_CLIENT_SECRET: environment.GITLAB_CLIENT_SECRET || previewEnv.RESOURCES_PREVIEW_GITLAB_CLIENT_SECRET || "local-preview-not-a-provider-secret",
    SESSION_SIGNING_KEY: environment.SESSION_SIGNING_KEY || previewEnv.RESOURCES_PREVIEW_SESSION_SIGNING_KEY || "local-preview-session-signing-key",
  };
  const key = JSON.stringify(effective);
  if (key === cachedEnvironmentKey && db === cachedDatabase) return cachedHandler;
  const authConfig = createAuthConfig({ ...effective, AUTH_ALLOW_INSECURE_LOCALHOST: "true" });
  const gitlabAuthConfig = createGitlabAuthConfig(effective, authConfig);
  cachedEnvironmentKey = key;
  cachedDatabase = db;
  const client = db ? createNodeSqliteClient(db) : null;
  const accountStore = client ? createAccountStore(client) : null;
  const contentStore = client ? createContentStore(client) : null;
  cachedHandler = createResourcesEdgeHandler({ config, authConfig, gitlabAuthConfig, accountStore, contentStore, fetchImpl });
  return cachedHandler;
}

export function resourcesEdgePreviewHandler(request, app = {}, context = {}) {
  return handlerFor(app.environment, context.db)(request);
}
