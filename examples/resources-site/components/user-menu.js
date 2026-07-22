import { composeUserMenuDomSchema, createExclusiveUserMenuSandboxSource, defineUserMenu, renderUserMenu } from "@macchiato-dev/user-menu-use";

const svg = (body, attributes = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"') => `<svg viewBox="0 0 24 24" ${attributes}>${body}</svg>`;
const avatar = `<span class="ub-avatar">MD</span>`;

export const RESOURCES_IDENTITY = Object.freeze({ name: "macchiato-dev", initials: "MD" });

const dom = {
  definitions: {
    userbar: {
      element: "section.box.userbar",
      attrs: ["class", "data-screen-label"],
      children: ["$userbar-pop"],
      place: true,
    },
    "edge-status": {
      element: "aside.box.userbar.edge-status",
      attrs: ["class", "data-screen-label"],
      children: ["span"],
      place: true,
    },
    "userbar-pop": {
      element: "div.ub-pop",
      attrs: ["class"],
      children: ["button", "$popover-menu"],
    },
    "popover-menu": {
      element: "div.popover.user-menu",
      attrs: ["class", "role"],
      children: ["button", "div"],
    },
  },
  placements: ["definitions.layout", "nodes.main"],
};

export const RESOURCES_USER_MENU = defineUserMenu({
  identity: RESOURCES_IDENTITY,
  menus: [
    {
      label: "Notifications",
      triggerHtml: `${svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>')}<span class="ub-dot"></span>`,
      panelHtml: `<div class="menu__head">Notifications</div><div class="menu__empty">You're all caught up.</div>`,
    },
    {
      label: "Create new",
      triggerHtml: svg('<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>', 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"'),
      panelHtml: `
        <button class="item">${svg('<path d="M4 4h16v16H4z"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>')}New project</button>
        <button class="item">${svg('<path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-4"></path>')}New organization</button>
        <div class="menu__sep"></div>
        <button class="item">${svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path><line x1="12" y1="15" x2="12" y2="3"></line>')}Import resource</button>`,
    },
    {
      label: "Account menu",
      triggerClass: "ub-acct",
      triggerHtml: `${avatar}${svg('<path d="m6 9 6 6 6-6"></path>', 'class="ub-caret" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')}`,
      panelHtml: `
        <div class="menu__acct">${avatar}<div class="menu__acct-meta"><span class="menu__acct-name">${RESOURCES_IDENTITY.name}</span><span>Signed in</span></div></div>
        <div class="menu__sep"></div>
        <button class="item">${svg('<path d="m12 2 10 5-10 5L2 7z"></path><path d="m2 17 10 5 10-5"></path><path d="m2 12 10 5 10-5"></path>')}Your projects</button>
        <button class="item">${svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>')}Your profile</button>
        <div class="menu__sep"></div>
        <button class="item">${svg('<circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"></path>')}Settings</button>
        <button class="item">${svg('<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>')}Help &amp; docs</button>`,
    },
  ],
  dom,
});

export function composeResourcesUserMenuDomSchema(schema) {
  return composeUserMenuDomSchema(schema, RESOURCES_USER_MENU);
}

export const resourcesUserMenuSandboxSource = createExclusiveUserMenuSandboxSource({
  menuCount: RESOURCES_USER_MENU.menus.length,
  eventFunction: "__resourcesUserbarEvent",
  bindingsFunction: "__resourcesUserbarBindings",
});

export function renderResourcesUserMenu() {
  return renderUserMenu(RESOURCES_USER_MENU);
}

export function renderResourcesEdgeStatus() {
  return `<aside class="box userbar edge-status" data-screen-label="runtime-status">
    <span class="edge-status__dot"></span>
    <span class="edge-status__label">Edge safe</span>
    <span class="ub-avatar">${RESOURCES_IDENTITY.initials}</span>
  </aside>`;
}
