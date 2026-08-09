import { createResourcesArtifactSet } from "./artifacts.js";
import { createEdgeConfig } from "./edge/models.js";
import { publicResponseHeaders } from "./edge/models.js";
import { createResourcesBootstrapHandler } from "./edge/bootstrap.js";
import { createMemoryStorageAdapter } from "./adapters/memory-storage.js";

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
const previewEnv = globalThis.process?.env || {};
const artifactSet = createResourcesArtifactSet({
  theme: resourcesEdgePreviewConfig.theme,
  generatedAt: "local-preview",
  blogExamplesOrigin: previewEnv.BLOG_EXAMPLES_ORIGIN || "http://blog-examples.localhost:3030",
});
const storageFetch = createMemoryStorageAdapter({ config, artifactSet });
const fetchImpl = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  return url.origin === new URL(config.storageOrigin).origin
    ? storageFetch(input, init)
    : fetch(input, init);
};
export function createResourcesEdgePreviewRouter({
  loadApplication = () => import("./preview-application.js"),
  schedule = setTimeout,
} = {}) {
  let cachedEnvironmentKey = "";
  let cachedHandler;
  let cachedDatabase;

  return function handlerFor(environment = {}, db = null) {
    const effective = {
      PUBLIC_ORIGIN: environment.PUBLIC_ORIGIN || previewEnv.RESOURCES_PREVIEW_ORIGIN || "http://resources-edge.localhost:3030",
      GITHUB_CLIENT_ID: environment.GITHUB_CLIENT_ID || previewEnv.RESOURCES_PREVIEW_GITHUB_CLIENT_ID || "local-preview",
      GITHUB_CLIENT_SECRET: environment.GITHUB_CLIENT_SECRET || previewEnv.RESOURCES_PREVIEW_GITHUB_CLIENT_SECRET || "local-preview-not-a-provider-secret",
      GITLAB_CLIENT_ID: environment.GITLAB_CLIENT_ID || previewEnv.RESOURCES_PREVIEW_GITLAB_CLIENT_ID || "local-preview",
      GITLAB_CLIENT_SECRET: environment.GITLAB_CLIENT_SECRET || previewEnv.RESOURCES_PREVIEW_GITLAB_CLIENT_SECRET || "local-preview-not-a-provider-secret",
      SESSION_SIGNING_KEY: environment.SESSION_SIGNING_KEY || previewEnv.RESOURCES_PREVIEW_SESSION_SIGNING_KEY || "local-preview-session-signing-key",
      SIGNUPS_ENABLED: environment.SIGNUPS_ENABLED || previewEnv.RESOURCES_PREVIEW_SIGNUPS_ENABLED || "true",
    };
    const key = JSON.stringify(effective);
    if (key === cachedEnvironmentKey && db === cachedDatabase) return cachedHandler;
    cachedEnvironmentKey = key;
    cachedDatabase = db;
    let applicationPromise;
    function application() {
      if (!applicationPromise) {
        applicationPromise = loadApplication().then((module) => module.createResourcesPreviewApplication({
          config, environment: effective, db, fetchImpl,
          blogExamplesOrigin: previewEnv.BLOG_EXAMPLES_ORIGIN || "http://blog-examples.localhost:3030",
        })).catch((error) => {
          applicationPromise = null;
          throw error;
        });
      }
      return applicationPromise;
    }
    const deferredHandler = {
      prewarm: application,
      async handle(request) {
        try {
          return await (await application())(request);
        } catch (error) {
          console.error("resources-edge preview deferred load", error?.message || String(error));
          return new Response("Edge application unavailable", { status: 503, headers: { "cache-control": "no-store" } });
        }
      },
    };
    cachedHandler = createResourcesBootstrapHandler({
      config, env: effective, fetchImpl, deferredHandler, schedule,
    });
    return cachedHandler;
  };
}

const previewRouter = createResourcesEdgePreviewRouter();

export function resourcesEdgePreviewHandler(request, app = {}, context = {}) {
  return previewRouter(app.environment, context.db)(request);
}

export const blogExamplesPreviewConfig = Object.freeze({
  subdomain: "blog-examples",
  runtime: "local static example host",
  profile: "sandboxed-blog-examples-v1",
});

export function blogExamplesPreviewHandler(request) {
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  if (!url.pathname.startsWith("/-/blog-examples/")) return new Response("Not found", { status: 404 });
  const asset = artifactSet.files.get(url.pathname);
  if (!asset) return new Response("Not found", { status: 404 });
  const key = url.pathname.slice(1);
  return new Response(request.method === "HEAD" ? null : asset, { status: 200, headers: publicResponseHeaders(key) });
}
