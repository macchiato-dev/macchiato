import { performance } from "node:perf_hooks";

import { DomUse } from "../lib/index.js";
import { StyleUse } from "../../style-use/src/index.js";

function measure(name, iterations, operation) {
  for (let index = 0; index < Math.min(iterations, 2_000); index++) operation(index);
  const started = performance.now();
  for (let index = 0; index < iterations; index++) operation(index);
  const milliseconds = performance.now() - started;
  console.log(`${name}: ${milliseconds.toFixed(2)} ms; ${Math.round(iterations / milliseconds * 1_000).toLocaleString()} ops/s`);
}

const styleUse = new StyleUse({
  properties: { color: true, background: true },
  urls: { background: { pattern: /^https:\/\/assets\.example\// } },
});
const domUse = new DomUse({
  gas: { enabled: false },
  nodes: { div: { attrs: ["title"], children: [] } },
}, styleUse);
const element = domUse.createDocument().createElement("div");

measure("StyleUse construction", 50_000, () => new StyleUse({ properties: { color: true } }));
measure("ordinary CSS declaration", 100_000, () => styleUse.validateInline("color", "red"));
measure("URL CSS declaration", 50_000, () => styleUse.validateInline("background", "url(https://assets.example/a.png)"));
measure("DOM attribute mutation", 100_000, (index) => element.setAttribute("title", `value-${index % 10}`));
measure("small DOM sanitization", 10_000, () => domUse.sanitizeHTML('<div title="safe"></div>'));
