#!/usr/bin/env node
import { join } from "node:path";
import { createDevelopmentAuth, resetDevelopmentAuth } from "./development-auth.js";

const args = process.argv.slice(2);
const action = args.shift() || "get";
const subdomain = args.shift() || "";
let dataDir = join(process.env.HOME || "/root", ".macchiato", "default");
let port = 3030;

for (let index = 0; index < args.length; index++) {
  if (args[index] === "--data-dir") dataDir = args[++index];
  else if (args[index] === "--port") port = Number(args[++index]);
  else throw new Error(`Unknown option: ${args[index]}`);
}

if (!subdomain || !["get", "reset"].includes(action)) {
  throw new Error("Usage: macchiato-dev-link <get|reset> <subdomain> [--port <port>] [--data-dir <path>]");
}
const options = { dataDir, hostname: subdomain, port };
const auth = action === "reset" ? resetDevelopmentAuth(options) : createDevelopmentAuth(options);
console.log(auth.bootstrapUrl);
