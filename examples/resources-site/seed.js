import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { putSiteRoute, readRepoProjectMetadata } from "@macchiato-dev/site";
import { DomUse } from "@macchiato-dev/dom-use";
import { StyleUse } from "@macchiato-dev/style-use";
import { createSafeTriangle, pointInSafeTriangle, userMenuUseClientPath } from "@macchiato-dev/user-menu-use";
import { resourcesRuntimeProfile } from "./runtime.js";
import { resourcesThemeCss } from "./theme.js";
import { resourcesMenu, renderResourcesMobileMenu, renderResourcesPrimaryMenu } from "./components/menu.js";
import { composeResourcesUserMenuDomSchema, renderResourcesEdgeStatus, renderResourcesUserMenu, RESOURCES_USER_MENU, resourcesUserMenuSandboxSource } from "./components/user-menu.js";
import { commandPaletteClientPath } from "@macchiato-dev/command-palette-use";
import { themeUseClientPath } from "@macchiato-dev/theme-use";
import { composeResourcesAuthDomSchema, renderResourcesAuthBlock, RESOURCES_AUTH, resourcesAuthRoute } from "./components/auth.js";
import { createTranslator, DEFAULT_RESOURCE_LOCALE, loadResourcesLocales } from "./i18n.js";
import { loadProjectContentSpace } from "./catalog-content.js";
import { loadBlogPosts, renderBlogInline } from "./blog-content.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const SUBDOMAIN = "resources-co";

const RESOURCE_MESSAGES = loadResourcesLocales();

const REPO_PROJECT_METADATA = readRepoProjectMetadata({ repoRoot });
const PROJECT_CONTENT = loadProjectContentSpace(REPO_PROJECT_METADATA.projects);
const BLOG_POSTS_BY_LOCALE = Object.freeze(Object.fromEntries(["en", "es"].map((locale) => [locale, loadBlogPosts(undefined, locale)])));
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

function projectFacts(project, t = null) {
  const label = (key, fallback) => t ? t(key) : fallback;
  const facts = [
    [label("common.organization", "Organization"), project.namespace],
    [label("common.package", "Package"), project.npmName],
    [label("common.kind", "Kind"), project.kind],
    [label("common.files", "Files"), `${project.files}`],
  ];
  if (project.version) facts.splice(2, 0, [label("common.version", "Version"), project.version]);
  return facts;
}

function languageSummary(project, t = null) {
  return Object.entries(project.languages)
    .slice(0, 6)
    .map(([language, count]) => `${language} ${count}`)
    .join(", ") || (t ? t("common.noTrackedFiles") : "No tracked source files");
}

function packageRows(project, t = null) {
  const label = (key, fallback) => t ? t(key) : fallback;
  return [
    [label("common.source", "Source"), project.packageDir],
    [label("common.packageFile", "Package file"), project.packageJson],
    [label("common.languages", "Languages"), languageSummary(project, t)],
    [label("common.exports", "Exports"), project.exports.join(", ") || label("common.noneDeclared", "None declared")],
    [label("common.commands", "Commands"), project.bins.join(", ") || label("common.noneDeclared", "None declared")],
    [label("common.workspaceDeps", "Workspace deps"), project.dependencies.join(", ") || label("common.none", "None")],
  ];
}

