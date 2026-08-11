import * as BunnySDK from "@bunny.net/edgescript-sdk";
import process from "node:process";
import { createResourcesApplicationHandler } from "./bunny-application.js";
import { createResourcesBootstrapHandler } from "./edge/bootstrap.js";
import { createEdgeConfig } from "./edge/models.js";

const storagePrefix = "resources-co-__MACCHIATO_GIT_REVISION__";
const environment = process.env;
const config = createEdgeConfig({ ...environment, BUNNY_BUCKET_PREFIX: storagePrefix });
let application;
function handleApplication(request) {
  application ||= createResourcesApplicationHandler(environment);
  return application(request);
}

// Keep the anonymous home path database-free while shipping one conventional,
// self-contained Edge Script. Database migrations remain lazy inside the
// application handler and begin only when a database-backed route is requested.
const handler = createResourcesBootstrapHandler({
  config,
  env: { ...environment, DEFERRED_PREWARM_DELAY_MS: "0" },
  deferredHandler: {
    async prewarm() {},
    handle: handleApplication,
  },
});

BunnySDK.net.http.serve(handler);
