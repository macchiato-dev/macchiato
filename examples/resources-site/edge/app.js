import {
  normalizeExportManifest,
  pathToObjectKey,
  publicResponseHeaders,
  storageRequest,
} from "./models.js";
import { localeCookie, localizedObjectKey, negotiateLocale, parseLanguageRoute, parseLanguageSelection } from "./i18n.js";
import { finishGithubAuth, readSession, signOut, startGithubAuth } from "../auth/github.js";
import { finishGitlabAuth, startGitlabAuth } from "../auth/gitlab.js";
import { seal, unseal } from "../auth/session.js";
import { ContentConflictError, ContentValidationError } from "../models/content.js";
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
const ACCOUNT_PATHS = new Set(["/dashboard", "/projects/new", "/organizations/new"]);

async function fetchStorage(fetchImpl, request) {
  const response = await fetchImpl(request);
  if (response.status >= 300 && response.status < 400) throw new Error("Storage redirects are not allowed");
  return response;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function message(messages, key, fallback) {
  return escapeHtml(messages?.[key] || fallback);
}

function languageMenuHtml(locale, pathname, messages) {
  return `<div class="menu__head">${message(messages, "chrome.language", "Language")}</div>
    <form class="profile-language" method="get" action="/language">
      <select name="locale" aria-label="${message(messages, "chrome.language", "Language")}">
        <option value="en"${locale === "en" ? " selected" : ""}>English</option>
        <option value="es"${locale === "es" ? " selected" : ""}>Español</option>
      </select>
      <input type="hidden" name="return" value="${escapeHtml(pathname)}">
      <button type="submit">${message(messages, "chrome.changeLanguage", "Change")}</button>
    </form>`;
}

function notificationMenuHtml(messages) {
  return `<details class="edge-user-menu edge-icon-menu">
    <summary class="edge-user-menu__trigger ub-icon" aria-label="${message(messages, "account.notifications", "Notifications")}">${resourcesBellIconHtml}</summary>
    <div class="popover edge-user-menu__panel"><div class="menu__head">${message(messages, "account.notifications", "Notifications")}</div><div class="menu__empty">${message(messages, "account.noNotifications", "You're all caught up.")}</div></div>
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

function authStatusHtml(session, messages = {}, { locale = "en", pathname = "/" } = {}) {
  if (!session) {
    return `<aside class="box userbar edge-status" data-screen-label="runtime-status">
      ${renderResourcesCommandPalette()}
      ${notificationMenuHtml(messages)}
      ${createMenuHtml(messages)}
      <details class="edge-user-menu edge-guest-menu"><summary class="edge-user-menu__trigger ub-acct" aria-label="${message(messages, "account.menu", "Account menu")}">${resourcesBlankAvatarHtml}<svg class="ub-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg></summary>
        <div class="popover edge-user-menu__panel"><a class="item" href="/settings">${message(messages, "account.settings", "Settings")}</a><a class="item" href="/help">${message(messages, "account.help", "Help & docs")}</a><div class="menu__sep"></div>${resourcesAppearanceHtml}<div class="menu__sep"></div>${languageMenuHtml(locale, pathname, messages)}<div class="menu__sep"></div><a class="item" href="/login">${message(messages, "auth.login", "Log in")}</a><a class="item" href="/signup">${message(messages, "auth.signup", "Sign up")}</a></div>
      </details>
    </aside>`;
  }
  const initials = session.login.slice(0, 2).toUpperCase();
  return `<aside class="box userbar edge-status" data-screen-label="runtime-status">
    ${renderResourcesCommandPalette()}
    ${notificationMenuHtml(messages)}
    ${createMenuHtml(messages)}
    <details class="edge-user-menu">
      <summary class="edge-user-menu__trigger" aria-label="${message(messages, "account.menu", "Account menu")}">
        <span class="ub-avatar">${escapeHtml(initials)}</span>
        <svg class="ub-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg>
      </summary>
      <div class="popover edge-user-menu__panel">
        <div class="menu__acct"><span class="ub-avatar">${escapeHtml(initials)}</span><div class="menu__acct-meta"><b>${escapeHtml(session.name)}</b><span>@${escapeHtml(session.login)}</span></div></div>
        <div class="menu__sep"></div>
        <a class="item" href="/dashboard">${message(messages, "account.projects", "Your projects")}</a>
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

function renderSessionHtml(html, session, messages, options) {
  return html
    .replace(/<aside class="box userbar edge-status"[\s\S]*?<\/aside>/, authStatusHtml(session, messages, options))
    .replace("</body>", `<script type="module" src="${commandPaletteClientPath}"></script><script type="module" src="${themeUseClientPath}"></script><script type="module" src="${userMenuUseClientPath}"></script><script type="module" src="/-/resources-site/content-form.js"></script></body>`);
}

function checked(value, expected) {
  return value === expected ? " checked" : "";
}

function projectRoute(pathname) {
  try {
    const match = /^\/([^/]+)\/([^/]+)$/.exec(decodeURIComponent(pathname));
    return match ? { namespace: match[1], slug: match[2] } : null;
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
    ? `<div class="account-grid">${content.projects.map((item) => `<a class="account-card" href="/${encodeURIComponent(item.namespace)}/${encodeURIComponent(item.slug)}">
        <span class="account-card__namespace">${escapeHtml(item.namespace)}/</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description || `${item.template.toUpperCase()} project`)}</p>
        <span class="account-card__meta">${message(messages, `dashboard.${item.visibility}`, item.visibility)}</span>
      </a>`).join("")}</div>`
    : `<div class="account-empty">${message(messages, "dashboard.noProjects", "No projects yet.")}</div>`;
  const organizations = content.organizations.length
    ? `<div class="account-grid">${content.organizations.map((item) => `<article class="account-card">
        <span class="account-card__namespace">${message(messages, "common.organization", "Organization")}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description || item.slug)}</p>
      </article>`).join("")}</div>`
    : `<div class="account-empty">${message(messages, "dashboard.noOrganizations", "No organizations yet.")}</div>`;
  return `<div class="account-dashboard">
    <div class="account-dashboard__header"><div><h1>${message(messages, "dashboard.heading", "Your projects")}</h1><p class="account-dashboard__intro">${message(messages, "dashboard.intro", "Projects and organizations owned by your account.")}</p></div>
      <a class="account-action" href="/projects/new">${message(messages, "account.newProject", "New project")}</a></div>
    <div class="create-actions"><a class="account-action account-action--secondary" href="/organizations/new">${message(messages, "account.newOrganization", "New organization")}</a></div>
    <section class="account-section"><div class="account-section__header"><h2>${message(messages, "dashboard.projects", "Projects")}</h2></div>${projects}</section>
    <section class="account-section"><div class="account-section__header"><h2>${message(messages, "dashboard.organizations", "Organizations")}</h2></div>${organizations}</section>
  </div>`;
}

