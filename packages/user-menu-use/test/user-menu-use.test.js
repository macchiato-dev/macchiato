import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createExclusiveUserMenuSandboxSource, defineUserMenu, renderUserMenu } from "../src/index.js";

test("user-menu-use renders configured popovers", () => {
  const model = defineUserMenu({ identity: { name: "Ada", initials: "AL" }, menus: [{ label: "Account", triggerHtml: "AL", panelHtml: "Signed in" }] });
  assert.match(renderUserMenu(model), /aria-label="Account"[\s\S]*Signed in/);
  assert.throws(() => defineUserMenu({ identity: { name: "Ada", initials: "AL" }, menus: [{ label: "Bad", triggerClass: "x\" onclick=", triggerHtml: "X", panelHtml: "Y" }] }), /safe class/);
});

test("exclusive user menu state opens, switches, and closes popovers", () => {
  const context = vm.createContext({ JSON });
  vm.runInContext(createExclusiveUserMenuSandboxSource({ menuCount: 3 }), context);
  const send = (event) => JSON.parse(context.__userMenuEvent(JSON.stringify(event)));
  assert.deepEqual(Array.from(send({ type: "toggle", index: 0 }).open), [true, false, false]);
  assert.deepEqual(Array.from(send({ type: "toggle", index: 2 }).open), [false, false, true]);
  const closed = send({ type: "toggle", index: 2 });
  assert.deepEqual(Array.from(closed.open), [false, false, false]);
  assert.equal(closed.hoverPaused, true);
});
