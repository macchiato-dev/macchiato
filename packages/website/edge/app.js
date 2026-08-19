import {
  normalizeExportManifest,
  pathToObjectKey,
  publicResponseHeaders,
  storageRequest,
} from "./models.js";
import { localeCookie, localizedObjectKey, negotiateLocale, parseLanguageRoute, parseLanguageSelection } from "./i18n.js";
import { finishGithubAuth, readSession, refreshedSessionCookie, signOut, startGithubAuth } from "../auth/github.js";
import { finishGitlabAuth, startGitlabAuth } from "../auth/gitlab.js";
import { seal, unseal } from "../auth/session.js";
import { ContentConflictError, ContentValidationError } from "@macchiato-dev/hub/content";
import { AccountConflictError, AccountValidationError } from "@macchiato-dev/hub/accounts";
import { OrganizationAccessError, OrganizationInputError } from "@macchiato-dev/hub/organizations";
import { validateAllowedUrlPatterns } from "@macchiato-dev/hub/url-pattern";
import {
  renderResourcesCommandPalette,
  resourcesAppearanceHtml,
  resourcesBellIconHtml,
  resourcesBlankAvatarHtml,
  resourcesCreateIconHtml,
} from "../components/user-menu.js";
import { commandPaletteClientPath } from "@macchiato-dev/command-palette-use";
import { themeUseClientPath } from "@macchiato-dev/theme-use";
import { userMenuUseClientPath } from "@macchiato-dev/user-menu-use";

const MANIFEST_KEY = "manifest.json";
const ACCOUNT_CONTENT_MARKER = "<p>__RESOURCES_ACCOUNT_CONTENT__</p>";
const PUBLIC_PROJECTS_MARKER = "<p>__RESOURCES_PUBLIC_PROJECTS__</p>";
const ACCOUNT_PATHS = new Set(["/", "/projects", "/projects/new", "/organizations/new", "/profile"]);
const PROTECTED_ACCOUNT_PATHS = new Set(["/projects", "/projects/new", "/organizations/new", "/profile"]);
const DISCOVERABLE_PROJECT_NAMESPACES = Object.freeze(["benatkin", "resources", "macchiato"]);

async function fetchStorage(fetchImpl, request) {
  const response = await fetchImpl(request);
  if (response.status >= 300 && response.status < 400) throw new Error("Storage redirects are not allowed");
  return response;
}

function storageResponseError(config, key, response, label = "Storage") {
  const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  const objectKey = [...config.bucketPrefix.split("/"), ...String(key).split("/")].join("/");
  const hint = response.status === 404
    ? " Confirm BUNNY_STORAGE_ORIGIN ends at the Storage zone root and that this exact object key exists."
    : " Check the Storage endpoint, access key permissions, and Bunny service status.";
  return new Error(`${label} response: ${status}; object key=${JSON.stringify(objectKey)}; storage origin=${JSON.stringify(config.storageOrigin)}.${hint}`);
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const focusedHomeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path></svg>`;
const projectCloseIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"></path></svg>`;
// Lucide `history`, kept inline so the focused editor remains self-contained.
const projectHistoryIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>`;
function focusedProjectDocument(html, namespace, slug) {
  const header = `<header class="box focused-header" data-screen-label="brand"><nav class="crumb" id="brand-path" aria-label="Breadcrumb"><a class="home-ic" href="/" aria-label="Home">${focusedHomeIcon}</a><span class="sep">/</span><a href="/${encodeURIComponent(namespace)}">${escapeHtml(namespace)}</a><span class="sep">/</span><span class="here">${escapeHtml(slug)}</span></nav></header>`;
  return html
    .replace(/<main class="layout([^"]*)" data-view="standard">/, `<main class="layout$1 focused-view" data-view="focused">`)
    .replace(/<header class="box (?:brand|project-identity|focused-header)"[\s\S]*?<\/header>/, header);
}

function embeddedProjectDocument(html) {
  return html
    .replace(/<main class="layout([^"]*)" data-view="standard">/, `<main class="layout$1 embed-view" data-view="embed">`)
    .replace(/<main class="layout([^"]*) focused-view" data-view="focused">/, `<main class="layout$1 embed-view" data-view="embed">`);
}

function namespaceDocument(html, namespace) {
  const crumb = `<nav class="box crumb" id="crumb" aria-label="Breadcrumb"><a class="home-ic" aria-label="Home" href="/">${focusedHomeIcon}</a><span class="sep">/</span><span class="here">${escapeHtml(namespace.namespace)}</span></nav>`;
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(namespace.name)} - Resources.co</title>`)
    .replace(/<nav class="box crumb" id="crumb"[\s\S]*?<\/nav>/, crumb);
}

function message(messages, key, fallback) {
  return escapeHtml(messages?.[key] || fallback);
}

function languageMenuHtml(locale, pathname, messages) {
  return `<div class="menu__head">${message(messages, "chrome.language", "Language")}</div>
    <form class="profile-language" method="get" action="/language">
      <select name="locale" aria-label="${message(messages, "chrome.language", "Language")}" data-language-select>
        <option value="en"${locale === "en" ? " selected" : ""}>English</option>
        <option value="es"${locale === "es" ? " selected" : ""}>Español</option>
      </select>
      <input type="hidden" name="return" value="${escapeHtml(pathname)}">
    </form>`;
}

function notificationMenuHtml(messages, notifications = [], csrf = "") {
  const items = notifications.map((item) => `<article class="notification${item.read ? " is-read" : ""}">
    <p><b>${escapeHtml(item.inviter)}</b> invited you to join <b>${escapeHtml(item.organizationName)}</b> as ${escapeHtml(item.role)}.</p>
    <div class="notification__actions">${item.status === "pending" ? `<form method="post" action="/notifications/${encodeURIComponent(item.id)}"><input type="hidden" name="csrf" value="${escapeHtml(csrf)}"><button name="intent" value="accept" type="submit">Accept</button><button name="intent" value="read" type="submit">Mark read</button><button name="intent" value="delete" type="submit">Delete</button></form>` : `<a href="/${encodeURIComponent(item.organizationSlug)}">View organization</a><form method="post" action="/notifications/${encodeURIComponent(item.id)}"><input type="hidden" name="csrf" value="${escapeHtml(csrf)}"><button name="intent" value="delete" type="submit">Delete</button></form>`}</div>
  </article>`).join("");
  return `<details class="edge-user-menu edge-icon-menu">
    <summary class="edge-user-menu__trigger ub-icon" aria-label="${message(messages, "account.notifications", "Notifications")}">${resourcesBellIconHtml}</summary>
    <div class="popover edge-user-menu__panel notification-panel"><div class="menu__head">${message(messages, "account.notifications", "Notifications")}</div>${items || `<div class="menu__empty">${message(messages, "account.noNotifications", "You're all caught up.")}</div>`}</div>
  </details>`;
}

function createMenuHtml(messages) {
  return `<details class="edge-user-menu edge-icon-menu">
    <summary class="edge-user-menu__trigger ub-icon" aria-label="${message(messages, "account.create", "Create new")}">${resourcesCreateIconHtml}</summary>
    <div class="popover edge-user-menu__panel">
      <a class="item" href="/projects/new">${message(messages, "account.newProject", "New project")}</a>
      <a class="item" href="/organizations/new">${message(messages, "account.newOrganization", "New organization")}</a>
    </div>
  </details>`;
}

