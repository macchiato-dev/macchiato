import test from "node:test";
import assert from "node:assert/strict";
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
