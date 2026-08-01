import { applyProjectPatch, diffProjectSnapshots, emptyProjectSnapshot, normalizeProjectSnapshot, projectPatchIsEmpty } from "/-/resources-site/project-history.js";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 63).replace(/-+$/g, "");
}

const EDITOR_PROTOCOL = "resources-project-editor-v1";
const DRAFT_KEY = "resources_project_draft_v1";
const CHECKPOINT_MS = 300_000;
const STARTING_POINTS = Object.freeze({
  html: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <title>New project</title>\n  <link rel=\"stylesheet\" href=\"./style.css\">\n</head>\n<body>\n  <main>\n    <h1>Hello</h1>\n    <p>Edit this page to make it yours.</p>\n  </main>\n  <script src=\"./script.js\"></script>\n</body>\n</html>\n" },
      { path: "style.css", content: "body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  font-family: system-ui, sans-serif;\n  color: #f5f7f7;\n  background: #171a1a;\n}\nmain {\n  max-width: 42rem;\n  padding: 2rem;\n}\n" },
      { path: "script.js", content: "console.log(\"Hello from Resources.co\");\n" },
    ],
    config: { entry: "index.html", sandbox: { network: false, storage: "session" } },
  },
  canvas: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>Canvas sketch</title>\n<link rel=\"stylesheet\" href=\"./style.css\">\n<canvas width=\"720\" height=\"480\" aria-label=\"Canvas sketch\"></canvas>\n<script src=\"./script.js\"></script>\n" },
      { path: "style.css", content: "body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #171a1a; }\ncanvas { max-width: calc(100% - 2rem); background: #222727; }\n" },
      { path: "script.js", content: "const canvas = document.querySelector(\"canvas\");\nconst context = canvas.getContext(\"2d\");\ncontext.fillStyle = \"#30d5c8\";\ncontext.fillRect(120, 100, 480, 280);\n" },
    ],
    config: { entry: "index.html", sandbox: { network: false, storage: "memory" } },
  },
  svg: {
    files: [{ path: "image.svg", content: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 500\" role=\"img\" aria-labelledby=\"title\">\n  <title id=\"title\">A new illustration</title>\n  <rect width=\"800\" height=\"500\" fill=\"#171a1a\"/>\n  <circle cx=\"400\" cy=\"250\" r=\"150\" fill=\"#30d5c8\"/>\n</svg>\n" }],
    config: { entry: "image.svg", sandbox: { network: false, storage: "memory" } },
  },
  blank: {
    files: [{ path: "index.html", content: "" }],
    config: { entry: "index.html", sandbox: { network: false, storage: "session" } },
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
  return { snapshot, checkpoint: snapshot, patches: [diffProjectSnapshots(empty, snapshot)], versionTimes: [createdAt], createdAt, lastVersionAt: createdAt };
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
    button.disabled = true;
  }
  return button;
}