function authStatusHtml(session, messages = {}, { locale = "en", pathname = "/", focused = false, signupsEnabled = false, notifications = [], notificationCsrf = "" } = {}) {
  const shellClass = `box userbar edge-status${focused ? " toolbar--cardless" : ""}`;
  if (!session) {
    return `<aside class="${shellClass}" data-screen-label="runtime-status">
      ${renderResourcesCommandPalette()}
      ${notificationMenuHtml(messages)}
      ${createMenuHtml(messages)}
      <details class="edge-user-menu edge-guest-menu"><summary class="edge-user-menu__trigger ub-acct" aria-label="${message(messages, "account.menu", "Account menu")}">${resourcesBlankAvatarHtml}<svg class="ub-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg></summary>
        <div class="popover edge-user-menu__panel"><a class="item" href="/settings">${message(messages, "account.settings", "Settings")}</a><a class="item" href="/help">${message(messages, "account.help", "Help & docs")}</a><div class="menu__sep"></div>${resourcesAppearanceHtml}<div class="menu__sep"></div>${languageMenuHtml(locale, pathname, messages)}<div class="menu__sep"></div><a class="item" href="/login">${message(messages, "auth.login", "Log in")}</a>${signupsEnabled ? `<a class="item" href="/signup">${message(messages, "auth.signup", "Sign up")}</a>` : ""}</div>
      </details>
    </aside>`;
  }
  const initials = session.login.slice(0, 2).toUpperCase();
  return `<aside class="${shellClass}" data-screen-label="runtime-status">
    ${renderResourcesCommandPalette()}
    ${notificationMenuHtml(messages, notifications, notificationCsrf)}
    ${createMenuHtml(messages)}
    <details class="edge-user-menu">
      <summary class="edge-user-menu__trigger ub-acct" aria-label="${message(messages, "account.menu", "Account menu")}">
        <span class="ub-avatar">${escapeHtml(initials)}</span>
        <svg class="ub-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg>
      </summary>
      <div class="popover edge-user-menu__panel">
        <div class="menu__acct"><span class="ub-avatar">${escapeHtml(initials)}</span><div class="menu__acct-meta"><b>${escapeHtml(session.name)}</b><span>@${escapeHtml(session.login)}</span></div></div>
        <div class="menu__sep"></div>
        <a class="item" href="/projects">${message(messages, "account.projects", "Your projects")}</a>
        <a class="item" href="/profile">${message(messages, "account.profile", "Your profile")}</a>
        <div class="menu__sep"></div>
        <a class="item" href="/settings">${message(messages, "account.settings", "Settings")}</a>
        <a class="item" href="/help">${message(messages, "account.help", "Help & docs")}</a>
        <div class="menu__sep"></div>
        ${resourcesAppearanceHtml}
        <div class="menu__sep"></div>
        ${languageMenuHtml(locale, pathname, messages)}
        <div class="menu__sep"></div>
        <form method="post" action="/logout"><button class="item item--danger" type="submit">${message(messages, "account.signout", "Sign out")}</button></form>
      </div>
    </details>
  </aside>`;
}

function signupDisabledCard(messages) {
  return `<section class="box block auth-card"><div class="auth-eyebrow">${message(messages, "auth.signup", "Sign up")}</div><h1>${message(messages, "auth.signupDisabled", "Sign up is not currently enabled")}</h1><p>${message(messages, "auth.signupDisabledUpdates", "Follow us on X or LinkedIn for updates.")}</p><div class="auth-alt"><a href="https://x.com/ResourcesCo" target="_blank" rel="noopener">X</a> · <a href="https://www.linkedin.com/company/resources-co/" target="_blank" rel="noopener">LinkedIn</a></div><div class="auth-alt"><a href="/login">${message(messages, "auth.login", "Log in")}</a></div></section>`;
}

function applySignupPolicy(html, pathname, messages, signupsEnabled) {
  if (signupsEnabled) return html;
  html = html.replace(/<a class="item" href="\/signup">[\s\S]*?<\/a>/g, "");
  if (pathname === "/signup") return html.replace(/<section class="box block auth-card">[\s\S]*?<\/section>/, signupDisabledCard(messages));
  if (pathname === "/login") return html.replace(/<div class="auth-alt">[\s\S]*?<\/div>/, "");
  return html;
}

function renderSessionHtml(html, session, messages, options, contentFormVersion = "") {
  const contentFormSrc = `/-/resources-site/content-form.js${contentFormVersion ? `?v=${contentFormVersion}` : ""}`;
  return html
    .replace(/<aside class="box userbar edge-status(?: toolbar--cardless)?"[\s\S]*?<\/aside>/, authStatusHtml(session, messages, options))
    .replace("</body>", `<script type="module" src="${commandPaletteClientPath}"></script><script type="module" src="${themeUseClientPath}"></script><script type="module" src="${userMenuUseClientPath}"></script><script type="module" src="${contentFormSrc}"></script></body>`);
}

function checked(value, expected) {
  return value === expected ? " checked" : "";
}

function selected(value, expected) {
  return value === expected ? " selected" : "";
}

function initialProjectSnapshot() {
  return {
    files: [
      { path: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width\">\n  <title>A small article</title>\n  <link rel=\"stylesheet\" href=\"./style.css\">\n</head>\n<body>\n  <article>\n    <h1>A small article</h1>\n    <p><a href=\"https://en.wikipedia.org/wiki/Hypertext\">Hypertext</a> connects documents through links and gives the web its navigable structure.</p>\n    <p><a href=\"https://en.wikipedia.org/wiki/WebAssembly\">WebAssembly</a> provides a portable execution format for programs in the browser.</p>\n    <p><a href=\"https://en.wikipedia.org/wiki/Capability-based_security\">Capability-based security</a> limits programs to the authority they are explicitly given.</p>\n  </article>\n</body>\n</html>" },
      { path: "style.css", content: "body {\n  margin: 0;\n  font: 17px/1.6 system-ui, sans-serif;\n  color: #eef2ff;\n  background: #151717;\n}\narticle {\n  max-width: 44rem;\n  margin: auto;\n  padding: 3rem 2rem;\n}\na { color: #30d5c8; }\n" },
    ],
    config: { entry: "index.html", template: "article", container: "article", containerOptions: { allowedLinkPatterns: ["*.wikipedia.org"], links: { addTargetBlank: true } }, sandbox: { network: false, storage: "session" } },
  };
}

function validateProjectUrlPatterns(snapshot) {
  const patterns = snapshot?.config?.containerOptions?.allowedLinkPatterns || snapshot?.config?.container?.allowedLinkPatterns;
  if (patterns === undefined) return;
  if (!Array.isArray(patterns) || patterns.some((pattern) => typeof pattern !== "string")) throw new ContentValidationError("snapshot", "allowed link URL patterns must be strings");
  try {
    validateAllowedUrlPatterns(patterns);
  } catch (error) {
    throw new ContentValidationError("snapshot", error.message);
  }
}

