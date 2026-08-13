export const elementUseExampleSources = Object.freeze([
  "examples/mahjong/index.html",
  "packages/element-use/package.json",
  "packages/element-use/README.md",
  "packages/element-use/src/policy.js",
  "packages/element-use/src/host.js",
  "packages/element-use/src/guest.js",
  "packages/element-use/src/runtime.js",
  "packages/element-use/src/controller.js",
  "packages/element-use/src/runner.js",
  "packages/element-use/src/protocol.js",
  "packages/element-use/src/browser-assets.js",
  "packages/element-use/runner.html",
  "packages/element-use/example/index.html",
  "packages/element-use/example/style.css",
  "packages/element-use/example/client.js",
  "packages/element-use/example/handler.js",
  "packages/element-use/example/manifest.js",
  "packages/element-use/test/element-use.test.js",
]);

const tileRoot =
  "https://cdn.jsdelivr.net/gh/xhokir/riichi-mahjong-tiles@master/";

export const mahjongTileUrls = Object.freeze([
  `${tileRoot}ExampleRegular.png`,
  ...[1, 2, 3, 4].map((number) => `${tileRoot}Regular/Flower${number}.svg`),
  ...[1, 2, 3, 4].map((number) => `${tileRoot}Regular/Season${number}.svg`),
]);
