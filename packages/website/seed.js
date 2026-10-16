import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { putSiteRoute, readRepoProjectMetadata } from "@macchiato-dev/site";
import { DomUse } from "@macchiato-dev/dom-use";
import { StyleUse } from "@macchiato-dev/style-use";
import { putFontAsset } from "@macchiato-dev/font-use";
import { createSafeTriangle, pointInSafeTriangle, userMenuUseClientPath } from "@macchiato-dev/user-menu-use";
import { resourcesRuntimeProfile } from "./runtime.js";
import { resourcesThemeCss } from "./theme.js";
import { themeBootstrapHtml } from "./theme-bootstrap.js";
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
        type: "home-hero",
        eyebrow: t("home.eyebrow"),
        h1: t("home.heading"),
        paras: [
          t("home.p1"),
          t("home.p2"),
        ],
      },
      { type: "home-features" },
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
  "/credits": creditsRoute(i18n),
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
    navKey: "home",
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

function creditsRoute(i18n) {
  const spanish = i18n.locale === "es";
  const item = (name, description, href) => [name, description, href, { newTab: true }];
  return {
    navKey: "",
    title: `${spanish ? "Créditos" : "Credits"} - Resources.co`,
    crumb: [{ icon: true, href: "/" }, { label: spanish ? "Créditos" : "Credits" }],
    blocks: [
      {
        h1: spanish ? "Créditos" : "Credits",
        paras: [spanish
          ? "Resources.co se construye con software abierto y con la ayuda de herramientas de desarrollo y diseño asistidas por IA."
          : "Resources.co is built with open-source software and help from AI-assisted development and design tools."],
      },
      {
        h2: spanish ? "Software e interfaz" : "Software and interface",
        items: [
          item("Lucide", spanish ? "Iconos de interfaz, incluido el icono History." : "Interface icons, including the History icon.", "https://lucide.dev/"),
          item("QuickJS", spanish ? "Motor de JavaScript usado en entornos aislados." : "JavaScript engine used by sandboxed environments.", "https://bellard.org/quickjs/"),
          item("CodeMirror", spanish ? "Editor de código extensible usado por Code Editor Use." : "Extensible code editor used by Code Editor Use.", "https://codemirror.net/"),
          item("Instrument Sans", spanish ? "Tipografía de interfaz de Rodrigo Fuenzalida, bajo la licencia SIL Open Font License." : "Interface typeface by Rodrigo Fuenzalida, under the SIL Open Font License.", "https://github.com/Instrument/instrument-sans"),
          item("JetBrains Mono", spanish ? "Tipografía monoespaciada para código e identificadores, bajo la licencia SIL Open Font License." : "Monospaced typeface for code and identifiers, under the SIL Open Font License.", "https://www.jetbrains.com/lp/mono/"),
        ],
      },
      {
        h2: spanish ? "Asistencia de IA" : "AI assistance",
        items: [
          item("Codex", spanish ? "Asistencia para desarrollo de software." : "Software-development assistance.", "https://openai.com/codex/"),
          item("GPT", spanish ? "Asistencia para razonamiento, escritura y código." : "Reasoning, writing, and coding assistance.", "https://openai.com/"),
          item("Claude Code", spanish ? "Asistencia agéntica para desarrollo de software." : "Agentic software-development assistance.", "https://www.anthropic.com/product/claude-code"),
          item("Claude Design", spanish ? "Asistencia para exploración y desarrollo del diseño." : "Design exploration and development assistance.", "https://claude.ai/"),
          item("Claude", spanish ? "Asistencia para diseño, escritura y código." : "Design, writing, and coding assistance.", "https://www.anthropic.com/claude"),
          item("Kimi", spanish ? "Asistencia para investigación y revisión." : "Research and review assistance.", "https://www.kimi.com/"),
          item("Kimi Code", spanish ? "Asistencia para exploración y revisión del código." : "Code exploration and review assistance.", "https://www.kimi.com/code"),
        ],
      },
    ],
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
  const authored = readFileSync(join(__dirname, "..", "..", "examples", "resources-website", "styles.css"), "utf8");
  const base = authored
    .replace(/html\[data-theme="dark"\]\s*\{[\s\S]*?\n\s*\}/, "")
    .replace(/html\[data-theme="light"\]\s*\{[\s\S]*?\n\s*\}/, "");
  return `${resourcesThemeCss(theme)}

${base}

${readFileSync(join(__dirname, "site.css"), "utf8")}${readFileSync(join(__dirname, "design-system.css"), "utf8")}
${readFileSync(join(__dirname, "editor-design.css"), "utf8")}
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
      <button class="ub-icon" aria-label="Notifications" aria-haspopup="true" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></button>
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

function viewForPath(path) {
  return path === "/projects/new" || path === "/try" || (/^\/[^/]+\/[^/]+$/.test(path) && path !== "/organizations/new" && !path.startsWith("/blog/") && !path.startsWith("/docs/"))
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
  // The regular site has a stable wordmark. Route breadcrumbs remain above
  // the content; project workspaces keep their existing compact path header.
  return `<header class="box brand" data-screen-label="brand"><nav class="brand__path" id="brand-path" aria-label="Resources.co"><a class="brand__home" href="/"><span class="brand__mark" aria-hidden="true">{}</span><span>Resources.co</span></a></nav></header>`;
}

function blockHtml(block, options = {}) {
  const t = options.i18n?.text;
  if (block.type === "home-hero") {
    return `<section class="box block content-block home-hero"><div class="block__eyebrow">${escapeHtml(block.eyebrow)}</div><h1>${escapeHtml(block.h1)}</h1><p>${escapeHtml(block.paras[0])}</p><div class="home-actions"><a class="account-action" href="/try">${escapeHtml(t("home.try"))}<span aria-hidden="true"> →</span></a><a class="account-action account-action--secondary" href="/browse">${escapeHtml(t("home.browse"))}</a></div><p class="home-note">${escapeHtml(block.paras[1])}</p></section>`;
  }
  if (block.type === "home-features") {
    return `<section class="home-features">${["edit", "versions", "sandbox"].map(key => `<div class="home-feature"><h2>${escapeHtml(t(`home.${key}.heading`))}</h2><p>${escapeHtml(t(`home.${key}.description`))}</p></div>`).join("")}</section>`;
  }
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
    : example.sameOrigin ? "allow-same-origin allow-scripts" : "allow-scripts";
  const deferred = !example.external && !example.sameOrigin && !origin;
  const src = deferred ? "about:blank" : example.external || example.sameOrigin ? example.url : `${origin}${example.url}`;
  const data = deferred ? ` data-example-path="${escapeHtml(example.url)}"` : "";
  const projectPath = example.project?.url.replace(/^\//, "") || "";
  const projectNamespace = projectPath.split("/")[0];
  const projectTitle = example.project?.label.replace(new RegExp(`^${projectNamespace}\\s*/\\s*`, "i"), "") || "";
  const identity = example.project
    ? `<div class="blog-example-identity"><a href="${escapeHtml(example.project.url)}">${escapeHtml(projectTitle)}</a><span class="blog-example-slug">${escapeHtml(projectPath)}</span></div>`
    : `<span>${escapeHtml(example.title)}</span>`;
  return `<figure class="blog-example-block"><iframe class="blog-example" src="${escapeHtml(src)}"${data} title="${escapeHtml(example.title)}" loading="lazy" referrerpolicy="no-referrer" sandbox="${sandbox}"></iframe><figcaption class="blog-example-panel">${identity}<button class="blog-example-fullscreen" type="button" aria-label="View full screen">View full screen ↗</button></figcaption><output class="blog-example-error" role="alert" hidden></output></figure>`;
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
  const readingRoute = path === "/blog" || path.startsWith("/blog/") || ["/about", "/terms", "/privacy", "/credits", "/help"].includes(path);
  const menu = resourcesMenu({
    home: i18n.text("nav.home"),
    browse: i18n.text("nav.browse"),
    projects: i18n.text("nav.projects"),
    blog: i18n.text("nav.blog"),
    about: i18n.text("nav.about"),
  });
  const view = viewForPath(path);
  const homeSocial = path === "/" ? `<aside class="box home-social" data-screen-label="home-social"><h2>${escapeHtml(i18n.text("social.heading"))}</h2><p>${escapeHtml(i18n.text("social.intro"))}</p><div class="home-social__links"><a href="https://x.com/ResourcesCo" target="_blank" rel="noopener">${escapeHtml(i18n.text("social.x"))}</a><a href="https://www.linkedin.com/company/resources-co/" target="_blank" rel="noopener">${escapeHtml(i18n.text("social.linkedin"))}</a></div></aside>` : "";
  return `<main class="layout${documentRuntime ? " document-runtime" : ""}${path === "/" ? " home-view" : ""}${authRoute ? " auth-layout" : ""}${readingRoute ? " reading-view" : ""}${path === "/projects/new" ? " project-create-layout" : ""}${view === "focused" ? " focused-view" : ""}" data-view="${view}">
    ${brandHeaderHtml(path)}
    ${documentRuntime ? renderResourcesEdgeStatus({ cardless: view === "focused" }) : renderResourcesUserMenu({ cardless: view === "focused" })}
    ${documentRuntime ? "" : renderResourcesMobileMenu(route.navKey, menu)}
    <div class="main" id="main">${breadcrumbHtml(route.crumb)}<div id="content" class="content-root">${route.blocks.map((block) => blockHtml(block, { documentRuntime, i18n, blogExamplesOrigin })).join("")}</div></div>
    ${renderResourcesPrimaryMenu(route.navKey, menu)}
    ${homeSocial}
    <footer class="box footer" data-screen-label="footer"><div class="copy"><span>${escapeHtml(i18n.text("chrome.copyright"))}</span><a href="/terms">${escapeHtml(i18n.text("auth.termsOfUse"))}</a><a href="/privacy">${escapeHtml(i18n.text("auth.privacy"))}</a><a href="/credits">${i18n.locale === "es" ? "Créditos" : "Credits"}</a></div></footer>
  </main>${runtime === "browser-use" ? `
  <script type="module" src="${themeUseClientPath}"></script>
  <script type="module">${clientScript()}</script>
  <script type="module" src="${commandPaletteClientPath}"></script>
  <script type="module" src="${userMenuUseClientPath}"></script>` : ""}`;
}

function headHtml({ runtime = "browser-use" } = {}) {
  if (runtime === "document") return themeBootstrapHtml;
  return `${themeBootstrapHtml}\n<script type="importmap">
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

${readFileSync(join(__dirname, "local-client.js"), "utf8").trimEnd()}`;
}

export function seedResourcesSite(db, { subdomain = SUBDOMAIN } = {}) {
  // The SQLite development profile serves the fonts the edge build embeds.
  for (const [assetPath, sourceUrl] of [
    ["instrument-sans-latin.woff2", "https://github.com/Instrument/instrument-sans"],
    ["jetbrains-mono-latin.woff2", "https://github.com/JetBrains/JetBrainsMono"],
  ]) putFontAsset(db, {
    name: "resourcesco-design", assetPath, sourceUrl, provider: "self",
    content: readFileSync(join(__dirname, "assets", "fonts", "design", assetPath)),
  });
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
      head: (viewForPath(path) === "focused" ? '<meta name="resources-workspace" content="true">\n' : "") + headHtml({ runtime: profile.name }),
      nav,
      transition: { mode: profile.navigation, routePath: path },
    };
  });
}
