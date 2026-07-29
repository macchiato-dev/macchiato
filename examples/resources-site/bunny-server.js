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
const config = createEdgeConfig(process.env);
const authConfig = createAuthConfig(process.env);
const gitlabAuthConfig = createGitlabAuthConfig(process.env, authConfig);
const databaseClient = createClient({
  url: process.env.BUNNY_DATABASE_URL,
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN,
});
const accountStore = createAccountStore(databaseClient);
const contentStore = createContentStore(databaseClient);
const handler = createResourcesEdgeHandler({ config, authConfig, gitlabAuthConfig, accountStore, contentStore, fetchImpl: fetch });

BunnySDK.net.http.serve(handler);
