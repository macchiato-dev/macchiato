import { serveHttpHandler } from "@macchiato-dev/declarative-app-server";
import { exampleHandler } from "./handler.js";

const running = await serveHttpHandler(exampleHandler, { onError: console.error });
console.log(`Quick Counter running at ${running.url}`);
