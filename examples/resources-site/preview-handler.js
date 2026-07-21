import { createResourcesArtifactSet } from "./artifacts.js";
import { createResourcesEdgeHandler } from "./edge/app.js";
import { createEdgeConfig } from "./edge/models.js";
import { createMemoryStorageAdapter } from "./adapters/memory-storage.js";

export const resourcesEdgePreviewConfig = Object.freeze({
  subdomain: "resources-edge",
  runtime: "local edge simulation",
  adapter: "in-memory manifest storage",
  targetAdapter: "Bunny Storage fetch",
  profile: "document-navigation-v1",
  theme: {
    dark: { "--accent": "#ffb86b", "--active-bg": "#7c3aed" },
    light: { "--accent": "#7c3aed", "--active-bg": "#7c3aed" },
  },
});

const config = createEdgeConfig({
  BUNNY_STORAGE_ORIGIN: "https://resources-memory.invalid/zone",
  BUNNY_BUCKET_PREFIX: "resources-co",
  STORAGE_API_KEY: "local-adapter-only",
  MANIFEST_TTL_MS: "300000",
});
const artifactSet = createResourcesArtifactSet({ theme: resourcesEdgePreviewConfig.theme, generatedAt: "local-preview" });
const fetchImpl = createMemoryStorageAdapter({ config, artifactSet });
const handler = createResourcesEdgeHandler({ config, fetchImpl });

export function resourcesEdgePreviewHandler(request) {
  return handler(request);
}
