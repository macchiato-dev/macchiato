import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { putSiteRoute } from "@macchiato-dev/site";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUBDOMAIN = "resources-co";

const NAV = [
  { path: "/", label: "Home", key: "home" },
  { path: "/browse", label: "Browse", key: "browse" },
  { path: "/collections", label: "Collections", key: "collections" },
  { path: "/about", label: "About", key: "about" },
];

const COLLECTIONS = {
  "/resources/containers": {
    name: "Containers",
    namespace: "resources",
    slug: "containers",
    tagline: "Self-hostable runtimes for everything you ship.",
    intro: "Lightweight, self-hosted runtimes that boot fast and stay out of your way. Run them on the infrastructure you already have.",
    items: [
      ["Edge runtime", "A minimal container that boots in milliseconds."],
      ["Job container", "Run background work without standing infrastructure."],
      ["Static host", "Serve assets from your own edge in one command."],
    ],
  },
  "/macchiato/components": {
    name: "Components",
    namespace: "macchiato",
    slug: "components",
    tagline: "Composable UI and service building blocks.",
    intro: "Drop-in building blocks for the surface of your app, each one self-contained, themeable, and ready to compose.",
    items: [
      ["Data table", "Sorting, paging, and selection out of the box."],
      ["Command menu", "A keyboard-first launcher you can drop in."],
      ["Form kit", "Validation and state handled for you."],
    ],
  },
  "/resources/usage-providers": {
    name: "Usage providers",
    namespace: "resources",
    slug: "usage-providers",
    tagline: "DOM, Style, and Navigator state shared cleanly.",
    intro: "Providers that expose live browser state to the rest of your app without prop-drilling or duplicated listeners.",
    items: [
      ["DOM use", "Subscribe to layout, focus, and visibility state."],
      ["Style use", "Read and react to computed style and theme."],
      ["Navigator use", "Connection, locale, and device capabilities."],
    ],
  },
  "/halcyon/design-tokens": {
    name: "Design tokens",
    namespace: "halcyon",
    slug: "design-tokens",
    tagline: "A living spec for color, type, and spacing.",
    intro: "One source of truth for your visual language, versioned alongside your code and exported to wherever it needs to go.",
    items: [
      ["Token spec", "Color, type, and spacing as a single source of truth."],
      ["Theme builder", "Compose and preview token sets in the browser."],
      ["Export targets", "Ship tokens to CSS, JSON, and native."],
    ],
  },
  "/northwind/adapters": {
    name: "Adapters",
    namespace: "northwind",
    slug: "adapters",
    tagline: "Uniform interfaces to external services and data.",
    intro: "Thin, swappable interfaces that let you change providers without rewriting the code that depends on them.",
    items: [
      ["Storage adapter", "One API across S3, GCS, and local disk."],
      ["Queue adapter", "Swap brokers without touching your code."],
      ["Auth adapter", "Plug in any identity provider."],
    ],
  },
};

const ORGS = {
  "/resources": {
    name: "resources",
    blurb: "The team behind Resources.co, self-hostable primitives for the web.",
  },
  "/macchiato": {
    name: "macchiato",
    blurb: "A small studio publishing composable UI building blocks.",
  },
  "/halcyon": {
    name: "halcyon",
    blurb: "Design-systems tooling, versioned alongside your code.",
  },
  "/northwind": {
    name: "northwind",
    blurb: "Infrastructure adapters that keep your code provider-agnostic.",
  },
};

const COLLECTION_ORDER = [
  "/resources/containers",
  "/macchiato/components",
  "/resources/usage-providers",
  "/halcyon/design-tokens",
  "/northwind/adapters",
];

