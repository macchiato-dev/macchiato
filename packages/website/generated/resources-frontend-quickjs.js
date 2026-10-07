(async function resourcesFrontend() {
// packages/command-palette-use/src/client.js
var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
var shortcut = isMac ? "\u2318 K" : "Ctrl K";
for (const label of document.querySelectorAll("[data-command-shortcut]")) label.textContent = shortcut;
function paletteFor(trigger) {
  return trigger.closest(".userbar")?.querySelector("[data-command-dialog]") || document.querySelector("[data-command-dialog]");
}
function openPalette(trigger) {
  const dialog = paletteFor(trigger);
  if (!dialog || dialog.open) return;
  dialog.showModal();
  const input = dialog.querySelector("[data-command-input]");
  input.value = "";
  input.dispatchEvent(new Event("input"));
  input.focus();
}
function openCommandPalette() {
  openPalette(document.querySelector("[data-command-open]"));
}
function closePalette(dialog) {
  if (dialog?.open) dialog.close();
}
document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-command-open]");
  if (trigger) {
    event.preventDefault();
    openPalette(trigger);
    return;
  }
  const search = event.target.closest("[data-search-elsewhere]");
  if (search) {
    const dialog = search.closest("[data-command-dialog]");
    const query = dialog?.querySelector("[data-command-input]")?.value.trim() || "";
    search.setAttribute("href", query ? `/browse?q=${encodeURIComponent(query)}` : "/browse");
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openCommandPalette();
    return;
  }
  if (event.key === "Escape") closePalette(document.querySelector("[data-command-dialog][open]"));
});
document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-command-input]")) return;
  const query = event.target.value.trim().toLowerCase();
  const dialog = event.target.closest("[data-command-dialog]");
  for (const item of dialog.querySelectorAll("[data-command-label]")) {
    item.hidden = Boolean(query && !item.dataset.commandLabel.includes(query));
  }
  const elsewhere = dialog.querySelector("[data-search-elsewhere] span");
  elsewhere.textContent = query ? `Search Resources.co for \u201C${event.target.value.trim()}\u201D` : "Search Resources.co";
});
for (const dialog of document.querySelectorAll("[data-command-dialog]")) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closePalette(dialog);
  });
}

// packages/theme-use/src/client.js
var root = document.documentElement;
var choices = /* @__PURE__ */ new Set(["dark", "light", "system"]);
var storageKey = root.dataset.themeStorageKey || "macchiato-theme";
var media = matchMedia("(prefers-color-scheme: light)");
function storedTheme() {
  try {
    const value = localStorage.getItem(storageKey);
    return choices.has(value) ? value : null;
  } catch {
    return null;
  }
}
function resolved(choice) {
  return choice === "system" ? media.matches ? "light" : "dark" : choice;
}
function apply(choice, persist = true) {
  if (!choices.has(choice)) return;
  const theme = resolved(choice);
  root.dataset.theme = theme;
  root.dataset.themeChoice = choice;
  for (const button of document.querySelectorAll("button[data-theme-choice]")) {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === choice));
  }
  if (persist) {
    try {
      localStorage.setItem(storageKey, choice);
    } catch {
    }
  }
  document.dispatchEvent(new CustomEvent("themechange", {
    detail: { choice, theme }
  }));
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme-choice]");
  if (button) apply(button.dataset.themeChoice);
});
var syncSystemTheme = () => {
  if (root.dataset.themeChoice === "system" && root.dataset.theme !== resolved("system")) apply("system", false);
};
media.onchange = syncSystemTheme;
media.addEventListener?.("change", syncSystemTheme);
apply(storedTheme() || "system", false);