for (const root of document.querySelectorAll("[data-project-editor]")) {
  const iframe = root.querySelector("iframe");
  const snapshotField = root.querySelector("[data-project-snapshot]");
  const status = root.querySelector("[data-project-status]");
  const versionButton = root.querySelector("[data-project-versions]");
  const versionCount = versionButton.querySelector(".project-editor__version-count");
  const historyPanel = root.querySelector("[data-project-history]");
  const versionList = root.querySelector("[data-project-version-list]");
  const projectId = root.dataset.projectId;
  const draft = root.dataset.draft === "true";
  let state = normalizeProjectSnapshot(JSON.parse(snapshotField.value));
  let selected = state.files[0]?.path || "config";
  let ready = false;
  let suppressChange = false;
  let pending = false;
  let saveTimer = 0;
  let pendingDestructive = false;
  let changeGeneration = 0;
  let saving = false;
  let localHistory = null;

  if (draft) {
    try {
      const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
      if (stored?.patches?.length) {
        localHistory = stored;
        localHistory.versionTimes ||= stored.patches.map((_, index) => Number(stored.createdAt || Date.now()) + index);
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
    if (selected.endsWith(".js") || selected.endsWith(".mjs") || selected.endsWith(".ts")) return "javascript";
    if (selected.endsWith(".html") || selected.endsWith(".htm") || selected.endsWith(".svg")) return "html";
    if (selected.endsWith(".css")) return "css";
    if (selected.endsWith(".md")) return "markdown";
    return "plain";
  }

  function sendContent() {
    if (!ready) return;
    suppressChange = true;
    root.dataset.editorLoading = "true";
    iframe.contentWindow.postMessage({ protocol: EDITOR_PROTOCOL, type: "set-content", content: selectedContent(), mode: mode(), language: language(), snapshot: state }, "*");
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
    root.querySelector("[data-project-remove-file]").disabled = selected === "config" || state.files.length === 1;
  }

  function setStatus(text, error = false) {
    status.textContent = text;
    status.dataset.error = error ? "true" : "false";
  }

  function updateSnapshot(next, { destructive = false } = {}) {
    state = normalizeProjectSnapshot(next);
    snapshotField.value = JSON.stringify(state);
    pending = true;
    changeGeneration += 1;
    pendingDestructive ||= destructive;
    setStatus("Unsaved changes");
    if (draft) {
      localHistory.snapshot = state;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1_500);
  }

  function checkpointDraft({ destructive = false } = {}) {
    const now = Date.now();
    if (!destructive && now - localHistory.lastVersionAt < CHECKPOINT_MS) return;
    const patch = diffProjectSnapshots(localHistory.checkpoint, state);
    if (projectPatchIsEmpty(patch)) return;
    localHistory.patches.push(patch);
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
    versionList.append(versionChoice(root.dataset.currentVersionLabel || "Current Version", Date.now(), { current: true }));
    [...localHistory.patches].reverse().forEach((_, reverseIndex) => {
      const sequence = localHistory.patches.length - reverseIndex;
      const button = versionChoice(relativeVersionTime(localHistory.versionTimes[sequence - 1]), localHistory.versionTimes[sequence - 1], { sequence });
      button.addEventListener("click", () => {
        checkpointDraft({ destructive: true });
        const target = rebuildDraft(localHistory.patches, sequence);
        const restore = diffProjectSnapshots(localHistory.checkpoint, target);
        if (!projectPatchIsEmpty(restore)) localHistory.patches.push(restore);
        if (!projectPatchIsEmpty(restore)) localHistory.versionTimes.push(Date.now());
        localHistory.snapshot = localHistory.checkpoint = state = target;
        localHistory.lastVersionAt = Date.now();
        snapshotField.value = JSON.stringify(state);
        renderTabs();
        versionCount.textContent = String(localHistory.patches.length);
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
        historyPanel.hidden = true;
        sendContent();
        setStatus(`Restored version ${sequence}`);
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
    versionList.append(versionChoice(root.dataset.currentVersionLabel || "Current Version", Date.now(), { current: true }));
    for (const version of versions) {
      const button = versionChoice(relativeVersionTime(version.createdAt), version.createdAt, { sequence: version.sequence });
      button.addEventListener("click", async () => {
        await save();
        const restored = await fetch(`/api/projects/${encodeURIComponent(projectId)}/restore/${version.sequence}`, {
          method: "POST", headers: { "content-type": "application/json", "x-resources-csrf": root.dataset.csrf }, body: "{}",
        });
        if (!restored.ok) { setStatus("Restore failed", true); return; }
        const result = await restored.json();
        state = normalizeProjectSnapshot(result.snapshot);
        versionCount.textContent = String(result.versionCount);
        snapshotField.value = JSON.stringify(state);
        historyPanel.hidden = true;
        sendContent();
        location.reload();
      });
      versionList.append(button);
    }
  }

  addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== iframe.contentWindow || message?.protocol !== EDITOR_PROTOCOL) return;
    if (message.type === "ready") { ready = true; sendContent(); return; }
    if (message.type === "content-set") { delete root.dataset.editorLoading; return; }
    if (message.type !== "change" || typeof message.content !== "string") return;
    if (suppressChange) { suppressChange = false; return; }
    try {
      if (selected === "config") updateSnapshot({ files: state.files, config: JSON.parse(message.content) });
      else updateSnapshot({ files: state.files.map((file) => file.path === selected ? { ...file, content: message.content } : file), config: state.config });
    } catch {
      setStatus("Configuration must be valid JSON", true);
    }
  });
  root.querySelector(".project-editor__tabs").addEventListener("click", (event) => {
    const file = event.target.closest("[data-project-file]");
    if (file) selected = file.dataset.projectFile;
    else if (event.target.closest("[data-project-config]")) selected = "config";
    else return;
    renderTabs();
    sendContent();
  });
  root.querySelector("[data-project-add-file]").addEventListener("click", () => {
    const path = prompt("File path");
    if (!path) return;
    try {
      const next = normalizeProjectSnapshot({ files: [...state.files, { path, content: "" }], config: state.config });
      selected = path;
      updateSnapshot(next, { destructive: true });
      renderTabs();
      sendContent();
    } catch (error) { setStatus(error.message, true); }
  });
  root.querySelector("[data-project-remove-file]").addEventListener("click", () => {
    if (selected === "config" || state.files.length === 1 || !confirm(`Remove ${selected}?`)) return;
    const removed = selected;
    const files = state.files.filter((file) => file.path !== removed);
    selected = files[0].path;
    updateSnapshot({ files, config: state.config }, { destructive: true });
    renderTabs();
    sendContent();
  });
  const startingPoint = root.closest("form")?.querySelector("[data-project-starting-point]");
  startingPoint?.addEventListener("change", () => {
    const next = STARTING_POINTS[startingPoint.value];
    if (!next) return;
    selected = next.files[0].path;
    updateSnapshot(next, { destructive: true });
    renderTabs();
    sendContent();
  });
  versionButton.addEventListener("click", () => { historyPanel.hidden = false; versionButton.setAttribute("aria-expanded", "true"); draft ? renderDraftVersions() : renderStoredVersions(); });
  root.querySelector("[data-project-history-close]").addEventListener("click", () => { historyPanel.hidden = true; versionButton.setAttribute("aria-expanded", "false"); versionButton.focus(); });
  addEventListener("beforeunload", (event) => { if (pending) event.preventDefault(); });
  setInterval(() => { if (draft) checkpointDraft(); else if (pending) save(); }, CHECKPOINT_MS);
  renderTabs();
}