const SECTIONS = {
  "/": {
    navKey: "home",
    title: "Resources.co",
    blocks: [
      {
        eyebrow: "Self-hosted building blocks",
        h1: "Infrastructure you own, composed from parts.",
        paras: [
          "Resources.co is a startup building self-hostable primitives for the web: containers, components, and usage providers you run on your own stack, wired together however you like.",
          "Pick a section from the panel on the right to start, or browse the full catalogue.",
        ],
      },
      { h2: "Featured collections", items: collectionLinks() },
    ],
  },
  "/browse": {
    navKey: "browse",
    title: "Browse - Resources.co",
    crumb: [{ icon: true, href: "/" }, { label: "Browse" }],
    blocks: [
      {
        h1: "Browse the catalogue",
        paras: ["Everything in Resources.co, grouped by what it does. All self-hostable, all yours to run."],
        tags: ["Containers", "Components", "Usage providers", "Design tokens"],
      },
      {
        h2: "Containers",
        items: [
          ["Edge runtime", "A minimal container that boots in milliseconds.", "/resources/containers"],
          ["Job container", "Run background work without standing infrastructure.", "/resources/containers"],
        ],
      },
      {
        h2: "Components",
        items: [
          ["Data table", "Sorting, paging, and selection out of the box.", "/macchiato/components"],
          ["Command menu", "A keyboard-first launcher you can drop in.", "/macchiato/components"],
        ],
      },
      {
        h2: "Design tokens",
        items: [["Token spec", "Color, type, and spacing as a single source of truth.", "/halcyon/design-tokens"]],
      },
    ],
  },
  "/collections": {
    navKey: "collections",
    title: "Collections - Resources.co",
    crumb: [{ icon: true, href: "/" }, { label: "Collections" }],
    blocks: [
      {
        h1: "Featured collections",
        paras: ["Curated sets of building blocks that work well together. Open one to self-host the whole collection or pick what you need."],
      },
      { items: collectionLinks() },
    ],
  },
  "/about": {
    navKey: "about",
    title: "About - Resources.co",
    crumb: [{ icon: true, href: "/" }, { label: "About" }],
    blocks: [
      {
        h1: "About Resources.co",
        paras: [
          "Resources.co is a startup making self-hosting composable. We build the primitives: containers, components, and usage providers, so teams can run modern infrastructure on their own terms.",
          "The bet is simple: owning your stack should not mean rebuilding it from scratch.",
        ],
      },
      {
        h2: "How it fits together",
        paras: [
          "Every building block is designed to be self-hosted and to compose with the others. Containers run your code, components shape the surface, and usage providers share state cleanly across both.",
          "Design tokens keep the whole thing visually consistent without locking you in.",
        ],
      },
    ],
  },
};

