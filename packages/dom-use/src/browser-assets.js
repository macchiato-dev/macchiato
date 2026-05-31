import { fileURLToPath } from "node:url";

export const domUseBrowserAssets = {
  namespace: "@macchiato-dev/dom-use",
  imports: {
    "@macchiato-dev/dom-use": "index.js",
  },
  files: [
    {
      publicPath: "index.js",
      filePath: fileURLToPath(new URL("./index.js", import.meta.url)),
    },
  ],
};