function projectEditorHtml({ snapshot, snapshotUrl = "", versionCount = 1, projectId = "", csrf = "", messages, persistence = "stored", readOnly = false, blogExamplesOrigin = "" }) {
  const initialSaveState = readOnly ? message(messages, "projectEditor.readOnly", "Read only") : "";
  const initialStatusState = "normal";
  return `<section class="project-editor" data-project-editor data-editor-machine-state="starting" data-project-id="${escapeHtml(projectId)}" data-persistence="${escapeHtml(persistence)}" data-read-only="${readOnly}" data-csrf="${escapeHtml(csrf)}" data-config-label="${message(messages, "projectEditor.configuration", "Configuration")}" data-current-version-label="${message(messages, "projectEditor.currentVersion", "Current Version")}" data-template-replaced-label="${message(messages, "projectEditor.templateReplaced", "Template replaced the project.")}" data-undo-label="${message(messages, "common.undo", "Undo")}">
    <span hidden data-blog-examples-origin="${escapeHtml(blogExamplesOrigin)}"></span><span hidden data-project-snapshot-url="${escapeHtml(snapshotUrl)}"></span>
    <div class="project-editor__toolbar">
      <div class="project-editor__source-toolbar"><div class="project-editor__tabs" data-project-tabs role="tablist" aria-label="Open project files"></div><div class="project-editor__file-picker" data-project-file-picker><button type="button" data-project-file-trigger aria-haspopup="menu" aria-expanded="false"><span data-project-file-current></span><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m2 4 4 4 4-4"></path></svg></button><div class="project-editor__file-menu" data-project-file-menu role="menu" hidden><label><span>${message(messages, "projectEditor.filterFiles", "Filter files")}</span><input type="search" data-project-file-filter autocomplete="off" placeholder="${message(messages, "projectEditor.filterFiles", "Filter files")}"></label><div data-project-file-options data-open-files-label="${message(messages, "projectEditor.openFiles", "Open files")}"></div><p data-project-file-empty hidden>${message(messages, "projectEditor.noMatchingFiles", "No matching files")}</p></div></div><div class="project-editor__source-actions"><button class="project-editor__versions" type="button" data-project-versions-proxy data-instant-tooltip="${message(messages, "projectEditor.history", "Version history")}" aria-label="${message(messages, "projectEditor.history", "Version history")}" aria-haspopup="dialog" aria-expanded="false">${projectHistoryIcon}<svg class="project-editor__history-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m2 4 4 4 4-4"></path></svg><span data-current-version hidden>${message(messages, "projectEditor.currentVersion", "Current Version")}</span><span class="project-editor__version-count" hidden>${versionCount}</span></button><div class="project-overflow" data-editor-overflow><button type="button" data-editor-overflow-trigger aria-label="Editor menu" aria-haspopup="menu" aria-expanded="false">•••</button><div class="project-overflow__menu" data-editor-overflow-menu role="menu" hidden><button type="button" role="menuitem" data-save-tab-configuration>Save tab configuration</button><button type="button" role="menuitem" data-project-import>Import ZIP</button><button type="button" role="menuitem" data-project-export>Export ZIP</button></div></div><input type="file" data-project-archive-file accept="application/zip,.zip" hidden></div></div>
      <div class="project-editor__toolbar-split" aria-hidden="true"></div>
      <div class="project-editor__preview-toolbar"><span data-preview-title>Output View</span><div class="project-editor__view-controls"><div class="project-view-segments" role="group" aria-label="Workspace view"><button type="button" data-project-view="editor" aria-label="Editor" data-instant-tooltip="Editor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h16v13H4zM9 10l-2 2 2 2M12 15h4"/></svg></button><button type="button" data-project-view="split" aria-label="Split view" data-instant-tooltip="Split view" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 5.5h17v13h-17zM12 5.5v13M6.5 9h2M15.5 9h2"/></svg></button><button type="button" data-project-view="preview" aria-label="Output View" data-instant-tooltip="Output View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h16v13H4zM8 15l3-3 2 2 3-4 2 2"/></svg></button></div><button type="button" class="project-details-toggle" data-project-view="details" aria-label="Details" data-instant-tooltip="Details"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 10.5v5M12 7.5h.01"/></svg></button><button type="button" data-project-present aria-label="Full screen" data-instant-tooltip="Full screen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg></button></div></div>
    </div>
    <textarea name="snapshot" data-project-snapshot hidden>${escapeHtml(JSON.stringify(snapshot))}</textarea>
    <div class="project-editor__workspace" data-view="split">
      <section class="project-editor__source" aria-label="${message(messages, "projectCreate.editor", "Sandboxed project editor")}"><div id="editor" class="project-editor__mount" data-project-editor-mount></div></section>
      <div class="project-editor__splitter" role="separator" aria-label="Resize editor and preview" aria-orientation="vertical" aria-valuemin="20" aria-valuemax="80" aria-valuenow="50" tabindex="0"></div>
      <section class="project-editor__preview" aria-label="Project output"><button class="project-editor__present-close" type="button" data-project-present-close aria-label="Close full screen">×</button><div data-project-preview></div><div class="project-editor__status" role="status" data-project-status data-state="${initialStatusState}" hidden><span class="project-editor__notice" data-project-notice hidden></span><span class="project-editor__error" data-project-error hidden></span><span class="project-editor__save" data-project-save hidden>${initialSaveState}</span></div></section>
    </div>
    <aside class="project-editor__history" data-project-history role="dialog" aria-label="${message(messages, "projectEditor.history", "Version history")}" hidden><div class="project-editor__history-head"><strong>${message(messages, "projectEditor.history", "Version history")}</strong><button type="button" data-project-history-close aria-label="${message(messages, "projectEditor.closeHistory", "Close version history")}">×</button></div><div data-project-version-list></div></aside>
  </section>`;
}

function projectRoute(pathname) {
  try {
    const match = /^\/([^/]+)\/([^/]+)(?:\/(embed))?$/.exec(decodeURIComponent(pathname));
    return match ? { namespace: match[1], slug: match[2], embed: match[3] === "embed" } : null;
  } catch {
    return null;
  }
}

function projectWorkspaceRoute(pathname) {
  try {
    const match = /^\/-\/projects\/([^/]+)\/([^/]+)\/workspace$/.exec(decodeURIComponent(pathname));
    return match ? { namespace: match[1], slug: match[2] } : null;
  } catch {
    return null;
  }
}

function namespaceRoute(pathname) {
  try {
    const match = /^\/([^/]+)$/.exec(decodeURIComponent(pathname));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function csrfToken(session, action, authConfig, now) {
  return seal({ v: 1, sub: session.sub, action, exp: now() + 20 * 60_000 }, authConfig.sessionSecret);
}

async function validCsrf(value, session, action, authConfig, now) {
  const token = await unseal(value, authConfig.sessionSecret);
  return token?.v === 1 && token.sub === session.sub && token.action === action && token.exp >= now();
}

function dashboardHtml(content, messages) {
  const projects = content.projects.length
    ? `<div class="account-grid">${content.projects.map((item) => `<a class="account-card" data-project-link href="/${encodeURIComponent(item.namespace)}/${encodeURIComponent(item.slug)}">
        <h3>${escapeHtml(item.name)}</h3>
        <span class="account-card__namespace">${escapeHtml(item.namespace)}/${escapeHtml(item.slug)}</span>
        <p>${escapeHtml(item.description || `${item.template.toUpperCase()} project`)}</p>
        <span class="account-card__meta">${message(messages, `dashboard.${item.visibility}`, item.visibility)}</span>
      </a>`).join("")}</div>`
    : `<div class="account-empty">${message(messages, "dashboard.noProjects", "No projects yet.")}</div>`;
  const organizations = content.organizations.length
    ? `<div class="account-grid">${content.organizations.map((item) => `<a class="account-card" href="/${encodeURIComponent(item.slug)}">
        <span class="account-card__namespace">${message(messages, "common.organization", "Organization")}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description || item.slug)}</p>
      </a>`).join("")}</div>`
    : `<div class="account-empty">${message(messages, "dashboard.noOrganizations", "No organizations yet.")}</div>`;
  return `<div class="account-dashboard">
    <div class="account-dashboard__header"><div><h1>${message(messages, "dashboard.heading", "Your projects")}</h1><p class="account-dashboard__intro">${message(messages, "dashboard.intro", "Projects and organizations owned by your account.")}</p></div>
      <a class="account-action" href="/projects/new">${message(messages, "account.newProject", "New Project")}</a></div>
    <div class="create-actions"><a class="account-action account-action--secondary" href="/organizations/new">${message(messages, "account.newOrganization", "New organization")}</a></div>
    <section class="account-section"><div class="account-section__header"><h2>${message(messages, "dashboard.projects", "Projects")}</h2></div>${projects}<div class="create-actions"><a class="account-action account-action--secondary" href="/projects">${message(messages, "dashboard.viewAllProjects", "View all projects")}</a></div></section>
    <section class="account-section"><div class="account-section__header"><h2>${message(messages, "dashboard.organizations", "Organizations")}</h2></div>${organizations}</section>
  </div>`;
}

function projectsHtml(content, messages) {
  const projects = content.projects.length
    ? `<div class="account-grid">${content.projects.map((item) => `<a class="account-card" data-project-link href="/${encodeURIComponent(item.namespace)}/${encodeURIComponent(item.slug)}">
        <h3>${escapeHtml(item.name)}</h3>
        <span class="account-card__namespace">${escapeHtml(item.namespace)}/${escapeHtml(item.slug)}</span>
        <p>${escapeHtml(item.description || `${item.template.toUpperCase()} project`)}</p>
        <span class="account-card__meta">${message(messages, `dashboard.${item.visibility}`, item.visibility)}</span>
      </a>`).join("")}</div>`
    : `<div class="account-empty">${message(messages, "dashboard.noProjects", "No projects yet.")}</div>`;
  return `<div class="account-dashboard"><div class="account-dashboard__header"><div><h1>${message(messages, "dashboard.projects", "Projects")}</h1></div><a class="account-action" href="/projects/new">${message(messages, "account.newProject", "New Project")}</a></div><section class="account-section">${projects}</section></div>`;
}

function formError(url, messages) {
  const error = url.searchParams.get("error");
  return error
    ? `<p class="form-error" role="alert">${error === "slug" ? message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.") : message(messages, "content.error", "Check the form and try again.")}</p>`
    : "";
}

