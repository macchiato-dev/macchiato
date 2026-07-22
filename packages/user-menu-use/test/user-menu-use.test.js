import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { composeUserMenuDomSchema, createExclusiveUserMenuSandboxSource, createSafeTriangle, defineUserMenu, pointInSafeTriangle, renderUserMenu } from "../src/index.js";

const dom = {
  definitions: { userbar: { element: "section.userbar", attrs: ["class"], children: ["button"], place: true } },
  placements: ["definitions.layout"],
};

test("user-menu-use renders configured popovers", () => {
  const model = defineUserMenu({ identity: { name: "Ada", initials: "AL" }, menus: [{ label: "Account", triggerHtml: "AL", panelHtml: "Signed in" }], dom });
  assert.match(renderUserMenu(model), /aria-label="Account"[\s\S]*Signed in/);
  assert.throws(() => defineUserMenu({ identity: { name: "Ada", initials: "AL" }, menus: [{ label: "Bad", triggerClass: "x\" onclick=", triggerHtml: "X", panelHtml: "Y" }], dom }), /safe class/);
});

test("user-menu-use composes colocated DOM capability definitions", () => {
  const model = defineUserMenu({ identity: { name: "Ada", initials: "AL" }, menus: [{ label: "Account", triggerHtml: "AL", panelHtml: "Signed in" }], dom });
  const schema = composeUserMenuDomSchema({ definitions: { layout: { element: "main.layout", children: [{ oneOf: ["section"] }] } } }, model);
  assert.deepEqual(schema.definitions.layout.children[0].oneOf, ["section", "$userbar"]);
  assert.equal(schema.definitions.userbar.place, undefined);
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

test("hover state switches freely while click state remains pinned", () => {
  const context = vm.createContext({ JSON });
  vm.runInContext(createExclusiveUserMenuSandboxSource({ menuCount: 3 }), context);
  const send = (event) => JSON.parse(context.__userMenuEvent(JSON.stringify(event)));
  assert.deepEqual(Array.from(send({ type: "hover", index: 2 }).open), [false, false, true]);
  assert.deepEqual(Array.from(send({ type: "hover", index: 1 }).open), [false, true, false]);
  assert.deepEqual(Array.from(send({ type: "pointerleave" }).open), [false, false, false]);
  assert.equal(send({ type: "click", target: { kind: "userbar-button", index: 2 } }).state.pinned, true);
  assert.deepEqual(Array.from(send({ type: "hover", index: 1 }).open), [false, false, true]);
});

test("safe triangle accepts diagonal panel travel and rejects horizontal sibling travel", () => {
  const triangle = createSafeTriangle({ x: 360, y: 50 }, { left: 100, right: 380, top: 90 }, { buffer: 2, requireIntent: true });
  assert.equal(pointInSafeTriangle({ x: 260, y: 70 }, triangle), true);
  assert.equal(pointInSafeTriangle({ x: 300, y: 50 }, triangle), false);
  assert.equal(createSafeTriangle({ x: 360, y: 100 }, { left: 100, right: 380, top: 90 }, { requireIntent: true }), null);
});
