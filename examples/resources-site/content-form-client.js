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
      { path: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Hello, HTML</title>\n</head>\n<body>\n  <main>\n    <h1>Hello, HTML</h1>\n    <p>This small page is made from familiar HTML elements.</p>\n    <ul><li>A heading</li><li>A paragraph</li><li>A list</li></ul>\n  </main>\n</body>\n</html>" },
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
      { path: "script.js", content: "const canvas = document.querySelector(\"canvas\");\nconst context = canvas.getContext(\"2d\");\nconst stars = Array.from({ length: 60 }, (_, index) => ({ x: (index * 97) % canvas.width, y: (index * 53) % canvas.height, speed: 1 + index % 3 }));\nfunction frame() {\n  context.fillStyle = \"#111827\"; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = \"#eef2ff\";\n  for (const star of stars) { star.y = (star.y + star.speed) % canvas.height; context.beginPath(); context.arc(star.x, star.y, star.speed, 0, Math.PI * 2); context.fill(); }\n  requestAnimationFrame(frame);\n}\nframe();" },
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
  const versionButton = root.querySelector("[data-project-versions]");
  const versionCount = versionButton.querySelector(".project-editor__version-count");
  const currentVersion = versionButton.querySelector("[data-current-version]");
  const historyPanel = root.querySelector("[data-project-history]");
  const versionList = root.querySelector("[data-project-version-list]");
  const projectId = root.dataset.projectId;
  const draft = root.dataset.draft === "true";
  let state = normalizeProjectSnapshot(JSON.parse(snapshotField.value));
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

  function showCurrentVersion() {
    currentVersion.textContent = root.dataset.currentVersionLabel || "Current Version";
    currentVersion.removeAttribute("title");
  }

  function showSelectedVersion(label, timestamp) {
    currentVersion.textContent = label;
    currentVersion.title = new Date(Number(timestamp)).toLocaleString();
  }

  if (draft) {
    const navigationType = performance.getEntriesByType("navigation")[0]?.type;
    if (navigationType !== "reload" && navigationType !== "back_forward") sessionStorage.removeItem(DRAFT_KEY);
    try {
      const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
      if (stored?.patches?.length) {
        localHistory = stored;
        localHistory.versionTimes ||= stored.patches.map((_, index) => Number(stored.createdAt || Date.now()) + index);
        localHistory.snapshots ||= stored.patches.map((_, index) => rebuildDraft(stored.patches, index + 1));
        state = normalizeProjectSnapshot(stored.snapshot);
      }
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
    localHistory ||= draftHistory(state);
    versionCount.textContent = String(localHistory.patches.length);
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
    editorController.setContent(selectedContent(), language(), { readOnly: selected === "config" });
    renderPreview();
    delete root.dataset.editorLoading;
  }

  function renderPreview() {
    const generation = ++previewGeneration;
    const entry = state.config?.entry || "index.html";
    const source = state.files.find((file) => file.path === entry)?.content || "";
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(source)?.[1].replace(/\s+/g, " ").trim() || entry;
    root.querySelector("[data-preview-title]").textContent = title;
    const parsed = new DOMParser().parseFromString(source, "text/html");
    const allowed = new Set(containerElementNames(typeof state.config?.container === "string" ? state.config.container : state.config?.container?.name));
    const scripts = [];
    for (const script of parsed.querySelectorAll("script")) {
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
      const structural = ["script", "style", "link", "meta", "head", "html", "body"].includes(name)
        || (name === "title" && node.namespaceURI !== "http://www.w3.org/2000/svg");
      if (!allowed.has(name) || structural) {
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
      previewController?.destroy();
      previewController = null;
      if (generation !== previewGeneration) return;
      try {
        const controller = await mountResourcesProjectPreview({
          root: preview, scripts, tags: [...allowed].filter((tag) => !["html", "head", "body", "meta", "title", "link", "script", "style"].includes(tag)),
          onViolation(error) { setStatus(`Preview stopped: ${error.message}`, true); },
        });
        if (generation !== previewGeneration) controller.destroy();
        else previewController = controller;
      } catch (error) {
        setStatus(`Preview stopped: ${error.message}`, true);
      }
    }, 120);
  }

  function renderTabs() {
    const tabs = root.querySelector(".project-editor__tabs");
    tabs.replaceChildren();
    for (const file of state.files) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-editor__tab";
      button.dataset.projectFile = file.path;
      button.setAttribute("aria-selected", file.path === selected ? "true" : "false");
      button.textContent = file.path;
      tabs.append(button);
    }
    const config = document.createElement("button");
    config.type = "button";
    config.className = "project-editor__tab";
    config.dataset.projectConfig = "";
    config.setAttribute("aria-selected", selected === "config" ? "true" : "false");
    config.textContent = root.dataset.configLabel || "Configuration";
    tabs.append(config);
  }

  function setStatus(text, error = false) {
    status.textContent = text;
    status.dataset.error = error ? "true" : "false";
  }

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
    changeGeneration += 1;
    pendingDestructive ||= destructive || branchedFromHistory;
    setStatus("Unsaved changes");
    if (draft) {
      localHistory.snapshot = state;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
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
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
  }

  async function save() {
    if (!pending || saving) return;
    if (draft) {
      checkpointDraft({ destructive: pendingDestructive || selected === "config" });
      pending = false;
      pendingDestructive = false;
      setStatus("Draft saved in this session");
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
        setStatus("Saved");
      } else {
        setStatus("Unsaved changes");
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
    if (selected === "config") return;
    try {
      updateSnapshot({ files: state.files.map((file) => file.path === selected ? { ...file, content } : file), config: state.config });
      renderPreview();
    } catch {}
  }
  root.querySelector(".project-editor__tabs").addEventListener("click", (event) => {
    const file = event.target.closest("[data-project-file]");
    if (file) selected = file.dataset.projectFile;
    else if (event.target.closest("[data-project-config]")) selected = "config";
    else return;
    renderTabs();
    sendContent();
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
    workspace.dataset.view = button.dataset.projectView;
    for (const item of root.querySelectorAll("[data-project-view]")) item.setAttribute("aria-pressed", item === button ? "true" : "false");
    if (button.dataset.projectView !== "preview") editorController?.focus();
  });
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
    updateSnapshot({ files: state.files, config: { ...state.config, container: container.value, containerOptions: { ...state.config.containerOptions, allowedLinkPatterns } } }, { destructive: true });
    sendContent();
  }
  template?.addEventListener("change", () => {
    const next = STARTING_POINTS[template.value];
    if (!next) return;
    if (pending) checkpointDraft({ destructive: true });
    if (container) container.value = next.config.container || "page";
    if (linkPatterns) linkPatterns.value = (next.config.containerOptions?.allowedLinkPatterns || []).join("\n");
    growTextarea(linkPatterns);
    renderContainerElements(container.value);
    selected = next.files[0].path;
    state = normalizeProjectSnapshot(next);
    currentSnapshot = state;
    viewingHistorical = false;
    snapshotField.value = JSON.stringify(state);
    localHistory.snapshot = state;
    localHistory.checkpoint = state;
    localHistory.lastVersionAt = Date.now();
    pending = false;
    pendingDestructive = false;
    clearTimeout(saveTimer);
    showCurrentVersion();
    versionCount.textContent = String(localHistory.patches.length);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
    setStatus("Template selected");
    renderTabs();
    sendContent();
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
    draft ? renderDraftVersions() : renderStoredVersions();
  });
  root.querySelector("[data-project-history-close]").addEventListener("click", () => { historyPanel.hidden = true; versionButton.setAttribute("aria-expanded", "false"); versionButton.focus(); });
  document.addEventListener("pointerdown", (event) => {
    if (historyPanel.hidden || historyPanel.contains(event.target) || versionButton.contains(event.target)) return;
    historyPanel.hidden = true;
    versionButton.setAttribute("aria-expanded", "false");
  });
  addEventListener("beforeunload", (event) => { if (pending) event.preventDefault(); });
  setInterval(() => { if (draft) checkpointDraft(); else if (pending) save(); }, CHECKPOINT_MS);
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
