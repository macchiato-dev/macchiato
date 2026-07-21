import * as BunnySDK from "@bunny.net/edgescript-sdk";
import process from "node:process";
import { createResourcesEdgeHandler } from "./edge/app.js";
import { createEdgeConfig } from "./edge/models.js";

// This file is intentionally wiring only. Security policy and storage behavior
// live in dependency-free, unit-tested models under ./edge/.
const config = createEdgeConfig(process.env);
const handler = createResourcesEdgeHandler({ config, fetchImpl: fetch });

BunnySDK.net.http.serve(handler);
