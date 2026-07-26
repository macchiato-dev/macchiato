import { createResourcesArtifactSet } from "./artifacts.js";
import { createResourcesEdgeHandler } from "./edge/app.js";
import { createEdgeConfig } from "./edge/models.js";
import { createMemoryStorageAdapter } from "./adapters/memory-storage.js";
import { createAuthConfig } from "./auth/github.js";
import { createGitlabAuthConfig } from "./auth/gitlab.js";

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
const authConfig = createAuthConfig({
  PUBLIC_ORIGIN: previewEnv.RESOURCES_PREVIEW_ORIGIN || "http://resources-edge.localhost:3030",
  AUTH_ALLOW_INSECURE_LOCALHOST: "true",
  GITHUB_CLIENT_ID: previewEnv.RESOURCES_PREVIEW_GITHUB_CLIENT_ID || "local-preview",
  GITHUB_CLIENT_SECRET: previewEnv.RESOURCES_PREVIEW_GITHUB_CLIENT_SECRET || "local-preview-not-a-provider-secret",
  SESSION_SIGNING_KEY: previewEnv.RESOURCES_PREVIEW_SESSION_SIGNING_KEY || "local-preview-session-signing-key",
});
const gitlabAuthConfig = createGitlabAuthConfig({
  GITLAB_CLIENT_ID: previewEnv.RESOURCES_PREVIEW_GITLAB_CLIENT_ID || "local-preview",
  GITLAB_CLIENT_SECRET: previewEnv.RESOURCES_PREVIEW_GITLAB_CLIENT_SECRET || "local-preview-not-a-provider-secret",
}, authConfig);
const handler = createResourcesEdgeHandler({ config, authConfig, gitlabAuthConfig, fetchImpl });

export function resourcesEdgePreviewHandler(request) {
  return handler(request);
}