function projectFieldsHtml({ session, content, project = null, snapshot, messages, editable, submitLabel, hasUnpublishedChanges = false, draft = false, versionCount = 1 }) {
  const disabled = editable ? "" : " disabled";
  const container = String(snapshot?.config?.container || "article");
  const templateName = String(snapshot?.config?.template || project?.template || "article");
  const patterns = snapshot?.config?.containerOptions?.allowedLinkPatterns || [];
  const namespaceOptions = editable && session ? [
    `<option value="user"${selected(project?.namespaceKind || "user", "user")}>@${escapeHtml(session.login)}</option>`,
    ...content.organizations.map((item) => `<option value="${escapeHtml(item.id)}"${selected(project?.namespace === item.slug ? item.id : "", item.id)}>${escapeHtml(item.name)}</option>`),
  ].join("") : `<option>${escapeHtml(project?.namespace || "")}</option>`;
  return `<div class="project-create__fields" data-project-fields>
    <div class="project-fields__toolbar">${editable ? `<div class="project-fields__toolbar-actions"><div class="project-overflow" data-project-overflow><button type="button" data-project-overflow-trigger aria-label="Project menu" aria-haspopup="menu" aria-expanded="false">•••</button><div class="project-overflow__menu" data-project-overflow-menu role="menu" hidden><button type="button" role="menuitem" ${draft ? "data-open-draft-delete" : "data-open-project-delete"}>${draft ? message(messages, "projectCreate.discardDraft", "Discard draft") : message(messages, "projectView.delete", "Delete project")}</button></div></div><a class="project-close" href="/projects" aria-label="Close project">${projectCloseIcon}</a></div>` : `<a class="project-close" href="/projects" aria-label="Close project">${projectCloseIcon}</a>`}</div>
    <div class="create-form__field"><label for="project-template">${message(messages, "projectCreate.template", "Template")}</label><select id="project-template" name="template" data-project-template${disabled}><option value="article"${selected(templateName, "article")}>${message(messages, "projectCreate.article", "Article")}</option><option value="hello"${selected(templateName, "hello")}>${message(messages, "projectCreate.hello", "Hello, HTML")}</option><option value="html"${selected(templateName, "html")}>Single-file document</option><option value="clock"${selected(templateName, "clock")}>${message(messages, "projectCreate.clock", "Digital clock")}</option><option value="mark"${selected(templateName, "mark")}>${message(messages, "projectCreate.mark", "Logo mark")}</option><option value="chart"${selected(templateName, "chart")}>${message(messages, "projectCreate.chart", "Bar chart")}</option><option value="ball"${selected(templateName, "ball")}>${message(messages, "projectCreate.ball", "Bouncing ball")}</option><option value="stars"${selected(templateName, "stars")}>${message(messages, "projectCreate.stars", "Starfield")}</option><option value="blank"${selected(templateName, "blank")}>${message(messages, "projectCreate.blank", "Blank project")}</option></select></div>
    <div class="create-form__field"><label for="project-container">${message(messages, "projectCreate.container", "Container")}</label><select id="project-container" name="container" data-project-container${disabled}><option value="article"${selected(container, "article")}>${message(messages, "projectCreate.article", "Article")}</option><option value="page"${selected(container, "page")}>${message(messages, "projectCreate.page", "Page")}</option><option value="canvas"${selected(container, "canvas")}>Canvas</option><option value="svg"${selected(container, "svg")}>SVG</option><option value="single-file-web-app"${selected(container, "single-file-web-app")}>Single-file HTML/CSS/JS</option></select></div>
    <div class="create-form__field"><div class="field-label-with-help"><label for="project-link-patterns">${message(messages, "projectCreate.allowedLinks", "Allowed Link URL Patterns")}</label><span class="field-help"><span class="field-help__trigger" tabindex="0" aria-label="${message(messages, "projectCreate.allowedLinksHelp", "URL pattern syntax")}">?</span><span class="field-help__text" role="tooltip">${message(messages, "projectCreate.allowedLinksHelp", "Use a hostname with wildcards, optionally followed by a path. Surround a specific URL with backquotes or a JavaScript regular expression with forward slashes.")}</span></span></div><textarea id="project-link-patterns" name="allowedLinkPatterns" rows="1" wrap="off" data-autogrow${disabled}>${escapeHtml(patterns.join("\n"))}</textarea></div>
    <div class="create-form__field"><label for="project-name">${message(messages, "projectCreate.name", "Title")}</label><input id="project-name" name="name" maxlength="80" value="${escapeHtml(project?.name || "")}" data-slug-source="project-slug" required${disabled}></div>
    <div class="create-form__field"><label for="project-slug">${message(messages, "projectCreate.slug", "Name")}</label><input id="project-slug" name="slug" maxlength="63" value="${escapeHtml(project?.slug || "")}" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" aria-describedby="project-slug-error" autocapitalize="none" autocomplete="off" spellcheck="false" required${disabled}><p id="project-slug-error" class="form-field-error" data-message="${message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.")}" hidden>${message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.")}</p></div>
    <div class="create-form__field"><label for="project-description">${message(messages, "projectCreate.description", "Description (optional)")}</label><textarea id="project-description" name="description" maxlength="500" rows="1" data-autogrow${disabled}>${escapeHtml(project?.description || "")}</textarea></div>
    ${editable ? `<div class="create-form__field"><label for="project-namespace">${message(messages, "projectCreate.namespace", "Namespace")}</label><select id="project-namespace" name="namespace">${namespaceOptions}</select></div>
    <fieldset><legend>${message(messages, "projectCreate.visibility", "Visibility")}</legend><div class="create-form__options"><label><input type="radio" name="visibility" value="public"${checked(project?.visibility || "public", "public")}> ${message(messages, "dashboard.public", "Public")}</label><label><input type="radio" name="visibility" value="private"${checked(project?.visibility, "private")}> ${message(messages, "dashboard.private", "Private")}</label></div></fieldset>` : ""}
    ${editable ? `<div class="draft-flash" data-draft-flash${hasUnpublishedChanges ? "" : " hidden"}><span>${message(messages, "projectView.unsavedDraft", "There are draft changes.")}</span><button class="draft-flash__revert" type="submit" name="intent" value="revert" formnovalidate>${message(messages, "projectView.revertPublished", "Revert to published version")}</button><button class="draft-flash__dismiss" type="button" data-dismiss-draft-flash aria-label="${message(messages, "common.dismiss", "Dismiss")}">×</button></div>` : ""}
    ${editable ? `<input type="hidden" name="versionTitle" data-version-title><div class="create-actions">${draft ? `<button class="account-action" type="submit" data-project-submit data-default-label="${escapeHtml(submitLabel)}">${submitLabel}</button>` : `<div class="save-split" data-save-split><button class="account-action save-split__primary" type="submit" data-project-submit data-default-label="${escapeHtml(submitLabel)}"${project && !hasUnpublishedChanges ? " disabled" : ""}>${submitLabel}</button><button class="account-action save-split__arrow" type="button" data-save-menu-trigger aria-label="More save options" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m2 4 4 4 4-4"></path></svg></button><div class="save-split__menu" data-save-menu role="menu" hidden><button type="button" role="menuitem" data-open-version-title>Save with title…</button></div></div>`}</div>` : ""}
    ${editable ? `<div class="destructive-actions"${draft ? " data-draft-actions hidden" : ""}><div class="destructive-confirm" data-destructive-confirm role="alertdialog" aria-label="${draft ? message(messages, "projectCreate.discardDraft", "Discard draft") : message(messages, "projectView.delete", "Delete project")}" hidden><strong>${draft ? message(messages, "projectCreate.discardWarning", "Discard this project draft? This cannot be undone.") : message(messages, "projectView.deleteWarning", "Delete this project and its version history? This cannot be undone.")}</strong><div><button type="button" data-cancel-delete>${message(messages, "common.cancel", "Cancel")}</button>${draft ? `<button type="button" data-confirm-draft-delete>${message(messages, "projectCreate.discardDraft", "Discard draft")}</button>` : `<button type="submit" name="intent" value="delete" formnovalidate>${message(messages, "projectView.delete", "Delete project")}</button>`}</div></div></div><div class="version-title-modal" data-version-title-modal role="dialog" aria-modal="true" aria-labelledby="version-title-heading" hidden><div><h2 id="version-title-heading">Save with title</h2><label for="version-title-input">Version title</label><input id="version-title-input" maxlength="80" data-version-title-input><div class="version-title-modal__actions"><button type="button" data-version-title-cancel>Cancel</button><button type="button" class="account-action" data-version-title-save>Save version</button></div></div></div>` : ""}
  </div>`;
}

function projectViewHtml(project, messages, workspace, csrf, owner, session, content, url, { embed = false, blogExamplesOrigin = "", snapshotUrl = "" } = {}) {
  const form = owner ? `<form class="create-form" method="post" action="/projects/${encodeURIComponent(project.id)}"><input type="hidden" name="csrf" value="${escapeHtml(csrf)}">` : `<div class="create-form" aria-label="Project details">`;
  const close = owner ? "</form>" : "</div>";
  return `<div class="account-dashboard project-create project-view project-workspace${embed ? " project-embed" : ""}">${form}${formError(url, messages)}<div class="project-create__layout">
    ${projectEditorHtml({ snapshot: workspace.snapshot, snapshotUrl, versionCount: workspace.versionCount, projectId: project.id, csrf, messages, persistence: owner ? "stored" : "memory", blogExamplesOrigin })}
    ${embed ? "" : projectFieldsHtml({ session, content, project, snapshot: workspace.snapshot, messages, editable: owner, submitLabel: message(messages, "projectView.save", "Save project"), hasUnpublishedChanges: workspace.hasUnpublishedChanges, versionCount: workspace.versionCount })}
  </div>${close}</div>`;
}

