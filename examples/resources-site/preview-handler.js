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
const fetchImpl = createMemoryStorageAdapter({ config, artifactSet });
const authConfig = createAuthConfig({
  PUBLIC_ORIGIN: "https://resources-edge.localhost",
  GITHUB_CLIENT_ID: "local-preview",
  GITHUB_CLIENT_SECRET: "local-preview-not-a-provider-secret",
  SESSION_SIGNING_KEY: "local-preview-session-signing-key",
});
const gitlabAuthConfig = createGitlabAuthConfig({
  GITLAB_CLIENT_ID: "local-preview",
  GITLAB_CLIENT_SECRET: "local-preview-not-a-provider-secret",
}, authConfig);
const handler = createResourcesEdgeHandler({ config, authConfig, gitlabAuthConfig, fetchImpl });

export function resourcesEdgePreviewHandler(request) {
  return handler(request);
}
