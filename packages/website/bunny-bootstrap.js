import * as BunnySDK from "@bunny.net/edgescript-sdk";
import process from "node:process";
import { createResourcesBootstrapHandler } from "./edge/bootstrap.js";
import { createDeferredModuleLoader } from "./edge/deferred-loader.js";
import { createEdgeConfig } from "./edge/models.js";

const storagePrefix = "resources-co-__MACCHIATO_GIT_REVISION__";
const deferredSha256 = "__MACCHIATO_DEFERRED_SHA256________________________________";
const config = createEdgeConfig({ ...process.env, BUNNY_BUCKET_PREFIX: storagePrefix });
const loader = createDeferredModuleLoader({
  origin: process.env.EDGE_MODULE_ORIGIN,
  token: process.env.EDGE_MODULE_API_KEY,
  expectedSha256: deferredSha256,
});
let handlerPromise;
function deferredHandler() {
  if (!handlerPromise) {
    handlerPromise = loader.load()
      .then((module) => module.createResourcesDeferredHandler(process.env))
      .catch((error) => {
        handlerPromise = null;
        throw error;
      });
  }
  return handlerPromise;
}
const bootstrap = createResourcesBootstrapHandler({
  config,
  env: process.env,
  deferredHandler: {
    prewarm: deferredHandler,
    async handle(request) {
      try {
        return await (await deferredHandler())(request);
      } catch (error) {
        console.error("resources-edge deferred load", error?.message || String(error));
        return new Response("Edge application unavailable", { status: 503, headers: { "cache-control": "no-store" } });
      }
    },
  },
});

BunnySDK.net.http.serve(bootstrap);
