import { fileURLToPath } from "node:url";

export const commandPaletteUseBrowserAssets = Object.freeze({
  namespace: "command-palette-use",
  imports: {
    "@macchiato-dev/command-palette-use/client": "client.js",
  },
  files: [
    {
      publicPath: "client.js",
      filePath: fileURLToPath(new URL("./client.js", import.meta.url)),
    },
  ],
});
