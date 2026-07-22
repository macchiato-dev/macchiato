import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { putSiteRoute, readRepoProjectMetadata } from "@macchiato-dev/site";
import { DomUse } from "@macchiato-dev/dom-use";
import { StyleUse } from "@macchiato-dev/style-use";
import { resourcesRuntimeProfile } from "./runtime.js";
import { resourcesThemeCss } from "./theme.js";
import { RESOURCES_MENU, renderResourcesMobileMenu, renderResourcesPrimaryMenu } from "./components/menu.js";
import { composeResourcesUserMenuDomSchema, renderResourcesEdgeStatus, renderResourcesUserMenu, resourcesUserMenuSandboxSource } from "./components/user-menu.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const SUBDOMAIN = "resources-co";

const NAV = RESOURCES_MENU.items;

const REPO_PROJECT_METADATA = readRepoProjectMetadata({ repoRoot });
const ORG_COPY = {
  macchiato: "Open-source packages from the macchiato-dev workspace, mapped into public project paths.",
  resources: "Packages published under the resources organization on npm.",
};

function titleForProject(project) {
  return project.slug
    .split("-")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "")
    .join(" ");
}

function projectItems(project) {
  const items = [
    ["npm package", project.npmName],
    ["source", project.packageDir],
    ["files", `${project.files} git-visible files`],
  ];
  if (project.version) items.push(["version", project.version]);
  if (project.exports.length) items.push(["exports", project.exports.join(", ")]);
  if (project.bins.length) items.push(["commands", project.bins.join(", ")]);
  if (project.dependencies.length) items.push(["workspace deps", project.dependencies.join(", ")]);
  return items;
}

function projectFacts(project) {
  const facts = [
    ["Organization", project.namespace],
    ["Package", project.npmName],
    ["Kind", project.kind],
    ["Files", `${project.files}`],
  ];
  if (project.version) facts.splice(2, 0, ["Version", project.version]);
  return facts;
}

function languageSummary(project) {
  return Object.entries(project.languages)
    .slice(0, 6)
    .map(([language, count]) => `${language} ${count}`)
    .join(", ") || "No tracked source files";
}

function packageRows(project) {
  return [
    ["Source", project.packageDir],
    ["Package file", project.packageJson],
    ["Languages", languageSummary(project)],
    ["Exports", project.exports.join(", ") || "None declared"],
    ["Commands", project.bins.join(", ") || "None declared"],
    ["Workspace deps", project.dependencies.join(", ") || "None"],
  ];
}

const PROJECTS = Object.fromEntries(REPO_PROJECT_METADATA.projects.map((project) => [
  project.path,
  {
    ...project,
    name: titleForProject(project),
    namespace: project.namespace,
    slug: project.slug,
    tagline: project.description,
    intro: `${project.description} This ${project.kind} is published as ${project.npmName} from ${project.packageDir}.`,
    items: projectItems(project),
  },
]));

const PROJECT_ORDER = Object.keys(PROJECTS).sort();

const ORGS = Object.fromEntries([...new Set(REPO_PROJECT_METADATA.projects.map((project) => project.namespace))]
  .sort()
  .map((namespace) => [`/${namespace}`, {
    name: namespace,
    blurb: ORG_COPY[namespace] || `Packages published by ${namespace}.`,
  }]));

function hydrateCssSchema(schema) {
  return {
    ...schema,
    properties: hydratePropertyRules(schema.properties),
    definitions: hydrateStyleDefinitions(schema.definitions),
    selectors: typeof schema.selectors === "string" ? new RegExp(schema.selectors) : schema.selectors,
    urls: hydrateUrlRules(schema.urls),
    content: hydrateContentRules(schema.content),
  };
}

function hydratePropertyRules(rules = {}) {
  const properties = {};
  for (const [name, rule] of Object.entries(rules)) {
    properties[name] = typeof rule === "string" ? new RegExp(rule) : rule;
  }
  return properties;
}

