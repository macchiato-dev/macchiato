import { fileURLToPath } from "node:url";

export const userMenuUseClientPath = "/-/user-menu-use/client.js";

export const userMenuUseBrowserAssets = Object.freeze({
  namespace: "user-menu-use",
  imports: { "@macchiato-dev/user-menu-use/client": "client.js" },
  files: [{ publicPath: "client.js", filePath: fileURLToPath(new URL("./client.js", import.meta.url)) }],
});