// packages/user-menu-use/src/client.js
var menuSelector = "details.edge-user-menu";
function closeMenus(except = null) {
  for (const menu of document.querySelectorAll(`${menuSelector}[open]`)) {
    if (menu !== except) menu.removeAttribute("open");
  }
}
document.addEventListener("click", (event) => {
  const menu = event.target.closest(menuSelector);
  if (!menu) closeMenus();
  else if (event.target.closest("summary")) closeMenus(menu);
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const open = document.querySelector(`${menuSelector}[open]`);
  if (!open) return;
  open.removeAttribute("open");
  open.querySelector("summary")?.focus();
});
document.addEventListener("change", (event) => {
  const select = event.target.closest?.("select[data-language-select]");
  if (select?.form) select.form.requestSubmit();
});

// packages/website/resources-storage-client.js
function storageRequest(operation, kind, key, value) {
  const text = JSON.stringify({ operation, kind, key: String(key), value });
  if (text.length > 2 * 1024 * 1024) throw new RangeError("Storage request exceeds its text limit");
  const result = JSON.parse(globalThis.__wwcServiceCall("storage.request", text));
  if (result.error) {
    const ErrorType = result.error.name === "RangeError" ? RangeError : result.error.name === "TypeError" ? TypeError : Error;
    const error = new ErrorType(result.error.message);
    error.name = result.error.name;
    throw error;
  }
  return result.value;
}
for (const [kind, area] of [["local", localStorage], ["session", sessionStorage]]) {
  area.getItem = (key) => storageRequest("get", kind, key);
  area.setItem = (key, value) => {
    storageRequest("set", kind, key, String(value));
  };
  area.removeItem = (key) => {
    storageRequest("delete", kind, key);
  };
}

// packages/website/project-frontend-services.js
var pending = /* @__PURE__ */ new Map();
var nextRequest = 1;
var editorListeners = null;
var outputListeners = /* @__PURE__ */ new Map();
function call(name, payload = {}) {
  return JSON.parse(globalThis.__wwcServiceCall(name, JSON.stringify(payload)));
}
function hasSessionValue(key) {
  return storageRequest("has", "session", key);
}
function navigationType() {
  return call("navigation.type");
}
function setProjectEditorTheme(theme) {
  return call("editor.theme", { theme });
}
function requestFrontendService(name, payload = {}) {
  const id = nextRequest++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    globalThis.__wwcPostMessage(JSON.stringify({ protocol: "resources-frontend-v1", id, name, payload }));
  });
}
globalThis.__resourcesFrontendReceive = (json) => {
  const message = JSON.parse(json);
  if (message.type === "command-palette") {
    openCommandPalette();
    return "null";
  }
  if (message.type === "editor-change") {
    editorListeners?.onChange?.(message.content, { syntaxErrors: message.syntaxErrors === true });
    return "null";
  }
  if (message.type === "editor-ready") {
    editorListeners?.onReady?.(message.value);
    return "null";
  }
  if (message.type === "editor-limit") {
    editorListeners?.onLimit?.(message.value);
    return "null";
  }
  if (message.type === "editor-error") {
    editorListeners?.onViolation?.(new Error(message.message));
    return "null";
  }
  if (message.type === "output-error") {
    outputListeners.get(message.id)?.(new Error(message.message));
    return "null";
  }
  const operation = pending.get(message.id);
  if (!operation) return "null";
  pending.delete(message.id);
  if (message.error) operation.reject(new Error(message.error));
  else operation.resolve(message.value);
  return "null";
};
var FrontendHeaders = class {
  constructor(entries = []) {
    this.entries = new Map(entries.map(([name, value]) => [name.toLowerCase(), value]));
  }
  get(name) {
    return this.entries.get(String(name).toLowerCase()) || null;
  }
};
var FrontendResponse = class {
  constructor(value) {
    this.status = value.status;
    this.ok = value.status >= 200 && value.status < 300;
    this.url = value.url;
    this.headers = new FrontendHeaders(value.headers);
    this.bodyText = value.body;
  }
  text() {
    return Promise.resolve(this.bodyText);
  }
  json() {
    return Promise.resolve(JSON.parse(this.bodyText));
  }
};
globalThis.fetch = async function frontendFetch(input, init = {}) {
  const response = await requestFrontendService("fetch", {
    url: String(input),
    method: String(init.method || "GET").toUpperCase(),
    headers: init.headers || {},
    body: init.body == null ? null : String(init.body)
  });
  return new FrontendResponse(response);
};

