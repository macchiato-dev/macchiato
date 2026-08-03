import * as BunnySDK from "@bunny.net/edgescript-sdk";
import process from "node:process";
import { createModuleOriginHandler } from "./handler.js";

BunnySDK.net.http.serve(createModuleOriginHandler(process.env));