function css() {
  const base = readFileSync(join(__dirname, "..", "resources-website", "styles.css"), "utf8");
  return `${base}

html:not([data-theme]) {
  --bg:
    radial-gradient(1150px 820px at 86% -14%, #6a5bff 0%, rgba(106,91,255,0) 54%),
    radial-gradient(1000px 860px at -8% 110%, rgba(40,80,255,0.5) 0%, rgba(40,80,255,0) 60%),
    linear-gradient(152deg, #1a1aa2 0%, #2626d8 52%, #16168e 100%);
  --card: rgba(9,15,42,0.52);
  --card-border: rgba(255,255,255,0.12);
  --shadow: 0 14px 44px rgba(2,6,28,0.34);
  --text: #eef2ff;
  --muted: #aeb9e8;
  --accent: #30D5C8;
  --hover: rgba(255,255,255,0.07);
  --active-bg: #2f5bff;
  --active-fg: #ffffff;
  --track: rgba(255,255,255,0.10);
  --track-border: rgba(255,255,255,0.16);
  --ghost: rgba(255,255,255,0.55);
  --thumb: #f3f6ff;
  --thumb-ic: #0e1b46;
}

.crumb a {
  appearance: none;
  background: none;
  border: none;
  padding: 4px 8px;
  margin: -4px 0;
  border-radius: 8px;
  font: inherit;
  color: var(--muted);
  cursor: pointer;
  text-decoration: none;
  transition: background .15s ease, color .15s ease;
}
.crumb a:hover { background: var(--hover); color: var(--text); }
.crumb a.home-ic { display: inline-flex; align-items: center; padding: 6px 9px; color: var(--accent); }
.crumb a.home-ic:hover { color: var(--text); }
.crumb a svg { width: 16px; height: 16px; display: block; }

.items a {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.items .it-name {
  flex: 0 1 auto;
  overflow-wrap: anywhere;
}
.items .it-desc {
  max-width: 58ch;
}

.menu {
  grid-area: menu;
  justify-self: end;
  display: none;
  position: relative;
  z-index: 20;
  padding: 10px;
}
.menu-button {
  appearance: none;
  position: relative;
  width: 48px;
  height: 42px;
  border: 1px solid var(--track-border);
  border-radius: 14px;
  background: var(--track);
  color: var(--text);
  cursor: pointer;
}
.menu-button span {
  position: absolute;
  left: 13px;
  width: 20px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  transition: transform .24s ease, opacity .18s ease, top .24s ease;
}
.menu-button span:nth-child(1) { top: 13px; }
.menu-button span:nth-child(2) { top: 20px; }
.menu-button span:nth-child(3) { top: 27px; }
.menu[data-open="true"] .menu-button span:nth-child(1) {
  top: 20px;
  transform: rotate(45deg);
}
.menu[data-open="true"] .menu-button span:nth-child(2) {
  opacity: 0;
}
.menu[data-open="true"] .menu-button span:nth-child(3) {
  top: 20px;
  transform: rotate(-45deg);
}
.menu-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  min-width: min(280px, calc(100vw - 40px));
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-6px) scale(.98);
  transform-origin: top right;
  transition: opacity .18s ease, transform .18s ease, visibility 0s linear .18s;
}
.menu[data-open="true"] .menu-panel {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0) scale(1);
  transition-delay: 0s;
}
.menu-panel .toggle-btn {
  align-self: flex-end;
}
.menu-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.menu-nav a {
  text-decoration: none;
  color: var(--text);
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 12px 14px;
  border-radius: 12px;
  font-weight: 500;
}
.menu-nav a:hover { background: var(--hover); }
.menu-nav a[aria-current="page"] {
  background: var(--active-bg);
  color: var(--active-fg);
  font-weight: 600;
}

@media (max-width: 760px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "brand menu"
      "main main"
      "footer footer";
  }
  .toggle,
  .nav {
    display: none;
  }
  .menu {
    display: block;
  }
  .brand {
    min-width: 0;
    padding: 18px 20px 22px;
  }
  .brand__name {
    overflow-wrap: anywhere;
  }
  .main {
    max-width: none;
  }
}
`;
}

function collectionLinks() {
  return COLLECTION_ORDER.map((path) => [
    path.slice(1),
    COLLECTIONS[path].tagline,
    path,
  ]);
}

function childrenOf(namespacePath) {
  const namespace = namespacePath.slice(1);
  return COLLECTION_ORDER
    .filter((path) => COLLECTIONS[path].namespace === namespace)
    .map((path) => [path.slice(1), COLLECTIONS[path].tagline, path]);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function homeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.6 12 3l9 7.6"></path><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21h3.5a1 1 0 0 0 1-1V9.5"></path></svg>`;
}

function themeToggleHtml() {
  const sun = `<svg class="tb-ghost tb-ghost-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"></line><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"></line><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"></line></svg>`;
  const moon = `<svg class="tb-ghost tb-ghost-moon" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  return `<button class="toggle-btn theme-toggle" role="switch" aria-checked="true" aria-label="Switch to light mode">${sun}${moon}<span class="tb-thumb">${sun.replace("tb-ghost tb-ghost-sun", "tb-sun")}${moon.replace("tb-ghost tb-ghost-moon", "tb-moon")}</span></button>`;
}

