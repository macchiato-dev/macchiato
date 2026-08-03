import * as BunnySDK from "@bunny.net/edgescript-sdk";
import process from "node:process";
import { createResourcesEdgeHandler } from "./edge/app.js";
import { createEdgeConfig } from "./edge/models.js";
import { createAuthConfig } from "./auth/github.js";
import { createGitlabAuthConfig } from "./auth/gitlab.js";
import { createClient } from "@libsql/client/web";
import { createAccountStore } from "./models/accounts.js";
import { createContentStore } from "./models/content.js";

// This file is intentionally wiring only. Security policy and storage behavior
// live in dependency-free, unit-tested models under ./edge/.
// The build replaces this marker with the seven-character Git revision. Keep
// the resolved storage prefix in the deployed function rather than mutable
// Edge Script environment configuration.
const storagePrefix = "resources-co-__MACCHIATO_GIT_REVISION__";
const config = createEdgeConfig({ ...process.env, BUNNY_BUCKET_PREFIX: storagePrefix });
const authConfig = createAuthConfig(process.env);
const gitlabAuthConfig = createGitlabAuthConfig(process.env, authConfig);
const databaseClient = createClient({
  url: process.env.BUNNY_DATABASE_URL,
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN,
});
const accountStore = createAccountStore(databaseClient);
const contentStore = createContentStore(databaseClient);
const handler = createResourcesEdgeHandler({
  config, authConfig, gitlabAuthConfig, accountStore, contentStore,
  blogExamplesOrigin: process.env.BLOG_EXAMPLES_ORIGIN,
  fetchImpl: fetch,
});

BunnySDK.net.http.serve(handler);
