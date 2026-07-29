import { fileURLToPath } from "node:url";

export const themeUseBrowserAssets = Object.freeze({
  namespace: "theme-use",
  imports: { "@macchiato-dev/theme-use/client": "client.js" },
  files: [{ publicPath: "client.js", filePath: fileURLToPath(new URL("./client.js", import.meta.url)) }],
});
