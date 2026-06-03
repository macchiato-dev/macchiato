import { fileURLToPath } from "node:url";

const npm = (path) => fileURLToPath(new URL(`../../../node_modules/${path}`, import.meta.url));

export const quickJsEmscriptenSandboxBrowserAssets = {
  namespace: "quickjs-emscripten-sandbox",
  imports: {
    "@macchiato-dev/quickjs-emscripten-sandbox": "index.js",
    "@jitl/quickjs-ffi-types": "ffi-types.js",
    "@jitl/quickjs-singlefile-browser-release-sync": "singlefile-browser-release-sync.js",
    "quickjs-emscripten-core": "quickjs-core.js",
  },
  files: [
    {
      publicPath: "index.js",
      filePath: fileURLToPath(new URL("./index.js", import.meta.url)),
    },
    {
      publicPath: "ffi-types.js",
      filePath: npm("@jitl/quickjs-ffi-types/dist/index.mjs"),
      sourceMapPath: npm("@jitl/quickjs-ffi-types/dist/index.mjs.map"),
    },
    {
      publicPath: "singlefile-browser-release-sync.js",
      filePath: npm("@jitl/quickjs-singlefile-browser-release-sync/dist/index.mjs"),
      sourceMapPath: npm("@jitl/quickjs-singlefile-browser-release-sync/dist/index.mjs.map"),
      rewrites: {
        "./chunk-FGV2HSCH.mjs": "./singlefile-runtime.js",
        "./ffi.mjs": "./singlefile-ffi.js",
        "./emscripten-module.browser-XIKQQPVU.mjs": "./emscripten-module.browser.js",
      },
    },
    {
      publicPath: "singlefile-runtime.js",
      filePath: npm("@jitl/quickjs-singlefile-browser-release-sync/dist/chunk-FGV2HSCH.mjs"),
      sourceMapPath: npm("@jitl/quickjs-singlefile-browser-release-sync/dist/chunk-FGV2HSCH.mjs.map"),
    },
    {
      publicPath: "singlefile-ffi.js",
      filePath: npm("@jitl/quickjs-singlefile-browser-release-sync/dist/ffi.mjs"),
      sourceMapPath: npm("@jitl/quickjs-singlefile-browser-release-sync/dist/ffi.mjs.map"),
      rewrites: {
        "./chunk-FGV2HSCH.mjs": "./singlefile-runtime.js",
      },
    },
    {
      publicPath: "emscripten-module.browser.js",
      filePath: npm("@jitl/quickjs-singlefile-browser-release-sync/dist/emscripten-module.browser-XIKQQPVU.mjs"),
      sourceMapPath: npm("@jitl/quickjs-singlefile-browser-release-sync/dist/emscripten-module.browser-XIKQQPVU.mjs.map"),
      rewrites: {
        "./chunk-FGV2HSCH.mjs": "./singlefile-runtime.js",
      },
    },
    {
      publicPath: "quickjs-core.js",
      filePath: npm("quickjs-emscripten-core/dist/index.mjs"),
      sourceMapPath: npm("quickjs-emscripten-core/dist/index.mjs.map"),
      rewrites: {
        "./chunk-TAV5CUKK.mjs": "./quickjs-async-runtime.js",
        "./chunk-V2S4ZYJR.mjs": "./quickjs-runtime.js",
        "./module-ES6BEMUI.mjs": "./quickjs-module.js",
        "./module-asyncify-2EFITU5U.mjs": "./quickjs-module-asyncify.js",
      },
    },
    {
      publicPath: "quickjs-runtime.js",
      filePath: npm("quickjs-emscripten-core/dist/chunk-V2S4ZYJR.mjs"),
      sourceMapPath: npm("quickjs-emscripten-core/dist/chunk-V2S4ZYJR.mjs.map"),
    },
    {
      publicPath: "quickjs-async-runtime.js",
      filePath: npm("quickjs-emscripten-core/dist/chunk-TAV5CUKK.mjs"),
      sourceMapPath: npm("quickjs-emscripten-core/dist/chunk-TAV5CUKK.mjs.map"),
      rewrites: {
        "./chunk-V2S4ZYJR.mjs": "./quickjs-runtime.js",
      },
    },
    {
      publicPath: "quickjs-module.js",
      filePath: npm("quickjs-emscripten-core/dist/module-ES6BEMUI.mjs"),
      sourceMapPath: npm("quickjs-emscripten-core/dist/module-ES6BEMUI.mjs.map"),
      rewrites: {
        "./chunk-V2S4ZYJR.mjs": "./quickjs-runtime.js",
      },
    },
    {
      publicPath: "quickjs-module-asyncify.js",
      filePath: npm("quickjs-emscripten-core/dist/module-asyncify-2EFITU5U.mjs"),
      sourceMapPath: npm("quickjs-emscripten-core/dist/module-asyncify-2EFITU5U.mjs.map"),
      rewrites: {
        "./chunk-TAV5CUKK.mjs": "./quickjs-async-runtime.js",
        "./chunk-V2S4ZYJR.mjs": "./quickjs-runtime.js",
      },
    },
  ],
};
