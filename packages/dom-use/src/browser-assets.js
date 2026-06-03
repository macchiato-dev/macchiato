import { fileURLToPath } from "node:url";

export const domUseBrowserAssets = {
  namespace: "@macchiato-dev/dom-use",
  imports: {
    "@macchiato-dev/dom-use": "index.js",
    "@macchiato-dev/dom-use/bridge": "bridge.js",
  },
  files: [
    {
      publicPath: "index.js",
      filePath: fileURLToPath(new URL("./index.js", import.meta.url)),
    },
    {
      publicPath: "bridge.js",
      filePath: fileURLToPath(new URL("./bridge.js", import.meta.url)),
    },
  ],
};
