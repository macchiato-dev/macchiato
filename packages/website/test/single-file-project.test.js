import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { StyleUse } from "@macchiato-dev/style-use";
import { singleFileSnapshot } from "../seed-single-file-project.js";

test("keeps a single-file project intact and separates runtime from display", () => {
  const source = `<!doctype html><body><style>body{color:red}.card{--tone:#fff}</style><button>Go</button><script>document.querySelector("button")</script></body>`;
  const snapshot = singleFileSnapshot(source);

  assert.deepEqual(snapshot.files, [{ path: "index.html", content: source }]);
  assert.equal(snapshot.config.container, "single-file-web-app");
  assert.equal(snapshot.config.containers.runtime.name, "single-file-html-runtime");
  assert.equal(snapshot.config.containers.runtime.scripts, "quickjs");
  assert.equal(snapshot.config.containers.display.name, "single-file-web-surface");
  assert.equal(snapshot.config.containers.display.dom, "dom-use");
  assert.equal(snapshot.config.containers.display.css, "style-use");
  assert.equal(snapshot.config.cssSchema.properties["--tone"], true);
  assert.equal(snapshot.config.capabilities.scroll, "vertical");
  assert.equal("externalResources" in snapshot.config, false);
  assert.equal("img" in snapshot.config.domSchema.nodes, false);
  const styles = new StyleUse(snapshot.config.cssSchema);
  assert.throws(() => styles.validateInline("background-image", "url(https://cdn.example/cat.svg)"), /not allowed/);
});

test("records exact constrained CDN fetch grants for the QuickJS runtime", () => {
  const url = "https://cdn.jsdelivr.net/npm/example@1.0.0/data.json";
  const snapshot = singleFileSnapshot("<!doctype html><p>Network fixture</p>", { fetchResources: [url] });
  assert.deepEqual(snapshot.config.capabilities.fetch.resources, [url]);
  assert.equal(snapshot.config.capabilities.fetch.limits.maxFiles, 10);
  assert.equal(snapshot.config.capabilities.fetch.limits.maxUrlLength, 100);
  assert.equal(snapshot.config.domSchema.limits.maxAttributeValueLength, 16_384);
  assert.equal(snapshot.config.domSchema.limits.maxAttributeValueLengths["img.src"], 1_500_000);
  assert.match(snapshot.config.domSchema.urls["img.src"], /macchiato-resource/);
  assert.equal(snapshot.config.sandbox.network, false);
});

test("Mahjong renders fetched artwork through image elements, not CSS", () => {
  const example = new URL("../../../examples/mahjong/", import.meta.url);
  const source = readFileSync(new URL("index.html", example), "utf8");
  assert.match(source, /document\.createElement\(["']img["']\)/);
  assert.match(source, /response\.resourceUrl\(\)/);
  assert.doesNotMatch(source, /https:\/\/cdn\.jsdelivr\.net/);
  assert.equal(existsSync(new URL("tiles/ExampleRegular.png", example)), true);
  for (const kind of ["Flower", "Season"]) for (let number = 1; number <= 4; number += 1)
    assert.equal(existsSync(new URL(`tiles/Regular/${kind}${number}.svg`, example)), true);
  assert.doesNotMatch(source, /--tiles|background-image:\s*var\(/);
  assert.doesNotMatch(source, /id="hint"|id="shuffle"|highlighted free tile/i);
  assert.doesNotMatch(source, /A free tile has|nothing covers it|Select a free tile|matching free tile/i);
  assert.doesNotMatch(source, /Clear the familiar turtle/);
  assert.match(source, /container-type:\s*inline-size/);
  assert.match(source, /width:\s*min\(760px,\s*100%\)/);
  assert.match(source, /aspect-ratio:\s*760\/590/);
  assert.doesNotMatch(source, /\.tile\.selected\s*\{[^}]*outline/);
  assert.doesNotMatch(source, /\.tile:hover/);
  assert.match(source, /\.tile\.removing\s*\{[^}]*opacity:\s*0/);
  assert.match(source, /\.tile\.deselecting\s*\{[^}]*filter:\s*none/);
  assert.match(source, /state\.mismatch\.add\(firstIndex\)[\s\S]*state\.mismatch\.add\(index\)/);
  assert.doesNotMatch(source, /Those tiles do not match/);
  assert.doesNotMatch(source, /No moves remain|Board cleared|id="message"/);
  assert.doesNotMatch(source, /id="stats"|tiles ·|moves/);
  assert.match(source, /image\.style\.inset\s*=\s*["']0["']/);
  assert.match(source, /image\.style\.left\s*=\s*["']0["']/);
  assert.match(source, /image\.style\.inset\s*=\s*["']auto["']/);
  assert.match(source, /const rows\s*=\s*\[\[12,\s*1\],[\s\S]*\[12,\s*1\]\]/);
  assert.match(source, /layer\(1,\s*6,\s*6,\s*4,\s*1\)[\s\S]*layer\(3,\s*2,\s*2,\s*6,\s*3\)/);
  assert.match(source, /out\.push\(\{\s*x:\s*6\.5,\s*y:\s*3\.5,\s*z:\s*4\s*\}\)/);
  assert.match(source, /return shuffle\(pairs\)/);
  assert.match(source, /const SOLUTION\s*=\s*\[\s*\[/);
  assert.doesNotMatch(source, /row\.shift\(\).*row\.pop\(/);
});