const PROJECTS = Object.fromEntries(REPO_PROJECT_METADATA.projects.map((project) => [
  project.path,
  {
    ...project,
    name: titleForProject(project),
    namespace: project.namespace,
    slug: project.slug,
    descriptions: PROJECT_CONTENT[project.path],
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
  return composeResourcesAuthDomSchema(composeResourcesUserMenuDomSchema(base));
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

function authMessages(i18n) {
  return Object.fromEntries(Object.entries(i18n.messages)
    .filter(([key]) => key.startsWith("auth."))
    .map(([key, value]) => [key.slice(5), value]));
}

function sectionsFor(i18n) {
  const t = i18n.text;
  const legal = i18n.locale === "es" ? {
    terms: ["Condiciones de uso", "Al crear una cuenta o utilizar Resources.co, aceptas estas condiciones.", [
      ["Tu cuenta", "Eres responsable de la actividad de tu cuenta y de mantener seguras las credenciales de tu proveedor."],
      ["Contenido y espacios de nombres", "Conservas la propiedad de lo que publicas. Al hacer público un proyecto, concedes los permisos que hayas elegido."],
      ["Uso aceptable", "No subas malware, infrinjas derechos ajenos ni abuses de los recursos de la plataforma."],
      ["Terminación", "Puedes eliminar tu cuenta. Podemos suspender cuentas que incumplan estas condiciones."],
    ]],
    privacy: ["Política de privacidad", "Recibimos de tu proveedor de acceso tu nombre, correo electrónico y avatar, y guardamos los proyectos y ajustes que creas.", [
      ["Cómo usamos los datos", "Los usamos para operar tu cuenta y el servicio. No vendemos tus datos personales."],
      ["Acceso de terceros", "GitHub, GitLab y futuros proveedores gestionan la autenticación conforme a sus propias políticas."],
      ["Tus opciones", "Puedes exportar o eliminar tus datos y revocar el acceso desde los ajustes del proveedor."],
      ["Contacto", "Para preguntas sobre privacidad, escribe a privacy@resources.co."],
    ]],
  } : {
    terms: ["Terms of Use", "By creating an account or using Resources.co, you agree to these terms.", [
      ["Your account", "You are responsible for activity under your account and for keeping your provider credentials secure."],
      ["Content and namespaces", "You retain ownership of what you publish. When you make a project public, you grant the rights you choose."],
      ["Acceptable use", "Do not upload malware, infringe others' rights, or abuse the platform's resources."],
      ["Termination", "You can delete your account. We may suspend accounts that violate these terms."],
    ]],
    privacy: ["Privacy Policy", "We receive your name, email, and avatar from your sign-in provider and store the projects and settings you create.", [
      ["How we use data", "We use it to operate your account and the service. We do not sell your personal data."],
      ["Third-party sign-in", "GitHub, GitLab, and future providers handle authentication under their own privacy policies."],
      ["Your choices", "You can export or delete your data and revoke access from your provider's settings."],
      ["Contact", "For privacy questions, contact privacy@resources.co."],
    ]],
  };
  const sections = {
    "/": {
    navKey: "home",
    title: t("home.title"),
    blocks: [
      {
        eyebrow: t("home.eyebrow"),
        h1: t("home.heading"),
        paras: [
          t("home.p1"),
          t("home.p2"),
        ],
        items: [[t("try.button"), t("try.buttonDescription"), "/try"]],
      },
      { h2: t("home.featured"), paras: ["__RESOURCES_PUBLIC_PROJECTS__"] },
    ],
  },
  "/browse": {
    navKey: "browse",
    title: t("browse.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("browse.crumb") }],
    blocks: [
      {
        h1: t("browse.heading"),
        paras: [t("browse.p1")],
        tags: [...new Set(REPO_PROJECT_METADATA.projects.map((project) => project.kind))],
      },
      { paras: ["__RESOURCES_PUBLIC_PROJECTS__"] },
    ],
  },
  "/collections": {
    navKey: "collections",
    title: t("projects.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("projects.crumb") }],
    blocks: [
      {
        h1: t("projects.heading"),
        paras: [t("projects.p1")],
      },
      { items: projectLinks(i18n) },
    ],
  },
  "/about": {
    navKey: "about",
    title: t("about.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("about.crumb") }],
    blocks: [
      {
        h1: t("about.heading"),
        paras: [
          t("about.p1"),
          t("about.p2"),
        ],
      },
      {
        h2: t("about.fit"),
        paras: [
          t("about.fitP1"),
          t("about.fitP2"),
        ],
      },
    ],
  },
  "/blog": {
    navKey: "blog",
    title: t("blog.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("blog.heading") }],
    blocks: [
      { h1: t("blog.heading"), paras: [t("blog.intro")] },
      { items: BLOG_POSTS_BY_LOCALE[i18n.locale].map((post) => [post.title, post.published, `/blog/${post.slug}`]) },
    ],
  },
  "/terms": legalRoute(legal.terms, i18n),
  "/privacy": legalRoute(legal.privacy, i18n),
  "/profile": {
    navKey: "",
    title: t("profile.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("profile.crumb") }],
    blocks: [
      {
        eyebrow: t("common.account"),
        h1: t("profile.heading"),
        paras: [t("profile.p1")],
      },
    ],
  },
  "/settings": {
    navKey: "",
    title: t("settings.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("settings.crumb") }],
    blocks: [
      {
        eyebrow: t("common.account"),
        h1: t("settings.heading"),
        paras: [t("settings.p1")],
        items: [
          [t("settings.github"), t("settings.githubDesc"), "/auth/github/link"],
          [t("settings.gitlab"), t("settings.gitlabDesc"), "/auth/gitlab/link"],
        ],
      },
    ],
  },
  "/help": {
    navKey: "",
    title: t("help.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("help.crumb") }],
    blocks: [
      {
        eyebrow: t("common.support"),
        h1: t("help.heading"),
        paras: [t("help.p1")],
        items: [
          [t("docs.heading"), t("docs.p1"), "/docs"],
          [t("help.browse"), t("help.browseDesc"), "/browse"],
          [t("help.about"), t("help.aboutDesc"), "/about"],
        ],
      },
    ],
  },
  "/docs": {
    navKey: "",
    title: t("docs.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("docs.crumb") }],
    blocks: [{
      h1: t("docs.heading"),
      paras: [t("docs.p1")],
      items: [[t("docs.domUse"), t("docs.domUseDesc"), "/docs/dom-use", { newTab: true }]],
    }],
  },
  "/docs/dom-use": {
    navKey: "",
    title: t("docs.domUseTitle"),
    crumb: [{ icon: true, href: "/" }, { label: t("docs.crumb"), href: "/docs" }, { label: t("docs.domUseHeading") }],
    blocks: [{ h1: t("docs.domUseHeading"), paras: [t("docs.domUseP1"), t("docs.domUseP2")] }],
  },
  "/dashboard": {
    navKey: "",
    title: t("dashboard.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("dashboard.heading") }],
    blocks: [{ paras: ["__RESOURCES_ACCOUNT_CONTENT__"] }],
  },
  "/projects": {
    navKey: "",
    title: t("dashboard.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("dashboard.projects") }],
    blocks: [{ paras: ["__RESOURCES_ACCOUNT_CONTENT__"] }],
  },
  "/projects/new": {
    navKey: "",
    title: t("projectCreate.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("dashboard.projects"), href: "/projects" }, { label: t("projectCreate.heading") }],
    blocks: [{ paras: ["__RESOURCES_ACCOUNT_CONTENT__"] }],
  },
  "/try": {
    navKey: "",
    title: t("try.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("try.heading") }],
    blocks: [{ paras: ["__RESOURCES_ACCOUNT_CONTENT__"] }],
  },
  "/organizations/new": {
    navKey: "",
    title: t("organizationCreate.title"),
    crumb: [{ icon: true, href: "/" }, { label: t("organizationCreate.heading") }],
    blocks: [{ paras: ["__RESOURCES_ACCOUNT_CONTENT__"] }],
  },
  };
  sections["/login"] = resourcesAuthRoute("login", authMessages(i18n));
  sections["/signup"] = resourcesAuthRoute("signup", authMessages(i18n));
  return sections;
}

function legalRoute([title, intro, sections], i18n) {
  return {
    navKey: "",
    title: `${title} - Resources.co`,
    crumb: [{ icon: true, href: "/" }, { label: title }],
    blocks: [{ h1: title, paras: [intro] }, ...sections.map(([h2, paragraph]) => ({ h2, paras: [paragraph] }))],
  };
}

function notFoundRoute(i18n) {
  const t = i18n.text;
  return {
  navKey: "",
  title: t("notFound.title"),
  crumb: [{ icon: true, href: "/" }, { label: t("notFound.crumb") }],
  blocks: [
    {
      eyebrow: "404",
      h1: t("notFound.heading"),
      paras: [
        t("notFound.p1"),
        t("notFound.p2"),
      ],
      items: [
        [t("nav.home"), t("notFound.homeDesc"), "/"],
        [t("nav.browse"), t("notFound.browseDesc"), "/browse"],
        [t("nav.projects"), t("notFound.projectsDesc"), "/collections"],
      ],
    },
  ],
  };
}

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
.footer .copy { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.footer .copy a { color: var(--accent); text-decoration: underline; }
.footer .copy a:visited { color: var(--accent); }
.footer .copy a:hover, .footer .copy a:focus-visible { color: var(--text); }
.layout.home-view { grid-template-rows: auto auto minmax(0, 1fr) auto; grid-template-areas: "brand userbar" "main nav" "main social" "footer footer"; }
.home-social { grid-area: social; align-self: start; padding: 18px 20px; }
.home-social h2 { margin: 0 0 5px; font-size: 14px; }
.home-social p { margin: 0 0 12px; color: var(--muted); font-size: 12.5px; }
.home-social__links { display: flex; flex-wrap: wrap; gap: 8px; }
.home-social__links a { color: var(--accent); font-size: 13px; font-weight: 600; }
.language-switcher { display: inline-flex; align-items: center; gap: 6px; }
.language-switcher label { display: inline-flex; align-items: center; gap: 6px; }
.language-switcher select { padding: 4px 24px 4px 8px; border: 1px solid var(--border); border-radius: 6px; color: var(--text); background: var(--surface); font: inherit; }
.language-switcher button { padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; color: var(--text); background: var(--surface); font: inherit; cursor: pointer; }

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

.blog-example {
  display: block;
  width: 100%;
  min-height: 500px;
  margin-top: 22px;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  background: var(--track);
}
.content-block p a {
  color: var(--accent);
  text-decoration: underline;
}
.content-block p a:visited { color: var(--accent); }
.content-block p a:hover,
.content-block p a:focus-visible {
  color: var(--text);
}
.blog-list { margin: 16px 0 22px 22px; display: grid; gap: 12px; }
.blog-list li { padding: 0 0 0 4px; color: var(--muted); line-height: 1.65; }
.blog-list a { color: var(--accent); text-decoration: underline; font-weight: 600; }
.blog-figure { margin: 24px 0; }
.blog-figure img { display: block; width: 100%; height: auto; border: 1px solid var(--card-border); border-radius: 12px; }
.blog-figure figcaption { margin-top: 9px; color: var(--muted); font-size: 13px; line-height: 1.5; }

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

.edge-status { min-height: 64px; gap: 5px; }
.command-trigger { flex: 0 0 auto; min-width: 210px; min-height: 40px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 8px 10px 8px 13px; border: 1px solid var(--track-border); border-radius: 11px; color: var(--muted); background: var(--track); font: inherit; font-size: 13px; cursor: pointer; }
.command-trigger > span { flex: 0 0 auto; }
.command-trigger:hover { border-color: var(--accent); color: var(--text); }
.command-trigger kbd, .command-palette kbd { padding: 3px 6px; border: 1px solid var(--track-border); border-radius: 6px; color: var(--muted); background: var(--card); font-family: "Space Mono", monospace; font-size: 10px; font-weight: 600; line-height: 1.2; }
.command-palette { width: min(620px, calc(100% - 32px)); margin: 13vh auto 0; padding: 0; border: 1px solid var(--card-border); border-radius: 16px; color: var(--text); background: var(--pop-bg); box-shadow: var(--shadow); }
.command-palette::backdrop { background: rgba(8,14,40,.38); backdrop-filter: blur(5px); }
.command-palette__surface { padding: 8px; }
.command-palette__search { display: flex; align-items: center; gap: 10px; padding: 8px 10px 14px; }
.command-palette__icon { width: 20px; height: 20px; color: var(--muted); }
.command-palette__search input { flex: 1; min-width: 0; border: none; outline: none; color: var(--text); background: transparent; font: inherit; font-size: 17px; }
.command-palette__list { display: grid; gap: 3px; padding: 7px 0 0; }
.command-palette__item { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 11px 12px; border-radius: 9px; color: var(--text); text-decoration: none; font-size: 14px; }
.command-palette__item:hover, .command-palette__item:focus { color: var(--active-fg); background: var(--active-bg); outline: none; }
.command-palette__item[hidden] { display: none; }
.edge-account-name {
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
}
.edge-user-menu { position: relative; display: flex; padding-bottom: 12px; margin-bottom: -12px; }
.edge-user-menu::after { content: ""; position: absolute; top: 100%; right: 0; width: 100%; height: 14px; display: block; pointer-events: auto; }
.edge-user-menu > summary::-webkit-details-marker { display: none; }
.edge-user-menu__trigger { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.edge-user-menu__trigger.ub-icon { display: grid; }
.edge-user-menu__trigger .ub-caret { width: 14px; height: 14px; }
.edge-user-menu__panel { top: calc(100% + 2px); right: 0; opacity: 0; pointer-events: none; }
.edge-user-menu[open] .edge-user-menu__panel, .edge-user-menu:focus-within .edge-user-menu__panel, .edge-user-menu:hover .edge-user-menu__panel { opacity: 1; transform: none; pointer-events: auto; }
.edge-user-menu:hover > .ub-icon, .edge-user-menu:focus-within > .ub-icon, .edge-user-menu[open] > .ub-icon { background: var(--hover); }
.edge-user-menu:hover > .ub-acct, .edge-user-menu:focus-within > .ub-acct, .edge-user-menu[open] > .ub-acct { border-color: var(--track-border); background: var(--hover); }
.edge-user-menu__panel .item { display: flex; width: 100%; padding: 9px 12px; border: none; border-radius: 10px; background: transparent; color: var(--text); font: inherit; font-size: 14.5px; font-weight: 500; text-decoration: none; cursor: pointer; }
.edge-user-menu__panel .item:hover { background: var(--hover); }
.ub-guest { display: none; align-items: center; gap: 5px; }
body[data-auth="out"] .userbar .ub-pop--member { display: none; }
body[data-auth="out"] .ub-guest { display: flex; }
.document-runtime .ub-guest { display: flex; }
.edge-status form { margin: 0; }
.edge-status form button { font: inherit; background: transparent; cursor: pointer; }
.ub-btn { flex: 0 0 auto; border: 1px solid var(--track-border); border-radius: 11px; padding: 10px 15px; color: var(--text); font-size: 14px; font-weight: 600; text-decoration: none; }
.ub-btn--solid { border-color: var(--active-bg); background: var(--active-bg); color: var(--active-fg); }
.ub-avatar--blank { border: 1px solid var(--track-border); color: var(--muted); background: var(--track); }
.ub-avatar--blank svg { width: 20px; height: 20px; }
.edge-guest-menu { position: relative; }
.edge-guest-menu .ub-acct { padding: 4px; }
.edge-guest-menu .edge-user-menu__panel { min-width: 210px; }
.profile-language { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; padding: 2px 5px 5px; }
.profile-language select, .profile-language button { min-height: 36px; border: 1px solid var(--track-border); border-radius: 9px; color: var(--text); background: var(--track); font: inherit; font-size: 13px; }
.profile-language select { min-width: 0; padding: 6px 9px; }
.profile-language button { padding: 6px 10px; cursor: pointer; }
.profile-language button:hover { border-color: var(--accent); }
.item--danger:hover { color: #ff6b6b; }
.auth-card { width: 100%; max-width: 440px; padding: 40px 40px 34px; align-self: center; }
.auth-eyebrow { color: var(--accent); font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.auth-providers { display: grid; gap: 10px; margin-top: 22px; }
.auth-provider { min-height: 52px; border: 1px solid var(--track-border); border-radius: 12px; padding: 11px 16px; background: var(--track); color: var(--text); font: inherit; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 12px; text-decoration: none; }
.auth-provider:hover { border-color: var(--accent); }
.auth-provider__mark { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; color: var(--text); background: transparent; font-size: 9px; font-weight: 800; }
.auth-provider__mark svg { width: 22px; height: 22px; }
.auth-provider__mark--google { background: #4285f4; }
.auth-provider__mark--apple { color: var(--text); background: transparent; font-size: 14px; }
.auth-provider--disabled { opacity: 0.55; }
.auth-provider__soon { margin: 0 0 0 auto; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
.auth-legal { margin-top: 16px; color: var(--muted); font-size: 12px; line-height: 1.55; text-align: center; }
.auth-legal a, .auth-alt a { color: var(--accent); font-weight: 600; }
.auth-divider { display: flex; align-items: center; gap: 14px; margin-top: 22px; color: var(--muted); font-size: 12px; }
.auth-divider::before, .auth-divider::after { content: ""; height: 1px; flex: 1; background: var(--track-border); }
.auth-alt { margin-top: 22px; font-size: 13px; color: var(--muted); text-align: center; }
.auth-note { display: flex; align-items: flex-start; gap: 10px; margin-top: 20px; padding: 12px 14px; border-radius: 10px; background: var(--hover); font-size: 12px; line-height: 1.5; color: var(--muted); }
.auth-note__icon { width: 16px; height: 16px; border: 1px solid var(--accent); color: var(--accent); border-radius: 50%; display: grid; place-items: center; flex: 0 0 auto; font-size: 10px; font-weight: 700; }
.account-dashboard__header, .account-section__header, .create-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.account-dashboard__header h1, .account-section__header h2 { margin: 0; }
.account-dashboard__intro { color: var(--muted); margin: 8px 0 0; }
.create-actions { justify-content: flex-start; flex-wrap: wrap; margin-top: 22px; }
.account-action { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; min-height: 42px; padding: 9px 15px; border: 1px solid var(--active-bg); border-radius: 10px; color: var(--active-fg); background: var(--active-bg); font-weight: 700; text-decoration: none; }
.account-action--secondary { border-color: var(--track-border); color: var(--text); background: var(--track); }
.account-section { margin-top: 32px; }
.account-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
.account-card { min-height: 128px; padding: 17px; border: 1px solid var(--track-border); border-radius: 12px; background: var(--track); color: var(--text); text-decoration: none; transition: background .15s ease, border-color .15s ease; }
.account-card:hover { border-color: var(--accent); background: var(--hover); }
.account-card__namespace, .account-card__meta { color: var(--muted); font-size: 12px; font-weight: 600; }
.account-card h3 { margin: 8px 0; font-size: 17px; }
.account-card p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; }
.project-view__back { display: inline-flex; margin-bottom: 18px; color: var(--muted); text-decoration: none; }
.project-view__back:hover { color: var(--text); }
.project-view__identity h1 { margin: 7px 0 0; }
.project-view__meta { display: flex; gap: 8px; margin: 16px 0; }
.project-view__meta span { padding: 5px 8px; border: 1px solid var(--track-border); border-radius: 8px; color: var(--muted); background: var(--track); font-size: 11px; font-weight: 600; }
.project-surface { min-height: 220px; display: grid; place-items: center; gap: 14px; padding: 28px; border: 1px dashed var(--track-border); border-radius: 14px; text-align: center; }
.project-surface p { color: var(--muted); }
.account-empty { margin-top: 16px; padding: 22px; border: 1px dashed var(--track-border); border-radius: 12px; color: var(--muted); }
.create-form { display: grid; gap: 18px; max-width: 660px; margin-top: 24px; }
.create-form__field { display: grid; gap: 7px; }
.create-form__field label, .create-form legend { font-size: 13px; font-weight: 700; }
.create-form input, .create-form textarea, .create-form select { width: 100%; padding: 11px 13px; border: 1px solid var(--track-border); border-radius: 10px; color: var(--text); background: var(--track); font: inherit; }
.create-form textarea { min-height: 96px; resize: vertical; }
.create-form fieldset { padding: 0; border: none; }
.create-form__options { display: flex; gap: 16px; margin-top: 9px; }
.create-form__options label { display: flex; align-items: center; gap: 7px; font-weight: 500; }
.create-form__options input { width: auto; }
.form-error { padding: 11px 13px; border: 1px solid #ff6b6b; border-radius: 10px; color: #ffb3b3; }
.form-field-error { color: #ffb3b3; font-size: 13px; }
.project-create__heading { margin-bottom: 18px; }
.project-create .create-form { max-width: none; margin-top: 0; }
.project-create__layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 270px); gap: 0; height: 100%; min-height: 0; }
.project-create__fields { display: grid; align-content: start; gap: 14px; min-height: 0; overflow: auto; }
.project-create__fields .create-form textarea { min-height: 72px; }
.project-create__fields .create-actions { gap: 8px; margin-top: 2px; }
.draft-flash { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; padding: 8px 28px 8px 10px; border: 1px solid #5269e8; border-radius: 8px; color: #d9dfff; background: #1b2454; font-size: 11px; }
.draft-flash__revert, .draft-flash__dismiss { border: 1px solid transparent; color: inherit; background: transparent; font: inherit; cursor: pointer; }
.draft-flash__revert { padding: 0; text-decoration: underline; }
.draft-flash__dismiss { position: absolute; top: 4px; right: 5px; width: 22px; height: 22px; padding: 0; border-radius: 5px; font-size: 16px; }
.draft-flash__dismiss:hover { background: #303a70; }
.project-editor { position: relative; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; min-width: 0; min-height: 650px; border: 1px solid var(--track-border); border-radius: 10px; background: #151717; }
.project-editor__toolbar { display: flex; align-items: center; gap: 10px; padding: 7px; color: #cbd4ff; background: #17226e; }
.project-editor__source-toolbar { display: flex; width: 50%; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; }
.project-editor__tabs { display: flex; align-items: center; gap: 3px; min-width: 0; }
.project-editor__tab, .project-editor__versions, .project-editor__version, .project-editor__history-head button { min-height: 30px; padding: 5px 9px; border: 1px solid transparent; border-radius: 7px; color: var(--muted); background: transparent; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
.project-editor__tab:hover, .project-editor__versions:hover, .project-editor__version:hover { color: var(--text); background: var(--hover); }
.project-editor__tab[aria-selected="true"] { border-color: var(--track-border); color: var(--text); background: var(--card); }
.project-editor__versions { flex: 0 0 auto; display: flex; align-items: center; gap: 7px; }
.project-editor__versions svg { width: 12px; height: 12px; }
.project-editor__version-count { display: inline-flex; min-width: 19px; min-height: 19px; align-items: center; justify-content: center; padding: 1px 5px; border: 1px solid #6978cc; border-radius: 999px; font-size: 10px; }
.project-editor__workspace { display: grid; grid-template-columns: minmax(0, var(--source-width, 50%)) 7px minmax(0, 1fr); min-height: 0; overflow: hidden; background: #151717; }
.project-editor__workspace[data-view="editor"] { grid-template-columns: 1fr; }
.project-editor__workspace[data-view="editor"] .project-editor__preview, .project-editor__workspace[data-view="editor"] .project-editor__splitter { display: none; }
.project-editor__workspace[data-view="preview"] { grid-template-columns: 1fr; }
.project-editor__workspace[data-view="preview"] .project-editor__source, .project-editor__workspace[data-view="preview"] .project-editor__splitter { display: none; }
.project-editor__source, .project-editor__preview { min-width: 0; min-height: 0; overflow: auto; }
.project-editor__source { padding: 12px; overflow: hidden; }
.project-editor__mount, .project-editor__mount .cm-editor { height: 100%; min-height: 0; }
.project-editor__mount .cm-editor { background: #1d2020; }
.project-editor__mount .cm-scroller { overflow: auto; }
.project-editor__splitter { position: relative; cursor: col-resize; background: #242928; outline: none; }
.project-editor__splitter::after { content: ""; position: absolute; top: 45%; left: 2px; width: 3px; height: 10%; border-radius: 2px; background: #64706e; }
.project-editor__preview-toolbar { display: flex; flex: 1 1 auto; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; color: #eef2ff; font-size: 12px; }
.project-editor__preview > [data-project-preview] { padding: 20px; color: #edf3f2; }
.project-editor__view-controls { display: flex; gap: 2px; }
.project-editor__view-controls button { padding: 4px 7px; border: 1px solid transparent; border-radius: 4px; color: #aeb9b7; background: transparent; font: inherit; font-size: 11px; }
.project-editor__view-controls button[aria-pressed="true"] { border-color: #6978cc; color: #fff; background: #2d3c98; }
.project-editor[data-editor-loading="true"] .project-editor__mount { pointer-events: none; }
.project-editor__status { min-height: 31px; margin: 4px; padding: 4px 8px; border: 1px solid #5269e8; border-radius: 999px; color: #cbd3ff; background: #1b2454; font-size: 11px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.project-editor__status[data-state="warning"] { border-color: #c99b37; color: #ffe2a3; background: #3c3018; }
.project-editor__status[data-state="error"] { border-color: #d45b62; color: #ffd0d2; background: #421f23; }
.project-editor__notice button { appearance: none; border: 1px solid transparent; padding: 0; color: inherit; background: transparent; font: inherit; text-decoration: underline; cursor: pointer; }
.project-editor__tip { min-width: 0; display: flex; align-items: center; gap: 7px; }
.project-editor__tip[hidden], .project-editor__error[hidden] { display: none; }
.project-editor__tip span { overflow: hidden; }
.project-editor__tip button { width: 22px; height: 22px; border: 1px solid transparent; border-radius: 5px; color: var(--muted); background: transparent; font: inherit; cursor: pointer; }
.project-editor__tip button:hover, .project-editor__tip button:focus-visible { color: #fff; background: #303a70; }
.project-editor__error { min-width: 0; overflow: hidden; }
.project-editor__save { flex: 0 0 auto; }
.project-editor__history { position: absolute; top: 48px; left: 10px; z-index: 10; width: min(330px, calc(100% - 20px)); padding: 10px; border: 1px solid var(--track-border); border-radius: 10px; color: var(--text); background: var(--pop-bg); box-shadow: var(--shadow); }
.project-editor__history-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.project-editor__history-head { padding: 3px 5px 9px; }
.project-editor__version { width: 100%; text-align: left; }
.project-editor__version[aria-current="true"] { color: var(--text); background: var(--hover); opacity: 1; cursor: default; }
.layout.project-create-layout > .brand,
.layout.project-create-layout > .edge-status { min-height: 48px; padding: 4px 23px; }
.layout.project-create-layout > .main { max-width: none; padding: clamp(14px, 2vw, 28px); }
html:has(.focused-view),
body:has(.focused-view) { height: 100%; background: var(--pop-bg); overflow: hidden; }
body:has(.focused-view) { padding: 0; }
.layout.focused-view { width: 100%; height: 100vh; max-width: none; min-height: 0; margin: 0; gap: 0; overflow: hidden; background: var(--pop-bg); grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: 54px minmax(0, 1fr); grid-template-areas: "brand userbar" "main main"; }
.layout.focused-view > .focused-header,
.layout.focused-view > .brand { height: 54px; min-height: 54px; align-self: stretch; justify-self: stretch; padding: 0 9px; border: none; border-radius: 0; background: #17226e; box-shadow: none; }
.layout.focused-view > .userbar { height: 54px; min-height: 54px; align-self: stretch; justify-self: stretch; padding: 7px 9px 7px 0; border: none; border-radius: 0; background: #17226e; box-shadow: none; }
.layout.focused-view > .nav { display: none; }
.layout.focused-view > .footer { display: none; }
.layout.focused-view > .main { height: 100%; max-width: none; min-height: 0; padding: 0; overflow: hidden; }
.layout.focused-view > .main > .crumb { display: none; }
.layout.focused-view .content-root, .layout.focused-view .content-block { width: 100%; height: 100%; min-height: 0; }
.layout.focused-view .content-block { padding: 0; border: none; border-radius: 0; background: transparent; box-shadow: none; }
.focused-header { display: flex; align-items: center; }
.focused-header .crumb { align-self: center; margin: 0; padding: 0; box-shadow: none; }
.toolbar--cardless { border: none; border-radius: 0; box-shadow: none; }
.focused-view .project-editor { border-radius: 0; }
.focused-view .account-dashboard.project-create, .focused-view .project-create .create-form { height: 100%; min-height: 0; }
.focused-view .project-create__fields { gap: 9px; padding: 10px 12px; border: 1px solid var(--track-border); border-radius: 0; }
.focused-view .project-create__fields .create-form__field { gap: 4px; }
.focused-view .project-create__fields .create-form__field label,
.focused-view .project-create__fields legend { font-size: 11px; letter-spacing: 0.02em; }
.focused-view .create-form input,
.focused-view .create-form textarea,
.focused-view .create-form select { padding: 7px 9px; border-radius: 3px; background: transparent; font-size: 13px; }
.focused-view .create-form__options { gap: 10px; margin-top: 3px; font-size: 12px; }
.focused-view .create-actions { gap: 6px; }
.focused-view .account-action { min-height: 34px; padding: 6px 10px; border-radius: 6px; font-size: 12px; }
.focused-view .project-view__identity { padding: 16px; }
.focused-view .project-view__meta { margin: 0; padding: 0 16px 16px; }
.focused-view .project-view__meta span { border-radius: 3px; background: transparent; }
.focused-view .project-surface { border-radius: 0; }
.container-outline { padding: 7px 9px; border: 1px solid var(--track-border); color: var(--muted); font-size: 11px; }
.container-outline strong { display: block; margin-bottom: 6px; color: var(--text); }
.element-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.element-tag { display: inline-flex; align-items: center; padding: 2px 6px; border: 1px solid var(--track-border); border-radius: 999px; color: var(--accent); background: var(--track); font-family: "Space Mono", monospace; font-size: 10px; line-height: 1.3; }
.element-tag:hover, .element-tag:focus { border-color: var(--accent); color: var(--text); background: var(--hover); }
.field-label-with-help { display: flex; align-items: center; gap: 6px; }
.field-help { position: relative; display: inline-flex; }
.field-help__trigger { display: inline-flex; width: 17px; height: 17px; align-items: center; justify-content: center; border: 1px solid var(--muted); border-radius: 999px; color: var(--muted); font-size: 11px; }
.field-help__text { position: absolute; top: 23px; right: 0; z-index: 20; display: none; width: min(300px, 75vw); padding: 9px 11px; border: 1px solid var(--track-border); border-radius: 6px; color: var(--text); background: var(--pop-bg); box-shadow: var(--shadow); font-size: 12px; font-weight: 400; line-height: 1.4; }
.field-help:hover .field-help__text, .field-help:focus-within .field-help__text { display: block; }
.create-form textarea[data-autogrow] { min-height: 0; resize: none; }
.project-create__fields .create-form textarea[data-autogrow] { min-height: 34px; }
.project-create-layout .content-root { width: 100%; }
.project-create-layout .content-block { width: 100%; }
.layout:has(.project-workspace) > .main { max-width: none; }
.layout:has(.project-workspace) .content-root, .layout:has(.project-workspace) .content-block { width: 100%; }
.project-workspace .project-editor { min-height: calc(100vh - 190px); margin-top: 0; }

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
  .command-trigger { min-width: 42px; width: 42px; padding: 8px; justify-content: center; }
  .command-trigger > span { display: none; }
  .command-trigger kbd { border: none; padding: 0; font-size: 9px; }
  .account-grid { grid-template-columns: 1fr; }
  .account-dashboard__header, .account-section__header { align-items: flex-start; flex-direction: column; }
  .project-create__layout { grid-template-columns: minmax(0, 1fr); }
  .project-editor { min-height: 520px; }
  .layout {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    grid-template-areas:
      "brand menu"
      "main main"
      "footer footer";
  }
  .layout.home-view { grid-template-rows: auto auto minmax(0, 1fr) auto; grid-template-areas: "brand menu" "main main" "social social" "footer footer"; }
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

@media (min-width: 761px) and (max-width: 980px) {
  .project-create__layout { grid-template-columns: minmax(0, 1fr); }
  .project-create__fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .project-create__fields .create-actions { align-self: end; }
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
  .layout.document-runtime.home-view { grid-template-rows: auto auto auto minmax(0, 1fr) auto auto; grid-template-areas: "brand" "userbar" "nav" "main" "social" "footer"; }
  .document-runtime .nav {
    display: flex;
  }
}
`;
}

function projectDescription(project, i18n) {
  return project.descriptions[i18n.locale] || project.descriptions.en;
}

function projectLinks(i18n) {
  return PROJECT_ORDER.map((path) => [
    path.slice(1),
    projectDescription(PROJECTS[path], i18n),
    path,
  ]);
}

function projectGroups(i18n) {
  const groups = new Map();
  for (const path of PROJECT_ORDER) {
    const project = PROJECTS[path];
    if (!groups.has(project.kind)) groups.set(project.kind, []);
    groups.get(project.kind).push([path.slice(1), projectDescription(project, i18n), path]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([kind, items]) => ({
    h2: i18n.text("catalog.group", { kind: `${kind[0].toUpperCase()}${kind.slice(1)}` }),
    items,
  }));
}

function childrenOf(namespacePath, i18n) {
  const namespace = namespacePath.slice(1);
  return PROJECT_ORDER
    .filter((path) => PROJECTS[path].namespace === namespace)
    .map((path) => [path.slice(1), projectDescription(PROJECTS[path], i18n), path]);
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

function viewForPath(path) {
  return path === "/projects/new" || path === "/try" || (/^\/[^/]+\/[^/]+$/.test(path) && !path.startsWith("/blog/") && !path.startsWith("/docs/"))
    ? "focused"
    : "standard";
}

function brandHeaderHtml(path) {
  if (viewForPath(path) === "focused") {
    const parts = projectSegmentsForPath(path).map((segment, index) => {
      const sep = `<span class="sep">/</span>`;
      return segment.href
        ? `${sep}<a href="${segment.href}">${escapeHtml(segment.label)}</a>`
        : `${sep}<span class="here">${escapeHtml(segment.label)}</span>`;
    });
    return `<header class="box focused-header" data-screen-label="brand"><nav class="crumb" id="brand-path" aria-label="Breadcrumb"><a class="home-ic" href="/" aria-label="Home">${homeIcon()}</a>${parts.join("")}</nav></header>`;
  }
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

function blockHtml(block, options = {}) {
  if (block.type === "auth") return renderResourcesAuthBlock(block.mode, { ...options, messages: authMessages(options.i18n) });
  if (block.type === "project-summary") return projectSummaryHtml(block);
  if (block.type === "package-details") return packageDetailsHtml(block);
  const bits = [`<section class="box block content-block">`];
  if (block.eyebrow) bits.push(`<div class="block__eyebrow">${escapeHtml(block.eyebrow)}</div>`);
  if (block.h1) bits.push(`<h1>${escapeHtml(block.h1)}</h1>`);
  if (block.h2) bits.push(`<h2>${escapeHtml(block.h2)}</h2>`);
  for (const para of block.paras || []) bits.push(`<p>${escapeHtml(para)}</p>`);
  for (const para of block.markdownParas || []) bits.push(`<p>${renderBlogInline(para, escapeHtml)}</p>`);
  for (const item of block.blogBody || []) {
    if (item.type === "paragraph") bits.push(`<p>${renderBlogInline(item.markdown, escapeHtml)}</p>`);
    else if (item.type === "list") bits.push(`<ul class="blog-list">${item.items.map((entry) => `<li>${renderBlogInline(entry, escapeHtml)}</li>`).join("")}</ul>`);
    else if (item.type === "image") bits.push(`<figure class="blog-figure"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy"><figcaption>${escapeHtml(item.caption)}</figcaption></figure>`);
    else bits.push(blogExampleHtml(item.example, options.blogExamplesOrigin));
  }
  for (const example of block.examples || []) {
    bits.push(blogExampleHtml(example, options.blogExamplesOrigin));
  }
  if (block.tags) {
    bits.push(`<div class="tags">${block.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`);
  }
  if (block.items) {
    bits.push(`<div class="items">${block.items.map((item) => {
      const [name, desc, href = "#", linkOptions = {}] = item;
      const external = linkOptions.newTab ? ` target="_blank" rel="noopener noreferrer"` : "";
      return `<a href="${href}"${external}><span class="it-name">${escapeHtml(name)}</span><span class="it-desc">${escapeHtml(desc)}</span></a>`;
    }).join("")}</div>`);
  }
  bits.push(`</section>`);
  return bits.join("");
}

function blogExampleHtml(example, origin) {
  const sandbox = example.external
    ? "allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
    : "allow-scripts";
  const deferred = !example.external && !origin;
  const src = deferred ? "about:blank" : example.external ? example.url : `${origin}${example.url}`;
  const data = deferred ? ` data-example-path="${escapeHtml(example.url)}"` : "";
  return `<iframe class="blog-example" src="${escapeHtml(src)}"${data} title="${escapeHtml(example.title)}" loading="lazy" referrerpolicy="no-referrer" sandbox="${sandbox}"></iframe>`;
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

function routeForPath(path, i18n) {
  const sections = sectionsFor(i18n);
  const blogByPath = Object.fromEntries(BLOG_POSTS_BY_LOCALE[i18n.locale].map((post) => [`/blog/${post.slug}`, post]));
  const t = i18n.text;
  if (path === "/404") return notFoundRoute(i18n);
  if (sections[path]) return sections[path];
  if (blogByPath[path]) {
    const post = blogByPath[path];
    return {
      navKey: "blog",
      title: `${post.title} - Resources.co`,
      crumb: [{ icon: true, href: "/" }, { label: i18n.text("blog.heading"), href: "/blog" }, { label: post.title }],
      blocks: [{ eyebrow: post.published, h1: post.title, blogBody: post.body }],
    };
  }
  if (PROJECTS[path]) {
    const project = PROJECTS[path];
    const description = projectDescription(project, i18n);
    return {
      navKey: "collections",
      title: `${project.name} - Resources.co`,
      crumb: [
        { icon: true, href: "/" },
        { label: project.namespace, href: `/${project.namespace}` },
        { label: project.slug },
      ],
      blocks: [
        {
          type: "project-summary",
          eyebrow: project.npmName,
          h1: project.name,
          intro: t("catalog.intro", {
            description,
            kind: project.kind,
            package: project.npmName,
            directory: project.packageDir,
          }),
          facts: projectFacts(project, t),
        },
        {
          h2: i18n.locale === "es" ? "Editor del proyecto" : "Project editor",
          paras: [i18n.locale === "es" ? "Un editor Markdown aislado con vista previa en vivo." : "A sandboxed Markdown editor with a live preview."],
          examples: [{ title: "Project Markdown editor", url: "/-/blog-examples/markdown-editor/index.html", external: false }],
        },
        { type: "package-details", h2: t("common.packageMetadata"), rows: packageRows(project, t) },
      ],
    };
  }
  if (ORGS[path]) {
    const org = ORGS[path];
    const children = childrenOf(path, i18n);
    return {
      navKey: "",
      title: `${org.name} - Resources.co`,
      crumb: [{ icon: true, href: "/" }, { label: org.name }],
      blocks: [
        { eyebrow: t("common.organization"), h1: org.name, paras: [org.blurb] },
        { h2: children.length === 1 ? t("projects.one") : t("projects.many", { count: children.length }), items: children },
      ],
    };
  }
  return null;
}

function pageHtml(path, { runtime = "browser-use", i18n, blogExamplesOrigin = "" } = {}) {
  const route = routeForPath(path, i18n);
  const documentRuntime = runtime === "document";
  const authRoute = path === "/login" || path === "/signup";
  const menu = resourcesMenu({
    home: i18n.text("nav.home"),
    browse: i18n.text("nav.browse"),
    projects: i18n.text("nav.projects"),
    blog: i18n.text("nav.blog"),
    about: i18n.text("nav.about"),
  });
  const view = viewForPath(path);
  const homeSocial = path === "/" ? `<aside class="box home-social" data-screen-label="home-social"><h2>${escapeHtml(i18n.text("social.heading"))}</h2><p>${escapeHtml(i18n.text("social.intro"))}</p><div class="home-social__links"><a href="https://x.com/ResourcesCo" target="_blank" rel="noopener">${escapeHtml(i18n.text("social.x"))}</a><a href="https://www.linkedin.com/company/resources-co/" target="_blank" rel="noopener">${escapeHtml(i18n.text("social.linkedin"))}</a></div></aside>` : "";
  return `<main class="layout${documentRuntime ? " document-runtime" : ""}${path === "/" ? " home-view" : ""}${authRoute ? " auth-layout" : ""}${path === "/projects/new" ? " project-create-layout" : ""}${view === "focused" ? " focused-view" : ""}" data-view="${view}">
    ${brandHeaderHtml(path)}
    ${documentRuntime ? renderResourcesEdgeStatus({ cardless: view === "focused" }) : renderResourcesUserMenu({ cardless: view === "focused" })}
    ${documentRuntime ? "" : renderResourcesMobileMenu(route.navKey, menu)}
    <div class="main" id="main">${breadcrumbHtml(route.crumb)}<div id="content" class="content-root">${route.blocks.map((block) => blockHtml(block, { documentRuntime, i18n, blogExamplesOrigin })).join("")}</div></div>
    ${renderResourcesPrimaryMenu(route.navKey, menu)}
    ${homeSocial}
    <footer class="box footer" data-screen-label="footer"><div class="copy"><span>${escapeHtml(i18n.text("chrome.copyright"))}</span><a href="/terms">${escapeHtml(i18n.text("auth.termsOfUse"))}</a><a href="/privacy">${escapeHtml(i18n.text("auth.privacy"))}</a></div></footer>
  </main>${runtime === "browser-use" ? `
  <script type="module" src="${themeUseClientPath}"></script>
  <script type="module">${clientScript()}</script>
  <script type="module" src="${commandPaletteClientPath}"></script>
  <script type="module" src="${userMenuUseClientPath}"></script>` : ""}`;
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
const userMenuBehavior = ${JSON.stringify(RESOURCES_USER_MENU.behavior)};
const authConfig = ${JSON.stringify(RESOURCES_AUTH)};
const createSafeTriangle = ${createSafeTriangle.toString()};
const pointInSafeTriangle = ${pointInSafeTriangle.toString()};

(() => {
  const root = document.documentElement;
  const routeCache = new Map();
  let userbarSandboxPromise = null;
  let transitionDomUsePromise = null;
  let userbarHoverGuard = null;

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

  function applyAuthState(state) {
    const authenticated = state === "in";
    if (authenticated) delete document.body.dataset.auth;
    else document.body.dataset.auth = "out";
    try { localStorage.setItem(authConfig.storageKey, authenticated ? "in" : "out"); } catch {}
  }

  function initialAuthState() {
    try { return localStorage.getItem(authConfig.storageKey) || authConfig.defaultState; } catch { return authConfig.defaultState; }
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

  function beginUserbarHoverGuard(event, pop) {
    const behavior = userMenuBehavior.hover;
    if (!behavior.enabled || !behavior.safePolygon || pop.dataset.open !== "true") return;
    const panel = pop.querySelector(".popover");
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const triangle = createSafeTriangle({ x: event.clientX, y: event.clientY }, rect, behavior);
    if (!triangle) return;
    userbarHoverGuard = {
      pop,
      triangle,
      expires: performance.now() + behavior.timeoutMs,
    };
  }

  function installUserbarHoverIntent() {
    const behavior = userMenuBehavior.hover;
    const userbar = document.querySelector(".userbar");
    if (!behavior.enabled || !userbar || userbar.dataset.userbarControlled === "true") return;
    userbar.dataset.userbarControlled = "true";
    const pops = Array.from(userbar.querySelectorAll(".ub-pop"));
    pops.forEach((pop, index) => {
      const button = pop.querySelector(":scope > button");
      button?.addEventListener("pointerenter", (event) => {
        if (userbarHoverGuard && pointInSafeTriangle({ x: event.clientX, y: event.clientY }, userbarHoverGuard.triangle)) return;
        userbarHoverGuard = null;
        dispatchUserbarEvent({ type: "hover", index });
      });
      button?.addEventListener("pointerleave", (event) => beginUserbarHoverGuard(event, pop));
    });
    document.addEventListener("pointermove", (event) => {
      if (!userbarHoverGuard) return;
      if (userbarHoverGuard.pop.querySelector(".popover")?.contains(event.target)) {
        userbarHoverGuard = null;
        return;
      }
      const point = { x: event.clientX, y: event.clientY };
      if (performance.now() <= userbarHoverGuard.expires && pointInSafeTriangle(point, userbarHoverGuard.triangle)) return;
      userbarHoverGuard = null;
      const button = event.target.closest(".userbar .ub-pop > button");
      if (button) dispatchUserbarEvent({ type: "hover", index: pops.indexOf(button.closest(".ub-pop")) });
    });
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
    installUserbarHoverIntent();
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
          const inertHtml = html
            .replace(new RegExp("<head\\\\b[\\\\s\\\\S]*?</head>", "i"), "<head></head>")
            .replace(new RegExp("<script\\\\b[\\\\s\\\\S]*?</scr" + "ipt>", "gi"), "");
          return new DOMParser().parseFromString(inertHtml, "text/html");
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

  function prepareLocalExamples(rootNode = document) {
    rootNode.querySelectorAll("iframe[data-example-path]").forEach((frame) => {
      const path = frame.dataset.examplePath;
      if (!new RegExp("^/-/blog-examples/[A-Za-z0-9._~?&=/%+-]+$").test(path)) return;
      const port = location.port ? ":" + location.port : "";
      frame.src = location.protocol + "//blog-examples.localhost" + port + path;
      delete frame.dataset.examplePath;
    });
  }

  applyTheme(root.getAttribute("data-theme") || "dark");
  applyAuthState(initialAuthState());
  prepareUserbarMenus();
  preparePrefetching();
  prepareLocalExamples();
  document.addEventListener("click", (event) => {
    const provider = event.target.closest(".auth-provider");
    if (provider) {
      event.preventDefault();
      applyAuthState("in");
      navigate(new URL("/", location.href), "push");
      return;
    }
    if (event.target.closest(".auth-signout")) {
      event.preventDefault();
      applyAuthState("out");
      dispatchUserbarEvent({ type: "close" });
      navigate(new URL("/", location.href), "push");
      return;
    }
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
    const currentLayout = document.querySelector("main.layout");
    const nextLayout = nextDoc.querySelector("main.layout");
    if (!nextContent || !currentContent) {
      location.href = url.href;
      return;
    }
    document.title = nextDoc.title;
    if (currentLayout && nextLayout) {
      const view = nextLayout.dataset.view === "focused" ? "focused" : "standard";
      currentLayout.dataset.view = view;
      currentLayout.classList.toggle("focused-view", view === "focused");
    }
    if (currentBrand && nextBrand) currentBrand.outerHTML = await sanitizedOuterHTML(nextBrand);
    if (currentCrumb && nextCrumb) currentCrumb.outerHTML = await sanitizedOuterHTML(nextCrumb);
    else if (currentCrumb) currentCrumb.remove();
    else if (nextCrumb) document.getElementById("main").insertAdjacentHTML("afterbegin", await sanitizedOuterHTML(nextCrumb));
    clearSkeleton();
    await setSanitizedInnerHTML(currentContent, nextContent);
    syncActiveNav(nextDoc);
    applyTheme(root.getAttribute("data-theme") || "dark");
    preparePrefetching(currentContent);
    prepareLocalExamples(currentContent);
    if (historyMode === "push") history.pushState(null, "", url.pathname);
    scrollTo({ top: 0, behavior: "auto" });
  }
})();`;
}

export function seedResourcesSite(db, { subdomain = SUBDOMAIN } = {}) {
  for (const route of buildResourcesSiteRoutesForRuntime({ runtime: "browser-use", subdomain, locale: DEFAULT_RESOURCE_LOCALE })) putSiteRoute(db, route);
}

export function buildResourcesSiteRoutes() {
  return buildResourcesSiteRoutesForRuntime({ runtime: "browser-use" });
}

export function buildResourcesSiteRoutesForRuntime({ runtime = "local", theme = {}, subdomain = SUBDOMAIN, locale = DEFAULT_RESOURCE_LOCALE, blogExamplesOrigin = "" } = {}) {
  const profile = resourcesRuntimeProfile(runtime);
  const i18n = createTranslator(locale, RESOURCE_MESSAGES);
  const sections = sectionsFor(i18n);
  const nav = resourcesMenu({
    home: i18n.text("nav.home"),
    browse: i18n.text("nav.browse"),
    projects: i18n.text("nav.projects"),
    blog: i18n.text("nav.blog"),
    about: i18n.text("nav.about"),
  }).items;
  const stylesheet = css(theme);
  const styleUse = new StyleUse(resourcesCssSchema());
  styleUse.validateStylesheet(stylesheet);
  const domUse = new DomUse(resourcesDomSchema(), styleUse);
  const paths = [...Object.keys(sections), ...BLOG_POSTS_BY_LOCALE[locale].map((post) => `/blog/${post.slug}`), ...Object.keys(ORGS), ...PROJECT_ORDER, "/404"];
  return paths.map((path) => {
    const route = routeForPath(path, i18n);
    const authoredHtml = pageHtml(path, { runtime: profile.name, i18n, blogExamplesOrigin });
    // The edge profile is promoted to trusted static content only after passing
    // through the use-* boundary. The richer local profile keeps its authored
    // module script and applies dom-use again to each client-side page swap.
    const html = profile.name === "document" ? domUse.sanitizeHTML(authoredHtml, { strict: true }) : authoredHtml;
    return {
      subdomain,
      path,
      title: route.title,
      lang: i18n.locale,
      html,
      css: stylesheet,
      head: headHtml({ runtime: profile.name }),
      nav,
      transition: { mode: profile.navigation, routePath: path },
    };
  });
}
