import { DomUse, sanitizeDomHtml } from "../source/index.ts";

const domUse = new DomUse({
  nodes: {
    p: { attrs: ["title"], children: ["#text"] },
  },
  maxDepth: 4,
  maxNodes: 8,
  maxTextLength: 80,
});

const html = sanitizeDomHtml(domUse, '<p title="QuickJS">Deno host smoke test</p>');

if (html !== '<p title="QuickJS">Deno host smoke test</p>') {
  throw new Error(`Unexpected sanitized HTML: ${html}`);
}

console.log("dom-use Deno QuickJS smoke test passed");