function navHtml(activeKey) {
  const links = NAV.map((item) => {
    const current = item.key === activeKey ? ' aria-current="page"' : "";
    return `<a href="${item.path}" data-section="${item.key}"${current}><span>${escapeHtml(item.label)}</span></a>`;
  });
  return `<nav class="box nav" data-screen-label="nav" aria-label="Primary">${links.join("")}</nav>`;
}

function menuHtml(activeKey) {
  const links = NAV.map((item) => {
    const current = item.key === activeKey ? ' aria-current="page"' : "";
    return `<a href="${item.path}" data-section="${item.key}"${current}><span>${escapeHtml(item.label)}</span></a>`;
  });
  return `<section class="box menu" data-open="false" data-screen-label="menu">
    <button class="menu-button" type="button" aria-expanded="false" aria-label="Open menu"><span></span><span></span><span></span></button>
    <div class="box menu-panel">
      ${themeToggleHtml()}
      <nav class="menu-nav" aria-label="Primary">${links.join("")}</nav>
    </div>
  </section>`;
}

function breadcrumbHtml(trail) {
  if (!trail) return "";
  const parts = trail.map((item, index) => {
    const sep = index === 0 ? "" : `<span class="sep">/</span>`;
    if (item.href) {
      const label = item.icon ? homeIcon() : escapeHtml(item.label);
      const cls = item.icon ? ` class="home-ic"` : "";
      const aria = item.icon ? ` aria-label="Home"` : "";
      return `${sep}<a${cls}${aria} href="${item.href}">${label}</a>`;
    }
    return `${sep}<span class="here">${escapeHtml(item.label)}</span>`;
  });
  return `<nav class="box crumb" id="crumb" aria-label="Breadcrumb">${parts.join("")}</nav>`;
}

function blockHtml(block) {
  const bits = [`<section class="box block">`];
  if (block.eyebrow) bits.push(`<div class="block__eyebrow">${escapeHtml(block.eyebrow)}</div>`);
  if (block.h1) bits.push(`<h1>${escapeHtml(block.h1)}</h1>`);
  if (block.h2) bits.push(`<h2>${escapeHtml(block.h2)}</h2>`);
  for (const para of block.paras || []) bits.push(`<p>${escapeHtml(para)}</p>`);
  if (block.tags) {
    bits.push(`<div class="tags">${block.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`);
  }
  if (block.items) {
    bits.push(`<div class="items">${block.items.map((item) => {
      const [name, desc, href = "#"] = item;
      return `<a href="${href}"><span class="it-name">${escapeHtml(name)}</span><span class="it-desc">${escapeHtml(desc)}</span></a>`;
    }).join("")}</div>`);
  }
  bits.push(`</section>`);
  return bits.join("");
}

function routeForPath(path) {
  if (SECTIONS[path]) return SECTIONS[path];
  if (COLLECTIONS[path]) {
    const collection = COLLECTIONS[path];
    return {
      navKey: "collections",
      title: `${collection.name} - Resources.co`,
      crumb: [
        { icon: true, href: "/" },
        { label: collection.namespace, href: `/${collection.namespace}` },
        { label: collection.slug },
      ],
      blocks: [
        { h1: collection.name, paras: [collection.intro] },
        { items: collection.items },
      ],
    };
  }
  if (ORGS[path]) {
    const org = ORGS[path];
    const children = childrenOf(path);
    return {
      navKey: "",
      title: `${org.name} - Resources.co`,
      crumb: [{ icon: true, href: "/" }, { label: org.name }],
      blocks: [
        { eyebrow: "Organization", h1: org.name, paras: [org.blurb] },
        { h2: children.length === 1 ? "1 collection" : `${children.length} collections`, items: children },
      ],
    };
  }
  return null;
}