function hydrateStyleDefinitions(definitions = {}) {
  const hydrated = {};
  for (const [name, definition] of Object.entries(definitions)) {
    hydrated[name] = {
      ...definition,
      properties: hydratePropertyRules(definition.properties || definition),
    };
  }
  return hydrated;
}

function hydrateContentRules(rules) {
  if (!rules || typeof rules !== "object") return rules;
  return {
    ...rules,
    allowedPattern: typeof rules.allowedPattern === "string" ? new RegExp(rules.allowedPattern) : rules.allowedPattern,
    rejectPattern: typeof rules.rejectPattern === "string" ? new RegExp(rules.rejectPattern) : rules.rejectPattern,
  };
}

function hydrateUrlRules(rules) {
  if (rules === undefined || typeof rules === "boolean") return rules;
  if (typeof rules === "string") return new RegExp(rules);
  if (Array.isArray(rules)) return rules.map((rule) => typeof rule === "string" ? new RegExp(rule) : rule);
  const hydrated = {};
  for (const [name, rule] of Object.entries(rules)) {
    hydrated[name] = hydrateUrlRules(rule);
  }
  return hydrated;
}

export function resourcesCssSchema() {
  const json = readFileSync(join(__dirname, "css.schema.json"), "utf8");
  return hydrateCssSchema(JSON.parse(json));
}

export function resourcesDomSchema() {
  const base = JSON.parse(readFileSync(join(__dirname, "dom.schema.json"), "utf8"));
  return composeResourcesUserMenuDomSchema(base);
}

function resourcesDomSchemaText() {
  return JSON.stringify(resourcesDomSchema());
}

function resourcesCssSchemaText() {
  return readFileSync(join(__dirname, "css.schema.json"), "utf8");
}

export function validateResourcesStylesheet(stylesheet) {
  return new StyleUse(resourcesCssSchema()).validateStylesheet(stylesheet);
}

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
      { h2: "Featured projects", items: projectLinks() },
    ],
  },
  "/browse": {
    navKey: "browse",
    title: "Browse - Resources.co",
    crumb: [{ icon: true, href: "/" }, { label: "Browse" }],
    blocks: [
      {
        h1: "Browse the catalogue",
        paras: ["Everything in Resources.co, grouped from the real packages in this repo. All self-hostable, all yours to run."],
        tags: [...new Set(REPO_PROJECT_METADATA.projects.map((project) => project.kind))],
      },
      ...projectGroups(),
    ],
  },
  "/collections": {
    navKey: "collections",
    title: "Projects - Resources.co",
    crumb: [{ icon: true, href: "/" }, { label: "Projects" }],
    blocks: [
      {
        h1: "Projects",
        paras: ["Real packages from this repository, mapped into public project paths like macchiato/dom-use."],
      },
      { items: projectLinks() },
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
          "Every building block is designed to be self-hosted and to compose with the others. The project catalogue is generated from package metadata rather than a hand-maintained list.",
          "Package names become public project paths, so @macchiato-dev/dom-use appears as macchiato/dom-use.",
        ],
      },
    ],
  },
};

const NOT_FOUND_ROUTE = {
  navKey: "",
  title: "Not found - Resources.co",
  crumb: [{ icon: true, href: "/" }, { label: "Not found" }],
  blocks: [
    {
      eyebrow: "404",
      h1: "This block has not been composed yet.",
      paras: [
        "That route is not in the Resources.co catalogue. It may still be on a workbench somewhere, or it may be a typo.",
        "Head back home or browse the projects that are already wired up.",
      ],
      items: [
        ["Home", "Return to the Resources.co starting point.", "/"],
        ["Browse", "Scan the current catalogue of self-hostable parts.", "/browse"],
        ["Projects", "Open the generated Resources.co projects.", "/collections"],
      ],
    },
  ],
};