function projectFormHtml(session, content, token, messages, url) {
  const snapshot = initialProjectSnapshot();
  return `<div class="account-dashboard project-create">
    ${formError(url, messages)}
    <form class="create-form" method="post" action="/projects">
      <input type="hidden" name="csrf" value="${escapeHtml(token)}">
      <div class="project-create__layout">
        ${projectEditorHtml({ snapshot, messages, persistence: "session" })}
        ${projectFieldsHtml({ session, content, snapshot, messages, editable: true, submitLabel: message(messages, "projectCreate.submit", "Create project"), draft: true })}
      </div>
    </form>
  </div>`;
}

function tryFieldsHtml(messages) {
  return `<aside class="project-create__fields try-fields" data-project-fields aria-label="${message(messages, "try.settings", "Playground settings")}">
    <div class="project-fields__toolbar"><a class="project-close" href="/" aria-label="Close project">${projectCloseIcon}</a></div>
    <div class="create-form__field"><label for="project-template">${message(messages, "projectCreate.template", "Template")}</label><select id="project-template" name="template" data-project-template><option value="article">${message(messages, "projectCreate.article", "Article")}</option><option value="hello">${message(messages, "projectCreate.hello", "Hello, HTML")}</option><option value="clock">${message(messages, "projectCreate.clock", "Digital clock")}</option><option value="mark">${message(messages, "projectCreate.mark", "Logo mark")}</option><option value="chart">${message(messages, "projectCreate.chart", "Bar chart")}</option><option value="ball">${message(messages, "projectCreate.ball", "Bouncing ball")}</option><option value="stars">${message(messages, "projectCreate.stars", "Starfield")}</option><option value="blank">${message(messages, "projectCreate.blank", "Blank project")}</option></select></div>
    <div class="create-form__field"><label for="project-container">${message(messages, "projectCreate.container", "Container")}</label><select id="project-container" name="container" data-project-container><option value="article">${message(messages, "projectCreate.article", "Article")}</option><option value="page">${message(messages, "projectCreate.page", "Page")}</option><option value="canvas">Canvas</option><option value="svg">SVG</option><option value="single-file-web-app">Single-file HTML/CSS/JS</option></select></div>
    <div class="create-form__field"><div class="field-label-with-help"><label for="project-link-patterns">${message(messages, "projectCreate.allowedLinks", "Allowed Link URL Patterns")}</label></div><textarea id="project-link-patterns" name="allowedLinkPatterns" rows="1" wrap="off" data-autogrow>*.wikipedia.org</textarea></div>
  </aside>`;
}

function tryProjectHtml(messages) {
  return `<div class="account-dashboard project-create project-view project-workspace"><form class="create-form" data-try-form><div class="project-create__layout">${projectEditorHtml({ snapshot: initialProjectSnapshot(), messages, persistence: "memory" })}${tryFieldsHtml(messages)}</div></form></div>`;
}

function publicProjectsHtml(projects, messages) {
  if (!projects.length) return `<div class="account-empty">${message(messages, "publicProjects.empty", "No public projects have been published yet.")}</div>`;
  return `<div class="account-grid">${projects.map((item) => `<a class="account-card" data-project-link href="/${encodeURIComponent(item.namespace)}/${encodeURIComponent(item.slug)}"><h3>${escapeHtml(item.name)}</h3><span class="account-card__namespace">${escapeHtml(item.namespace)}/${escapeHtml(item.slug)}</span><p>${escapeHtml(item.description || `${item.template.toUpperCase()} project`)}</p></a>`).join("")}</div>`;
}

// The publication build uses this to produce an anonymous home document that
// the small Bunny bootstrap can serve without initializing OAuth, libSQL, or
// the full application bundle. Live project discovery remains a deferred route;
// the fast document deliberately renders the valid empty state.
export function renderFastAnonymousHome(html, messages, {
  locale = "en",
  signupsEnabled = true,
  contentFormVersion = "",
} = {}) {
  if (!html.includes(PUBLIC_PROJECTS_MARKER)) throw new Error("Fast home public-project marker is missing");
  const withProjects = html.replace(PUBLIC_PROJECTS_MARKER, () => publicProjectsHtml([], messages));
  const withSignupPolicy = applySignupPolicy(withProjects, "/", messages, signupsEnabled);
  return renderSessionHtml(withSignupPolicy, null, messages, {
    locale,
    pathname: "/",
    focused: false,
    signupsEnabled,
  }, contentFormVersion);
}

function namespaceProjectsHtml(namespace, messages) {
  return `<div class="account-dashboard namespace-view"><div class="account-dashboard__header"><div><span class="account-card__namespace">${message(messages, namespace.kind === "organization" ? "common.organization" : "common.user", namespace.kind)}</span><h1>${escapeHtml(namespace.name)}</h1><p class="account-dashboard__intro">@${escapeHtml(namespace.namespace)}</p></div></div><section class="account-section"><div class="account-section__header"><h2>${message(messages, "dashboard.projects", "Projects")}</h2></div>${publicProjectsHtml(namespace.projects, messages)}</section></div>`;
}

function profileHtml(account, token, messages, url) {
  return `<div class="account-dashboard"><div class="account-dashboard__header"><div><h1>${message(messages, "profile.heading", "Your profile")}</h1><p class="account-dashboard__intro">${message(messages, "profile.intro", "Choose the public username used by your profile and personal projects.")}</p></div></div>${formError(url, messages)}<form class="create-form" method="post" action="/profile"><input type="hidden" name="csrf" value="${escapeHtml(token)}"><div class="create-form__field"><label for="profile-username">${message(messages, "profile.username", "Username")}</label><input id="profile-username" name="username" minlength="4" maxlength="63" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value="${escapeHtml(account.login)}" autocapitalize="none" autocomplete="username" spellcheck="false" required><p class="form-help">${message(messages, "profile.usernameHelp", "Changing this also changes the URLs of projects in your personal namespace.")}</p></div><div class="create-actions"><button class="account-action" type="submit">${message(messages, "profile.save", "Save username")}</button></div></form></div>`;
}

function managedOrganizationHtml(namespace, managed, token, messages, url) {
  const hasAdmin = managed.members.some((member) => member.role === "admin");
  const members = managed.members.length ? managed.members.map((member) => `<div class="organization-member"><div><b>${escapeHtml(member.name)}</b><span>@${escapeHtml(member.username)}</span></div><form method="post" action="/organizations/${encodeURIComponent(managed.slug)}/members/${encodeURIComponent(member.userId)}"><input type="hidden" name="csrf" value="${escapeHtml(token)}"><select name="role" aria-label="Role for ${escapeHtml(member.username)}"><option value="member"${selected(member.role, "member")}>Member</option><option value="admin"${selected(member.role, "admin")}>Admin</option></select><button type="submit">Change role</button></form></div>`).join("") : `<p>${message(messages, "organization.noMembers", "No members yet.")}</p>`;
  return `<div class="account-dashboard namespace-view"><div class="account-dashboard__header"><div><span class="account-card__namespace">${message(messages, "common.organization", "Organization")}</span><h1>${escapeHtml(namespace.name)}</h1><p class="account-dashboard__intro">@${escapeHtml(namespace.namespace)}</p></div></div>${formError(url, messages)}<section class="account-section"><div class="account-section__header"><h2>${message(messages, "organization.members", "Members")}</h2></div><div class="organization-members">${members}</div></section><section class="account-section"><div class="account-section__header"><h2>${message(messages, "organization.invite", "Invite an existing user")}</h2></div><form class="create-form" method="post" action="/organizations/${encodeURIComponent(managed.slug)}/invitations"><input type="hidden" name="csrf" value="${escapeHtml(token)}"><div class="create-form__field"><label for="invite-username">${message(messages, "profile.username", "Username")}</label><input id="invite-username" name="username" minlength="4" maxlength="63" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required></div><div class="create-form__field"><label for="invite-role">${message(messages, "organization.role", "Role")}</label><select id="invite-role" name="role"><option value="member">Member</option><option value="admin"${hasAdmin ? " disabled" : ""}>Admin</option></select></div><div class="create-actions"><button class="account-action" type="submit">${message(messages, "organization.sendInvite", "Send invitation")}</button></div></form></section><section class="account-section"><div class="account-section__header"><h2>${message(messages, "dashboard.projects", "Projects")}</h2></div>${publicProjectsHtml(namespace.projects, messages)}</section></div>`;
}

