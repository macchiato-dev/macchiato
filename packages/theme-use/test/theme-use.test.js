import assert from "node:assert/strict";
import test from "node:test";
import { defineTheme, mergeTheme, renderThemeCss } from "../src/index.js";

const allowedTokens = ["--accent", "--text"];

test("theme-use renders allowlisted customizable tokens", () => {
  const dark = defineTheme({
    name: "dark",
    selector: 'html[data-theme="dark"]',
    tokens: { "--accent": "#30d5c8", "--text": "#eef2ff" },
  }, { allowedTokens });
  const customized = mergeTheme(dark, { "--accent": "#ffb86b" }, { allowedTokens });
  assert.match(renderThemeCss([customized]), /--accent: #ffb86b/);
  assert.equal(customized.tokens["--text"], "#eef2ff");
});

test("theme-use rejects undeclared tokens, selectors, and active values", () => {
  assert.throws(() => defineTheme({ name: "bad", selector: "body .child", tokens: {} }), /Invalid theme selector/);
  assert.throws(() => defineTheme({ name: "bad", selector: ":root", tokens: { "--other": "red" } }, { allowedTokens }), /not allowed/);
  assert.throws(() => defineTheme({ name: "bad", selector: ":root", tokens: { "--accent": "url(https://example.test/x)" } }, { allowedTokens }), /may not load/);
});
