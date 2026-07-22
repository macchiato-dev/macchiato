const SAFE_KEY = /^[a-z][a-z0-9-]*$/;
const SAFE_PATH = /^\/(?:[a-z0-9-]+\/?)*$/;

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function defineMenu({ name, items }) {
  if (!SAFE_KEY.test(name || "")) throw new Error("Menu name must be a safe key");
  if (!Array.isArray(items) || items.length === 0) throw new Error("Menu requires at least one item");
  const keys = new Set();
  const normalized = items.map((item) => {
    if (!SAFE_KEY.test(item?.key || "") || keys.has(item.key)) throw new Error("Menu item keys must be safe and unique");
    if (!SAFE_PATH.test(item.path || "")) throw new Error("Menu item path must be a root-relative document path");
    if (!String(item.label || "").trim()) throw new Error("Menu item label is required");
    keys.add(item.key);
    return Object.freeze({ key: item.key, path: item.path, label: String(item.label) });
  });
  return Object.freeze({ name, items: Object.freeze(normalized) });
}

export function renderMenuLinks(menu, { activeKey = "" } = {}) {
  return menu.items.map((item) => {
    const current = item.key === activeKey ? ' aria-current="page"' : "";
    return `<a href="${escapeHtml(item.path)}" data-section="${escapeHtml(item.key)}"${current}><span>${escapeHtml(item.label)}</span></a>`;
  }).join("");
}

export function renderPrimaryMenu(menu, { activeKey = "" } = {}) {
  return `<nav class="box nav" data-screen-label="nav" aria-label="Primary">${renderMenuLinks(menu, { activeKey })}</nav>`;
}

export function renderMobileMenu(menu, { activeKey = "", controlHtml = "" } = {}) {
  return `<section class="box menu" data-open="false" data-screen-label="menu">
    <button class="menu-button" type="button" aria-expanded="false" aria-label="Open menu"><span></span><span></span><span></span></button>
    <div class="box menu-panel">
      ${controlHtml}
      <nav class="menu-nav" aria-label="Primary">${renderMenuLinks(menu, { activeKey })}</nav>
    </div>
  </section>`;
}