function css(theme = {}) {
  const authored = readFileSync(join(__dirname, "..", "resources-website", "styles.css"), "utf8");
  const base = authored
    .replace(/html\[data-theme="dark"\]\s*\{[\s\S]*?\n\s*\}/, "")
    .replace(/html\[data-theme="light"\]\s*\{[\s\S]*?\n\s*\}/, "");
  return `${resourcesThemeCss(theme)}

${base}

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

.project-summary {
  display: grid;
  gap: 22px;
  padding: 31px 34px;
}
.project-summary__top {
  display: grid;
  gap: 12px;
}
.project-summary__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.project-summary__fact,
.package-details__row {
  border: 1px solid var(--card-border);
  border-radius: 14px;
  background: var(--track);
}
.project-summary__fact {
  display: grid;
  gap: 5px;
  padding: 13px 15px;
}
.project-summary__label,
.package-details__label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.project-summary__value,
.package-details__value {
  color: var(--text);
  font-size: 15px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.package-details {
  display: grid;
  gap: 16px;
  padding: 27px 30px 30px;
}
.package-details__grid {
  display: grid;
  gap: 10px;
}
.package-details__row {
  display: grid;
  grid-template-columns: minmax(120px, 0.36fr) minmax(0, 1fr);
  gap: 16px;
  padding: 13px 15px;
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

.brand {
  min-height: 72px;
  padding: 15px 23px;
}
.brand__path {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  min-width: 0;
  font-size: clamp(24px, 3vw, 30px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
.brand__home,
.brand__seg {
  appearance: none;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
  padding: 0;
}
.brand__home:hover,
.brand__seg:hover {
  color: inherit;
}
.brand__home .dot {
  color: var(--accent);
}
.brand__path--solo {
  font-size: clamp(22px, 2.7vw, 30px);
}
.brand__path--solo .brand__seg {
  overflow-wrap: anywhere;
}
.brand__seg--current {
  cursor: default;
}
.brand__sep {
  color: var(--muted);
  margin: 0 9px;
}
.project-identity {
  min-height: 72px;
  padding: 14px 23px;
}
.project-identity__path {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  min-width: 0;
  font-size: clamp(22px, 2.7vw, 30px);
  font-weight: 600;
  line-height: 1.05;
}
.project-identity__home {
  display: inline-flex;
  align-self: center;
  color: var(--accent);
  text-decoration: none;
}
.project-identity__home:hover {
  color: var(--text);
}
.project-identity__home svg {
  display: block;
  width: 20px;
  height: 20px;
}
.project-identity__owner,
.project-identity__name {
  color: inherit;
  text-decoration: none;
  overflow-wrap: anywhere;
}
.project-identity__owner {
  color: var(--muted);
}
.project-identity__owner:hover,
.project-identity__name:hover {
  color: var(--text);
}
.project-identity__name {
  color: var(--text);
}
.project-identity__name--current {
  cursor: default;
}
.project-identity__sep {
  color: var(--muted);
  margin: 0 9px;
}

.layout {
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.edge-status {
  min-height: 64px;
  gap: 10px;
}
.edge-status__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
}
.edge-status__label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.content-root[data-loading="true"] {
  width: 100%;
}
.skeleton-block {
  width: 100%;
  padding: 30px 34px;
}
.skeleton-line {
  display: block;
  height: 16px;
  width: 100%;
  max-width: 58ch;
  margin-top: 14px;
  border-radius: 999px;
  background: var(--hover);
  opacity: .72;
  animation: skeletonPulse 1.1s ease-in-out infinite;
}
.skeleton-line:first-child {
  margin-top: 0;
  width: 42%;
}
.skeleton-line:nth-child(2) {
  width: 78%;
  height: 28px;
}
.skeleton-line:nth-child(4) {
  width: 64%;
}
@keyframes skeletonPulse {
  50% { opacity: .38; }
}

@media (max-width: 760px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
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
    padding: 15px 18px;
  }
  .brand__path {
    overflow-wrap: anywhere;
  }
  .project-summary__facts,
  .package-details__row {
    grid-template-columns: minmax(0, 1fr);
  }
  .main {
    max-width: none;
  }
}

@media (max-width: 760px) {
  .layout.document-runtime {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto minmax(0, 1fr) auto;
    grid-template-areas:
      "brand"
      "userbar"
      "nav"
      "main"
      "footer";
  }
  .document-runtime .nav {
    display: flex;
  }
}
`;
}

