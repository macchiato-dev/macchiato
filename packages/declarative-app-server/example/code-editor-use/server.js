import { serveHttpHandler } from "@macchiato-dev/declarative-app-server";
import { codeEditorUseHandler } from "./handler.js";

const running = await serveHttpHandler(codeEditorUseHandler, {
  onError: console.error,
});

console.log(`Code editor declarative app running at ${running.url}`);
