import { fileURLToPath } from "node:url";

const asset = (publicPath, relative) => ({
  publicPath,
  filePath: fileURLToPath(new URL(relative, import.meta.url)),
});
export const elementUseBrowserAssets = {
  namespace: "element-use",
  files: [
    asset("runner.html", "../runner.html"),
    asset("controller.js", "./controller.js"),
    asset("runner.js", "./runner.js"),
    asset("runtime.js", "./runtime.js"),
    asset("host.js", "./host.js"),
    asset("guest.js", "./guest.js"),
    asset("policy.js", "./policy.js"),
    asset("protocol.js", "./protocol.js"),
  ],
};
