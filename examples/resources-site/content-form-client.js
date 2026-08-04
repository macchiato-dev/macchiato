import { applyProjectPatch, diffProjectSnapshots, emptyProjectSnapshot, normalizeProjectSnapshot, projectPatchIsEmpty } from "/-/resources-site/project-history.js";
import { urlMatchesAllowedPatterns, validateAllowedUrlPatterns } from "/-/resources-site/url-pattern.js";
import { containerElementNames, describeContainerElement } from "/-/resources-site/container-elements.js";
import { mountResourcesProjectEditor, mountResourcesProjectPreview } from "/-/resources-site/project-editor-runtime.js";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 63).replace(/-+$/g, "");
}

const DRAFT_KEY = "resources_project_draft_v5";
const CHECKPOINT_MS = 300_000;
const STARTING_POINTS = Object.freeze({
  article: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width\">\n  <title>A small article</title>\n  <link rel=\"stylesheet\" href=\"./style.css\">\n</head>\n<body>\n  <article>\n    <h1>A small article</h1>\n    <p><a href=\"https://en.wikipedia.org/wiki/Hypertext\">Hypertext</a> connects documents through links and gives the web its navigable structure.</p>\n    <p><a href=\"https://en.wikipedia.org/wiki/WebAssembly\">WebAssembly</a> provides a portable execution format for programs in the browser.</p>\n    <p><a href=\"https://en.wikipedia.org/wiki/Capability-based_security\">Capability-based security</a> limits programs to the authority they are explicitly given.</p>\n  </article>\n</body>\n</html>" },
      { path: "style.css", content: "body {\n  margin: 0;\n  font: 17px/1.6 system-ui, sans-serif;\n  color: #eef2ff;\n  background: #151717;\n}\narticle {\n  max-width: 44rem;\n  margin: auto;\n  padding: 3rem 2rem;\n}\na { color: #30d5c8; }\n" },
    ],
    config: { entry: "index.html", template: "article", container: "article", containerOptions: { allowedLinkPatterns: ["*.wikipedia.org"], links: { addTargetBlank: true } }, sandbox: { network: false, storage: "session" } },
  },
  hello: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Hello, HTML</title>\n  <link rel=\"stylesheet\" href=\"./style.css\">\n</head>\n<body>\n  <main>\n    <h1>Hello, HTML</h1>\n    <p>This small page is made from familiar HTML elements.</p>\n    <ul><li>A heading</li><li>A paragraph</li><li>A list</li></ul>\n  </main>\n</body>\n</html>" },
      { path: "style.css", content: "body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  font-family: system-ui, sans-serif;\n  color: #f5f7f7;\n  background: #171a1a;\n}\nmain {\n  max-width: 42rem;\n  padding: 2rem;\n}\n" },
    ],
    config: { entry: "index.html", template: "hello", container: "page", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "session" } },
  },
  clock: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>Digital clock</title>\n<main><h1 id=\"time\">--:--:--</h1><p id=\"date\">Waiting for the sandbox…</p></main>\n<script src=\"./script.js\"></script>" },
      { path: "style.css", content: "body { margin: 0; font-family: ui-monospace, monospace; color: #f5f7f7; background: #171a1a; }\nmain { padding: 3rem; text-align: center; }\nh1 { font-size: clamp(2rem, 10vw, 5rem); }\n" },
      { path: "script.js", content: "const pad = (value) => String(value).padStart(2, \"0\");\nfunction tick() {\n  const now = new Date();\n  document.getElementById(\"time\").textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;\n  document.getElementById(\"date\").textContent = now.toLocaleDateString();\n}\ntick();\nsetInterval(tick, 1000);" },
    ],
    config: { entry: "index.html", template: "clock", container: "page", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  mark: {
    files: [{ path: "image.svg", content: "<svg viewBox=\"0 0 640 420\" role=\"img\" aria-labelledby=\"mark-title\">\n  <title id=\"mark-title\">Logo mark</title>\n  <defs><linearGradient id=\"mark-gradient\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#30d5c8\"/><stop offset=\"100%\" stop-color=\"#3267e3\"/></linearGradient></defs>\n  <circle cx=\"320\" cy=\"210\" r=\"160\" fill=\"url(#mark-gradient)\"/>\n  <path d=\"M 245 285 L 320 120 L 395 285 Z\" fill=\"#151717\"/>\n</svg>" }],
    config: { entry: "image.svg", template: "mark", container: "svg", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  chart: {
    files: [{ path: "image.svg", content: "<svg viewBox=\"0 0 720 440\" role=\"img\" aria-labelledby=\"chart-title\">\n  <title id=\"chart-title\">Bar chart</title>\n  <line x1=\"80\" y1=\"360\" x2=\"660\" y2=\"360\" stroke=\"#839099\"/>\n  <rect x=\"130\" y=\"210\" width=\"90\" height=\"150\" rx=\"8\" fill=\"#30d5c8\"/>\n  <rect x=\"315\" y=\"120\" width=\"90\" height=\"240\" rx=\"8\" fill=\"#3267e3\"/>\n  <rect x=\"500\" y=\"170\" width=\"90\" height=\"190\" rx=\"8\" fill=\"#ae79ff\"/>\n  <text x=\"148\" y=\"395\" fill=\"#eef2ff\">HTML</text><text x=\"340\" y=\"395\" fill=\"#eef2ff\">SVG</text><text x=\"510\" y=\"395\" fill=\"#eef2ff\">Canvas</text>\n</svg>" }],
    config: { entry: "image.svg", template: "chart", container: "svg", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  ball: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>Bouncing ball</title>\n<canvas width=\"720\" height=\"440\" aria-label=\"Animated bouncing ball\"></canvas>\n<script src=\"./script.js\"></script>" },
      { path: "script.js", content: "const canvas = document.querySelector(\"canvas\");\nconst context = canvas.getContext(\"2d\");\nlet x = 90, y = 80, dx = 5, dy = 4;\nfunction frame() {\n  x += dx; y += dy;\n  if (x < 28 || x > canvas.width - 28) dx *= -1;\n  if (y < 28 || y > canvas.height - 28) dy *= -1;\n  context.clearRect(0, 0, canvas.width, canvas.height);\n  context.fillStyle = \"#30d5c8\"; context.beginPath(); context.arc(x, y, 26, 0, Math.PI * 2); context.fill();\n  requestAnimationFrame(frame);\n}\nframe();" },
    ],
    config: { entry: "index.html", template: "ball", container: "canvas", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  stars: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>Starfield</title>\n<canvas width=\"720\" height=\"440\" aria-label=\"Animated starfield\"></canvas>\n<script src=\"./script.js\"></script>" },
      { path: "script.js", content: "const canvas = document.querySelector(\"canvas\");\nconst context = canvas.getContext(\"2d\");\nconst width = canvas.width, height = canvas.height;\nconst stars = Array.from({ length: 120 }, () => ({ x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() }));\nlet last = null;\nfunction frame(time) {\n  if (last === null) last = time;\n  const elapsed = Math.min((time - last) / 1000, 0.1); last = time;\n  context.fillStyle = \"rgba(0,0,0,0.4)\"; context.fillRect(0, 0, width, height);\n  for (const star of stars) {\n    star.z -= 0.5 * elapsed;\n    if (star.z <= 0.02) { star.x = Math.random() - 0.5; star.y = Math.random() - 0.5; star.z = 1; }\n    const x = width / 2 + (star.x / star.z) * width;\n    const y = height / 2 + (star.y / star.z) * height;\n    context.fillStyle = \"#cdd9ff\"; context.beginPath(); context.arc(x, y, (1 - star.z) * 2.3, 0, Math.PI * 2); context.fill();\n  }\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);" },
    ],
    config: { entry: "index.html", template: "stars", container: "canvas", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  blank: {
    files: [{ path: "index.html", content: "" }],
    config: { entry: "index.html", template: "blank", container: "page", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "session" } },
  },
});

