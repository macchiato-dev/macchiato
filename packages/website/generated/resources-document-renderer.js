function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
var ACCOUNT_CONTENT_MARKER = "<p>__RESOURCES_ACCOUNT_CONTENT__</p>";
var PUBLIC_PROJECTS_MARKER = "<p>__RESOURCES_PUBLIC_PROJECTS__</p>";
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
  return applySignupPolicy(html, options.pathname, messages, options.signupsEnabled).replace(/<aside class="box userbar edge-status(?: toolbar--cardless)?"[\s\S]*?<\/aside>/, authStatusHtml(session, messages, options)).replace("</body>", "<script type=\"module\" src=\"".concat(controllerSrc, "\"></script></body>"));
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
  return "<section class=\"project-editor\" data-project-editor data-editor-machine-state=\"starting\" data-output-machine-state=\"starting\" data-project-id=\"".concat(escapeHtml(projectId), "\" data-project-slug=\"").concat(escapeHtml(projectSlug), "\" data-persistence=\"").concat(escapeHtml(persistence), "\" data-read-only=\"").concat(readOnly, "\" data-csrf=\"").concat(escapeHtml(csrf), "\" data-config-label=\"").concat(message(messages, "projectEditor.configuration", "Configuration"), "\" data-current-version-label=\"").concat(message(messages, "projectEditor.currentVersion", "Current Version"), "\" data-template-replaced-label=\"").concat(message(messages, "projectEditor.templateReplaced", "Template replaced the project."), "\" data-undo-label=\"").concat(message(messages, "common.undo", "Undo"), "\">\n    <span hidden data-blog-examples-origin=\"").concat(escapeHtml(blogExamplesOrigin), "\"></span><span hidden data-project-snapshot-url=\"").concat(escapeHtml(snapshotUrl), "\"></span>\n    <div class=\"project-editor__toolbar\">\n      <div class=\"project-editor__source-toolbar\"><div class=\"project-editor__tabs\" data-project-tabs role=\"tablist\" aria-label=\"Open project files\"></div><div class=\"project-editor__file-picker\" data-project-file-picker><button type=\"button\" data-project-file-trigger data-instant-tooltip=\"").concat(message(messages, "projectEditor.selectFile", "Select a file or view"), "\" aria-label=\"").concat(message(messages, "projectEditor.selectFile", "Select a file or view"), "\" aria-haspopup=\"menu\" aria-expanded=\"false\"><span data-project-file-current></span><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\"></svg></button><div class=\"project-editor__file-menu\" data-project-file-menu role=\"menu\" hidden><div class=\"project-editor__popover-head\"><strong>").concat(message(messages, "projectEditor.openFileView", "Open File/View"), "</strong></div><label><span>").concat(message(messages, "projectEditor.filterFiles", "Filter files"), "</span><input type=\"search\" data-project-file-filter autocomplete=\"off\" placeholder=\"").concat(message(messages, "projectEditor.filterFiles", "Filter files"), "\"></label><div data-project-file-options data-open-files-label=\"").concat(message(messages, "projectEditor.openFiles", "Open files"), "\"></div><p data-project-file-empty hidden>").concat(message(messages, "projectEditor.noMatchingFiles", "No matching files"), "</p></div></div><div class=\"project-editor__source-actions\"><button class=\"project-editor__versions\" type=\"button\" data-project-versions-proxy data-instant-tooltip=\"").concat(message(messages, "projectEditor.history", "Version history"), "\" aria-label=\"").concat(message(messages, "projectEditor.history", "Version history"), "\" aria-haspopup=\"dialog\" aria-expanded=\"false\">").concat(projectHistoryIcon, "<svg class=\"project-editor__history-arrow\" viewBox=\"0 0 12 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\"><path d=\"m2 4 4 4 4-4\"></path></svg><span data-current-version hidden>").concat(message(messages, "projectEditor.currentVersion", "Current Version"), "</span><span class=\"project-editor__version-count\" hidden>").concat(versionCount, "</span></button><div class=\"project-overflow\" data-editor-overflow><button type=\"button\" data-editor-overflow-trigger aria-label=\"Editor menu\" aria-haspopup=\"menu\" aria-expanded=\"false\">\u2022\u2022\u2022</button><div class=\"project-overflow__menu\" data-editor-overflow-menu role=\"menu\" hidden><button type=\"button\" role=\"menuitem\" data-save-tab-configuration>Save tab configuration</button><button type=\"button\" role=\"menuitem\" data-project-import>Import ZIP</button><button type=\"button\" role=\"menuitem\" data-project-export>Export ZIP</button></div></div><input type=\"file\" data-project-archive-file accept=\"application/zip,.zip\" hidden></div></div>\n      <div class=\"project-editor__toolbar-split\" aria-hidden=\"true\"></div>\n      <div class=\"project-editor__preview-toolbar\"><span data-preview-title>Output View</span><div class=\"project-editor__view-controls\"><div class=\"project-view-segments\" role=\"group\" aria-label=\"Workspace view\"><button type=\"button\" data-project-view=\"editor\" aria-label=\"Editor\" data-instant-tooltip=\"Editor\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 5.5h16v13H4zM9 10l-2 2 2 2M12 15h4\"/></svg></button><button type=\"button\" data-project-view=\"split\" aria-label=\"Split view\" data-instant-tooltip=\"Split view\" aria-pressed=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3.5 5.5h17v13h-17zM12 5.5v13M6.5 9h2M15.5 9h2\"/></svg></button><button type=\"button\" data-project-view=\"preview\" aria-label=\"Output View\" data-instant-tooltip=\"Output View\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 5.5h16v13H4zM8 15l3-3 2 2 3-4 2 2\"/></svg></button></div><button type=\"button\" class=\"project-details-toggle\" data-project-view=\"details\" aria-label=\"Details\" data-instant-tooltip=\"Details\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 10.5v5M12 7.5h.01\"/></svg></button><button type=\"button\" data-project-present aria-label=\"Expanded view\" data-instant-tooltip=\"Expanded view\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5\"/></svg></button><div class=\"project-overflow project-output-overflow\" data-output-overflow><button type=\"button\" data-output-overflow-trigger aria-label=\"Output menu\" aria-haspopup=\"menu\" aria-expanded=\"false\">\u2022\u2022\u2022</button><div class=\"project-overflow__menu\" data-output-overflow-menu role=\"menu\" hidden><button type=\"button\" role=\"menuitem\" data-project-fullscreen>Full screen</button></div></div></div></div>\n    </div>\n    <div class=\"version-title-modal project-import-modal\" data-project-import-modal role=\"dialog\" aria-modal=\"true\" aria-label=\"Import ZIP\" hidden>\n      <div>\n        <header><h2>Import ZIP</h2><button type=\"button\" data-project-import-close aria-label=\"Close import\">\xD7</button></header>\n        <button type=\"button\" class=\"project-import-modal__drop\" data-project-import-choose>Drop a project ZIP here<span>or click to choose a file \xB7 up to 50 MB</span></button>\n        <p>Replaces the files and configuration in this draft.</p>\n        <p data-project-import-error role=\"alert\"></p>\n      </div>\n    </div>\n    <textarea name=\"snapshot\" data-project-snapshot hidden>").concat(escapeHtml(JSON.stringify(snapshot)), "</textarea>\n    <div class=\"project-editor__workspace\" data-view=\"split\">\n      <section class=\"project-editor__source\" aria-label=\"").concat(message(messages, "projectCreate.editor", "Sandboxed project editor"), "\"><span class=\"project-editor__pane-loading\" aria-hidden=\"true\"></span><div id=\"editor\" class=\"project-editor__mount\" data-project-editor-mount></div></section>\n      <div class=\"project-editor__splitter\" role=\"separator\" aria-label=\"Resize editor and preview\" aria-orientation=\"vertical\" aria-valuemin=\"20\" aria-valuemax=\"80\" aria-valuenow=\"50\" tabindex=\"0\"></div>\n      <section class=\"project-editor__preview\" aria-label=\"Project output\"><span class=\"project-editor__pane-loading\" aria-hidden=\"true\"></span><button class=\"project-editor__present-close\" type=\"button\" data-project-present-close aria-label=\"Close full screen\">\xD7</button><div data-project-preview></div><div class=\"project-editor__status\" role=\"status\" data-project-status data-state=\"").concat(initialStatusState, "\" hidden><span class=\"project-editor__notice\" data-project-notice hidden></span><span class=\"project-editor__error\" data-project-error hidden></span><span class=\"project-editor__save\" data-project-save hidden>").concat(initialSaveState, "</span></div></section>\n    </div>\n    <aside class=\"project-editor__history\" data-project-history role=\"dialog\" aria-label=\"").concat(message(messages, "projectEditor.history", "Version history"), "\" hidden><div class=\"project-editor__popover-head\"><strong>").concat(message(messages, "projectEditor.history", "Version history"), "</strong></div><div data-project-version-list></div></aside>\n  </section>");
}
function dashboardHtml(content, messages) {
  var projects = content.projects.length ? "<div class=\"account-grid\">".concat(content.projects.map(function (item) {
    return "<a class=\"account-card\" data-project-link href=\"/".concat(encodeURIComponent(item.namespace), "/").concat(encodeURIComponent(item.slug), "\">\n        <h3>").concat(escapeHtml(item.name), "</h3>\n        <span class=\"account-card__namespace\">").concat(escapeHtml(item.namespace), "/").concat(escapeHtml(item.slug), "</span>\n        <p>").concat(escapeHtml(item.description || "".concat(item.template.toUpperCase(), " project")), "</p>\n        <span class=\"account-card__meta\">").concat(message(messages, "dashboard.".concat(item.visibility), item.visibility), "</span>\n      </a>");
  }).join(""), "</div>") : "<div class=\"account-empty\">".concat(message(messages, "dashboard.noProjects", "No projects yet."), "</div>");
  var organizations = content.organizations.length ? "<div class=\"account-grid\">".concat(content.organizations.map(function (item) {
    return "<a class=\"account-card\" href=\"/".concat(encodeURIComponent(item.slug), "\">\n        <span class=\"account-card__namespace\">").concat(message(messages, "common.organization", "Organization"), "</span>\n        <h3>").concat(escapeHtml(item.name), "</h3>\n        <p>").concat(escapeHtml(item.description || item.slug), "</p>\n      </a>");
  }).join(""), "</div>") : "<div class=\"account-empty\">".concat(message(messages, "dashboard.noOrganizations", "No organizations yet."), "</div>");
  return "<div class=\"account-dashboard\">\n    <div class=\"account-dashboard__header\"><div><h1>".concat(message(messages, "dashboard.heading", "Your projects"), "</h1><p class=\"account-dashboard__intro\">").concat(message(messages, "dashboard.intro", "Projects and organizations owned by your account."), "</p></div>\n      <a class=\"account-action\" href=\"/projects/new\">").concat(message(messages, "account.newProject", "New Project"), "</a></div>\n    <section class=\"account-section\"><div class=\"account-section__header\"><h2>").concat(message(messages, "dashboard.projects", "Projects"), "</h2></div>").concat(projects, "<div class=\"create-actions\"><a class=\"account-action account-action--secondary\" href=\"/projects\">").concat(message(messages, "dashboard.viewAllProjects", "View all projects"), "</a></div></section>\n    <section class=\"account-section\"><div class=\"account-section__header\"><h2>").concat(message(messages, "dashboard.organizations", "Organizations"), "</h2><a class=\"account-action account-action--secondary\" href=\"/organizations/new\">").concat(message(messages, "account.newOrganization", "New organization"), "</a></div>").concat(organizations, "</section>\n  </div>");
}
function projectsHtml(content, messages) {
  var projects = content.projects.length ? "<div class=\"account-grid\">".concat(content.projects.map(function (item) {
    return "<a class=\"account-card\" data-project-link href=\"/".concat(encodeURIComponent(item.namespace), "/").concat(encodeURIComponent(item.slug), "\">\n        <h3>").concat(escapeHtml(item.name), "</h3>\n        <span class=\"account-card__namespace\">").concat(escapeHtml(item.namespace), "/").concat(escapeHtml(item.slug), "</span>\n        <p>").concat(escapeHtml(item.description || "".concat(item.template.toUpperCase(), " project")), "</p>\n        <span class=\"account-card__meta\">").concat(message(messages, "dashboard.".concat(item.visibility), item.visibility), "</span>\n      </a>");
  }).join(""), "</div>") : "<div class=\"account-empty\">".concat(message(messages, "dashboard.noProjects", "No projects yet."), "</div>");
  return "<div class=\"account-dashboard\"><div class=\"account-dashboard__header\"><div><h1>".concat(message(messages, "dashboard.projects", "Projects"), "</h1></div><a class=\"account-action\" href=\"/projects/new\">").concat(message(messages, "account.newProject", "New Project"), "</a></div><section class=\"account-section\">").concat(projects, "</section></div>");
}
function formError(error, messages) {
  return error ? "<p class=\"form-error\" role=\"alert\">".concat(error === "slug" ? message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens.") : message(messages, "content.error", "Check the form and try again."), "</p>") : "";
}
function projectFieldsHtml(_ref3) {
  var _snapshot$config, _snapshot$config2;
  var session = _ref3.session,
    content = _ref3.content,
    _ref3$project = _ref3.project,
    project = _ref3$project === void 0 ? null : _ref3$project,
    snapshot = _ref3.snapshot,
    messages = _ref3.messages,
    editable = _ref3.editable,
    submitLabel = _ref3.submitLabel,
    _ref3$hasUnpublishedC = _ref3.hasUnpublishedChanges,
    hasUnpublishedChanges = _ref3$hasUnpublishedC === void 0 ? false : _ref3$hasUnpublishedC,
    _ref3$draft = _ref3.draft,
    draft = _ref3$draft === void 0 ? false : _ref3$draft,
    _ref3$versionCount = _ref3.versionCount,
    versionCount = _ref3$versionCount === void 0 ? 1 : _ref3$versionCount;
  var disabled = editable ? "" : " disabled";
  var templateName = String((snapshot === null || snapshot === void 0 || (_snapshot$config = snapshot.config) === null || _snapshot$config === void 0 ? void 0 : _snapshot$config.template) || (project === null || project === void 0 ? void 0 : project.template) || "article");
  var patterns = (snapshot === null || snapshot === void 0 || (_snapshot$config2 = snapshot.config) === null || _snapshot$config2 === void 0 || (_snapshot$config2 = _snapshot$config2.containerOptions) === null || _snapshot$config2 === void 0 ? void 0 : _snapshot$config2.allowedLinkPatterns) || [];
  var namespaceOptions = editable && session ? ["<option value=\"user\"".concat(selected((project === null || project === void 0 ? void 0 : project.namespaceKind) || "user", "user"), ">@").concat(escapeHtml(session.login), "</option>")].concat(_toConsumableArray(content.organizations.map(function (item) {
    return "<option value=\"".concat(escapeHtml(item.id), "\"").concat(selected((project === null || project === void 0 ? void 0 : project.namespace) === item.slug ? item.id : "", item.id), ">").concat(escapeHtml(item.name), "</option>");
  }))).join("") : "<option>".concat(escapeHtml((project === null || project === void 0 ? void 0 : project.namespace) || ""), "</option>");
  return "<div class=\"project-create__fields\" data-project-fields>\n    <div class=\"project-fields__toolbar\">".concat(editable ? "<div class=\"project-fields__toolbar-actions\"><div class=\"project-overflow\" data-project-overflow><button type=\"button\" data-project-overflow-trigger aria-label=\"Project menu\" aria-haspopup=\"menu\" aria-expanded=\"false\">\u2022\u2022\u2022</button><div class=\"project-overflow__menu\" data-project-overflow-menu role=\"menu\" hidden><button type=\"button\" role=\"menuitem\" ".concat(draft ? "data-open-draft-delete" : "data-open-project-delete", ">").concat(draft ? message(messages, "projectCreate.discardDraft", "Discard draft") : message(messages, "projectView.delete", "Delete project"), "</button></div></div><a class=\"project-close\" href=\"/\" aria-label=\"Close project\">").concat(projectCloseIcon, "</a></div>") : "<a class=\"project-close\" href=\"/\" aria-label=\"Close project\">".concat(projectCloseIcon, "</a>"), "</div>\n    <div class=\"create-form__field\"><label for=\"project-template\">").concat(message(messages, "projectCreate.template", "Template"), "</label><select id=\"project-template\" name=\"template\" data-project-template").concat(disabled, "><option value=\"article\"").concat(selected(templateName, "article"), ">").concat(message(messages, "projectCreate.article", "Article"), "</option><option value=\"hello\"").concat(selected(templateName, "hello"), ">").concat(message(messages, "projectCreate.hello", "Hello, HTML"), "</option><option value=\"html\"").concat(selected(templateName, "html"), ">Single-file document</option><option value=\"clock\"").concat(selected(templateName, "clock"), ">").concat(message(messages, "projectCreate.clock", "Digital clock"), "</option><option value=\"mark\"").concat(selected(templateName, "mark"), ">").concat(message(messages, "projectCreate.mark", "Logo mark"), "</option><option value=\"chart\"").concat(selected(templateName, "chart"), ">").concat(message(messages, "projectCreate.chart", "Bar chart"), "</option><option value=\"ball\"").concat(selected(templateName, "ball"), ">").concat(message(messages, "projectCreate.ball", "Bouncing ball"), "</option><option value=\"stars\"").concat(selected(templateName, "stars"), ">").concat(message(messages, "projectCreate.stars", "Starfield"), "</option><option value=\"paint\"").concat(selected(templateName, "paint"), ">Canvas paint</option><option value=\"webgl\"").concat(selected(templateName, "webgl"), ">WebGL triangle</option><option value=\"webgpu\"").concat(selected(templateName, "webgpu"), ">WebGPU triangle</option><option value=\"three\"").concat(selected(templateName, "three"), ">Three.js triangle</option><option value=\"slides\"").concat(selected(templateName, "slides"), ">Presentation</option><option value=\"vue\"").concat(selected(templateName, "vue"), ">Vue SFC</option><option value=\"svelte\"").concat(selected(templateName, "svelte"), ">Svelte</option><option value=\"blank\"").concat(selected(templateName, "blank"), ">").concat(message(messages, "projectCreate.blank", "Blank project"), "</option></select></div>\n    <div class=\"create-form__field\"><div class=\"field-label-with-help\"><label for=\"project-link-patterns\">").concat(message(messages, "projectCreate.allowedLinks", "Allowed Link URL Patterns"), "</label><span class=\"field-help\"><span class=\"field-help__trigger\" tabindex=\"0\" aria-label=\"").concat(message(messages, "projectCreate.allowedLinksHelp", "URL pattern syntax"), "\">?</span><span class=\"field-help__text\" role=\"tooltip\">").concat(message(messages, "projectCreate.allowedLinksHelp", "Use a hostname with wildcards, optionally followed by a path. Surround a specific URL with backquotes or a JavaScript regular expression with forward slashes."), "</span></span></div><textarea id=\"project-link-patterns\" name=\"allowedLinkPatterns\" rows=\"1\" wrap=\"off\" data-autogrow").concat(disabled, ">").concat(escapeHtml(patterns.join("\n")), "</textarea></div>\n    <div class=\"create-form__field\"><label for=\"project-name\">").concat(message(messages, "projectCreate.name", "Title"), "</label><input id=\"project-name\" name=\"name\" maxlength=\"80\" value=\"").concat(escapeHtml((project === null || project === void 0 ? void 0 : project.name) || ""), "\" data-slug-source=\"project-slug\" required").concat(disabled, "></div>\n    <div class=\"create-form__field\"><label for=\"project-slug\">").concat(message(messages, "projectCreate.slug", "Name"), "</label><input id=\"project-slug\" name=\"slug\" maxlength=\"63\" value=\"").concat(escapeHtml((project === null || project === void 0 ? void 0 : project.slug) || ""), "\" pattern=\"[a-z0-9]+(?:-[a-z0-9]+)*\" aria-describedby=\"project-slug-error\" autocapitalize=\"none\" autocomplete=\"off\" spellcheck=\"false\" required").concat(disabled, "><p id=\"project-slug-error\" class=\"form-field-error\" data-message=\"").concat(message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens."), "\" hidden>").concat(message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens."), "</p></div>\n    <div class=\"create-form__field\"><label for=\"project-description\">").concat(message(messages, "projectCreate.description", "Description (optional)"), "</label><span class=\"autogrow-textarea\" data-autogrow-replica><span class=\"autogrow-textarea__measure\" data-autogrow-measure aria-hidden=\"true\">").concat(escapeHtml((project === null || project === void 0 ? void 0 : project.description) || ""), " </span><textarea id=\"project-description\" name=\"description\" maxlength=\"500\" rows=\"1\" data-autogrow").concat(disabled, ">").concat(escapeHtml((project === null || project === void 0 ? void 0 : project.description) || ""), "</textarea></span></div>\n    ").concat(editable ? "<div class=\"create-form__field\"><label for=\"project-namespace\">".concat(message(messages, "projectCreate.namespace", "Namespace"), "</label><select id=\"project-namespace\" name=\"namespace\">").concat(namespaceOptions, "</select></div>\n    <fieldset><legend>").concat(message(messages, "projectCreate.visibility", "Visibility"), "</legend><div class=\"create-form__options\"><label><input type=\"radio\" name=\"visibility\" value=\"public\"").concat(checked((project === null || project === void 0 ? void 0 : project.visibility) || "public", "public"), "> ").concat(message(messages, "dashboard.public", "Public"), "</label><label><input type=\"radio\" name=\"visibility\" value=\"private\"").concat(checked(project === null || project === void 0 ? void 0 : project.visibility, "private"), "> ").concat(message(messages, "dashboard.private", "Private"), "</label></div></fieldset>") : "", "\n    ").concat(editable ? "<div class=\"draft-flash\" data-draft-flash".concat(hasUnpublishedChanges ? "" : " hidden", "><span>").concat(message(messages, "projectView.unsavedDraft", "There are draft changes."), "</span><button class=\"draft-flash__revert\" type=\"submit\" name=\"intent\" value=\"revert\" formnovalidate>").concat(message(messages, "projectView.revertPublished", "Revert to published version"), "</button><button class=\"draft-flash__dismiss\" type=\"button\" data-dismiss-draft-flash aria-label=\"").concat(message(messages, "common.dismiss", "Dismiss"), "\">\xD7</button></div>") : "", "\n    ").concat(editable ? "<input type=\"hidden\" name=\"versionTitle\" data-version-title><div class=\"create-actions\">".concat(draft ? "<button class=\"account-action\" type=\"submit\" data-project-submit data-default-label=\"".concat(escapeHtml(submitLabel), "\">").concat(submitLabel, "</button>") : "<div class=\"save-split\" data-save-split><button class=\"account-action save-split__primary\" type=\"submit\" data-project-submit data-default-label=\"".concat(escapeHtml(submitLabel), "\"").concat(project && !hasUnpublishedChanges ? " disabled" : "", ">").concat(submitLabel, "</button><button class=\"account-action save-split__arrow\" type=\"button\" data-save-menu-trigger aria-label=\"More save options\" aria-haspopup=\"menu\" aria-expanded=\"false\"><svg viewBox=\"0 0 12 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\"><path d=\"m2 4 4 4 4-4\"></path></svg></button><div class=\"save-split__menu\" data-save-menu role=\"menu\" hidden><button type=\"button\" role=\"menuitem\" data-open-version-title>Save with title\u2026</button></div></div>"), "</div>") : "", "\n    ").concat(editable ? "<div class=\"destructive-actions\"".concat(draft ? " data-draft-actions hidden" : "", "><div class=\"destructive-confirm\" data-destructive-confirm role=\"alertdialog\" aria-label=\"").concat(draft ? message(messages, "projectCreate.discardDraft", "Discard draft") : message(messages, "projectView.delete", "Delete project"), "\" hidden><strong>").concat(draft ? message(messages, "projectCreate.discardWarning", "Discard this project draft? This cannot be undone.") : message(messages, "projectView.deleteWarning", "Delete this project and its version history? This cannot be undone."), "</strong><div><button type=\"button\" data-cancel-delete>").concat(message(messages, "common.cancel", "Cancel"), "</button>").concat(draft ? "<button type=\"button\" data-confirm-draft-delete>".concat(message(messages, "projectCreate.discardDraft", "Discard draft"), "</button>") : "<button type=\"submit\" name=\"intent\" value=\"delete\" formnovalidate>".concat(message(messages, "projectView.delete", "Delete project"), "</button>"), "</div></div></div><div class=\"version-title-modal\" data-version-title-modal role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"version-title-heading\" hidden><div><h2 id=\"version-title-heading\">Save with title</h2><label for=\"version-title-input\">Version title</label><input id=\"version-title-input\" maxlength=\"80\" data-version-title-input><div class=\"version-title-modal__actions\"><button type=\"button\" data-version-title-cancel>Cancel</button><button type=\"button\" class=\"account-action\" data-version-title-save>Save version</button></div></div></div>") : "", "\n  </div>");
}
function projectViewHtml(project, messages, workspace, csrf, owner, session, content, url) {
  var _ref4 = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : {},
    _ref4$embed = _ref4.embed,
    embed = _ref4$embed === void 0 ? false : _ref4$embed,
    _ref4$blogExamplesOri = _ref4.blogExamplesOrigin,
    blogExamplesOrigin = _ref4$blogExamplesOri === void 0 ? "" : _ref4$blogExamplesOri,
    _ref4$snapshotUrl = _ref4.snapshotUrl,
    snapshotUrl = _ref4$snapshotUrl === void 0 ? "" : _ref4$snapshotUrl;
  var form = owner ? "<form class=\"create-form\" method=\"post\" action=\"/projects/".concat(encodeURIComponent(project.id), "\"><input type=\"hidden\" name=\"csrf\" value=\"").concat(escapeHtml(csrf), "\">") : "<div class=\"create-form\" aria-label=\"Project details\">";
  var close = owner ? "</form>" : "</div>";
  return "<div class=\"account-dashboard project-create project-view project-workspace".concat(embed ? " project-embed" : "", "\">").concat(form).concat(formError(url, messages), "<div class=\"project-create__layout\">\n    ").concat(projectEditorHtml({
    snapshot: workspace.snapshot,
    snapshotUrl: snapshotUrl,
    versionCount: workspace.versionCount,
    projectId: project.id,
    projectSlug: project.slug,
    csrf: csrf,
    messages: messages,
    persistence: owner ? "stored" : "memory",
    blogExamplesOrigin: blogExamplesOrigin
  }), "\n    ").concat(embed ? "" : projectFieldsHtml({
    session: session,
    content: content,
    project: project,
    snapshot: workspace.snapshot,
    messages: messages,
    editable: owner,
    submitLabel: message(messages, "projectView.save", "Save project"),
    hasUnpublishedChanges: workspace.hasUnpublishedChanges,
    versionCount: workspace.versionCount
  }), "\n  </div>").concat(close, "</div>");
}
function projectFormHtml(session, content, token, messages, url) {
  var snapshot = initialProjectSnapshot();
  return "<div class=\"account-dashboard project-create project-view project-workspace\">\n    ".concat(formError(url, messages), "\n    <form class=\"create-form\" method=\"post\" action=\"/projects\">\n      <input type=\"hidden\" name=\"csrf\" value=\"").concat(escapeHtml(token), "\">\n      <div class=\"project-create__layout\">\n        ").concat(projectEditorHtml({
    snapshot: snapshot,
    messages: messages,
    persistence: "session"
  }), "\n        ").concat(projectFieldsHtml({
    session: session,
    content: content,
    snapshot: snapshot,
    messages: messages,
    editable: true,
    submitLabel: message(messages, "projectCreate.submit", "Create project"),
    draft: true
  }), "\n      </div>\n    </form>\n  </div>");
}
function tryFieldsHtml(messages) {
  return "<aside class=\"project-create__fields try-fields\" data-project-fields aria-label=\"".concat(message(messages, "try.settings", "Playground settings"), "\">\n    <div class=\"project-fields__toolbar\"><a class=\"project-close\" href=\"/\" aria-label=\"Close project\">").concat(projectCloseIcon, "</a></div>\n    <div class=\"create-form__field\"><label for=\"project-template\">").concat(message(messages, "projectCreate.template", "Template"), "</label><select id=\"project-template\" name=\"template\" data-project-template><option value=\"article\">").concat(message(messages, "projectCreate.article", "Article"), "</option><option value=\"hello\">").concat(message(messages, "projectCreate.hello", "Hello, HTML"), "</option><option value=\"html\">Single-file document</option><option value=\"clock\">").concat(message(messages, "projectCreate.clock", "Digital clock"), "</option><option value=\"mark\">").concat(message(messages, "projectCreate.mark", "Logo mark"), "</option><option value=\"chart\">").concat(message(messages, "projectCreate.chart", "Bar chart"), "</option><option value=\"ball\">").concat(message(messages, "projectCreate.ball", "Bouncing ball"), "</option><option value=\"stars\">").concat(message(messages, "projectCreate.stars", "Starfield"), "</option><option value=\"paint\">Canvas paint</option><option value=\"webgl\">WebGL triangle</option><option value=\"webgpu\">WebGPU triangle</option><option value=\"three\">Three.js triangle</option><option value=\"slides\">Presentation</option><option value=\"vue\">Vue SFC</option><option value=\"svelte\">Svelte</option><option value=\"blank\">").concat(message(messages, "projectCreate.blank", "Blank project"), "</option></select></div>\n    <div class=\"create-form__field\"><div class=\"field-label-with-help\"><label for=\"project-link-patterns\">").concat(message(messages, "projectCreate.allowedLinks", "Allowed Link URL Patterns"), "</label></div><textarea id=\"project-link-patterns\" name=\"allowedLinkPatterns\" rows=\"1\" wrap=\"off\" data-autogrow>*.wikipedia.org</textarea></div>\n  </aside>");
}
function tryProjectHtml(messages) {
  return "<div class=\"account-dashboard project-create project-view project-workspace\"><form class=\"create-form\" data-try-form><div class=\"project-create__layout\">".concat(projectEditorHtml({
    snapshot: initialProjectSnapshot(),
    messages: messages,
    persistence: "memory"
  })).concat(tryFieldsHtml(messages), "</div></form></div>");
}
function publicProjectsHtml(projects, messages) {
  var content = !projects.length ? "<div class=\"account-empty\">".concat(message(messages, "publicProjects.empty", "No public projects have been published yet."), "</div>") : "<div class=\"account-grid\">".concat(projects.map(function (item) {
    return "<a class=\"account-card\" data-project-link href=\"/".concat(encodeURIComponent(item.namespace), "/").concat(encodeURIComponent(item.slug), "\"><h3>").concat(escapeHtml(item.name), "</h3><span class=\"account-card__namespace\">").concat(escapeHtml(item.namespace), "/").concat(escapeHtml(item.slug), "</span><p>").concat(escapeHtml(item.description || "".concat(item.template.toUpperCase(), " project")), "</p></a>");
  }).join(""), "</div>");
  return "<div data-public-projects>".concat(content, "</div>");
}

// The publication build uses this to produce an anonymous home document that
// the small Bunny bootstrap can serve without initializing OAuth, libSQL, or
// the full application bundle. Live project discovery remains a deferred route;
// the fast document deliberately renders the valid empty state.
function renderFastAnonymousHome(html, messages) {
  var _ref5 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
    _ref5$locale = _ref5.locale,
    locale = _ref5$locale === void 0 ? "en" : _ref5$locale,
    _ref5$signupsEnabled = _ref5.signupsEnabled,
    signupsEnabled = _ref5$signupsEnabled === void 0 ? true : _ref5$signupsEnabled,
    _ref5$controllerVersi = _ref5.controllerVersion,
    controllerVersion = _ref5$controllerVersi === void 0 ? "" : _ref5$controllerVersi;
  if (!html.includes(PUBLIC_PROJECTS_MARKER)) throw new Error("Fast home public-project marker is missing");
  var withProjects = html.replace(PUBLIC_PROJECTS_MARKER, function () {
    return publicProjectsHtml([], messages);
  });
  var withSignupPolicy = applySignupPolicy(withProjects, "/", messages, signupsEnabled);
  return renderSessionHtml(withSignupPolicy, null, messages, {
    locale: locale,
    pathname: "/",
    focused: false,
    signupsEnabled: signupsEnabled
  }, controllerVersion);
}
function namespaceProjectsHtml(namespace, messages) {
  return "<div class=\"account-dashboard namespace-view\"><div class=\"account-dashboard__header\"><div><span class=\"account-card__namespace\">".concat(message(messages, namespace.kind === "organization" ? "common.organization" : "common.user", namespace.kind), "</span><h1>").concat(escapeHtml(namespace.name), "</h1><p class=\"account-dashboard__intro\">@").concat(escapeHtml(namespace.namespace), "</p></div></div><section class=\"account-section\"><div class=\"account-section__header\"><h2>").concat(message(messages, "dashboard.projects", "Projects"), "</h2></div>").concat(publicProjectsHtml(namespace.projects, messages), "</section></div>");
}
function profileHtml(account, token, messages, url) {
  return "<div class=\"account-dashboard\"><div class=\"account-dashboard__header\"><div><h1>".concat(message(messages, "profile.heading", "Your profile"), "</h1><p class=\"account-dashboard__intro\">").concat(message(messages, "profile.intro", "Choose the public username used by your profile and personal projects."), "</p></div></div>").concat(formError(url, messages), "<form class=\"create-form\" method=\"post\" action=\"/profile\"><input type=\"hidden\" name=\"csrf\" value=\"").concat(escapeHtml(token), "\"><div class=\"create-form__field\"><label for=\"profile-username\">").concat(message(messages, "profile.username", "Username"), "</label><input id=\"profile-username\" name=\"username\" minlength=\"4\" maxlength=\"63\" pattern=\"[a-z0-9]+(?:-[a-z0-9]+)*\" value=\"").concat(escapeHtml(account.login), "\" autocapitalize=\"none\" autocomplete=\"username\" spellcheck=\"false\" required><p class=\"form-help\">").concat(message(messages, "profile.usernameHelp", "Changing this also changes the URLs of projects in your personal namespace."), "</p></div><div class=\"create-actions\"><button class=\"account-action\" type=\"submit\">").concat(message(messages, "profile.save", "Save username"), "</button></div></form></div>");
}
function managedOrganizationHtml(namespace, managed, token, messages, url) {
  var hasAdmin = managed.members.some(function (member) {
    return member.role === "admin";
  });
  var members = managed.members.length ? managed.members.map(function (member) {
    return "<div class=\"organization-member\"><div><b>".concat(escapeHtml(member.name), "</b><span>@").concat(escapeHtml(member.username), "</span></div><form method=\"post\" action=\"/organizations/").concat(encodeURIComponent(managed.slug), "/members/").concat(encodeURIComponent(member.userId), "\"><input type=\"hidden\" name=\"csrf\" value=\"").concat(escapeHtml(token), "\"><select name=\"role\" aria-label=\"Role for ").concat(escapeHtml(member.username), "\"><option value=\"member\"").concat(selected(member.role, "member"), ">Member</option><option value=\"admin\"").concat(selected(member.role, "admin"), ">Admin</option></select><button type=\"submit\">Change role</button></form></div>");
  }).join("") : "<p>".concat(message(messages, "organization.noMembers", "No members yet."), "</p>");
  return "<div class=\"account-dashboard namespace-view\"><div class=\"account-dashboard__header\"><div><span class=\"account-card__namespace\">".concat(message(messages, "common.organization", "Organization"), "</span><h1>").concat(escapeHtml(namespace.name), "</h1><p class=\"account-dashboard__intro\">@").concat(escapeHtml(namespace.namespace), "</p></div></div>").concat(formError(url, messages), "<section class=\"account-section\"><div class=\"account-section__header\"><h2>").concat(message(messages, "organization.members", "Members"), "</h2></div><div class=\"organization-members\">").concat(members, "</div></section><section class=\"account-section\"><div class=\"account-section__header\"><h2>").concat(message(messages, "organization.invite", "Invite an existing user"), "</h2></div><form class=\"create-form\" method=\"post\" action=\"/organizations/").concat(encodeURIComponent(managed.slug), "/invitations\"><input type=\"hidden\" name=\"csrf\" value=\"").concat(escapeHtml(token), "\"><div class=\"create-form__field\"><label for=\"invite-username\">").concat(message(messages, "profile.username", "Username"), "</label><input id=\"invite-username\" name=\"username\" minlength=\"4\" maxlength=\"63\" pattern=\"[a-z0-9]+(?:-[a-z0-9]+)*\" required></div><div class=\"create-form__field\"><label for=\"invite-role\">").concat(message(messages, "organization.role", "Role"), "</label><select id=\"invite-role\" name=\"role\"><option value=\"member\">Member</option><option value=\"admin\"").concat(hasAdmin ? " disabled" : "", ">Admin</option></select></div><div class=\"create-actions\"><button class=\"account-action\" type=\"submit\">").concat(message(messages, "organization.sendInvite", "Send invitation"), "</button></div></form></section><section class=\"account-section\"><div class=\"account-section__header\"><h2>").concat(message(messages, "dashboard.projects", "Projects"), "</h2></div>").concat(publicProjectsHtml(namespace.projects, messages), "</section></div>");
}
function organizationFormHtml(token, messages, url) {
  return "<div class=\"account-dashboard\">\n    <h1>".concat(message(messages, "organizationCreate.heading", "Create an organization"), "</h1>\n    <p class=\"account-dashboard__intro\">").concat(message(messages, "organizationCreate.intro", "Organizations give related projects a shared namespace."), "</p>\n    ").concat(formError(url, messages), "\n    <form class=\"create-form\" method=\"post\" action=\"/organizations\">\n      <input type=\"hidden\" name=\"csrf\" value=\"").concat(escapeHtml(token), "\">\n      <div class=\"create-form__field\"><label for=\"organization-name\">").concat(message(messages, "organizationCreate.name", "Title"), "</label><input id=\"organization-name\" name=\"name\" minlength=\"4\" maxlength=\"80\" data-slug-source=\"organization-slug\" required></div>\n      <div class=\"create-form__field\"><label for=\"organization-slug\">").concat(message(messages, "organizationCreate.slug", "Name"), "</label><input id=\"organization-slug\" name=\"slug\" minlength=\"4\" maxlength=\"63\" pattern=\"[a-z0-9]+(?:-[a-z0-9]+)*\" aria-describedby=\"organization-slug-error\" autocapitalize=\"none\" autocomplete=\"off\" spellcheck=\"false\" required><p id=\"organization-slug-error\" class=\"form-field-error\" data-message=\"").concat(message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens."), "\" hidden>").concat(message(messages, "content.slugError", "Use lowercase letters, numbers, and single hyphens."), "</p></div>\n      <div class=\"create-form__field\"><label for=\"organization-description\">").concat(message(messages, "organizationCreate.description", "Description (optional)"), "</label><textarea id=\"organization-description\" name=\"description\" maxlength=\"500\"></textarea></div>\n      <div class=\"create-actions\"><button class=\"account-action\" type=\"submit\">").concat(message(messages, "organizationCreate.submit", "Create organization"), "</button></div>\n    </form>\n  </div>");
}
function renderPlannedDocument(html, plan, session, messages, tokens, options) {
  var marker = ACCOUNT_CONTENT_MARKER;
  var errorCode = options.formErrorCode || "";
  if (plan.kind === "project") {
    if (html.indexOf(marker) < 0) throw new Error("Project shell lacks its content marker");
    var project = plan.dynamicProject;
    var workspace = {
      snapshot: {
        files: [],
        config: {
          entry: "",
          template: project.template,
          container: "page",
          containerOptions: {
            allowedLinkPatterns: []
          },
          sandbox: {
            network: false,
            storage: "session"
          }
        }
      },
      versionCount: 0,
      hasUnpublishedChanges: false
    };
    var snapshotUrl = "/-/projects/".concat(encodeURIComponent(project.namespace), "/").concat(encodeURIComponent(project.slug), "/workspace");
    html = html.replace(marker, projectViewHtml(project, messages, workspace, tokens["project:".concat(project.id)] || "", plan.projectOwner, session, plan.accountContent || {
      organizations: [],
      projects: []
    }, errorCode, {
      embed: plan.requestedProject.embed,
      blogExamplesOrigin: options.blogExamplesOrigin,
      snapshotUrl: snapshotUrl
    }));
    html = plan.requestedProject.embed ? embeddedProjectDocument(html) : focusedProjectDocument(html, project.namespace, project.slug);
  } else if (plan.kind === "managed-organization" || plan.kind === "namespace") {
    if (html.indexOf(marker) < 0) throw new Error("Namespace shell lacks its content marker");
    var namespaceContent = plan.kind === "managed-organization" ? managedOrganizationHtml(plan.dynamicNamespace, plan.managedOrganization, tokens["organization:".concat(plan.managedOrganization.slug)] || "", messages, errorCode) : namespaceProjectsHtml(plan.dynamicNamespace, messages);
    html = namespaceDocument(html.replace(marker, namespaceContent), plan.dynamicNamespace);
  } else if (plan.kind === "try") {
    if (html.indexOf(marker) < 0) throw new Error("Try shell lacks its content marker");
    html = html.replace(marker, tryProjectHtml(messages));
  } else if (plan.kind === "dashboard" || plan.kind === "projects" || plan.kind === "project-form" || plan.kind === "organization-form" || plan.kind === "profile") {
    if (html.indexOf(marker) < 0) throw new Error("Account shell lacks its content marker");
    var content = plan.accountContent;
    var dynamic = plan.kind === "dashboard" ? dashboardHtml(content, messages) : plan.kind === "projects" ? projectsHtml(content, messages) : plan.kind === "project-form" ? projectFormHtml(session, content, tokens["/projects"] || "", messages, errorCode) : plan.kind === "organization-form" ? organizationFormHtml(tokens["/organizations"] || "", messages, errorCode) : profileHtml(plan.account, tokens.profile || "", messages, errorCode);
    html = html.replace(marker, function () {
      return dynamic;
    });
  }
  if (plan.publicProjects) {
    if (html.indexOf(PUBLIC_PROJECTS_MARKER) < 0) {
      throw new Error("Public-project shell lacks its content marker");
    }
    html = html.replace(PUBLIC_PROJECTS_MARKER, publicProjectsHtml(plan.publicProjects, messages));
  }
  return renderSessionHtml(html, session, messages, {
    locale: options.locale,
    pathname: options.pathname,
    focused: plan.focused,
    signupsEnabled: options.signupsEnabled,
    notifications: plan.notifications,
    notificationCsrf: tokens.notifications || ""
  }, options.controllerVersion);
}
function renderResourcesDocument(operation, args) {
  if (!Array.isArray(args)) throw new TypeError("document renderer arguments must be an array");
  if (operation === "session") return renderSessionHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "dashboard") return dashboardHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "projects") return projectsHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "try") return tryProjectHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "public-projects") return publicProjectsHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "namespace-projects") return namespaceProjectsHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "project-view") return projectViewHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "project-form") return projectFormHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "profile") return profileHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "managed-organization") return managedOrganizationHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "organization-form") return organizationFormHtml.apply(void 0, _toConsumableArray(args));
  if (operation === "focused-project-document") return focusedProjectDocument.apply(void 0, _toConsumableArray(args));
  if (operation === "embedded-project-document") return embeddedProjectDocument.apply(void 0, _toConsumableArray(args));
  if (operation === "namespace-document") return namespaceDocument.apply(void 0, _toConsumableArray(args));
  if (operation === "page") return renderPlannedDocument.apply(void 0, _toConsumableArray(args));
  throw new Error("document renderer operation is not available: ".concat(operation));
}
