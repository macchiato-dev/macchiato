import assert from "node:assert/strict";
import test from "node:test";
import { defineMenu, renderMobileMenu, renderPrimaryMenu } from "../src/index.js";

test("menu-use renders one immutable model for document and mobile menus", () => {
  const menu = defineMenu({ name: "main", items: [{ key: "home", path: "/", label: "Home" }, { key: "docs", path: "/docs", label: "Docs" }] });
  assert.match(renderPrimaryMenu(menu, { activeKey: "docs" }), /href="\/docs"[^>]*aria-current="page"/);
  assert.match(renderMobileMenu(menu, { controlHtml: "<button>Theme</button>" }), /menu-button[\s\S]*<button>Theme<\/button>[\s\S]*menu-nav/);
  assert.throws(() => defineMenu({ name: "bad", items: [{ key: "same", path: "/", label: "One" }, { key: "same", path: "/two", label: "Two" }] }), /unique/);
});