// packages/website/project-presentation.js
function mountProjectPresentation(root3) {
  const button = root3.querySelector("[data-project-present]");
  const close = root3.querySelector("[data-project-present-close]");
  const preview = root3.querySelector(".project-editor__preview");
  const content = root3.closest(".content-block");
  function hide() {
    delete root3.dataset.presenting;
    document.body.classList.remove("project-presenting");
    preview.classList.remove("project-editor__preview--presenting");
    for (const name of ["animation", "backdrop-filter", "transform"]) content?.style.removeProperty(name);
    button.setAttribute("aria-pressed", "false");
  }
  button.addEventListener("click", () => {
    root3.dataset.presenting = "true";
    document.body.classList.add("project-presenting");
    preview.classList.add("project-editor__preview--presenting");
    for (const name of ["animation", "backdrop-filter", "transform"]) content?.style.setProperty(name, "none");
    button.setAttribute("aria-pressed", "true");
    close.blur();
    requestAnimationFrame(() => root3.querySelector(".project-editor__output-frame")?.focus());
  });
  close.addEventListener("click", (event) => {
    hide();
    if (event.detail === 0) button.focus();
    else button.blur();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root3.dataset.presenting === "true") {
      event.preventDefault();
      hide();
      button.focus();
    } else if (event.key === "Escape" && parent !== window) {
      parent.postMessage({ protocol: "resources-project-presentation-v1", type: "escape" }, "*");
    }
  });
}

// packages/website/project-session.js
var DRAFT_KEY = "resources_project_draft_v5";
var PENDING_KEY_PREFIX = "resources_project_pending_v1:";
function pendingProjectSnapshotKey(projectId) {
  return projectId ? `${PENDING_KEY_PREFIX}${projectId}` : "";
}
function hasProjectRecovery({
  projectId,
  persistence = "stored",
  readOnly,
  navigationType: navigationType2
}, storage) {
  if (readOnly || persistence === "memory") return false;
  const key = persistence === "session" ? ["reload", "back_forward"].includes(navigationType2) ? DRAFT_KEY : "" : pendingProjectSnapshotKey(projectId);
  try {
    return !!key && storage.getItem(key) !== null;
  } catch {
    return false;
  }
}

