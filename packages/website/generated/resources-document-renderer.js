var resourcesAppearanceHtml = "<div class=\"menu__head\">Appearance</div><div class=\"seg\" role=\"group\" aria-label=\"Appearance\"><button class=\"seg__btn\" type=\"button\" data-theme-choice=\"system\" aria-pressed=\"true\"><span>System</span></button><button class=\"seg__btn\" type=\"button\" data-theme-choice=\"dark\" aria-pressed=\"false\"><span>Dark</span></button><button class=\"seg__btn\" type=\"button\" data-theme-choice=\"light\" aria-pressed=\"false\"><span>Light</span></button></div>";
var resourcesBellIconHtml = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9\"></path><path d=\"M13.73 21a2 2 0 0 1-3.46 0\"></path></svg>";
var resourcesBlankAvatarHtml = "<span class=\"ub-avatar ub-avatar--blank\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 21a8 8 0 0 0-16 0\"></path><circle cx=\"12\" cy=\"7\" r=\"4\"></circle></svg></span>";
var resourcesCreateIconHtml = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"></line><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"></line></svg>";
function renderResourcesCommandPalette() {
  return "<button class=\"command-trigger\" type=\"button\" data-command-open aria-label=\"Search or jump to…\"><svg class=\"command-trigger__icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"></circle><path d=\"m20 20-4-4\"></path></svg><span>Search or jump to…</span><kbd data-command-shortcut>Ctrl K</kbd></button>\n    <dialog class=\"command-palette\" data-command-dialog aria-label=\"Search or jump to…\">\n      <div class=\"command-palette__surface\">\n        <div class=\"command-palette__search\"><svg class=\"command-palette__icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"></circle><path d=\"m20 20-4-4\"></path></svg><input type=\"search\" data-command-input aria-label=\"Search or jump to…\" placeholder=\"Search or jump to…\"><kbd>Esc</kbd></div>\n        <div class=\"command-palette__list\" data-command-list><a class=\"command-palette__item\" href=\"/browse\" data-command-label=\"browse resources\" data-command-kind=\"command\"><span>Browse resources</span><kbd>Enter</kbd></a><a class=\"command-palette__item\" href=\"/projects\" data-command-label=\"your projects\" data-command-kind=\"command\"><span>Your projects</span><kbd>Enter</kbd></a><a class=\"command-palette__item\" href=\"/settings\" data-command-label=\"settings\" data-command-kind=\"command\"><span>Settings</span><kbd>Enter</kbd></a><a class=\"command-palette__item\" href=\"/docs\" data-command-label=\"documentation\" data-command-kind=\"command\"><span>Documentation</span><kbd>Enter</kbd></a><a class=\"command-palette__item\" href=\"/help\" data-command-label=\"help\" data-command-kind=\"command\"><span>Help</span><kbd>Enter</kbd></a><a class=\"command-palette__item command-palette__search-elsewhere\" href=\"/browse\" data-search-elsewhere><span>Search Resources.co</span><kbd>Enter</kbd></a></div>\n      </div>\n    </dialog>";
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var focusedHomeIcon = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m3 11 9-8 9 8\"></path><path d=\"M5 10v10h14V10\"></path><path d=\"M9 20v-6h6v6\"></path></svg>";
var projectCloseIcon = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"m7 7 10 10M17 7 7 17\"></path></svg>";
// Lucide `history`, kept inline so the focused editor remains self-contained.
var projectHistoryIcon = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 12a9 9 0 1 0 3-6.7L3 8\"></path><path d=\"M3 3v5h5\"></path><path d=\"M12 7v5l4 2\"></path></svg>";
function focusedProjectDocument(html, namespace, slug) {
  var header = "<header class=\"box focused-header\" data-screen-label=\"brand\"><nav class=\"crumb\" id=\"brand-path\" aria-label=\"Breadcrumb\"><a class=\"home-ic\" href=\"/\" aria-label=\"Home\">".concat(focusedHomeIcon, "</a><span class=\"sep\">/</span><a href=\"/").concat(encodeURIComponent(namespace), "\">").concat(escapeHtml(namespace), "</a><span class=\"sep\">/</span><span class=\"here\">").concat(escapeHtml(slug), "</span></nav></header>");
  return html.replace(/<main class="layout([^"]*)" data-view="standard">/, "<main class=\"layout$1 focused-view\" data-view=\"focused\">").replace(/<header class="box (?:brand|project-identity|focused-header)"[\s\S]*?<\/header>/, header);
}
function embeddedProjectDocument(html) {
  return html.replace(/<main class="layout([^"]*)" data-view="standard">/, "<main class=\"layout$1 embed-view\" data-view=\"embed\">").replace(/<main class="layout([^"]*) focused-view" data-view="focused">/, "<main class=\"layout$1 embed-view\" data-view=\"embed\">");
}
function namespaceDocument(html, namespace) {
  var crumb = "<nav class=\"box crumb\" id=\"crumb\" aria-label=\"Breadcrumb\"><a class=\"home-ic\" aria-label=\"Home\" href=\"/\">".concat(focusedHomeIcon, "</a><span class=\"sep\">/</span><span class=\"here\">").concat(escapeHtml(namespace.namespace), "</span></nav>");
  return html.replace(/<title>[\s\S]*?<\/title>/, "<title>".concat(escapeHtml(namespace.name), " - Resources.co</title>")).replace(/<nav class="box crumb" id="crumb"[\s\S]*?<\/nav>/, crumb);
}
function message(messages, key, fallback) {
  return escapeHtml((messages === null || messages === void 0 ? void 0 : messages[key]) || fallback);
}
function languageMenuHtml(locale, pathname, messages) {
  return "<div class=\"menu__head\">".concat(message(messages, "chrome.language", "Language"), "</div>\n    <form class=\"profile-language\" method=\"get\" action=\"/language\">\n      <select name=\"locale\" aria-label=\"").concat(message(messages, "chrome.language", "Language"), "\" data-language-select>\n        <option value=\"en\"").concat(locale === "en" ? " selected" : "", ">English</option>\n        <option value=\"es\"").concat(locale === "es" ? " selected" : "", ">Espa\xF1ol</option>\n      </select>\n      <input type=\"hidden\" name=\"return\" value=\"").concat(escapeHtml(pathname), "\">\n    </form>");
}
function notificationMenuHtml(messages) {
  var notifications = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var csrf = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
  var badge = notifications.some(function (item) {
    return !item.read;
  }) ? "<span class=\"ub-dot\"></span>" : "";
  var items = notifications.map(function (item) {
    return "<article class=\"notification".concat(item.read ? " is-read" : "", "\">\n    <p><b>").concat(escapeHtml(item.inviter), "</b> invited you to join <b>").concat(escapeHtml(item.organizationName), "</b> as ").concat(escapeHtml(item.role), ".</p>\n    <div class=\"notification__actions\">").concat(item.status === "pending" ? "<form method=\"post\" action=\"/notifications/".concat(encodeURIComponent(item.id), "\"><input type=\"hidden\" name=\"csrf\" value=\"").concat(escapeHtml(csrf), "\"><button name=\"intent\" value=\"accept\" type=\"submit\">Accept</button><button name=\"intent\" value=\"read\" type=\"submit\">Mark read</button><button name=\"intent\" value=\"delete\" type=\"submit\">Delete</button></form>") : "<a href=\"/".concat(encodeURIComponent(item.organizationSlug), "\">View organization</a><form method=\"post\" action=\"/notifications/").concat(encodeURIComponent(item.id), "\"><input type=\"hidden\" name=\"csrf\" value=\"").concat(escapeHtml(csrf), "\"><button name=\"intent\" value=\"delete\" type=\"submit\">Delete</button></form>"), "</div>\n  </article>");
  }).join("");
  return "<details class=\"edge-user-menu edge-icon-menu\">\n    <summary class=\"edge-user-menu__trigger ub-icon\" aria-label=\"".concat(message(messages, "account.notifications", "Notifications"), "\">").concat(resourcesBellIconHtml).concat(badge, "</summary>\n    <div class=\"popover edge-user-menu__panel notification-panel\"><div class=\"menu__head\">").concat(message(messages, "account.notifications", "Notifications"), "</div>").concat(items || "<div class=\"menu__empty\">".concat(message(messages, "account.noNotifications", "You're all caught up."), "</div>"), "</div>\n  </details>");
}
function createMenuHtml(messages) {
  return "<details class=\"edge-user-menu edge-icon-menu\">\n    <summary class=\"edge-user-menu__trigger ub-icon\" aria-label=\"".concat(message(messages, "account.create", "Create new"), "\">").concat(resourcesCreateIconHtml, "</summary>\n    <div class=\"popover edge-user-menu__panel\">\n      <a class=\"item\" href=\"/projects/new\">").concat(message(messages, "account.newProject", "New project"), "</a>\n      <a class=\"item\" href=\"/organizations/new\">").concat(message(messages, "account.newOrganization", "New organization"), "</a>\n    </div>\n  </details>");
}
function authStatusHtml(session) {
  var messages = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
    _ref$locale = _ref.locale,
    locale = _ref$locale === void 0 ? "en" : _ref$locale,
    _ref$pathname = _ref.pathname,
    pathname = _ref$pathname === void 0 ? "/" : _ref$pathname,
    _ref$focused = _ref.focused,
    focused = _ref$focused === void 0 ? false : _ref$focused,
    _ref$signupsEnabled = _ref.signupsEnabled,
    signupsEnabled = _ref$signupsEnabled === void 0 ? false : _ref$signupsEnabled,
    _ref$notifications = _ref.notifications,
    notifications = _ref$notifications === void 0 ? [] : _ref$notifications,
    _ref$notificationCsrf = _ref.notificationCsrf,
    notificationCsrf = _ref$notificationCsrf === void 0 ? "" : _ref$notificationCsrf;
  var shellClass = "box userbar edge-status".concat(focused ? " toolbar--cardless" : "");
  if (!session) {
    return "<aside class=\"".concat(shellClass, "\" data-screen-label=\"runtime-status\">\n      ").concat(renderResourcesCommandPalette(), "\n      ").concat(notificationMenuHtml(messages), "\n      ").concat(createMenuHtml(messages), "\n      <details class=\"edge-user-menu edge-guest-menu\"><summary class=\"edge-user-menu__trigger ub-acct\" aria-label=\"").concat(message(messages, "account.menu", "Account menu"), "\">").concat(resourcesBlankAvatarHtml, "<svg class=\"ub-caret\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m6 9 6 6 6-6\"></path></svg></summary>\n        <div class=\"popover edge-user-menu__panel\"><a class=\"item\" href=\"/settings\">").concat(message(messages, "account.settings", "Settings"), "</a><a class=\"item\" href=\"/help\">").concat(message(messages, "account.help", "Help & docs"), "</a><div class=\"menu__sep\"></div>").concat(resourcesAppearanceHtml, "<div class=\"menu__sep\"></div>").concat(languageMenuHtml(locale, pathname, messages), "<div class=\"menu__sep\"></div><a class=\"item\" href=\"/login\">").concat(message(messages, "auth.login", "Log in"), "</a>").concat(signupsEnabled ? "<a class=\"item\" href=\"/signup\">".concat(message(messages, "auth.signup", "Sign up"), "</a>") : "", "</div>\n      </details>\n    </aside>");
  }
  var initials = session.login.slice(0, 2).toUpperCase();
  return "<aside class=\"".concat(shellClass, "\" data-screen-label=\"runtime-status\">\n    ").concat(renderResourcesCommandPalette(), "\n    ").concat(notificationMenuHtml(messages, notifications, notificationCsrf), "\n    ").concat(createMenuHtml(messages), "\n    <details class=\"edge-user-menu\">\n      <summary class=\"edge-user-menu__trigger ub-acct\" aria-label=\"").concat(message(messages, "account.menu", "Account menu"), "\">\n        <span class=\"ub-avatar\">").concat(escapeHtml(initials), "</span>\n        <svg class=\"ub-caret\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m6 9 6 6 6-6\"></path></svg>\n      </summary>\n      <div class=\"popover edge-user-menu__panel\">\n        <div class=\"menu__acct\"><span class=\"ub-avatar\">").concat(escapeHtml(initials), "</span><div class=\"menu__acct-meta\"><b>").concat(escapeHtml(session.name), "</b><span>@").concat(escapeHtml(session.login), "</span></div></div>\n        <div class=\"menu__sep\"></div>\n        <a class=\"item\" href=\"/projects\">").concat(message(messages, "account.projects", "Your projects"), "</a>\n        <a class=\"item\" href=\"/profile\">").concat(message(messages, "account.profile", "Your profile"), "</a>\n        <div class=\"menu__sep\"></div>\n        <a class=\"item\" href=\"/settings\">").concat(message(messages, "account.settings", "Settings"), "</a>\n        <a class=\"item\" href=\"/help\">").concat(message(messages, "account.help", "Help & docs"), "</a>\n        <div class=\"menu__sep\"></div>\n        ").concat(resourcesAppearanceHtml, "\n        <div class=\"menu__sep\"></div>\n        ").concat(languageMenuHtml(locale, pathname, messages), "\n        <div class=\"menu__sep\"></div>\n        <form method=\"post\" action=\"/logout\"><button class=\"item item--danger\" type=\"submit\">").concat(message(messages, "account.signout", "Sign out"), "</button></form>\n      </div>\n    </details>\n  </aside>");
}
function signupDisabledCard(messages) {
  return "<section class=\"box block auth-card\"><div class=\"auth-eyebrow\">".concat(message(messages, "auth.signup", "Sign up"), "</div><h1>").concat(message(messages, "auth.signupDisabled", "Sign up is not currently enabled"), "</h1><p>").concat(message(messages, "auth.signupDisabledUpdates", "Follow us on X or LinkedIn for updates."), "</p><div class=\"auth-alt\"><a href=\"https://x.com/ResourcesCo\" target=\"_blank\" rel=\"noopener\">X</a> \xB7 <a href=\"https://www.linkedin.com/company/resources-co/\" target=\"_blank\" rel=\"noopener\">LinkedIn</a></div><div class=\"auth-alt\"><a href=\"/login\">").concat(message(messages, "auth.login", "Log in"), "</a></div></section>");
}
function applySignupPolicy(html, pathname, messages, signupsEnabled) {
  if (signupsEnabled) return html;
  html = html.replace(/<a class="item" href="\/signup">[\s\S]*?<\/a>/g, "");
  if (pathname === "/signup") return html.replace(/<section class="box block auth-card">[\s\S]*?<\/section>/, signupDisabledCard(messages));
  if (pathname === "/login") return html.replace(/<div class="auth-alt">[\s\S]*?<\/div>/, "");
  return html;
}
function renderSessionHtml(html, session, messages, options) {
  var controllerVersion = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : "";
  var controllerSrc = "/-/resources-site/controller.js".concat(controllerVersion ? "?v=".concat(controllerVersion) : "");
  return html.replace(/<aside class="box userbar edge-status(?: toolbar--cardless)?"[\s\S]*?<\/aside>/, authStatusHtml(session, messages, options)).replace("</body>", "<script type=\"module\" src=\"".concat(controllerSrc, "\"></script></body>"));
}
function checked(value, expected) {
  return value === expected ? " checked" : "";
}
function selected(value, expected) {
  return value === expected ? " selected" : "";
}
function initialProjectSnapshot() {
  return {
    files: [{
      path: "index.html",
      content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width\">\n  <title>A small article</title>\n  <link rel=\"stylesheet\" href=\"./style.css\">\n</head>\n<body>\n  <article>\n    <h1>A small article</h1>\n    <p><a href=\"https://en.wikipedia.org/wiki/Hypertext\">Hypertext</a> connects documents through links and gives the web its navigable structure.</p>\n    <p><a href=\"https://en.wikipedia.org/wiki/WebAssembly\">WebAssembly</a> provides a portable execution format for programs in the browser.</p>\n    <p><a href=\"https://en.wikipedia.org/wiki/Capability-based_security\">Capability-based security</a> limits programs to the authority they are explicitly given.</p>\n  </article>\n</body>\n</html>"
    }, {
      path: "style.css",
      content: "body {\n  margin: 0;\n  font: 17px/1.6 system-ui, sans-serif;\n  color: #eef2ff;\n  background: #151717;\n}\narticle {\n  max-width: 44rem;\n  margin: auto;\n  padding: 3rem 2rem;\n}\na { color: #30d5c8; }\n"
    }],
    config: {
      entry: "index.html",
      template: "article",
      container: "article",
      containerOptions: {
        allowedLinkPatterns: ["*.wikipedia.org"],
        links: {
          addTargetBlank: true
        }
      },
      sandbox: {
        network: false,
        storage: "session"
      }
    }
  };
}
function projectEditorHtml(_ref2) {
  var snapshot = _ref2.snapshot,
    _ref2$snapshotUrl = _ref2.snapshotUrl,
    snapshotUrl = _ref2$snapshotUrl === void 0 ? "" : _ref2$snapshotUrl,
    _ref2$versionCount = _ref2.versionCount,
    versionCount = _ref2$versionCount === void 0 ? 1 : _ref2$versionCount,
    _ref2$projectId = _ref2.projectId,
    projectId = _ref2$projectId === void 0 ? "" : _ref2$projectId,
    _ref2$projectSlug = _ref2.projectSlug,
    projectSlug = _ref2$projectSlug === void 0 ? "" : _ref2$projectSlug,
    _ref2$csrf = _ref2.csrf,
    csrf = _ref2$csrf === void 0 ? "" : _ref2$csrf,
    messages = _ref2.messages,
    _ref2$persistence = _ref2.persistence,
    persistence = _ref2$persistence === void 0 ? "stored" : _ref2$persistence,
    _ref2$readOnly = _ref2.readOnly,
    readOnly = _ref2$readOnly === void 0 ? false : _ref2$readOnly,
    _ref2$blogExamplesOri = _ref2.blogExamplesOrigin,
    blogExamplesOrigin = _ref2$blogExamplesOri === void 0 ? "" : _ref2$blogExamplesOri;
  var initialSaveState = readOnly ? message(messages, "projectEditor.readOnly", "Read only") : "";
  var initialStatusState = "normal";
  return "<section class=\"project-editor\" data-project-editor data-editor-machine-state=\"starting\" data-output-machine-state=\"starting\" data-project-id=\"".concat(escapeHtml(projectId), "\" data-project-slug=\"").concat(escapeHtml(projectSlug), "\" data-persistence=\"").concat(escapeHtml(persistence), "\" data-read-only=\"").concat(readOnly, "\" data-csrf=\"").concat(escapeHtml(csrf), "\" data-config-label=\"").concat(message(messages, "projectEditor.configuration", "Configuration"), "\" data-current-version-label=\"").concat(message(messages, "projectEditor.currentVersion", "Current Version"), "\" data-template-replaced-label=\"").concat(message(messages, "projectEditor.templateReplaced", "Template replaced the project."), "\" data-undo-label=\"").concat(message(messages, "common.undo", "Undo"), "\">\n    <span hidden data-blog-examples-origin=\"").concat(escapeHtml(blogExamplesOrigin), "\"></span><span hidden data-project-snapshot-url=\"").concat(escapeHtml(snapshotUrl), "\"></span>\n    <div class=\"project-editor__toolbar\">\n      <div class=\"project-editor__source-toolbar\"><div class=\"project-editor__tabs\" data-project-tabs role=\"tablist\" aria-label=\"Open project files\"></div><div class=\"project-editor__file-picker\" data-project-file-picker><button type=\"button\" data-project-file-trigger data-instant-tooltip=\"").concat(message(messages, "projectEditor.selectFile", "Select a file or view"), "\" aria-label=\"").concat(message(messages, "projectEditor.selectFile", "Select a file or view"), "\" aria-haspopup=\"menu\" aria-expanded=\"false\"><span data-project-file-current></span><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\"></svg></button><div class=\"project-editor__file-menu\" data-project-file-menu role=\"menu\" hidden><div class=\"project-editor__popover-head\"><strong>").concat(message(messages, "projectEditor.openFileView", "Open File/View"), "</strong></div><label><span>").concat(message(messages, "projectEditor.filterFiles", "Filter files"), "</span><input type=\"search\" data-project-file-filter autocomplete=\"off\" placeholder=\"").concat(message(messages, "projectEditor.filterFiles", "Filter files"), "\"></label><div data-project-file-options data-open-files-label=\"").concat(message(messages, "projectEditor.openFiles", "Open files"), "\"></div><p data-project-file-empty hidden>").concat(message(messages, "projectEditor.noMatchingFiles", "No matching files"), "</p></div></div><div class=\"project-editor__source-actions\"><button class=\"project-editor__versions\" type=\"button\" data-project-versions-proxy data-instant-tooltip=\"").concat(message(messages, "projectEditor.history", "Version history"), "\" aria-label=\"").concat(message(messages, "projectEditor.history", "Version history"), "\" aria-haspopup=\"dialog\" aria-expanded=\"false\">").concat(projectHistoryIcon, "<svg class=\"project-editor__history-arrow\" viewBox=\"0 0 12 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\"><path d=\"m2 4 4 4 4-4\"></path></svg><span data-current-version hidden>").concat(message(messages, "projectEditor.currentVersion", "Current Version"), "</span><span class=\"project-editor__version-count\" hidden>").concat(versionCount, "</span></button><div class=\"project-overflow\" data-editor-overflow><button type=\"button\" data-editor-overflow-trigger aria-label=\"Editor menu\" aria-haspopup=\"menu\" aria-expanded=\"false\">\u2022\u2022\u2022</button><div class=\"project-overflow__menu\" data-editor-overflow-menu role=\"menu\" hidden><button type=\"button\" role=\"menuitem\" data-save-tab-configuration>Save tab configuration</button><button type=\"button\" role=\"menuitem\" data-project-import>Import ZIP</button><button type=\"button\" role=\"menuitem\" data-project-export>Export ZIP</button></div></div><input type=\"file\" data-project-archive-file accept=\"application/zip,.zip\" hidden></div></div>\n      <div class=\"project-editor__toolbar-split\" aria-hidden=\"true\"></div>\n      <div class=\"project-editor__preview-toolbar\"><span data-preview-title>Output View</span><div class=\"project-editor__view-controls\"><div class=\"project-view-segments\" role=\"group\" aria-label=\"Workspace view\"><button type=\"button\" data-project-view=\"editor\" aria-label=\"Editor\" data-instant-tooltip=\"Editor\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 5.5h16v13H4zM9 10l-2 2 2 2M12 15h4\"/></svg></button><button type=\"button\" data-project-view=\"split\" aria-label=\"Split view\" data-instant-tooltip=\"Split view\" aria-pressed=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3.5 5.5h17v13h-17zM12 5.5v13M6.5 9h2M15.5 9h2\"/></svg></button><button type=\"button\" data-project-view=\"preview\" aria-label=\"Output View\" data-instant-tooltip=\"Output View\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 5.5h16v13H4zM8 15l3-3 2 2 3-4 2 2\"/></svg></button></div><button type=\"button\" class=\"project-details-toggle\" data-project-view=\"details\" aria-label=\"Details\" data-instant-tooltip=\"Details\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 10.5v5M12 7.5h.01\"/></svg></button><button type=\"button\" data-project-present aria-label=\"Expanded view\" data-instant-tooltip=\"Expanded view\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5\"/></svg></button><div class=\"project-overflow project-output-overflow\" data-output-overflow><button type=\"button\" data-output-overflow-trigger aria-label=\"Output menu\" aria-haspopup=\"menu\" aria-expanded=\"false\">\u2022\u2022\u2022</button><div class=\"project-overflow__menu\" data-output-overflow-menu role=\"menu\" hidden><button type=\"button\" role=\"menuitem\" data-project-fullscreen>Full screen</button></div></div></div></div>\n    </div>\n    <textarea name=\"snapshot\" data-project-snapshot hidden>").concat(escapeHtml(JSON.stringify(snapshot)), "</textarea>\n    <div class=\"project-editor__workspace\" data-view=\"split\">\n      <section class=\"project-editor__source\" aria-label=\"").concat(message(messages, "projectCreate.editor", "Sandboxed project editor"), "\"><span class=\"project-editor__pane-loading\" aria-hidden=\"true\"></span><div id=\"editor\" class=\"project-editor__mount\" data-project-editor-mount></div></section>\n      <div class=\"project-editor__splitter\" role=\"separator\" aria-label=\"Resize editor and preview\" aria-orientation=\"vertical\" aria-valuemin=\"20\" aria-valuemax=\"80\" aria-valuenow=\"50\" tabindex=\"0\"></div>\n      <section class=\"project-editor__preview\" aria-label=\"Project output\"><span class=\"project-editor__pane-loading\" aria-hidden=\"true\"></span><button class=\"project-editor__present-close\" type=\"button\" data-project-present-close aria-label=\"Close full screen\">\xD7</button><div data-project-preview></div><div class=\"project-editor__status\" role=\"status\" data-project-status data-state=\"").concat(initialStatusState, "\" hidden><span class=\"project-editor__notice\" data-project-notice hidden></span><span class=\"project-editor__error\" data-project-error hidden></span><span class=\"project-editor__save\" data-project-save hidden>").concat(initialSaveState, "</span></div></section>\n    </div>\n    <aside class=\"project-editor__history\" data-project-history role=\"dialog\" aria-label=\"").concat(message(messages, "projectEditor.history", "Version history"), "\" hidden><div class=\"project-editor__popover-head\"><strong>").concat(message(messages, "projectEditor.history", "Version history"), "</strong></div><div data-project-version-list></div></aside>\n  </section>");
}
