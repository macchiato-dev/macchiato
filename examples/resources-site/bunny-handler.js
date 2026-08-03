import process from "node:process";
import { createResourcesEdgeHandler } from "./edge/app.js";
import { createEdgeConfig } from "./edge/models.js";
import { createAuthConfig } from "./auth/github.js";
import { createGitlabAuthConfig } from "./auth/gitlab.js";
import { createClient } from "@libsql/client/web";
import { createAccountStore } from "./models/accounts.js";
import { createContentStore } from "./models/content.js";

// Runtime wiring is separate from Bunny's serve call so release builds can pin
// an immutable Storage prefix into their generated entry point.
export function createResourcesBunnyHandler({
  env = process.env,
  bucketPrefix = env.BUNNY_BUCKET_PREFIX,
  fetchImpl = fetch,
} = {}) {
  const config = createEdgeConfig({
    ...env,
    BUNNY_BUCKET_PREFIX: bucketPrefix,
  });
  const authConfig = createAuthConfig(env);
  const gitlabAuthConfig = createGitlabAuthConfig(env, authConfig);
  const databaseClient = createClient({
    url: env.BUNNY_DATABASE_URL,
    authToken: env.BUNNY_DATABASE_AUTH_TOKEN,
  });
  const accountStore = createAccountStore(databaseClient);
  const contentStore = createContentStore(databaseClient);
  return createResourcesEdgeHandler({
    config,
    authConfig,
    gitlabAuthConfig,
    accountStore,
    contentStore,
    blogExamplesOrigin: env.BLOG_EXAMPLES_ORIGIN,
    fetchImpl,
  });
}
