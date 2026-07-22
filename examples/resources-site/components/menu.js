import { defineMenu, renderMobileMenu, renderPrimaryMenu } from "@macchiato-dev/menu-use";

export const RESOURCES_MENU = defineMenu({
  name: "resources-primary",
  items: [
    { path: "/", label: "Home", key: "home" },
    { path: "/browse", label: "Browse", key: "browse" },
    { path: "/collections", label: "Projects", key: "collections" },
    { path: "/about", label: "About", key: "about" },
  ],
});

export function renderResourcesPrimaryMenu(activeKey) {
  return renderPrimaryMenu(RESOURCES_MENU, { activeKey });
}

export function renderResourcesMobileMenu(activeKey) {
  return renderMobileMenu(RESOURCES_MENU, { activeKey, controlHtml: renderResourcesThemeToggle() });
}

export function renderResourcesThemeToggle() {
  const sun = `<svg class="tb-ghost tb-ghost-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"></line><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"></line><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"></line></svg>`;
  const moon = `<svg class="tb-ghost tb-ghost-moon" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  return `<button class="toggle-btn theme-toggle" role="switch" aria-checked="true" aria-label="Switch to light mode">${sun}${moon}<span class="tb-thumb">${sun.replace("tb-ghost tb-ghost-sun", "tb-sun")}${moon.replace("tb-ghost tb-ghost-moon", "tb-moon")}</span></button>`;
}
