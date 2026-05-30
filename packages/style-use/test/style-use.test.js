import assert from "node:assert/strict";
import test from "node:test";

import { StyleUse } from "../src/index.js";

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
