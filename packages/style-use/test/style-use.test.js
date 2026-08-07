import assert from "node:assert/strict";
import test from "node:test";

import { StyleUse, StyleUseState, normalizeCssProperty, validateInlineStyle } from "../src/index.js";

test("keeps compiled policy in stable state and exposes function operations", () => {
  const styleUse = new StyleUse({ properties: { color: true }, limits: { maxValueLength: 20 } });
  assert.ok(styleUse.state instanceof StyleUseState);
  assert.equal(styleUse.effectiveProperties(), styleUse.effectiveProperties());
  assert.equal(styleUse.limits(), styleUse.limits());
  assert.equal(normalizeCssProperty("backgroundColor"), "background-color");
  assert.equal(validateInlineStyle(styleUse, "color", "red"), true);
});

test("allows configured inline styles and stylesheets", () => {
  const styleUse = new StyleUse({
    properties: {
      color: /^(#[0-9a-fA-F]{6}|[a-zA-Z]+)$/,
      margin: /^(\d+px|0)$/,
    },
    selectors: /^[a-zA-Z0-9_.#\-\s]+$/,
    urls: false,
  });

  assert.equal(styleUse.validateInline("color", "#123abc"), true);
  assert.equal(styleUse.validateStylesheet("main .notice { color: navy; margin: 0; }"), true);
});

test("combines named style definitions", () => {
  const styleUse = new StyleUse({
    definitions: {
      layout: {
        element: "main.layout",
        properties: {
          display: /^(grid|flex)$/,
          gap: /^(\d+px|var\(--gap\))$/,
        },
      },
      type: {
        element: "p.copy",
        properties: {
          color: /^var\(--text\)$/,
          "font-weight": /^(400|600)$/,
        },
      },
    },
    useStyles: ["layout", "type"],
    properties: {
      margin: /^0$/,
    },
  });

  assert.equal(styleUse.validateStylesheet(".layout { display: grid; gap: var(--gap); }"), true);
  assert.equal(styleUse.validateInline("color", "var(--text)"), true);
  assert.equal(styleUse.validateInline("margin", "0"), true);
  assert.throws(() => styleUse.validateInline("position", "fixed"), /CSS property not allowed: position/);
});

test("combines named style definitions from hyphenated use-styles", () => {
  const styleUse = new StyleUse({
    definitions: {
      block: {
        element: "section.block",
        properties: {
          padding: /^1rem$/,
        },
      },
    },
    "use-styles": ["block"],
  });

  assert.equal(styleUse.validateInline("padding", "1rem"), true);
});

test("supports named object value rules", () => {
  const styleUse = new StyleUse({
    values: {
      brandColor: { enum: ["#1233f0", "var(--accent)"] },
      smallLength: { pattern: "^(0|[1-9][0-9]?px)$" },
    },
    properties: {
      color: { $ref: "brandColor" },
      margin: { anyOf: [{ enum: ["auto"] }, { $ref: "smallLength" }] },
      padding: { allOf: [{ $ref: "smallLength" }, { not: { enum: ["99px"] } }] },
    },
  });

  assert.equal(styleUse.validateInline("color", "#1233f0"), true);
  assert.equal(styleUse.validateInline("margin", "24px"), true);
  assert.equal(styleUse.validateInline("margin", "auto"), true);
  assert.throws(() => styleUse.validateInline("color", "rebeccapurple"), /CSS value not allowed/);
  assert.throws(() => styleUse.validateInline("padding", "99px"), /CSS value not allowed/);
});

test("rejects ambiguous style definition selectors", () => {
  assert.throws(
    () => new StyleUse({
      definitions: {
        first: { element: "section.block", properties: { color: true } },
        second: { element: "section.block", properties: { margin: true } },
      },
      useStyles: ["first", "second"],
    }),
    /Ambiguous CSS style definitions/,
  );
});

test("rejects unconfigured properties and dangerous CSS values", () => {
  const styleUse = new StyleUse({
    properties: {
      color: /^[a-z]+$/,
    },
  });

  assert.throws(() => styleUse.validateInline("position", "fixed"), /CSS property not allowed: position/);
  assert.throws(() => styleUse.validateInline("color", "expression(alert(1))"), /Disallowed CSS value/);
  assert.throws(() => styleUse.validateStylesheet("p { behavior: url(evil.htc); }"), /Disallowed CSS value/);
});

test("denies CSS URL sinks and imports by default", () => {
  const styleUse = new StyleUse({
    properties: {
      background: true,
    },
  });

  assert.throws(
    () => styleUse.validateInline("background", "url(https://example.test/pixel.png)"),
    /CSS URLs are not allowed for background/,
  );
  assert.throws(
    () => styleUse.validateStylesheet('@import "https://example.test/base.css";'),
    /CSS imports are not allowed/,
  );
  assert.throws(
    () => styleUse.validateInline("background", 'image-set("https://example.test/a.png" 1x, https://example.test/b.png 2x)'),
    /CSS URLs are not allowed for background/,
  );
});

test("allows CSS URL sinks only when explicitly matched", () => {
  const styleUse = new StyleUse({
    properties: {
      background: true,
    },
    imports: true,
    urls: {
      background: /^https:\/\/assets\.example\//,
      import: /^https:\/\/assets\.example\//,
    },
  });

  assert.equal(
    styleUse.validateStylesheet('@import "https://assets.example/base.css"; body { background: url("https://assets.example/bg.png"); }'),
    true,
  );
  assert.equal(
    styleUse.validateInline("background", 'image-set("https://assets.example/a.png" 1x, https://assets.example/b.png 2x)'),
    true,
  );
  assert.throws(
    () => styleUse.validateInline("background", "url(https://tracker.example/bg.png)"),
    /CSS URL not allowed/,
  );
});

test("enforces configurable CSS size limits", () => {
  const styleUse = new StyleUse({
    properties: {
      color: true,
      background: true,
    },
    urls: {
      background: true,
    },
    limits: {
      maxStylesheetLength: 20,
      maxPropertyLength: 8,
      maxValueLength: 5,
      maxUrlLength: 10,
    },
  });

  assert.throws(() => styleUse.validateStylesheet("p { color: red; } p { color: blue; }"), /Stylesheet exceeds/);
  assert.throws(() => styleUse.validateInline("backgroundColor", "red"), /CSS property exceeds/);
  assert.throws(() => styleUse.validateInline("color", "purple"), /CSS value exceeds/);

  const urlLimited = new StyleUse({
    properties: { background: true },
    urls: { background: true },
    limits: {
      maxUrlLength: 10,
      maxValueLength: 100,
    },
  });
  assert.throws(() => urlLimited.validateInline("background", "url(https://too-long.example/)"), /CSS URL exceeds/);
});

test("enforces configurable import count and content restrictions", () => {
  const styleUse = new StyleUse({
    properties: {
      color: /^[a-z]+$/,
    },
    imports: true,
    urls: {
      import: /^https:\/\/assets\.example\//,
    },
    limits: {
      maxImports: 1,
    },
    content: {
      rejectPattern: "secret",
    },
  });

  assert.throws(
    () => styleUse.validateStylesheet('@import "https://assets.example/a.css"; @import "https://assets.example/b.css";'),
    /Stylesheet exceeds maxImports 1/,
  );
  assert.throws(() => styleUse.validateInline("color", "secret"), /Rejected CSS value/);
  assert.throws(() => styleUse.validateInline("color", "red\u202E"), /Troublesome special character/);
});
