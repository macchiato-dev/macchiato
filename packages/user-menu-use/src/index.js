const SAFE_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const SAFE_CLASSES = /^[a-z][a-z0-9-]*(?: [a-z][a-z0-9-]*)*$/;

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function defineUserMenu({ identity, menus, dom }) {
  if (!identity?.name || !identity?.initials) throw new Error("User menu identity requires a name and initials");
  if (!Array.isArray(menus) || menus.length === 0) throw new Error("User menu requires at least one popover");
  if (!dom?.definitions || !Array.isArray(dom.placements) || dom.placements.length === 0) throw new Error("User menu requires declarative DOM definitions and placements");
  const normalized = menus.map((menu) => {
    if (!menu?.label || !menu?.triggerHtml || !menu?.panelHtml) throw new Error("Each user menu requires a label, trigger, and panel");
    const triggerClass = String(menu.triggerClass || "ub-icon");
    if (!SAFE_CLASSES.test(triggerClass)) throw new Error("User menu trigger classes must be safe class names");
    return Object.freeze({ label: String(menu.label), triggerClass, triggerHtml: String(menu.triggerHtml), panelHtml: String(menu.panelHtml) });
  });
  const definitions = Object.freeze(Object.fromEntries(Object.entries(dom.definitions).map(([name, definition]) => [name, Object.freeze(structuredClone(definition))])));
  const placements = Object.freeze(dom.placements.map((placement) => {
    if (!/^(definitions|nodes)\.[a-z][a-z0-9-]*$/.test(placement)) throw new Error("User menu DOM placements must target a named definition or node");
    return placement;
  }));
  return Object.freeze({
    identity: Object.freeze({ name: String(identity.name), initials: String(identity.initials) }),
    menus: Object.freeze(normalized),
    dom: Object.freeze({ definitions, placements }),
  });
}

export function composeUserMenuDomSchema(schema, model) {
  const composed = structuredClone(schema);
  composed.definitions ||= {};
  for (const [name, definition] of Object.entries(model.dom.definitions)) {
    if (composed.definitions[name]) throw new Error(`DOM definition already exists: ${name}`);
    composed.definitions[name] = structuredClone(definition);
  }
  const references = Object.keys(model.dom.definitions).filter((name) => model.dom.definitions[name].place).map((name) => `$${name}`);
  for (const placement of model.dom.placements) {
    const [collection, name] = placement.split(".");
    const target = composed[collection]?.[name];
    const oneOf = target?.children?.[0]?.oneOf;
    if (!Array.isArray(oneOf)) throw new Error(`DOM placement does not expose a oneOf child list: ${placement}`);
    for (const reference of references) if (!oneOf.includes(reference)) oneOf.push(reference);
  }
  for (const definition of Object.values(composed.definitions)) delete definition.place;
  return composed;
}

export function renderUserMenu(model) {
  const popovers = model.menus.map((menu) => `<div class="ub-pop">
      <button class="${menu.triggerClass}" aria-label="${escapeHtml(menu.label)}" aria-haspopup="true" aria-expanded="false">${menu.triggerHtml}</button>
      <div class="popover user-menu" role="menu">${menu.panelHtml}</div>
    </div>`).join("\n    ");
  return `<section class="box userbar" data-screen-label="userbar">${popovers}</section>`;
}

export function createExclusiveUserMenuSandboxSource({ menuCount, eventFunction = "__userMenuEvent", bindingsFunction = "__userMenuBindings" }) {
  if (!Number.isInteger(menuCount) || menuCount < 1 || menuCount > 20) throw new Error("User menu count must be between 1 and 20");
  if (!SAFE_NAME.test(eventFunction) || !SAFE_NAME.test(bindingsFunction)) throw new Error("Sandbox function names must be safe identifiers");
  return `const state = { openIndex: null, hoverPaused: false };
const menuCount = ${menuCount};
function snapshot(blurIndex = null) {
  return { pinned: state.openIndex !== null, hoverPaused: state.hoverPaused, open: Array.from({ length: menuCount }, (_, index) => index === state.openIndex), expanded: Array.from({ length: menuCount }, (_, index) => index === state.openIndex), blurIndex };
}
function close({ pauseHover = false, blurIndex = null } = {}) { state.openIndex = null; state.hoverPaused = Boolean(pauseHover); return snapshot(blurIndex); }
globalThis.${eventFunction} = (json) => {
  const event = JSON.parse(json);
  if (event.type === "click") {
    if (event.target?.kind === "userbar-button") {
      const index = Number(event.target.index);
      if (!Number.isInteger(index) || index < 0 || index >= menuCount) return JSON.stringify({ state: snapshot(), preventDefault: false });
      if (state.openIndex === index) return JSON.stringify({ state: close({ pauseHover: true, blurIndex: index }), preventDefault: true });
      state.openIndex = index; state.hoverPaused = false; return JSON.stringify({ state: snapshot(), preventDefault: true });
    }
    if (!event.target?.insideUserbar) return JSON.stringify({ state: close(), preventDefault: false });
    return JSON.stringify({ state: snapshot(), preventDefault: false });
  }
  if (event.type === "toggle") {
    const index = Number(event.index);
    if (!Number.isInteger(index) || index < 0 || index >= menuCount) return JSON.stringify(snapshot());
    if (state.openIndex === index) return JSON.stringify(close({ pauseHover: true, blurIndex: index }));
    state.openIndex = index; state.hoverPaused = false; return JSON.stringify(snapshot());
  }
  if (event.type === "close") return JSON.stringify(close());
  if (event.type === "exit" || event.type === "pointerleave") { state.hoverPaused = false; return JSON.stringify(snapshot()); }
  return JSON.stringify(snapshot());
};
globalThis.${bindingsFunction} = () => JSON.stringify([{ target: "document", type: "click" }, { target: ".userbar", type: "pointerleave" }]);`;
}