function organizationFormHtml(token, messages, url) {
  return `<div class="account-dashboard">
    <h1>${message(messages, "organizationCreate.heading", "Create an organization")}</h1>
    <p class="account-dashboard__intro">${message(messages, "organizationCreate.intro", "Organizations give related projects a shared namespace.")}</p>
    ${formError(url, messages)}
    <form class="create-form" method="post" action="/organizations">
      <input type="hidden" name="csrf" value="${escapeHtml(token)}">
      <div class="create-form__field"><label for="organization-name">${message(messages, "organizationCreate.name", "Title")}</label><input id="organization-name" name="name" minlength="4" maxlength="80" data-slug-source="organization-slug" required></div>
      <div class="create-form__field"><label for="organization-slug">${message(messages, "organizationCreate.slug", "Name")}</label><input id="organization-slug" name="slug" minlength="4" maxlength="63" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" aria-describedby="organization-slug-error" autocapitalize="none" autocomplete="off" spellcheck="false" required><p id="organization-slug-error" class="form-field-error" data-message="${message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.")}" hidden>${message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.")}</p></div>
      <div class="create-form__field"><label for="organization-description">${message(messages, "organizationCreate.description", "Description (optional)")}</label><textarea id="organization-description" name="description" maxlength="500"></textarea></div>
      <div class="create-actions"><button class="account-action" type="submit">${message(messages, "organizationCreate.submit", "Create organization")}</button></div>
    </form>
  </div>`;
}

async function readCreateForm(request, session, action, authConfig, now) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") {
    throw new ContentValidationError("form", "unsupported form encoding");
  }
  if (Number(request.headers.get("content-length") || 0) > 70 * 1024 * 1024) {
    throw new ContentValidationError("form", "form is too large");
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    throw new ContentValidationError("form", "invalid form origin");
  }
  const form = await request.formData();
  if (!await validCsrf(form.get("csrf"), session, action, authConfig, now)) {
    throw new ContentValidationError("form", "invalid form token");
  }
  return form;
}

async function readProjectJson(request, session, action, authConfig, now) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new ContentValidationError("request", "JSON is required");
  if (Number(request.headers.get("content-length") || 0) > 72 * 1024 * 1024) throw new ContentValidationError("request", "project update is too large");
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new ContentValidationError("request", "invalid request origin");
  if (!await validCsrf(request.headers.get("x-resources-csrf"), session, action, authConfig, now)) throw new ContentValidationError("request", "invalid request token");
  return request.json();
}

