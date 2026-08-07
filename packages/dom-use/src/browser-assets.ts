import { fileURLToPath } from "node:url";

export const domUseBrowserAssets = {
  namespace: "@macchiato-dev/dom-use",
  imports: {
    "@macchiato-dev/dom-use": "index.js",
    "@macchiato-dev/dom-use/bridge": "bridge.js",
    "@macchiato-dev/dom-use/guest-runtime": "guest-runtime.js",
    "@macchiato-dev/dom-use/guest-runtime-microquickjs": "guest-runtime-microquickjs.js",
    "@macchiato-dev/dom-use/host": "host.js",
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
    {
      publicPath: "guest-runtime.js",
      filePath: fileURLToPath(new URL("./guest-runtime.js", import.meta.url)),
    },
    {
      publicPath: "guest-runtime-microquickjs.js",
      filePath: fileURLToPath(new URL("./guest-runtime-microquickjs.js", import.meta.url)),
    },
    {
      publicPath: "host.js",
      filePath: fileURLToPath(new URL("./host.js", import.meta.url)),
    },
  ],
};
