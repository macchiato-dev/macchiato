import { fileURLToPath } from "node:url";

export const htmlUseBrowserAssets = {
  namespace: "@macchiato-dev/html-use",
  imports: {
    "@macchiato-dev/html-use": "index.js",
  },
  files: [
    {
      publicPath: "index.js",
      filePath: fileURLToPath(new URL("./index.js", import.meta.url)),
    },
  ],
};
