import { fileURLToPath } from "node:url";

export const styleUseBrowserAssets = {
  namespace: "@macchiato-dev/style-use",
  imports: {
    "@macchiato-dev/style-use": "index.js",
  },
  files: [
    {
      publicPath: "index.js",
      filePath: fileURLToPath(new URL("./index.js", import.meta.url)),
    },
  ],
};
