// @ts-nocheck -- migrated controller; Bunny SDK boundary types follow separately.
import * as BunnySDK from "@bunny.net/edgescript-sdk";
import process from "node:process";
import { createResourcesRequestHandler } from "./machine.js";

BunnySDK.net.http.serve(createResourcesRequestHandler(process.env));