const generatedSlugs = new WeakMap();
function slugPair(source) {
  const slugId = source.dataset.slugSource || (source.id === "project-name" ? "project-slug" : source.id === "organization-name" ? "organization-slug" : "");
  const slug = document.getElementById(slugId);
  const error = document.getElementById(slug?.getAttribute("aria-describedby"));
  return slug && error ? { slug, error } : null;
}
function validateSlug(slug, error, touched = true) {
  const invalid = slug.value !== "" && !slugPattern.test(slug.value);
  slug.setCustomValidity(invalid ? error.dataset.message : "");
  slug.setAttribute("aria-invalid", invalid ? "true" : "false");
  error.hidden = !invalid || !touched;
}
document.addEventListener("input", (event) => {
  const source = event.target.closest?.("[data-slug-source], #project-name, #organization-name");
  if (source) {
    const pair = slugPair(source);
    if (!pair) return;
    const previous = generatedSlugs.get(source) ?? pair.slug.value;
    if (pair.slug.value !== "" && pair.slug.value !== previous) return;
    const generated = slugify(source.value);
    generatedSlugs.set(source, generated);
    pair.slug.value = generated;
    validateSlug(pair.slug, pair.error, false);
    return;
  }
  const slug = event.target.closest?.("#project-slug, #organization-slug");
  if (!slug) return;
  const error = document.getElementById(slug.getAttribute("aria-describedby"));
  if (error) validateSlug(slug, error);
});
document.addEventListener("focusout", (event) => {
  const slug = event.target.closest?.("#project-slug, #organization-slug");
  if (!slug) return;
  const error = document.getElementById(slug.getAttribute("aria-describedby"));
  if (error) validateSlug(slug, error);
});
document.querySelector("[data-try-form]")?.addEventListener("submit", (event) => event.preventDefault());
document.addEventListener("click", (event) => {
  event.target.closest?.("[data-dismiss-draft-flash]")?.closest("[data-draft-flash]")?.remove();
  const open = event.target.closest?.("[data-open-draft-delete], [data-open-project-delete]");
  if (open) open.closest(".destructive-actions")?.querySelector("[data-destructive-confirm]")?.removeAttribute("hidden");
  const cancel = event.target.closest?.("[data-cancel-delete]");
  if (cancel) cancel.closest("[data-destructive-confirm]")?.setAttribute("hidden", "");
  if (event.target.closest?.("[data-confirm-draft-delete]")) {
    sessionStorage.removeItem(DRAFT_KEY);
    location.reload();
  }
});

