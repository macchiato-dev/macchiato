import assert from "node:assert/strict";
import test from "node:test";
import { parseConstrainedCss } from "../src/constrained-css.js";
import { validateConstrainedCssRules } from "../src/constrained-css-policy.js";
import { encodeConstrainedCss } from "../src/constrained-css-wire.js";

test("encodes bounded responsive and preference media rules", () => {
  const source = `
    .shape { border-radius: 48% 52% 43% 57% / 54% 43% 57% 46%; }
    @media (max-width: 700px) and (min-aspect-ratio: 5 / 4) {
      .shape { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .shape { transition: none; }
    }
  `;
  const rules = validateConstrainedCssRules(parseConstrainedCss(source));
  assert.equal(rules[1].media, "(max-width: 700px) and (min-aspect-ratio: 5 / 4)");
  assert.ok(encodeConstrainedCss(source).byteLength > 0);
});

test("rejects media queries outside the bounded feature set", () => {
  assert.throws(() => validateConstrainedCssRules(parseConstrainedCss(`
    @media (scripting: enabled) { body { display: none; } }
  `)), /media condition is not allowed/);
});