function projectViewHtml(project, messages) {
  return `<div class="account-dashboard project-view">
    <a class="project-view__back" href="/dashboard">← ${message(messages, "account.projects", "Your projects")}</a>
    <div class="project-view__identity">
      <span class="account-card__namespace">${escapeHtml(project.namespace)}/</span>
      <h1>${escapeHtml(project.name)}</h1>
      <p class="account-dashboard__intro">${escapeHtml(project.description || `${project.template.toUpperCase()} project`)}</p>
    </div>
    <div class="project-view__meta">
      <span>${message(messages, `dashboard.${project.visibility}`, project.visibility)}</span>
      <span>${escapeHtml(project.template.toUpperCase())}</span>
    </div>
    <section class="project-surface" aria-label="${escapeHtml(project.name)} workspace">
      <p>${message(messages, "projectView.empty", "This project is ready for its first document.")}</p>
      <a class="account-action account-action--secondary" href="/dashboard">${message(messages, "projectView.manage", "Manage projects")}</a>
    </section>
  </div>`;
}

function formError(url, messages) {
  const error = url.searchParams.get("error");
  return error
    ? `<p class="form-error" role="alert">${error === "slug" ? message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.") : message(messages, "content.error", "Check the form and try again.")}</p>`
    : "";
}

function projectFormHtml(session, content, token, messages, url) {
  const namespaceOptions = [
    `<option value="user">@${escapeHtml(session.login)}</option>`,
    ...content.organizations.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`),
  ].join("");
  return `<div class="account-dashboard">
    <h1>${message(messages, "projectCreate.heading", "Create a project")}</h1>
    <p class="account-dashboard__intro">${message(messages, "projectCreate.intro", "Pick a template, give it a name, then create.")}</p>
    ${formError(url, messages)}
    <form class="create-form" method="post" action="/projects">
      <input type="hidden" name="csrf" value="${escapeHtml(token)}">
      <div class="create-form__field"><label for="project-name">${message(messages, "projectCreate.name", "Project name")}</label><input id="project-name" name="name" maxlength="80" data-slug-source="project-slug" required></div>
      <div class="create-form__field"><label for="project-slug">${message(messages, "projectCreate.slug", "Project slug")}</label><input id="project-slug" name="slug" maxlength="63" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" aria-describedby="project-slug-error" autocapitalize="none" autocomplete="off" spellcheck="false" required><p id="project-slug-error" class="form-field-error" data-message="${message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.")}" hidden>${message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.")}</p></div>
      <div class="create-form__field"><label for="project-description">${message(messages, "projectCreate.description", "Description (optional)")}</label><textarea id="project-description" name="description" maxlength="500"></textarea></div>
      <div class="create-form__field"><label for="project-namespace">${message(messages, "projectCreate.namespace", "Namespace")}</label><select id="project-namespace" name="namespace">${namespaceOptions}</select></div>
      <div class="create-form__field"><label for="project-template">${message(messages, "projectCreate.template", "Template")}</label><select id="project-template" name="template"><option value="blank">${message(messages, "projectCreate.blank", "Blank")}</option><option value="html">${message(messages, "projectCreate.html", "HTML")}</option><option value="svg">${message(messages, "projectCreate.svg", "SVG")}</option><option value="canvas">${message(messages, "projectCreate.canvas", "Canvas")}</option></select></div>
      <fieldset><legend>${message(messages, "projectCreate.visibility", "Visibility")}</legend><div class="create-form__options"><label><input type="radio" name="visibility" value="public"${checked("public", "public")}> ${message(messages, "dashboard.public", "Public")}</label><label><input type="radio" name="visibility" value="private"> ${message(messages, "dashboard.private", "Private")}</label></div></fieldset>
      <div class="create-actions"><button class="account-action" type="submit">${message(messages, "projectCreate.submit", "Create project")}</button><a class="account-action account-action--secondary" href="/dashboard">${message(messages, "account.projects", "Your projects")}</a></div>
    </form>
  </div>`;
}

function organizationFormHtml(token, messages, url) {
  return `<div class="account-dashboard">
    <h1>${message(messages, "organizationCreate.heading", "Create an organization")}</h1>
    <p class="account-dashboard__intro">${message(messages, "organizationCreate.intro", "Organizations give related projects a shared namespace.")}</p>
    ${formError(url, messages)}
    <form class="create-form" method="post" action="/organizations">
      <input type="hidden" name="csrf" value="${escapeHtml(token)}">
      <div class="create-form__field"><label for="organization-name">${message(messages, "organizationCreate.name", "Organization name")}</label><input id="organization-name" name="name" maxlength="80" data-slug-source="organization-slug" required></div>
      <div class="create-form__field"><label for="organization-slug">${message(messages, "organizationCreate.slug", "Organization slug")}</label><input id="organization-slug" name="slug" maxlength="63" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" aria-describedby="organization-slug-error" autocapitalize="none" autocomplete="off" spellcheck="false" required><p id="organization-slug-error" class="form-field-error" data-message="${message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.")}" hidden>${message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.")}</p></div>
      <div class="create-form__field"><label for="organization-description">${message(messages, "organizationCreate.description", "Description (optional)")}</label><textarea id="organization-description" name="description" maxlength="500"></textarea></div>
      <div class="create-actions"><button class="account-action" type="submit">${message(messages, "organizationCreate.submit", "Create organization")}</button><a class="account-action account-action--secondary" href="/dashboard">${message(messages, "account.projects", "Your projects")}</a></div>
    </form>
  </div>`;
}

async function readCreateForm(request, session, action, authConfig, now) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") {
    throw new ContentValidationError("form", "unsupported form encoding");
  }
  if (Number(request.headers.get("content-length") || 0) > 8_192) {
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

export function createResourcesEdgeHandler({ config, authConfig = null, gitlabAuthConfig = null, accountStore = null, contentStore = null, fetchImpl = fetch, now = Date.now, logger = console } = {}) {
  if (!config) throw new Error("Edge handler requires config");
  let cachedManifest = null;
  let manifestExpiresAt = 0;
  let manifestPromise = null;

  async function loadManifest() {
    if (cachedManifest && now() < manifestExpiresAt) return cachedManifest;
    if (!manifestPromise) {
      manifestPromise = (async () => {
        const response = await fetchStorage(fetchImpl, storageRequest(config, MANIFEST_KEY));
        if (!response.ok) throw new Error(`Manifest storage response: ${response.status}`);
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
          const created = await contentStore.createProject(session.sub, {
            userSlug: session.login,
            name: form.get("name"),
            slug: form.get("slug"),
            description: form.get("description"),
            namespace: form.get("namespace"),
            template: form.get("template"),
            visibility: form.get("visibility"),
          });
          return new Response(null, {
            status: 303,
            headers: {
              location: `/${encodeURIComponent(created.namespace)}/${encodeURIComponent(created.slug)}`,
              "cache-control": "no-store",
            },
          });
        }
        return new Response(null, { status: 303, headers: { location: "/dashboard", "cache-control": "no-store" } });
      } catch (error) {
        if (!(error instanceof ContentValidationError) && !(error instanceof ContentConflictError)) throw error;
        const target = pathname === "/projects" ? "/projects/new" : "/organizations/new";
        return new Response(null, { status: 303, headers: { location: `${target}?error=${encodeURIComponent(error.code || error.field || "form")}`, "cache-control": "no-store" } });
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
      const requestedProject = projectRoute(pathname);
      const dynamicProject = requestedProject && contentStore?.getProject
        ? await contentStore.getProject(requestedProject.namespace, requestedProject.slug, session?.sub)
        : null;
      if (session && contentStore && pathname === "/") {
        return new Response(null, { status: 302, headers: { location: "/dashboard", "cache-control": "private, no-store" } });
      }
      if (ACCOUNT_PATHS.has(pathname) && !session) {
        return new Response(null, { status: 302, headers: { location: "/login", "cache-control": "private, no-store" } });
      }
      const key = localizedObjectKey(locale, dynamicProject ? pathToObjectKey("/dashboard") : publicKey);
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
      if (key.startsWith("locales/") && key.endsWith(".html")) headers.set("content-language", locale);
      let body = request.method === "HEAD" ? null : upstream.body;
      if (authConfig && key.startsWith("locales/") && key.endsWith(".html") && request.method !== "HEAD") {
        let html = await upstream.text();
        if (dynamicProject) {
          if (!html.includes(ACCOUNT_CONTENT_MARKER)) throw new Error(`Account content marker missing from ${key}`);
          html = html.replace(ACCOUNT_CONTENT_MARKER, projectViewHtml(dynamicProject, manifest.messages[locale]));
        } else if (ACCOUNT_PATHS.has(pathname)) {
          if (!contentStore) return new Response("Account content unavailable", { status: 503 });
          const content = await contentStore.listForUser(session.sub);
          const token = await csrfToken(session, pathname === "/projects/new" ? "/projects" : "/organizations", authConfig, now);
          const dynamic = pathname === "/dashboard"
            ? dashboardHtml(content, manifest.messages[locale])
            : pathname === "/projects/new"
              ? projectFormHtml(session, content, token, manifest.messages[locale], url)
              : organizationFormHtml(token, manifest.messages[locale], url);
          if (!html.includes(ACCOUNT_CONTENT_MARKER)) throw new Error(`Account content marker missing from ${key}`);
          html = html.replace(ACCOUNT_CONTENT_MARKER, dynamic);
        }
        body = renderSessionHtml(html, session, manifest.messages[locale], { locale, pathname });
        headers.set("cache-control", "private, no-store");
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
