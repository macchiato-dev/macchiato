export const elementUseExampleSources = Object.freeze([
  "examples/mahjong/index.html",
  "packages/element-use/package.json",
  "packages/element-use/README.md",
  "packages/element-use/host.js",
  "packages/element-use/guest.js",
  "packages/element-use/example/index.html",
  "packages/element-use/example/style.css",
  "packages/element-use/example/client.js",
  "packages/element-use/example/frame.html",
  "packages/element-use/example/frame.js",
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
