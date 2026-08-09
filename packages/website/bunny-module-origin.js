import * as BunnySDK from "@bunny.net/edgescript-sdk";
import process from "node:process";
import { createEdgeConfig } from "./edge/models.js";
import { createModuleOriginHandler } from "./edge/module-origin.js";

const storagePrefix = "resources-co-__MACCHIATO_GIT_REVISION__";
const moduleKey = "-/edge/resources-application.__MACCHIATO_DEFERRED_SHORT__.js";
const expectedSha256 = "__MACCHIATO_DEFERRED_SHA256________________________________";
const config = createEdgeConfig({ ...process.env, BUNNY_BUCKET_PREFIX: storagePrefix });

BunnySDK.net.http.serve(createModuleOriginHandler({
  config,
  moduleKey,
  expectedSha256,
  apiKey: process.env.EDGE_MODULE_API_KEY,
}));