function draftHistory(snapshot) {
  const empty = emptyProjectSnapshot();
  const createdAt = Date.now();
  return { snapshot, checkpoint: snapshot, snapshots: [snapshot], patches: [diffProjectSnapshots(empty, snapshot)], versionTimes: [createdAt], createdAt, lastVersionAt: createdAt };
}

function rebuildDraft(patches, sequence = patches.length) {
  let snapshot = emptyProjectSnapshot();
  for (const patch of patches.slice(0, sequence)) snapshot = applyProjectPatch(snapshot, patch);
  return snapshot;
}

function relativeVersionTime(timestamp, now = Date.now()) {
  const deltaSeconds = Math.round((Number(timestamp) - now) / 1000);
  const absolute = Math.abs(deltaSeconds);
  const [value, unit] = absolute < 60
    ? [deltaSeconds, "second"]
    : absolute < 3600
      ? [Math.round(deltaSeconds / 60), "minute"]
      : absolute < 86_400
        ? [Math.round(deltaSeconds / 3600), "hour"]
        : [Math.round(deltaSeconds / 86_400), "day"];
  return new Intl.RelativeTimeFormat(document.documentElement.lang || "en", { numeric: "always" }).format(value, unit);
}

function versionChoice(label, timestamp, { current = false, sequence = 0 } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "project-editor__version";
  button.textContent = label;
  button.title = new Date(Number(timestamp)).toLocaleString();
  if (sequence) button.dataset.versionSequence = String(sequence);
  if (current) {
    button.setAttribute("aria-current", "true");
  }
  return button;
}