function pageHtml(path) {
  const route = routeForPath(path);
  return `<main class="layout">
    <header class="box brand" data-screen-label="brand"><div class="brand__name">Resources<span class="dot">.co</span></div></header>
    <section class="box toggle" data-screen-label="toggle">${themeToggleHtml()}</section>
    ${menuHtml(route.navKey)}
    <div class="main" id="main">${breadcrumbHtml(route.crumb)}<div id="content">${route.blocks.map(blockHtml).join("")}</div></div>
    ${navHtml(route.navKey)}
    <footer class="box footer" data-screen-label="footer"><div class="copy">&copy; 2026 Resources<span class="dot">.co</span>. All rights reserved.</div></footer>
  </main>
  <script>${clientScript()}</script>`;
}

function clientScript() {
  return `(() => {
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    const dark = theme === "dark";
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      const thumb = button.querySelector(".tb-thumb");
      button.setAttribute("aria-checked", dark ? "true" : "false");
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      if (thumb) thumb.style.transform = dark ? "translateX(38px)" : "translateX(0)";
    });
  }

  function setMenuOpen(open) {
    const menu = document.querySelector(".menu");
    const button = menu && menu.querySelector(".menu-button");
    if (!menu || !button) return;
    menu.dataset.open = open ? "true" : "false";
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function syncActiveNav(nextDoc) {
    const active = nextDoc.querySelector("[data-section][aria-current='page']");
    const activeKey = active && active.getAttribute("data-section");
    document.querySelectorAll("[data-section]").forEach((link) => {
      if (activeKey && link.getAttribute("data-section") === activeKey) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  applyTheme(root.getAttribute("data-theme") || "dark");
  document.addEventListener("click", (event) => {
    const menuButton = event.target.closest(".menu-button");
    if (menuButton) {
      const menu = menuButton.closest(".menu");
      setMenuOpen(menu.dataset.open !== "true");
      return;
    }
    if (!event.target.closest(".menu")) setMenuOpen(false);

    const themeButton = event.target.closest(".theme-toggle");
    if (themeButton) {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
      return;
    }
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const next = new URL(link.href, location.href);
    if (next.origin !== location.origin || next.hash || link.target) return;
    event.preventDefault();
    setMenuOpen(false);
    navigate(next, "push");
  });

  addEventListener("popstate", () => navigate(new URL(location.href), "replace"));

  async function navigate(url, historyMode) {
    const response = await fetch(url.pathname, { headers: { Accept: "text/html" } });
    if (!response.ok) {
      location.href = url.href;
      return;
    }
    const html = await response.text();
    const nextDoc = new DOMParser().parseFromString(html, "text/html");
    const nextContent = nextDoc.getElementById("content");
    const currentContent = document.getElementById("content");
    const currentCrumb = document.getElementById("crumb");
    const nextCrumb = nextDoc.getElementById("crumb");
    if (!nextContent || !currentContent) {
      location.href = url.href;
      return;
    }
    document.title = nextDoc.title;
    if (currentCrumb && nextCrumb) currentCrumb.replaceWith(nextCrumb);
    else if (currentCrumb) currentCrumb.remove();
    else if (nextCrumb) document.getElementById("main").prepend(nextCrumb);
    currentContent.replaceChildren(...nextContent.childNodes);
    syncActiveNav(nextDoc);
    applyTheme(root.getAttribute("data-theme") || "dark");
    if (historyMode === "push") history.pushState(null, "", url.pathname);
    scrollTo({ top: 0, behavior: "auto" });
  }
})();`;
}

export function seedResourcesSite(db) {
  for (const route of buildResourcesSiteRoutes()) putSiteRoute(db, route);
}

export function buildResourcesSiteRoutes() {
  const stylesheet = css();
  return [...Object.keys(SECTIONS), ...Object.keys(ORGS), ...COLLECTION_ORDER].map((path) => {
    const route = routeForPath(path);
    return {
      subdomain: SUBDOMAIN,
      path,
      title: route.title,
      html: pageHtml(path),
      css: stylesheet,
      nav: NAV,
      transition: { mode: "same-origin-ssr-swap", routePath: path },
    };
  });
}
