import * as BunnySDK from "@bunny.net/edgescript-sdk";
import { createResourcesBunnyHandler } from "./bunny-handler.js";

BunnySDK.net.http.serve(createResourcesBunnyHandler());