for (const root of document.querySelectorAll("[data-project-editor]")) {
  const editorMount = root.querySelector("[data-project-editor-mount]");
  const preview = root.querySelector("[data-project-preview]");
  const snapshotField = root.querySelector("[data-project-snapshot]");
  const status = root.querySelector("[data-project-status]");
  const statusSave = root.querySelector("[data-project-save]");
  const statusError = root.querySelector("[data-project-error]");
  const statusNotice = root.querySelector("[data-project-notice]");
  const tipControls = root.querySelector("[data-project-tip-controls]");
  const tipText = root.querySelector("[data-project-tip]");
  const versionButton = root.querySelector("[data-project-versions]");
  const versionCount = versionButton.querySelector(".project-editor__version-count");
  const currentVersion = versionButton.querySelector("[data-current-version]");
  const historyPanel = root.querySelector("[data-project-history]");
  const versionList = root.querySelector("[data-project-version-list]");
  const projectId = root.dataset.projectId;
  const persistence = root.dataset.persistence || "stored";
  const draft = persistence === "session";
  const memoryOnly = persistence === "memory";
  const readOnly = root.dataset.readOnly === "true";
  root.dataset.draftState = "clean";
  let restoredDraft = false;
  let state = normalizeProjectSnapshot(JSON.parse(snapshotField.value));
  const requestedTemplate = memoryOnly ? new URL(location.href).searchParams.get("template") : null;
  if (requestedTemplate && STARTING_POINTS[requestedTemplate]) {
    state = normalizeProjectSnapshot(STARTING_POINTS[requestedTemplate]);
    snapshotField.value = JSON.stringify(state);
  }
  let currentSnapshot = state;
  let viewingHistorical = false;
  let selected = state.files[0]?.path || "config";
  let ready = false;
  let pending = false;
  let saveTimer = 0;
  let pendingDestructive = false;
  let changeGeneration = 0;
  let saving = false;
  let localHistory = null;
  let editorController = null;
  let previewController = null;
  let previewTimer = 0;
  let previewGeneration = 0;
  let activeError = "";
  let activeNotice = false;
  let persistenceState = status.dataset.state || "normal";
  const tipMessages = JSON.parse(root.dataset.tips || "{}");
  let tipIndex = 0;

  function tips() {
    const container = typeof state.config?.container === "string" ? state.config.container : state.config?.container?.name;
    return [tipMessages[container] || tipMessages.page, tipMessages.change, tipMessages.navigate].filter(Boolean);
  }

  function renderTip() {
    const available = tips();
    tipIndex = ((tipIndex % available.length) + available.length) % available.length;
    tipText.textContent = available[tipIndex] || "";
  }

  function showCurrentVersion() {
    currentVersion.textContent = root.dataset.currentVersionLabel || "Current Version";
    currentVersion.removeAttribute("title");
  }

  function showSelectedVersion(label, timestamp) {
    currentVersion.textContent = label;
    currentVersion.title = new Date(Number(timestamp)).toLocaleString();
  }

  if (draft || memoryOnly) {
    if (draft) {
      const navigationType = performance.getEntriesByType("navigation")[0]?.type;
      if (navigationType !== "reload" && navigationType !== "back_forward") sessionStorage.removeItem(DRAFT_KEY);
      try {
        const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
        if (stored?.patches?.length) {
          restoredDraft = true;
          localHistory = stored;
          localHistory.versionTimes ||= stored.patches.map((_, index) => Number(stored.createdAt || Date.now()) + index);
          localHistory.snapshots ||= stored.patches.map((_, index) => rebuildDraft(stored.patches, index + 1));
          state = normalizeProjectSnapshot(stored.snapshot);
        }
      } catch {
        sessionStorage.removeItem(DRAFT_KEY);
      }
    }
    localHistory ||= draftHistory(state);
    versionCount.textContent = String(localHistory.patches.length);
  }
  if (restoredDraft) {
    root.dataset.draftState = "saved";
    root.closest("form")?.querySelector("[data-draft-actions]")?.removeAttribute("hidden");
    root.closest("form")?.querySelector("[data-new-draft-flash]")?.removeAttribute("hidden");
  }

  function selectedContent() {
    if (selected === "config") return JSON.stringify(state.config, null, 2) + "\n";
    return state.files.find((file) => file.path === selected)?.content ?? "";
  }

  function mode() {
    return selected.endsWith(".md") ? "markdown" : "code";
  }

  function language() {
    if (selected === "config") return "json";
    if (selected.endsWith(".js") || selected.endsWith(".mjs") || selected.endsWith(".ts")) return "javascript";
    if (selected.endsWith(".html") || selected.endsWith(".htm") || selected.endsWith(".svg")) return "html";
    if (selected.endsWith(".css")) return "css";
    if (selected.endsWith(".md")) return "markdown";
    return "plain";
  }

  function sendContent() {
    if (!ready || !editorController) return;
    root.dataset.editorLoading = "true";
    editorController.setContent(selectedContent(), language(), { readOnly: readOnly || selected === "config" });
    renderPreview();
    delete root.dataset.editorLoading;
  }

  function renderPreview() {
    const generation = ++previewGeneration;
    activeError = "";
    renderStatusState();
    delete preview.dataset.previewRuntime;
    delete preview.dataset.previewViolations;
    previewController?.destroy();
    previewController = null;
    const entry = state.config?.entry || "index.html";
    const source = state.files.find((file) => file.path === entry)?.content || "";
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(source)?.[1].replace(/\s+/g, " ").trim() || entry;
    root.querySelector("[data-preview-title]").textContent = title;
    const parsed = new DOMParser().parseFromString(source, "text/html");
    const allowed = new Set(containerElementNames(typeof state.config?.container === "string" ? state.config.container : state.config?.container?.name));
    const scripts = [];
    const violations = [];
    const structuralElement = (node) => ["script", "style", "link", "meta", "head", "html", "body"].includes(node.localName)
      || (node.localName === "title" && node.namespaceURI !== "http://www.w3.org/2000/svg");
    const reject = (message) => {
      if (!violations.some((violation) => violation.message === message)) violations.push(new Error(message));
    };
    for (const script of parsed.querySelectorAll("script")) {
      let ancestor = script.parentElement;
      let blocked = false;
      while (ancestor && ancestor !== parsed.body) {
        if (!structuralElement(ancestor) && !allowed.has(ancestor.localName)) { blocked = true; break; }
        ancestor = ancestor.parentElement;
      }
      if (blocked) continue;
      const src = script.getAttribute("src");
      if (src) {
        const path = src.replace(/^\.\//, "");
        const file = state.files.find((candidate) => candidate.path === path);
        if (file) scripts.push({ source: path, code: file.content });
      } else if (script.textContent.trim()) scripts.push({ source: entry, code: script.textContent });
    }
    const fragment = document.createDocumentFragment();
    function copy(node, parent) {
      if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.textContent)); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const name = node.localName;
      const structural = structuralElement(node);
      if (!allowed.has(name) || structural) {
        if (!structural) {
          reject(`<${name}> was omitted because the ${state.config?.container || "selected"} container schema does not allow it.`);
          return;
        }
        for (const child of node.childNodes) copy(child, parent);
        return;
      }
      const element = node.namespaceURI === "http://www.w3.org/2000/svg"
        ? document.createElementNS("http://www.w3.org/2000/svg", name)
        : document.createElement(name);
      for (const attribute of ["id", "class", "title", "role", "aria-label"]) {
        if (node.hasAttribute(attribute) && /^[- A-Za-z0-9_.,:]+$/.test(node.getAttribute(attribute))) element.setAttribute(attribute, node.getAttribute(attribute));
      }
      if (name === "canvas") {
        for (const attribute of ["width", "height"]) if (/^[0-9]{1,5}$/.test(node.getAttribute(attribute) || "")) element.setAttribute(attribute, node.getAttribute(attribute));
      }
      if (name === "a" && node.getAttribute("href")) {
        const href = node.getAttribute("href");
        const patterns = state.config?.containerOptions?.allowedLinkPatterns || state.config?.container?.allowedLinkPatterns || [];
        if (urlMatchesAllowedPatterns(href, patterns)) {
          element.setAttribute("href", href);
          const authoredTarget = node.getAttribute("target");
          if (authoredTarget) element.setAttribute("target", authoredTarget);
          else if ((state.config?.containerOptions?.links || state.config?.container?.links)?.addTargetBlank !== false) element.setAttribute("target", "_blank");
        } else {
          reject(`The href for ${href} was omitted because it is outside the allowed URL patterns.`);
        }
      }
      if (node.namespaceURI === "http://www.w3.org/2000/svg") {
        const svgAttributes = new Set(["viewBox", "width", "height", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "d", "points", "fill", "stroke", "stroke-width", "role", "aria-label", "aria-labelledby", "id", "offset", "stop-color", "gradientUnits"]);
        for (const attribute of node.attributes) {
          if (svgAttributes.has(attribute.name) && /^[- A-Za-z0-9.,#()%]+$/.test(attribute.value)) element.setAttribute(attribute.name, attribute.value);
        }
      }
      for (const child of node.childNodes) copy(child, element);
      parent.append(element);
    }
    for (const child of parsed.body.childNodes) copy(child, fragment);
    preview.replaceChildren(fragment);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
      if (generation !== previewGeneration) return;
      try {
        const controller = await mountResourcesProjectPreview({
          root: preview, scripts, violations, tags: [...allowed].filter((tag) => !["html", "head", "body", "meta", "link", "script", "style"].includes(tag)),
          onViolation(error) { if (generation === previewGeneration) setStatus(`Blocked: ${error.message}`, "error"); },
        });
        if (generation !== previewGeneration) controller.destroy();
        else previewController = controller;
      } catch (error) {
        setStatus(`Blocked: ${error.message}`, true);
      }
    }, 120);
  }

  function renderTabs() {
    const tabs = root.querySelector(".project-editor__tabs");
    const menu = root.querySelector("[data-project-file-menu]");
    tabs.replaceChildren();
    menu.replaceChildren();
    function addChoice({ path, label, config = false }) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-editor__tab";
      if (config) button.dataset.projectConfig = "";
      else button.dataset.projectFile = path;
      button.setAttribute("aria-selected", (config ? selected === "config" : path === selected) ? "true" : "false");
      button.textContent = label;
      tabs.append(button);
      const option = button.cloneNode(true);
      option.className = "project-editor__file-option";
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", button.getAttribute("aria-selected"));
      option.removeAttribute("aria-selected");
      menu.append(option);
    }
    for (const file of state.files) {
      addChoice({ path: file.path, label: file.path });
    }
    addChoice({ label: root.dataset.configLabel || "Configuration", config: true });
    root.querySelector("[data-project-file-current]").textContent = selected === "config"
      ? root.dataset.configLabel || "Configuration"
      : selected;
  }

  function renderStatusState() {
    status.dataset.state = activeError ? "error" : activeNotice ? "warning" : persistenceState;
    tipControls.hidden = Boolean(activeError || activeNotice);
    statusNotice.hidden = !activeNotice || Boolean(activeError);
    statusError.hidden = !activeError;
    statusError.textContent = activeError;
    if (!activeError && !activeNotice) renderTip();
  }

  function clearNotice() {
    activeNotice = false;
    statusNotice.replaceChildren();
    renderStatusState();
  }

  function showTemplateNotice(previousSnapshot) {
    activeNotice = true;
    statusNotice.replaceChildren(document.createTextNode(`${root.dataset.templateReplacedLabel || "Template replaced the project."} `));
    const undo = document.createElement("button");
    undo.type = "button";
    undo.textContent = root.dataset.undoLabel || "Undo";
    undo.addEventListener("click", () => {
      clearNotice();
      applyTemplateSnapshot(previousSnapshot, { notice: false });
    }, { once: true });
    statusNotice.append(undo);
    renderStatusState();
  }

  function setStatus(text, severity = "normal") {
    const nextState = severity === true ? "error" : severity;
    if (nextState === "error") activeError = text;
    else {
      persistenceState = nextState;
      statusSave.textContent = text;
    }
    renderStatusState();
  }

  root.querySelector("[data-project-tip-prev]").addEventListener("click", () => { tipIndex -= 1; renderTip(); });
  root.querySelector("[data-project-tip-next]").addEventListener("click", () => { tipIndex += 1; renderTip(); });
  renderTip();

  function updateSnapshot(next, { destructive = false } = {}) {
    const normalized = normalizeProjectSnapshot(next);
    if (projectPatchIsEmpty(diffProjectSnapshots(state, normalized))) return false;
    const branchedFromHistory = viewingHistorical;
    showCurrentVersion();
    viewingHistorical = false;
    state = normalized;
    currentSnapshot = state;
    snapshotField.value = JSON.stringify(state);
    pending = true;
    root.dataset.draftDirty = "true";
    root.dataset.draftState = "dirty";
    if (draft) root.closest("form")?.querySelector("[data-draft-actions]")?.removeAttribute("hidden");
    changeGeneration += 1;
    pendingDestructive ||= destructive || branchedFromHistory;
    if (draft || memoryOnly) {
      localHistory.snapshot = state;
      if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1_500);
    return true;
  }

  function checkpointDraft({ destructive = false } = {}) {
    const now = Date.now();
    if (!destructive && now - localHistory.lastVersionAt < CHECKPOINT_MS) return;
    const patch = diffProjectSnapshots(localHistory.snapshots.at(-1), state);
    if (projectPatchIsEmpty(patch)) return;
    localHistory.patches.push(patch);
    localHistory.snapshots.push(state);
    localHistory.versionTimes.push(now);
    localHistory.checkpoint = state;
    localHistory.lastVersionAt = now;
    localHistory.snapshot = state;
    versionCount.textContent = String(localHistory.patches.length);
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
  }

  async function save() {
    if (!pending || saving) return;
    if (draft || memoryOnly) {
      checkpointDraft({ destructive: pendingDestructive || selected === "config" });
      pending = false;
      pendingDestructive = false;
      delete root.dataset.draftDirty;
      root.dataset.draftState = "saved";
      setStatus(memoryOnly ? "" : "Draft saved in this session");
      return;
    }
    const savingGeneration = changeGeneration;
    const savingSnapshot = state;
    const savingDestructive = pendingDestructive;
    saving = true;
    setStatus("Saving…");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/snapshot`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-resources-csrf": root.dataset.csrf },
        body: JSON.stringify({ snapshot: savingSnapshot, destructive: savingDestructive }),
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      const result = await response.json();
      versionCount.textContent = String(result.versionCount);
      if (changeGeneration === savingGeneration) {
        pending = false;
        pendingDestructive = false;
        delete root.dataset.draftDirty;
        root.dataset.draftState = "saved";
        setStatus("Saved");
      } else {
        setStatus("Saving…");
      }
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      saving = false;
      if (pending && changeGeneration !== savingGeneration) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 250);
      }
    }
  }

  function renderDraftVersions() {
    versionList.replaceChildren();
    const current = versionChoice(root.dataset.currentVersionLabel || "Current Version", Date.now(), { current: true });
    current.addEventListener("click", () => {
      clearNotice();
      if (!viewingHistorical) return;
      state = currentSnapshot;
      viewingHistorical = false;
      snapshotField.value = JSON.stringify(state);
      historyPanel.hidden = true;
      versionButton.setAttribute("aria-expanded", "false");
      renderTabs();
      sendContent();
      showCurrentVersion();
      setStatus("Current version");
    });
    versionList.append(current);
    [...localHistory.patches].reverse().forEach((_, reverseIndex) => {
      const sequence = localHistory.patches.length - reverseIndex;
      const button = versionChoice(relativeVersionTime(localHistory.versionTimes[sequence - 1]), localHistory.versionTimes[sequence - 1], { sequence });
      button.addEventListener("click", () => {
        clearNotice();
        if (pending) checkpointDraft({ destructive: pendingDestructive });
        pending = false;
        pendingDestructive = false;
        currentSnapshot = localHistory.snapshot;
        const target = normalizeProjectSnapshot(localHistory.snapshots[sequence - 1] || rebuildDraft(localHistory.patches, sequence));
        state = target;
        viewingHistorical = true;
        snapshotField.value = JSON.stringify(state);
        renderTabs();
        historyPanel.hidden = true;
        versionButton.setAttribute("aria-expanded", "false");
        sendContent();
        setStatus(`Viewing version ${sequence}`);
        showSelectedVersion(button.textContent, localHistory.versionTimes[sequence - 1]);
      });
      versionList.append(button);
    });
  }

  async function renderStoredVersions() {
    versionList.textContent = "Loading…";
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/versions`);
    if (!response.ok) { versionList.textContent = "Version history unavailable."; return; }
    const { versions } = await response.json();
    versionList.replaceChildren();
    const current = versionChoice(root.dataset.currentVersionLabel || "Current Version", Date.now(), { current: true });
    current.addEventListener("click", () => {
      clearNotice();
      if (!viewingHistorical) return;
      state = currentSnapshot;
      viewingHistorical = false;
      snapshotField.value = JSON.stringify(state);
      historyPanel.hidden = true;
      versionButton.setAttribute("aria-expanded", "false");
      renderTabs();
      sendContent();
      showCurrentVersion();
      setStatus("Current version");
    });
    versionList.append(current);
    for (const version of versions) {
      const button = versionChoice(relativeVersionTime(version.createdAt), version.createdAt, { sequence: version.sequence });
      button.addEventListener("click", async () => {
        clearNotice();
        await save();
        currentSnapshot = state;
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/versions/${version.sequence}`);
        if (!response.ok) { setStatus("Version unavailable", true); return; }
        const result = await response.json();
        state = normalizeProjectSnapshot(result.snapshot);
        viewingHistorical = true;
        snapshotField.value = JSON.stringify(state);
        historyPanel.hidden = true;
        versionButton.setAttribute("aria-expanded", "false");
        renderTabs();
        sendContent();
        showSelectedVersion(button.textContent, version.createdAt);
        setStatus(`Viewing ${button.textContent}`);
      });
      versionList.append(button);
    }
  }

  function receiveEditorChange(content) {
    if (typeof content !== "string") return;
    if (readOnly || selected === "config" || content === selectedContent()) return;
    try {
      clearNotice();
      updateSnapshot({ files: state.files.map((file) => file.path === selected ? { ...file, content } : file), config: state.config });
      renderPreview();
    } catch {}
  }
  function selectProjectFile(event) {
    const file = event.target.closest("[data-project-file]");
    if (file) selected = file.dataset.projectFile;
    else if (event.target.closest("[data-project-config]")) selected = "config";
    else return;
    renderTabs();
    sendContent();
  }
  root.querySelector(".project-editor__tabs").addEventListener("click", selectProjectFile);
  const fileTrigger = root.querySelector("[data-project-file-trigger]");
  const fileMenu = root.querySelector("[data-project-file-menu]");
  function closeFileMenu({ focus = false } = {}) {
    fileMenu.hidden = true;
    fileTrigger.setAttribute("aria-expanded", "false");
    if (focus) fileTrigger.focus();
  }
  fileTrigger.addEventListener("click", () => {
    const opening = fileMenu.hidden;
    fileMenu.hidden = !opening;
    fileTrigger.setAttribute("aria-expanded", String(opening));
    if (opening) fileMenu.querySelector('[aria-checked="true"]')?.focus();
  });
  fileMenu.addEventListener("click", (event) => { selectProjectFile(event); closeFileMenu({ focus: true }); });
  fileMenu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeFileMenu({ focus: true });
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const options = [...fileMenu.querySelectorAll('[role="menuitemradio"]')];
    const current = Math.max(0, options.indexOf(document.activeElement));
    const next = event.key === "Home" ? 0
      : event.key === "End" ? options.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!root.querySelector("[data-project-file-picker]").contains(event.target)) closeFileMenu();
  });
  const workspace = root.querySelector(".project-editor__workspace");
  const splitter = root.querySelector(".project-editor__splitter");
  function setSplit(clientX) {
    const rect = workspace.getBoundingClientRect();
    const percent = Math.max(20, Math.min(80, ((clientX - rect.left) / rect.width) * 100));
    workspace.style.setProperty("--source-width", `${percent}%`);
    splitter.setAttribute("aria-valuenow", String(Math.round(percent)));
  }
  splitter.addEventListener("pointerdown", (event) => { splitter.setPointerCapture(event.pointerId); setSplit(event.clientX); });
  splitter.addEventListener("pointermove", (event) => { if (splitter.hasPointerCapture(event.pointerId)) setSplit(event.clientX); });
  splitter.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const next = Math.max(20, Math.min(80, Number(splitter.getAttribute("aria-valuenow")) + (event.key === "ArrowRight" ? 5 : -5)));
    workspace.style.setProperty("--source-width", `${next}%`);
    splitter.setAttribute("aria-valuenow", String(next));
  });
  for (const button of root.querySelectorAll("[data-project-view]")) button.addEventListener("click", () => {
    const projectLayout = root.closest(".project-create__layout");
    if (button.dataset.projectView === "details") projectLayout.dataset.mobileView = "details";
    else {
      delete projectLayout.dataset.mobileView;
      workspace.dataset.view = button.dataset.projectView;
    }
    for (const item of root.querySelectorAll("[data-project-view]")) item.setAttribute("aria-pressed", item === button ? "true" : "false");
    if (button.dataset.projectView === "editor") editorController?.focus();
  });
  const narrowWorkspace = matchMedia("(max-width: 760px)");
  function avoidMobileSplit() {
    if (!narrowWorkspace.matches || workspace.dataset.view !== "split") return;
    const previewButton = root.querySelector('[data-project-view="preview"]');
    workspace.dataset.view = "preview";
    for (const item of root.querySelectorAll("[data-project-view]")) item.setAttribute("aria-pressed", item === previewButton ? "true" : "false");
  }
  avoidMobileSplit();
  narrowWorkspace.addEventListener?.("change", avoidMobileSplit);
  const form = root.closest("form");
  const template = form?.querySelector("[data-project-template]");
  const container = form?.querySelector("[data-project-container]");
  const containerOutline = form?.querySelector("[data-container-outline]");
  const linkPatterns = form?.querySelector("#project-link-patterns");
  function renderContainerElements(name) {
    if (!containerOutline) return;
    containerOutline.replaceChildren(...containerElementNames(name).map((element) => {
      const tag = document.createElement("span");
      tag.className = "element-tag";
      tag.tabIndex = 0;
      tag.dataset.elementTag = element;
      tag.textContent = element;
      tag.title = describeContainerElement(name, element);
      return tag;
    }));
  }
  function growTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }
  if (template && state.config?.template) template.value = state.config.template;
  if (container && state.config?.container) container.value = state.config.container;
  if (linkPatterns) linkPatterns.value = (state.config?.containerOptions?.allowedLinkPatterns || []).join("\n");
  growTextarea(linkPatterns);
  renderContainerElements(container?.value);
  function updateContainer() {
    if (!container) return;
    renderContainerElements(container.value);
    const allowedLinkPatterns = String(linkPatterns?.value || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    try {
      validateAllowedUrlPatterns(allowedLinkPatterns);
      linkPatterns?.setCustomValidity("");
      linkPatterns?.setAttribute("aria-invalid", "false");
    } catch (error) {
      linkPatterns?.setCustomValidity(error.message);
      linkPatterns?.setAttribute("aria-invalid", "true");
      return;
    }
    clearNotice();
    updateSnapshot({ files: state.files, config: { ...state.config, container: container.value, containerOptions: { ...state.config.containerOptions, allowedLinkPatterns } } }, { destructive: true });
    sendContent();
  }

  function applyTemplateSnapshot(next, { notice = true, previousSnapshot = state } = {}) {
    if (container) container.value = next.config.container || "page";
    if (linkPatterns) linkPatterns.value = (next.config.containerOptions?.allowedLinkPatterns || []).join("\n");
    if (template) template.value = next.config.template || "blank";
    growTextarea(linkPatterns);
    renderContainerElements(container.value);
    selected = next.files[0].path;
    updateSnapshot(next, { destructive: true });
    renderTabs();
    sendContent();
    if (notice) showTemplateNotice(previousSnapshot);
  }

  template?.addEventListener("change", async () => {
    const next = STARTING_POINTS[template.value];
    if (!next) return;
    if (pending) {
      if (draft || memoryOnly) checkpointDraft({ destructive: true });
      else await save();
    }
    const previousSnapshot = state;
    applyTemplateSnapshot(next, { previousSnapshot });
  });
  container?.addEventListener("change", updateContainer);
  for (const textarea of form?.querySelectorAll("textarea[data-autogrow]") || []) {
    textarea.addEventListener("input", () => growTextarea(textarea));
    growTextarea(textarea);
  }
  linkPatterns?.addEventListener("input", updateContainer);
  versionButton.addEventListener("click", () => {
    if (!historyPanel.hidden) {
      historyPanel.hidden = true;
      versionButton.setAttribute("aria-expanded", "false");
      return;
    }
    historyPanel.hidden = false;
    versionButton.setAttribute("aria-expanded", "true");
    const rootRect = root.getBoundingClientRect();
    const buttonRect = versionButton.getBoundingClientRect();
    const panelWidth = historyPanel.getBoundingClientRect().width;
    historyPanel.style.left = `${Math.max(8, Math.min(buttonRect.left - rootRect.left, rootRect.width - panelWidth - 8))}px`;
    historyPanel.style.top = `${buttonRect.bottom - rootRect.top + 6}px`;
    if (readOnly) {
      versionList.replaceChildren(versionChoice(root.dataset.currentVersionLabel || "Current Version", Date.now(), { current: true }));
    } else {
      (draft || memoryOnly) ? renderDraftVersions() : renderStoredVersions();
    }
  });
  root.querySelector("[data-project-history-close]").addEventListener("click", () => { historyPanel.hidden = true; versionButton.setAttribute("aria-expanded", "false"); versionButton.focus(); });
  document.addEventListener("pointerdown", (event) => {
    if (historyPanel.hidden || historyPanel.contains(event.target) || versionButton.contains(event.target)) return;
    historyPanel.hidden = true;
    versionButton.setAttribute("aria-expanded", "false");
  });
  addEventListener("beforeunload", (event) => { if (pending) event.preventDefault(); });
  setInterval(() => { if (readOnly) return; if (draft || memoryOnly) checkpointDraft(); else if (pending) save(); }, CHECKPOINT_MS);
  renderTabs();
  mountResourcesProjectEditor({
    root: editorMount,
    onChange: receiveEditorChange,
    onViolation(error) { setStatus(`Editor stopped: ${error.message}`, true); },
  }).then((controller) => {
    editorController = controller;
    ready = true;
    sendContent();
  }).catch((error) => setStatus(`Editor failed to start: ${error.message}`, true));
  addEventListener("pagehide", () => { editorController?.destroy(); previewController?.destroy(); }, { once: true });
}
