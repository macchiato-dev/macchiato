import { composeUserMenuDomSchema, createExclusiveUserMenuSandboxSource, defineUserMenu, renderUserMenu } from "@macchiato-dev/user-menu-use";
import { defineCommandPalette, renderCommandPalette } from "@macchiato-dev/command-palette-use";

const svg = (body, attributes = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"') => `<svg viewBox="0 0 24 24" ${attributes}>${body}</svg>`;
const avatar = `<span class="ub-avatar">MD</span>`;
export const resourcesBlankAvatarHtml = `<span class="ub-avatar ub-avatar--blank" aria-hidden="true">${svg('<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>')}</span>`;
export const resourcesBellIconHtml = `${svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>')}<span class="ub-dot"></span>`;
export const resourcesCreateIconHtml = svg('<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>', 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"');
export const resourcesAppearanceHtml = `<div class="menu__head">Appearance</div><div class="seg" role="group" aria-label="Appearance"><button class="seg__btn" type="button" data-theme-choice="system" aria-pressed="true"><span>System</span></button><button class="seg__btn" type="button" data-theme-choice="dark" aria-pressed="false"><span>Dark</span></button><button class="seg__btn" type="button" data-theme-choice="light" aria-pressed="false"><span>Light</span></button></div>`;
const guestHtml = `<div class="ub-guest">
  <details class="edge-user-menu edge-guest-menu"><summary class="edge-user-menu__trigger ub-acct" aria-label="Account menu">${resourcesBlankAvatarHtml}${svg('<path d="m6 9 6 6 6-6"></path>', 'class="ub-caret" fill="none" stroke="currentColor" stroke-width="2"')}</summary>
    <div class="popover edge-user-menu__panel"><a class="item" href="/settings">Settings</a><a class="item" href="/help">Help &amp; docs</a><div class="menu__sep"></div>${resourcesAppearanceHtml}<div class="menu__sep"></div><a class="item" href="/login">Log in</a><a class="item" href="/signup">Sign up</a></div>
  </details></div>`;

export const RESOURCES_COMMAND_PALETTE = defineCommandPalette({
  commands: [
    { id: "browse", label: "Browse resources", href: "/browse" },
    { id: "projects", label: "Your projects", href: "/projects" },
    { id: "settings", label: "Settings", href: "/settings" },
    { id: "docs", label: "Documentation", href: "/docs" },
    { id: "help", label: "Help", href: "/help" },
  ],
});

export function renderResourcesCommandPalette() {
  return renderCommandPalette(RESOURCES_COMMAND_PALETTE);
}

export const RESOURCES_IDENTITY = Object.freeze({ name: "macchiato-dev", initials: "MD" });

const dom = {
  definitions: {
    userbar: {
      element: "section.box.userbar",
      attrs: ["class", "data-screen-label"],
      children: ["$userbar-pop", "div"],
      place: true,
    },
    "edge-status": {
      element: "aside.box.userbar.edge-status",
      attrs: ["class", "data-screen-label"],
      children: ["div"],
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
      triggerHtml: resourcesBellIconHtml,
      panelHtml: `<div class="menu__head">Notifications</div><div class="menu__empty">You're all caught up.</div>`,
    },
    {
      label: "Create new",
      triggerHtml: resourcesCreateIconHtml,
      panelHtml: `
        <button class="item">${svg('<path d="M4 4h16v16H4z"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>')}New project</button>
        <button class="item">${svg('<path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-4"></path>')}New organization</button>
        <div class="menu__sep"></div>
        <button class="item">${svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path><line x1="12" y1="15" x2="12" y2="3"></line>')}Import resource</button>`,
    },
    {
      label: "Account menu",
      containerClass: "ub-pop ub-pop--member",
      triggerClass: "ub-acct",
      triggerHtml: `${avatar}${svg('<path d="m6 9 6 6 6-6"></path>', 'class="ub-caret" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')}`,
      panelHtml: `
        <div class="menu__acct">${avatar}<div class="menu__acct-meta"><span class="menu__acct-name">${RESOURCES_IDENTITY.name}</span><span>Signed in</span></div></div>
        <div class="menu__sep"></div>
        <button class="item">${svg('<path d="m12 2 10 5-10 5L2 7z"></path><path d="m2 17 10 5 10-5"></path><path d="m2 12 10 5 10-5"></path>')}Your projects</button>
        <button class="item">${svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>')}Your profile</button>
        <div class="menu__sep"></div>
        <button class="item">${svg('<circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"></path>')}Settings</button>
        <button class="item">${svg('<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>')}Help &amp; docs</button>
        <div class="menu__sep"></div>
        ${resourcesAppearanceHtml}
        <div class="menu__sep"></div>
        <button class="item item--danger auth-signout">Sign out</button>`,
    },
  ],
  guestHtml,
  dom,
  behavior: {
    hover: { enabled: true, safePolygon: true, requireIntent: true, buffer: 2, timeoutMs: 450 },
  },
});

export function composeResourcesUserMenuDomSchema(schema) {
  return composeUserMenuDomSchema(schema, RESOURCES_USER_MENU);
}

export const resourcesUserMenuSandboxSource = createExclusiveUserMenuSandboxSource({
  model: RESOURCES_USER_MENU,
  eventFunction: "__resourcesUserbarEvent",
  bindingsFunction: "__resourcesUserbarBindings",
});

export function renderResourcesUserMenu({ cardless = false } = {}) {
  return renderUserMenu(RESOURCES_USER_MENU).replace(
    '<section class="box userbar" data-screen-label="userbar">',
    `<section class="box userbar${cardless ? " toolbar--cardless" : ""}" data-screen-label="userbar">${renderResourcesCommandPalette()}`,
  );
}

export function renderResourcesEdgeStatus({ cardless = false } = {}) {
  return `<aside class="box userbar edge-status${cardless ? " toolbar--cardless" : ""}" data-screen-label="runtime-status">
    <div class="ub-guest"></div>
  </aside>`;
}
