import { serveDeclarativeApp } from "@macchiato-dev/declarative-app-server";
import { app, renderCodeEditorBlock } from "./app.js";
import { codeEditorUseAssetHandler, codeEditorUseImportMap } from "./handler.js";

const running = await serveDeclarativeApp(app, {
  blocks: { "code-editor": (block, declaration) => renderCodeEditorBlock(block, declaration, codeEditorUseImportMap()) },
  assets: codeEditorUseAssetHandler,
  onError: console.error,
});

console.log(`Code editor declarative app running at ${running.url}`);