// packages/website/resources-project-bootstrap.js
if (document.querySelector("[data-project-editor]")) {
  document.addEventListener("themechange", (event) => setProjectEditorTheme(event.detail.theme));
  const root3 = document.querySelector("[data-project-editor]");
  mountProjectPresentation(root3);
  const deferOutput = hasProjectRecovery({
    projectId: root3.dataset.projectId,
    persistence: root3.dataset.persistence,
    readOnly: root3.dataset.readOnly === "true",
    navigationType: navigationType()
  }, { getItem: (key) => hasSessionValue(key) ? "" : null });
  async function openProject() {
    const url = root3.querySelector("[data-project-snapshot-url]")?.dataset.projectSnapshotUrl;
    let workspace;
    if (url) {
      const response = await requestFrontendService("fetch", {
        url,
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (response.status !== 200) throw new Error(`Project workspace response: ${response.status}`);
      workspace = JSON.parse(response.body);
    }
    const saved = workspace?.savedOutput;
    const config = workspace?.snapshot?.config || {};
    const savedConfig = saved?.project?.config || {};
    const useSaved = saved?.format === "resources-project-output-v1" && JSON.stringify(savedConfig.containerOptions || {}) === JSON.stringify(config.containerOptions || {}) && JSON.stringify(savedConfig.environment || {}) === JSON.stringify(config.environment || {});
    if (workspace) delete workspace.savedOutput;
    await requestFrontendService("editor.mount", {
      // A session draft may supersede even a valid cached build. Let the
      // editor recover it before choosing the first output to display.
      deferOutput,
      workspace,
      savedOutput: useSaved ? saved : null
    });
  }
  openProject().catch((error) => {
    document.querySelector("[data-project-editor]")?.setAttribute("data-editor-machine-state", "failed");
    globalThis.__wwcReportError(error?.stack || error?.message || String(error));
  });
}

// packages/website/public-projects-client.js
var root2 = document.querySelector("[data-public-projects]");
if (root2) {
  fetch("/api/public-projects", {
    headers: { accept: "application/json" },
    credentials: "same-origin"
  }).then((response) => {
    if (!response.ok) throw new Error(`Public projects response: ${response.status}`);
    return response.json();
  }).then((projects) => {
    if (!Array.isArray(projects) || !projects.length) return;
    const grid = document.createElement("div");
    grid.className = "account-grid";
    for (const project of projects) {
      if (!project || typeof project.namespace !== "string" || typeof project.slug !== "string") continue;
      const link = document.createElement("a");
      link.className = "account-card";
      link.dataset.projectLink = "";
      link.setAttribute("href", `/${encodeURIComponent(project.namespace)}/${encodeURIComponent(project.slug)}`);
      const title = document.createElement("h3");
      title.textContent = String(project.name || project.slug);
      const namespace = document.createElement("span");
      namespace.className = "account-card__namespace";
      namespace.textContent = `${project.namespace}/${project.slug}`;
      const description = document.createElement("p");
      description.textContent = String(project.description || `${String(project.template || "project").toUpperCase()} project`);
      link.append(title, namespace, description);
      grid.append(link);
    }
    if (grid.childElementCount) root2.replaceChildren(grid);
  }).catch(() => {
  });
}

// packages/website/content-name-fields.js
function mountContentNameFields() {
  const generatedSlugs = /* @__PURE__ */ new WeakMap();
  const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const slugSelector = "#project-slug, #organization-slug";
  function slugify(value) {
    const text = String(value || "");
    const normalized = typeof text.normalize === "function" ? text.normalize("NFKD") : text;
    return normalized.replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63).replace(/-+$/g, "");
  }
  function validate(slug, touched = true) {
    const error = document.getElementById(slug.getAttribute("aria-describedby"));
    if (!error) return;
    const invalid = slug.value !== "" && !pattern.test(slug.value);
    slug.setCustomValidity(invalid ? error.dataset.message : "");
    slug.setAttribute("aria-invalid", invalid ? "true" : "false");
    error.hidden = !invalid || !touched;
  }
  function onInput(event) {
    const source = event.target.closest?.("[data-slug-source], #project-name, #organization-name");
    if (source) {
      const id = source.dataset.slugSource || (source.id === "project-name" ? "project-slug" : source.id === "organization-name" ? "organization-slug" : "");
      const slug2 = document.getElementById(id);
      if (!slug2) return;
      const previous = generatedSlugs.get(source) ?? "";
      if (slug2.value !== "" && slug2.value !== previous) return;
      const generated = slugify(source.value);
      generatedSlugs.set(source, generated);
      slug2.value = generated;
      validate(slug2, false);
      return;
    }
    const slug = event.target.closest?.(slugSelector);
    if (slug) validate(slug);
  }
  function onFocusOut(event) {
    const slug = event.target.closest?.(slugSelector);
    if (slug) validate(slug);
  }
  for (const field of document.querySelectorAll(
    `[data-slug-source], #project-name, #organization-name, ${slugSelector}`
  )) {
    field.addEventListener("input", onInput);
    if (field.value) onInput({ target: field });
  }
  for (const field of document.querySelectorAll(slugSelector)) {
    field.addEventListener("focusout", onFocusOut);
  }
}

// packages/website/resources-frontend-entry.js
if (!document.querySelector("[data-project-editor]")) mountContentNameFields();

})().catch(function (error) { var message = String(error); var stack = error && error.stack; __wwcReportError(stack && stack.indexOf(message) < 0 ? message + "\n" + stack : stack || message); });