function projectLinks() {
  return PROJECT_ORDER.map((path) => [
    path.slice(1),
    PROJECTS[path].tagline,
    path,
  ]);
}

function projectGroups() {
  const groups = new Map();
  for (const path of PROJECT_ORDER) {
    const project = PROJECTS[path];
    if (!groups.has(project.kind)) groups.set(project.kind, []);
    groups.get(project.kind).push([path.slice(1), project.tagline, path]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([kind, items]) => ({
    h2: `${kind[0].toUpperCase()}${kind.slice(1)} packages`,
    items,
  }));
}

function childrenOf(namespacePath) {
  const namespace = namespacePath.slice(1);
  return PROJECT_ORDER
    .filter((path) => PROJECTS[path].namespace === namespace)
    .map((path) => [path.slice(1), PROJECTS[path].tagline, path]);
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

function userbarHtml() {
  return `<section class="box userbar" data-screen-label="userbar">
    <div class="ub-pop">
      <button class="ub-icon" aria-label="Notifications" aria-haspopup="true" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg><span class="ub-dot"></span></button>
      <div class="popover user-menu" role="menu"><div class="menu__head">Notifications</div><div class="menu__empty">You're all caught up.</div></div>
    </div>
    <div class="ub-pop">
      <button class="ub-icon" aria-label="Create new" aria-haspopup="true" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
      <div class="popover user-menu" role="menu">
        <button class="item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>New project</button>
        <button class="item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-4"></path></svg>New organization</button>
        <div class="menu__sep"></div>
        <button class="item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path><line x1="12" y1="15" x2="12" y2="3"></line></svg>Import resource</button>
      </div>
    </div>
    <div class="ub-pop">
      <button class="ub-acct" aria-label="Account menu" aria-haspopup="true" aria-expanded="false"><span class="ub-avatar">MD</span><svg class="ub-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button>
      <div class="popover user-menu" role="menu">
        <div class="menu__acct"><span class="ub-avatar">MD</span><div class="menu__acct-meta"><span class="menu__acct-name">macchiato-dev</span><span>Signed in</span></div></div>
        <div class="menu__sep"></div>
        <button class="item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 10 5-10 5L2 7z"></path><path d="m2 17 10 5 10-5"></path><path d="m2 12 10 5 10-5"></path></svg>Your projects</button>
        <button class="item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Your profile</button>
        <div class="menu__sep"></div>
        <button class="item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"></path></svg>Settings</button>
        <button class="item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>Help &amp; docs</button>
      </div>
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

function projectSegmentsForPath(path) {
  const parts = path.split("/").filter(Boolean);
  return parts.map((part, index) => {
    const href = index < parts.length - 1 ? `/${parts.slice(0, index + 1).join("/")}` : "";
    return { label: part, href, owner: index === 0 };
  });
}

function brandSegmentsForPath(path) {
  if (ORGS[path]) return [{ label: path.slice(1), href: "" }];
  return [];
}

function brandHeaderHtml(path) {
  if (PROJECTS[path]) {
    const parts = projectSegmentsForPath(path).map((segment, index) => {
      const sep = index === 0 ? "" : `<span class="project-identity__sep">/</span>`;
      const cls = segment.owner ? "project-identity__owner" : "project-identity__name";
      if (segment.href) {
        return `${sep}<a class="${cls}" href="${segment.href}">${escapeHtml(segment.label)}</a>`;
      }
      return `${sep}<span class="${cls} project-identity__name--current">${escapeHtml(segment.label)}</span>`;
    });
    return `<header class="box project-identity" data-screen-label="brand"><nav class="project-identity__path" id="brand-path" aria-label="Project path"><a class="project-identity__home" href="/" aria-label="Resources.co home">${homeIcon()}</a><span class="project-identity__sep">/</span>${parts.join("")}</nav></header>`;
  }
  const segments = brandSegmentsForPath(path);
  if (segments.length === 0) {
    return `<header class="box brand" data-screen-label="brand"><nav class="brand__path" id="brand-path" aria-label="Resource path"><a class="brand__home" href="/">Resources<span class="dot">.co</span></a></nav></header>`;
  }
  const parts = segments.map((segment, index) => {
    const sep = index === 0 ? "" : `<span class="brand__sep">/</span>`;
    if (segment.href) {
      return `${sep}<a class="brand__seg" href="${segment.href}">${escapeHtml(segment.label)}</a>`;
    }
    return `${sep}<span class="brand__seg brand__seg--current">${escapeHtml(segment.label)}</span>`;
  });
  return `<header class="box brand" data-screen-label="brand"><nav class="brand__path brand__path--solo" id="brand-path" aria-label="Resource path">${parts.join("")}</nav></header>`;
}

function blockHtml(block) {
  if (block.type === "project-summary") return projectSummaryHtml(block);
  if (block.type === "package-details") return packageDetailsHtml(block);
  const bits = [`<section class="box block content-block">`];
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

function projectSummaryHtml(block) {
  const facts = block.facts.map(([label, value]) => `<div class="project-summary__fact"><span class="project-summary__label">${escapeHtml(label)}</span><span class="project-summary__value">${escapeHtml(value)}</span></div>`);
  return `<section class="box block project-summary">
    <div class="project-summary__top">
      <div class="block__eyebrow">${escapeHtml(block.eyebrow)}</div>
      <h1>${escapeHtml(block.h1)}</h1>
      <p>${escapeHtml(block.intro)}</p>
    </div>
    <div class="project-summary__facts">${facts.join("")}</div>
  </section>`;
}

function packageDetailsHtml(block) {
  const rows = block.rows.map(([label, value]) => `<div class="package-details__row"><span class="package-details__label">${escapeHtml(label)}</span><span class="package-details__value">${escapeHtml(value)}</span></div>`);
  return `<section class="box block package-details">
    <h2>${escapeHtml(block.h2)}</h2>
    <div class="package-details__grid">${rows.join("")}</div>
  </section>`;
}

function routeForPath(path) {
  if (path === "/404") return NOT_FOUND_ROUTE;
  if (SECTIONS[path]) return SECTIONS[path];
  if (PROJECTS[path]) {
    const project = PROJECTS[path];
    return {
      navKey: "collections",
      title: `${project.name} - Resources.co`,
      crumb: [
        { icon: true, href: "/" },
        { label: project.namespace, href: `/${project.namespace}` },
        { label: project.slug },
      ],
      blocks: [
        { type: "project-summary", eyebrow: project.npmName, h1: project.name, intro: project.intro, facts: projectFacts(project) },
        { type: "package-details", h2: "Package metadata", rows: packageRows(project) },
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
        { h2: children.length === 1 ? "1 project" : `${children.length} projects`, items: children },
      ],
    };
  }
  return null;
}

function pageHtml(path, { runtime = "browser-use" } = {}) {
  const route = routeForPath(path);
  const documentRuntime = runtime === "document";
  return `<main class="layout${documentRuntime ? " document-runtime" : ""}">
    ${brandHeaderHtml(path)}
    ${documentRuntime ? renderResourcesEdgeStatus() : renderResourcesUserMenu()}
    ${documentRuntime ? "" : renderResourcesMobileMenu(route.navKey)}
    <div class="main" id="main">${breadcrumbHtml(route.crumb)}<div id="content" class="content-root">${route.blocks.map(blockHtml).join("")}</div></div>
    ${renderResourcesPrimaryMenu(route.navKey)}
    <footer class="box footer" data-screen-label="footer"><div class="copy">© 2026 Resources<span class="dot">.co</span>. All rights reserved.</div></footer>
  </main>${runtime === "browser-use" ? `
  <script type="module">${clientScript()}</script>` : ""}`;
}

function headHtml({ runtime = "browser-use" } = {}) {
  if (runtime === "document") return "";
  return `<script type="importmap">
${JSON.stringify({
  imports: {
    "@macchiato-dev/quickjs-emscripten-sandbox": "/-/quickjs-emscripten-sandbox/index.js",
    "@macchiato-dev/dom-use": "/-/@macchiato-dev/dom-use/index.js",
    "@macchiato-dev/html-use": "/-/@macchiato-dev/html-use/index.js",
    "@macchiato-dev/style-use": "/-/@macchiato-dev/style-use/index.js",
    "@jitl/quickjs-ffi-types": "/-/quickjs-emscripten-sandbox/ffi-types.js",
    "@jitl/quickjs-singlefile-browser-release-sync": "/-/quickjs-emscripten-sandbox/singlefile-browser-release-sync.js",
    "quickjs-emscripten-core": "/-/quickjs-emscripten-sandbox/quickjs-core.js",
  },
}, null, 2)}
</script>`;
}

function clientScript() {
  return `const resourcesDomSchema = ${resourcesDomSchemaText()};
const resourcesCssSchema = ${resourcesCssSchemaText()};

const userbarSandboxSource = ${JSON.stringify(resourcesUserMenuSandboxSource)};

(() => {
  const root = document.documentElement;
  const routeCache = new Map();
  let userbarSandboxPromise = null;
  let transitionDomUsePromise = null;

  function attributesFor(node) {
    return Object.fromEntries(Array.from(node.attributes || [], (attr) => [attr.name, attr.value]));
  }

  async function transitionDomUse() {
    if (!transitionDomUsePromise) {
      transitionDomUsePromise = Promise.all([
        import("@macchiato-dev/dom-use"),
        import("@macchiato-dev/style-use"),
      ]).then(([domUseModule, styleUseModule]) => (
        new domUseModule.DomUse(resourcesDomSchema, new styleUseModule.StyleUse(resourcesCssSchema))
      ));
    }
    return transitionDomUsePromise;
  }

  async function sanitizeRegionInner(node) {
    const domUse = await transitionDomUse();
    return domUse.sanitizeHTML(node.innerHTML, {
      container: {
        tagName: node.tagName.toLowerCase(),
        attributes: attributesFor(node),
      },
    });
  }

  async function setSanitizedInnerHTML(target, source) {
    target.innerHTML = await sanitizeRegionInner(source);
  }

  async function sanitizedOuterHTML(node) {
    const domUse = await transitionDomUse();
    return domUse.sanitizeHTML(node.innerHTML, {
      container: {
        tagName: node.tagName.toLowerCase(),
        attributes: attributesFor(node),
      },
      includeContainer: true,
    });
  }

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

  function applyUserbarState(state) {
    const userbar = document.querySelector(".userbar");
    if (!userbar || !state) return;
    userbar.dataset.userbarPinned = state.pinned ? "true" : "false";
    if (state.hoverPaused) userbar.dataset.userbarHoverPaused = "true";
    else delete userbar.dataset.userbarHoverPaused;
    userbar.querySelectorAll(".ub-pop").forEach((pop, index) => {
      const open = Boolean(state.open && state.open[index]);
      pop.dataset.open = open ? "true" : "false";
      const button = pop.querySelector("button[aria-expanded]");
      if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
      if (state.blurIndex === index && button) button.blur();
    });
  }

  function applyUserbarResult(result) {
    if (!result) return {};
    if (result.state) {
      applyUserbarState(result.state);
      return result;
    }
    applyUserbarState(result);
    return { state: result };
  }

  async function userbarSandbox() {
    if (!userbarSandboxPromise) {
      userbarSandboxPromise = import("@macchiato-dev/quickjs-emscripten-sandbox").then(({ createSandbox }) => createSandbox()).then((sandbox) => {
        sandbox.evalGlobal(userbarSandboxSource, "resources-userbar-state.js");
        return sandbox;
      }).catch((error) => {
        console.warn("Userbar sandbox unavailable", error);
        return null;
      });
    }
    return userbarSandboxPromise;
  }

  async function dispatchUserbarEvent(event) {
    const sandbox = await userbarSandbox();
    if (!sandbox) return;
    return applyUserbarResult(sandbox.callJsonFunction("__resourcesUserbarEvent", event));
  }

  function userbarEventPayload(event) {
    const userbar = document.querySelector(".userbar");
    const button = event.target.closest(".userbar .ub-pop > button");
    let target = { insideUserbar: Boolean(event.target.closest(".userbar")) };
    if (button && userbar) {
      const pop = button.closest(".ub-pop");
      target = {
        ...target,
        kind: "userbar-button",
        index: Array.from(userbar.querySelectorAll(".ub-pop")).indexOf(pop),
      };
    }
    return { type: event.type, target };
  }

  function addUserbarBinding(binding) {
    if (binding?.target === "document" && binding.type === "click") {
      document.addEventListener("click", (event) => {
        const payload = userbarEventPayload(event);
        if (payload.target.kind === "userbar-button") {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        dispatchUserbarEvent(payload);
      });
    }
    if (binding?.target === ".userbar" && binding.type === "pointerleave") {
      document.querySelector(".userbar")?.addEventListener("pointerleave", (event) => {
        dispatchUserbarEvent({ type: event.type, target: { insideUserbar: false } });
      });
    }
  }

  async function installUserbarApp() {
    const sandbox = await userbarSandbox();
    if (!sandbox) return;
    const bindings = sandbox.callJsonFunction("__resourcesUserbarBindings", {});
    bindings.forEach(addUserbarBinding);
  }

  function prepareUserbarMenus() {
    const userbar = document.querySelector(".userbar");
    if (!userbar || userbar.dataset.userbarReady === "true") return;
    userbar.dataset.userbarReady = "true";
    installUserbarApp();
  }

  function syncActiveNav(nextDoc) {
    const active = nextDoc.querySelector("[data-section][aria-current='page']");
    const activeKey = active && active.getAttribute("data-section");
    document.querySelectorAll("[data-section]").forEach((link) => {
      if (activeKey && link.getAttribute("data-section") === activeKey) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function sameSiteRoute(link) {
    if (!link || !link.href) return null;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.hash || link.target) return null;
    return url;
  }

  async function fetchRoute(url) {
    const key = url.pathname;
    if (!routeCache.has(key)) {
      routeCache.set(key, fetch(key, { headers: { Accept: "text/html" } })
        .then(async (response) => {
          if (!response.ok) throw new Error("Route fetch failed");
          const html = await response.text();
          return new DOMParser().parseFromString(html, "text/html");
        })
        .catch((error) => {
          routeCache.delete(key);
          throw error;
        }));
    }
    return routeCache.get(key);
  }

  function prefetchRoute(link) {
    const url = sameSiteRoute(link);
    if (!url || url.pathname === location.pathname) return;
    if (link.dataset.prefetch === "ready" || link.dataset.prefetch === "pending") return;
    link.dataset.prefetch = "pending";
    fetchRoute(url)
      .then(() => { link.dataset.prefetch = "ready"; })
      .catch(() => { delete link.dataset.prefetch; });
  }

  function showSkeleton() {
    const content = document.getElementById("content");
    if (!content) return;
    content.dataset.loading = "true";
    content.setAttribute("aria-busy", "true");
    content.replaceChildren(...[0, 1].map(() => {
      const block = document.createElement("section");
      block.className = "box skeleton-block";
      block.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 4; i += 1) {
        const line = document.createElement("span");
        line.className = "skeleton-line";
        block.appendChild(line);
      }
      return block;
    }));
  }

  function clearSkeleton() {
    const content = document.getElementById("content");
    if (!content) return;
    delete content.dataset.loading;
    content.removeAttribute("aria-busy");
  }

  function preparePrefetching(rootNode = document) {
    if (window.__resourcesDisablePrefetch) return;
    const links = Array.from(rootNode.querySelectorAll("a[href]")).filter(sameSiteRoute);
    links.forEach((link) => {
      link.addEventListener("pointerenter", () => prefetchRoute(link), { once: true });
      link.addEventListener("focus", () => prefetchRoute(link), { once: true });
      link.addEventListener("touchstart", () => prefetchRoute(link), { once: true, passive: true });
    });
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          prefetchRoute(entry.target);
        }
      }, { rootMargin: "160px" });
      links.forEach((link) => observer.observe(link));
    }
  }

  applyTheme(root.getAttribute("data-theme") || "dark");
  prepareUserbarMenus();
  preparePrefetching();
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
    const cached = routeCache.has(url.pathname);
    if (!cached) showSkeleton();
    let nextDoc;
    try {
      nextDoc = await fetchRoute(url);
    } catch {
      location.href = url.href;
      return;
    }
    const nextContent = nextDoc.getElementById("content");
    const currentContent = document.getElementById("content");
    const currentCrumb = document.getElementById("crumb");
    const nextCrumb = nextDoc.getElementById("crumb");
    const currentBrand = document.querySelector("[data-screen-label='brand']");
    const nextBrand = nextDoc.querySelector("[data-screen-label='brand']");
    if (!nextContent || !currentContent) {
      location.href = url.href;
      return;
    }
    document.title = nextDoc.title;
    if (currentBrand && nextBrand) currentBrand.outerHTML = await sanitizedOuterHTML(nextBrand);
    if (currentCrumb && nextCrumb) currentCrumb.outerHTML = await sanitizedOuterHTML(nextCrumb);
    else if (currentCrumb) currentCrumb.remove();
    else if (nextCrumb) document.getElementById("main").insertAdjacentHTML("afterbegin", await sanitizedOuterHTML(nextCrumb));
    clearSkeleton();
    await setSanitizedInnerHTML(currentContent, nextContent);
    syncActiveNav(nextDoc);
    applyTheme(root.getAttribute("data-theme") || "dark");
    preparePrefetching(currentContent);
    if (historyMode === "push") history.pushState(null, "", url.pathname);
    scrollTo({ top: 0, behavior: "auto" });
  }
})();`;
}

export function seedResourcesSite(db) {
  for (const route of buildResourcesSiteRoutes()) putSiteRoute(db, route);
}

export function buildResourcesSiteRoutes() {
  return buildResourcesSiteRoutesForRuntime({ runtime: "browser-use" });
}

export function buildResourcesSiteRoutesForRuntime({ runtime = "local", theme = {} } = {}) {
  const profile = resourcesRuntimeProfile(runtime);
  const stylesheet = css(theme);
  const styleUse = new StyleUse(resourcesCssSchema());
  styleUse.validateStylesheet(stylesheet);
  const domUse = new DomUse(resourcesDomSchema(), styleUse);
  return [...Object.keys(SECTIONS), ...Object.keys(ORGS), ...PROJECT_ORDER, "/404"].map((path) => {
    const route = routeForPath(path);
    const authoredHtml = pageHtml(path, { runtime: profile.name });
    // The edge profile is promoted to trusted static content only after passing
    // through the use-* boundary. The richer local profile keeps its authored
    // module script and applies dom-use again to each client-side page swap.
    const html = profile.name === "document" ? domUse.sanitizeHTML(authoredHtml, { strict: true }) : authoredHtml;
    return {
      subdomain: SUBDOMAIN,
      path,
      title: route.title,
      html,
      css: stylesheet,
      head: headHtml({ runtime: profile.name }),
      nav: NAV,
      transition: { mode: profile.navigation, routePath: path },
    };
  });
}
