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

function draftHistory(snapshot) {
  const empty = emptyProjectSnapshot();
  return { snapshot, checkpoint: snapshot, patches: [diffProjectSnapshots(empty, snapshot)], createdAt: Date.now(), lastVersionAt: Date.now() };
}

function rebuildDraft(patches, sequence = patches.length) {
  let snapshot = emptyProjectSnapshot();
  for (const patch of patches.slice(0, sequence)) snapshot = applyProjectPatch(snapshot, patch);
  return snapshot;
}

for (const root of document.querySelectorAll("[data-project-editor]")) {
  const iframe = root.querySelector("iframe");
  const snapshotField = root.querySelector("[data-project-snapshot]");
  const status = root.querySelector("[data-project-status]");
  const versionButton = root.querySelector("[data-project-versions]");
  const versionCount = versionButton.querySelector("span");
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

  function sendContent() {
    if (!ready) return;
    suppressChange = true;
    root.dataset.editorLoading = "true";
    iframe.contentWindow.postMessage({ protocol: EDITOR_PROTOCOL, type: "set-content", content: selectedContent(), mode: mode() }, "*");
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
    [...localHistory.patches].reverse().forEach((_, reverseIndex) => {
      const sequence = localHistory.patches.length - reverseIndex;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-editor__version";
      button.textContent = `Version ${sequence}`;
      button.addEventListener("click", () => {
        checkpointDraft({ destructive: true });
        const target = rebuildDraft(localHistory.patches, sequence);
        const restore = diffProjectSnapshots(localHistory.checkpoint, target);
        if (!projectPatchIsEmpty(restore)) localHistory.patches.push(restore);
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
    for (const version of versions) {
      const row = document.createElement("div");
      row.className = "project-editor__version-row";
      const label = document.createElement("span");
      label.textContent = `Version ${version.sequence} · ${version.reason.replaceAll("_", " ")}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-editor__version";
      button.textContent = "Restore";
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
      row.append(label, button);
      versionList.append(row);
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
  versionButton.addEventListener("click", () => { historyPanel.hidden = false; draft ? renderDraftVersions() : renderStoredVersions(); });
  root.querySelector("[data-project-history-close]").addEventListener("click", () => { historyPanel.hidden = true; });
  addEventListener("beforeunload", (event) => { if (pending) event.preventDefault(); });
  setInterval(() => { if (draft) checkpointDraft(); else if (pending) save(); }, CHECKPOINT_MS);
  renderTabs();
}

for (const source of document.querySelectorAll("[data-slug-source]")) {
  const slug = document.getElementById(source.dataset.slugSource);
  const error = document.getElementById(slug?.getAttribute("aria-describedby"));
  if (!slug || !error) continue;
  let generated = slug.value === "";
  let touched = false;
  function validate() {
    const invalid = slug.value !== "" && !slugPattern.test(slug.value);
    slug.setCustomValidity(invalid ? error.dataset.message : "");
    slug.setAttribute("aria-invalid", invalid ? "true" : "false");
    error.hidden = !invalid || !touched;
  }
  source.addEventListener("input", () => {
    if (!generated) return;
    slug.value = slugify(source.value);
    validate();
  });
  slug.addEventListener("input", (event) => {
    if (event.isTrusted) generated = slug.value === slugify(source.value);
    touched = true;
    validate();
  });
  slug.addEventListener("blur", () => { touched = true; validate(); });
}