export function createResourcesEdgeHandler({ config, authConfig = null, gitlabAuthConfig = null, accountStore = null, contentStore = null, organizationStore = null, blogExamplesOrigin = "https://blog-examples.resources.co", fetchImpl = fetch, now = Date.now, logger = console } = {}) {
  if (!config) throw new Error("Edge handler requires config");
  let cachedManifest = null;
  let manifestExpiresAt = 0;
  let manifestPromise = null;

  async function loadManifest() {
    if (cachedManifest && now() < manifestExpiresAt) return cachedManifest;
    if (!manifestPromise) {
      manifestPromise = (async () => {
        const response = await fetchStorage(fetchImpl, storageRequest(config, MANIFEST_KEY));
        if (!response.ok) throw storageResponseError(config, MANIFEST_KEY, response, "Manifest storage");
        const contentLength = Number(response.headers.get("content-length") || 0);
        if (contentLength > 256_000) throw new Error("Export manifest is too large");
        const manifest = normalizeExportManifest(await response.json());
        cachedManifest = manifest;
        manifestExpiresAt = now() + config.manifestTtlMs;
        return manifest;
      })().finally(() => { manifestPromise = null; });
    }
    return manifestPromise;
  }

  return async function resourcesEdgeHandler(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const languageRoute = request.method === "GET"
      ? parseLanguageSelection(new URL(request.url)) || parseLanguageRoute(pathname)
      : null;
    if (languageRoute) {
      const targetKey = pathToObjectKey(languageRoute.pathname);
      if (!targetKey || languageRoute.pathname.startsWith("/language/")) return new Response("Not found", { status: 404 });
      return new Response(null, {
        status: 302,
        headers: {
          location: languageRoute.pathname,
          "set-cookie": localeCookie(languageRoute.locale, { secure: new URL(request.url).protocol === "https:" }),
          "cache-control": "private, no-store",
          vary: "cookie",
        },
      });
    }
    if (authConfig && request.method === "GET" && pathname === "/auth/github/link") {
      const session = await readSession(request, authConfig, now);
      if (!session) return new Response(null, { status: 302, headers: { location: "/login", "cache-control": "no-store" } });
      return startGithubAuth(authConfig, now, { linkToUserId: session.sub });
    }
    if (authConfig && gitlabAuthConfig && request.method === "GET" && pathname === "/auth/gitlab/link") {
      const session = await readSession(request, authConfig, now);
      if (!session) return new Response(null, { status: 302, headers: { location: "/login", "cache-control": "no-store" } });
      return startGitlabAuth(gitlabAuthConfig, now, { linkToUserId: session.sub });
    }
    if (authConfig && request.method === "GET" && pathname === "/auth/github/start") {
      return startGithubAuth(authConfig, now);
    }
    if (authConfig && request.method === "GET" && pathname === "/auth/github/callback") {
      return finishGithubAuth(request, authConfig, { fetchImpl, now, accountStore });
    }
    if (gitlabAuthConfig && request.method === "GET" && pathname === "/auth/gitlab/start") {
      return startGitlabAuth(gitlabAuthConfig, now);
    }
    if (gitlabAuthConfig && request.method === "GET" && pathname === "/auth/gitlab/callback") {
      return finishGitlabAuth(request, gitlabAuthConfig, { fetchImpl, now, accountStore });
    }
    if (authConfig && request.method === "POST" && pathname === "/logout") return signOut(authConfig);
    if (authConfig && request.method === "POST" && pathname === "/profile") {
      const session = await readSession(request, authConfig, now);
      if (!session) return new Response(null, { status: 303, headers: { location: "/login", "cache-control": "no-store" } });
      try {
        const form = await readCreateForm(request, session, "profile", authConfig, now);
        const account = await accountStore.updateUsername(session.sub, form.get("username"));
        if (!account) return new Response("Not found", { status: 404 });
        return new Response(null, { status: 303, headers: { location: "/profile", "set-cookie": await refreshedSessionCookie(account, session, authConfig, now), "cache-control": "no-store" } });
      } catch (error) {
        if (!(error instanceof AccountValidationError) && !(error instanceof AccountConflictError)) throw error;
        return new Response(null, { status: 303, headers: { location: `/profile?error=${encodeURIComponent(error.field || error.code)}`, "cache-control": "no-store" } });
      }
    }
    const notificationAction = authConfig && request.method === "POST" && /^\/notifications\/([A-Za-z0-9-]+)$/.exec(pathname);
    if (notificationAction) {
      const session = await readSession(request, authConfig, now);
      if (!session) return new Response(null, { status: 303, headers: { location: "/login", "cache-control": "no-store" } });
      const form = await readCreateForm(request, session, "notifications", authConfig, now);
      const id = notificationAction[1];
      let location = "/";
      if (form.get("intent") === "accept") location = `/${encodeURIComponent(await organizationStore.acceptInvitation(session.sub, id) || "")}`;
      else if (form.get("intent") === "read") await organizationStore.markNotificationRead(session.sub, id);
      else if (form.get("intent") === "delete") await organizationStore.deleteNotification(session.sub, id);
      else return new Response("Invalid notification action", { status: 400 });
      return new Response(null, { status: 303, headers: { location, "cache-control": "no-store" } });
    }
    const invitationAction = authConfig && request.method === "POST" && /^\/organizations\/([a-z0-9-]+)\/invitations$/.exec(pathname);
    const memberAction = authConfig && request.method === "POST" && /^\/organizations\/([a-z0-9-]+)\/members\/([A-Za-z0-9-]+)$/.exec(pathname);
    if (invitationAction || memberAction) {
      const session = await readSession(request, authConfig, now);
      if (!session) return new Response(null, { status: 303, headers: { location: "/login", "cache-control": "no-store" } });
      const slug = (invitationAction || memberAction)[1];
      try {
        const form = await readCreateForm(request, session, `organization:${slug}`, authConfig, now);
        if (invitationAction) await organizationStore.invite(slug, session.sub, { username: form.get("username"), role: form.get("role") });
        else await organizationStore.changeRole(slug, session.sub, memberAction[2], form.get("role"));
        return new Response(null, { status: 303, headers: { location: `/${encodeURIComponent(slug)}`, "cache-control": "no-store" } });
      } catch (error) {
        if (!(error instanceof OrganizationInputError) && !(error instanceof OrganizationAccessError)) throw error;
        return new Response(null, { status: 303, headers: { location: `/${encodeURIComponent(slug)}?error=${encodeURIComponent(error.field || "access")}`, "cache-control": "no-store" } });
      }
    }
    const projectApi = /^\/api\/projects\/([A-Za-z0-9-]+)\/(snapshot|versions|restore)(?:\/(\d+))?$/.exec(pathname);
    if (projectApi) {
      const session = authConfig && await readSession(request, authConfig, now);
      if (!session) return Response.json({ error: "authentication_required" }, { status: 401, headers: { "cache-control": "no-store" } });
      if (!contentStore) return Response.json({ error: "content_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
      const [, projectId, operation, sequence] = projectApi;
      try {
        if (request.method === "GET" && operation === "versions" && sequence) {
          const snapshot = await contentStore.getProjectVersion(projectId, Number(sequence), session.sub);
          return snapshot ? Response.json({ snapshot }, { headers: { "cache-control": "private, no-store" } }) : Response.json({ error: "not_found" }, { status: 404, headers: { "cache-control": "no-store" } });
        }
        if (request.method === "GET" && operation === "versions" && !sequence) {
          return Response.json({ versions: await contentStore.listProjectVersions(projectId, session.sub) }, { headers: { "cache-control": "private, no-store" } });
        }
        if (request.method === "POST" && operation === "snapshot" && !sequence) {
          const value = await readProjectJson(request, session, `project:${projectId}`, authConfig, now);
          validateProjectUrlPatterns(value.snapshot);
          const saved = await contentStore.saveProjectSnapshot(session.sub, projectId, value.snapshot, { reason: value.manual ? "manual" : "periodic", destructive: value.destructive === true });
          return saved ? Response.json(saved, { headers: { "cache-control": "no-store" } }) : Response.json({ error: "not_found" }, { status: 404, headers: { "cache-control": "no-store" } });
        }
        if (request.method === "POST" && operation === "restore" && sequence) {
          await readProjectJson(request, session, `project:${projectId}`, authConfig, now);
          const restored = await contentStore.restoreProjectVersion(session.sub, projectId, Number(sequence));
          return restored ? Response.json(restored, { headers: { "cache-control": "no-store" } }) : Response.json({ error: "not_found" }, { status: 404, headers: { "cache-control": "no-store" } });
        }
        return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { allow: operation === "versions" ? "GET" : "POST", "cache-control": "no-store" } });
      } catch (error) {
        if (!(error instanceof ContentValidationError)) throw error;
        return Response.json({ error: error.field || "invalid" }, { status: 400, headers: { "cache-control": "no-store" } });
      }
    }
    const createAction = request.method === "POST" && (pathname === "/projects" || pathname === "/organizations");
    if (createAction) {
      const session = authConfig && await readSession(request, authConfig, now);
      if (!session) return new Response(null, { status: 303, headers: { location: "/login", "cache-control": "no-store" } });
      if (!contentStore) return new Response("Account content unavailable", { status: 503 });
      try {
        const form = await readCreateForm(request, session, pathname, authConfig, now);
        if (pathname === "/organizations") {
          await contentStore.createOrganization(session.sub, {
            name: form.get("name"), slug: form.get("slug"), description: form.get("description"),
          });
        } else {
          let snapshot;
          try {
            snapshot = JSON.parse(String(form.get("snapshot") || "{}"));
          } catch {
            throw new ContentValidationError("snapshot", "project snapshot is invalid");
          }
          validateProjectUrlPatterns(snapshot);
          const created = await contentStore.createProject(session.sub, {
            userSlug: session.login,
            name: form.get("name"),
            slug: form.get("slug"),
            description: form.get("description"),
            namespace: form.get("namespace"),
            template: form.get("template"),
            visibility: form.get("visibility"),
            snapshot,
          });
          return new Response(null, {
            status: 303,
            headers: {
              location: `/${encodeURIComponent(created.namespace)}/${encodeURIComponent(created.slug)}`,
              "cache-control": "no-store",
            },
          });
        }
        return new Response(null, { status: 303, headers: { location: "/", "cache-control": "no-store" } });
      } catch (error) {
        if (!(error instanceof ContentValidationError) && !(error instanceof ContentConflictError)) throw error;
        const target = pathname === "/projects" ? "/projects/new" : "/organizations/new";
        return new Response(null, { status: 303, headers: { location: `${target}?error=${encodeURIComponent(error.code || error.field || "form")}`, "cache-control": "no-store" } });
      }
    }
    const updateProjectAction = request.method === "POST" && /^\/projects\/([A-Za-z0-9-]+)$/.exec(pathname);
    if (updateProjectAction) {
      const session = authConfig && await readSession(request, authConfig, now);
      if (!session) return new Response(null, { status: 303, headers: { location: "/login", "cache-control": "no-store" } });
      if (!contentStore) return new Response("Account content unavailable", { status: 503 });
      const projectId = updateProjectAction[1];
      try {
        const form = await readCreateForm(request, session, `project:${projectId}`, authConfig, now);
        if (form.get("intent") === "delete") {
          const deleted = await contentStore.deleteProject(session.sub, projectId);
          return deleted
            ? new Response(null, { status: 303, headers: { location: "/projects", "cache-control": "no-store" } })
            : new Response("Not found", { status: 404 });
        }
        if (form.get("intent") === "revert") {
          const reverted = await contentStore.revertProjectToPublished(session.sub, projectId);
          if (!reverted) return new Response("Not found", { status: 404 });
          const referer = new URL(request.headers.get("referer") || "/projects", request.url);
          return new Response(null, { status: 303, headers: { location: referer.pathname, "cache-control": "no-store" } });
        }
        let snapshot;
        try {
          snapshot = JSON.parse(String(form.get("snapshot") || "{}"));
        } catch {
          throw new ContentValidationError("snapshot", "project snapshot is invalid");
        }
        validateProjectUrlPatterns(snapshot);
        const updated = await contentStore.updateProject(session.sub, projectId, {
          userSlug: session.login, name: form.get("name"), slug: form.get("slug"),
          description: form.get("description"), namespace: form.get("namespace"),
          template: form.get("template"), visibility: form.get("visibility"),
        });
        if (!updated) return new Response("Not found", { status: 404 });
        await contentStore.saveProjectSnapshot(session.sub, projectId, snapshot, { reason: "manual" });
        await contentStore.publishProject(session.sub, projectId, { title: form.get("versionTitle") });
        return new Response(null, { status: 303, headers: { location: `/${encodeURIComponent(updated.namespace)}/${encodeURIComponent(updated.slug)}`, "cache-control": "no-store" } });
      } catch (error) {
        if (!(error instanceof ContentValidationError) && !(error instanceof ContentConflictError)) throw error;
        return new Response(null, { status: 303, headers: { location: `${request.headers.get("referer") || "/projects"}?error=${encodeURIComponent(error.code || error.field || "form")}`, "cache-control": "no-store" } });
      }
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    const publicKey = pathToObjectKey(pathname);
    if (!publicKey || publicKey === MANIFEST_KEY) return new Response("Not found", { status: 404 });

    try {
      const manifest = await loadManifest();
      const locale = negotiateLocale(request, manifest);
      const session = authConfig && await readSession(request, authConfig, now);
      const requestedWorkspace = projectWorkspaceRoute(pathname);
      if (requestedWorkspace) {
        if (!contentStore) return new Response("Project workspace unavailable", { status: 503 });
        const project = await contentStore.getProject(requestedWorkspace.namespace, requestedWorkspace.slug, session?.sub);
        if (!project) return new Response("Not found", { status: 404 });
        const owner = Boolean(session && project.ownerUserId === session.sub);
        const workspace = owner
          ? await contentStore.getProjectWorkspace(requestedWorkspace.namespace, requestedWorkspace.slug, session.sub)
          : project.visibility === "public" ? await contentStore.getPublicProjectWorkspace(requestedWorkspace.namespace, requestedWorkspace.slug) : null;
        if (!workspace) return new Response("Not found", { status: 404 });
        return Response.json({ snapshot: workspace.snapshot, versionCount: workspace.versionCount, updatedAt: workspace.updatedAt, hasUnpublishedChanges: Boolean(workspace.hasUnpublishedChanges) }, {
          headers: { "cache-control": owner ? "private, no-store" : "public, max-age=30", "content-language": locale },
        });
      }
      const requestedProject = projectRoute(pathname);
      const requestedNamespace = !requestedProject ? namespaceRoute(pathname) : null;
      const dynamicProject = requestedProject && contentStore?.getProject
        ? await contentStore.getProject(requestedProject.namespace, requestedProject.slug, session?.sub)
        : null;
      const projectOwner = Boolean(dynamicProject && session && dynamicProject.ownerUserId === session.sub);
      const visibleWorkspace = dynamicProject ? {
        snapshot: { files: [], config: { entry: "", template: dynamicProject.template, container: "page", containerOptions: { allowedLinkPatterns: [] }, sandbox: { network: false, storage: "session" } } },
        versionCount: 0,
        hasUnpublishedChanges: false,
      } : null;
      if (pathname === "/dashboard") {
        return new Response(null, { status: 302, headers: { location: "/", "cache-control": session ? "private, no-store" : "no-store" } });
      }
      if (PROTECTED_ACCOUNT_PATHS.has(pathname) && !session) {
        return new Response(null, { status: 302, headers: { location: "/login", "cache-control": "private, no-store" } });
      }
      const accountShellPath = (pathname === "/" && session) || pathname === "/profile" ? "/dashboard" : pathname;
      const staticKey = localizedObjectKey(locale, pathToObjectKey(accountShellPath));
      const dynamicNamespace = !manifest.files.has(staticKey) && requestedNamespace && contentStore?.getNamespace
        ? await contentStore.getNamespace(requestedNamespace, session?.sub)
        : null;
      const managedOrganization = dynamicNamespace?.kind === "organization" && session && organizationStore
        ? await organizationStore.getManagedOrganization(dynamicNamespace.namespace, session.sub)
        : null;
      const key = localizedObjectKey(locale, (dynamicProject || dynamicNamespace) ? pathToObjectKey("/dashboard") : pathToObjectKey(accountShellPath));
      if (!manifest.files.has(key)) return new Response("Not found", { status: 404 });
      const upstream = await fetchStorage(fetchImpl, storageRequest(config, key));
      if (upstream.status === 404) return new Response("Not found", { status: 404 });
      if (!upstream.ok) return new Response("Storage unavailable", { status: 502 });
      const expected = manifest.artifacts.get(key);
      const receivedLength = Number(upstream.headers.get("content-length") || 0);
      if (receivedLength && receivedLength !== expected.bytes) {
        throw new Error(`Storage length mismatch for ${key}`);
      }
      const headers = publicResponseHeaders(key, upstream.headers);
      if (requestedProject && pathname.endsWith("/embed")) {
        headers.set("content-security-policy", headers.get("content-security-policy").replace("frame-ancestors 'none'", "frame-ancestors 'self'"));
      }
      if (key.startsWith("locales/") && key.endsWith(".html")) headers.set("content-language", locale);
      let body = request.method === "HEAD" ? null : upstream.body;
      const contentFormVersion = manifest.artifacts.get("-/resources-site/content-form.js")?.sha256.slice(0, 12) || "";
      const editorVersion = manifest.artifacts.get("-/blog-examples/markdown-editor/app.js")?.sha256.slice(0, 12) || "";
      if (key === "-/blog-examples/markdown-editor/index.html" && request.method !== "HEAD") {
        const editorHtml = await upstream.text();
        const styleVersion = manifest.artifacts.get("-/blog-examples/markdown-editor/app.css")?.sha256.slice(0, 12) || editorVersion;
        body = editorHtml.replace("./app.css", `./app.css?v=${styleVersion}`).replace("./app.js", `./app.js?v=${editorVersion}`);
      }
      if (authConfig && key.startsWith("locales/") && key.endsWith(".html") && request.method !== "HEAD") {
        let html = await upstream.text();
        if (dynamicProject) {
          if (!html.includes(ACCOUNT_CONTENT_MARKER)) throw new Error(`Account content marker missing from ${key}`);
          const token = projectOwner ? await csrfToken(session, `project:${dynamicProject.id}`, authConfig, now) : "";
          const content = projectOwner ? await contentStore.listForUser(session.sub) : { organizations: [], projects: [] };
          const snapshotUrl = `/-/projects/${encodeURIComponent(dynamicProject.namespace)}/${encodeURIComponent(dynamicProject.slug)}/workspace`;
          html = html.replace(ACCOUNT_CONTENT_MARKER, () => projectViewHtml(dynamicProject, manifest.messages[locale], visibleWorkspace, token, projectOwner, session, content, url, { embed: requestedProject.embed, blogExamplesOrigin, snapshotUrl }));
          html = requestedProject.embed ? embeddedProjectDocument(html) : focusedProjectDocument(html, requestedProject.namespace, requestedProject.slug);
        } else if (dynamicNamespace) {
          if (!html.includes(ACCOUNT_CONTENT_MARKER)) throw new Error(`Account content marker missing from ${key}`);
          const token = managedOrganization ? await csrfToken(session, `organization:${managedOrganization.slug}`, authConfig, now) : "";
          html = html.replace(ACCOUNT_CONTENT_MARKER, () => managedOrganization
            ? managedOrganizationHtml(dynamicNamespace, managedOrganization, token, manifest.messages[locale], url)
            : namespaceProjectsHtml(dynamicNamespace, manifest.messages[locale]));
          html = namespaceDocument(html, dynamicNamespace);
        } else if (pathname === "/try") {
          if (!html.includes(ACCOUNT_CONTENT_MARKER)) throw new Error(`Try content marker missing from ${key}`);
          html = html.replace(ACCOUNT_CONTENT_MARKER, () => tryProjectHtml(manifest.messages[locale]));
        } else if (session && ACCOUNT_PATHS.has(pathname)) {
          if (!contentStore) return new Response("Account content unavailable", { status: 503 });
          const content = await contentStore.listForUser(session.sub);
          const token = await csrfToken(session, pathname === "/projects/new" ? "/projects" : pathname === "/organizations/new" ? "/organizations" : pathname === "/profile" ? "profile" : "/", authConfig, now);
          const dynamic = pathname === "/"
            ? dashboardHtml(content, manifest.messages[locale])
            : pathname === "/projects"
              ? projectsHtml(content, manifest.messages[locale])
            : pathname === "/projects/new"
              ? projectFormHtml(session, content, token, manifest.messages[locale], url)
              : pathname === "/organizations/new"
                ? organizationFormHtml(token, manifest.messages[locale], url)
                : profileHtml(await accountStore.getAccount(session.sub), token, manifest.messages[locale], url);
          if (!html.includes(ACCOUNT_CONTENT_MARKER)) throw new Error(`Account content marker missing from ${key}`);
          html = html.replace(ACCOUNT_CONTENT_MARKER, () => dynamic);
        }
        if ((pathname === "/" && !session) || pathname === "/browse") {
          if (!html.includes(PUBLIC_PROJECTS_MARKER)) throw new Error(`Public projects marker missing from ${key}`);
          const projects = contentStore?.listPublicProjects
            ? await contentStore.listPublicProjects({ limit: pathname === "/" ? 6 : 48, namespaces: DISCOVERABLE_PROJECT_NAMESPACES })
            : [];
          html = html.replace(PUBLIC_PROJECTS_MARKER, () => publicProjectsHtml(projects, manifest.messages[locale]));
        }
        html = applySignupPolicy(html, pathname, manifest.messages[locale], authConfig.signupsEnabled);
        const notifications = session && organizationStore ? await organizationStore.listNotifications(session.sub) : [];
        const notificationCsrf = session ? await csrfToken(session, "notifications", authConfig, now) : "";
        body = renderSessionHtml(html, session, manifest.messages[locale], { locale, pathname, focused: Boolean(dynamicProject) || pathname === "/projects/new" || pathname === "/try", signupsEnabled: authConfig.signupsEnabled, notifications, notificationCsrf }, contentFormVersion);
        headers.set("cache-control", session ? "private, no-store" : "public, max-age=30, stale-while-revalidate=60");
      }
      if (key.endsWith(".html")) headers.set("vary", "accept-language, cookie");
      return new Response(body, {
        status: 200,
        headers,
      });
    } catch (error) {
      logger.error("resources-edge", error?.message || String(error));
      return new Response("Edge content unavailable", { status: 503, headers: { "cache-control": "no-store" } });
    }
  };
}
