import { applyProjectPatch, diffProjectSnapshots, emptyProjectSnapshot, normalizeProjectSnapshot, projectPatchIsEmpty } from "/-/resources-site/project-history.js";
import { urlMatchesAllowedPatterns, validateAllowedUrlPatterns } from "/-/resources-site/url-pattern.js";
import { containerElementNames, describeContainerElement } from "/-/resources-site/container-elements.js";
import { decodeProjectArchive, encodeProjectArchive, isProjectImage } from "/-/resources-site/project-archive.js";
import { mountResourcesPresentation, mountResourcesProjectEditor, mountResourcesProjectPreview } from "/-/resources-site/project-editor-runtime.js";
import { StyleUse } from "/-/style-use/index.js";

function enterProjectLoadingView(href) {
  const content = document.getElementById("content");
  const layout = document.querySelector("main.layout");
  if (!content) return;
  layout?.classList.add("focused-view");
  if (layout) layout.dataset.view = "focused";
  content.dataset.loading = "true";
  content.setAttribute("aria-busy", "true");
  const loading = document.createElement("section");
  loading.className = "project-route-loading";
  loading.setAttribute("aria-label", "Loading project");
  const spinner = document.createElement("span");
  spinner.className = "project-route-loading__spinner";
  spinner.setAttribute("aria-hidden", "true");
  const label = document.createElement("p");
  label.textContent = "Loading project…";
  loading.append(spinner, label);
  content.replaceChildren(loading);
  // Leave the focused shell on screen long enough for the browser to paint it
  // before a native navigation makes the old document unavailable.
  setTimeout(() => location.assign(href), 80);
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[data-project-link][href]");
  if (!link || link.target || new URL(link.href, location.href).origin !== location.origin) return;
  event.preventDefault();
  enterProjectLoadingView(link.href);
});

for (const split of document.querySelectorAll("[data-save-split]")) {
  const trigger = split.querySelector("[data-save-menu-trigger]");
  const menu = split.querySelector("[data-save-menu]");
  trigger.addEventListener("click", () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    trigger.setAttribute("aria-expanded", String(opening));
  });
  document.addEventListener("pointerdown", (event) => {
    if (!split.contains(event.target)) { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest?.("a[href]");
  if (!link || link.classList.contains("project-close")) return;
  const target = new URL(link.href, location.href);
  if (target.origin === location.origin && /^\/[^/]+\/[^/]+$/.test(target.pathname)) {
    let stack = [];
    try { stack = JSON.parse(sessionStorage.getItem("resources-project-close-stack")) || []; } catch {}
    const current = location.pathname + location.search;
    if (stack.at(-1) !== current) stack.push(current);
    sessionStorage.setItem("resources-project-close-stack", JSON.stringify(stack.slice(-20)));
  }
});
for (const close of document.querySelectorAll(".project-close")) {
  let stack = [];
  try { stack = JSON.parse(sessionStorage.getItem("resources-project-close-stack")) || []; } catch {}
  if (!Array.isArray(stack)) stack = [];
  const previous = stack.at(-1);
  close.href = typeof previous === "string" && previous.startsWith("/") ? previous : "/";
  close.addEventListener("click", () => {
    stack.pop();
    sessionStorage.setItem("resources-project-close-stack", JSON.stringify(stack));
  });
}

for (const overflow of document.querySelectorAll("[data-project-overflow]")) {
  const trigger = overflow.querySelector("[data-project-overflow-trigger]");
  const menu = overflow.querySelector("[data-project-overflow-menu]");
  trigger.addEventListener("click", () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    trigger.setAttribute("aria-expanded", String(opening));
  });
  document.addEventListener("pointerdown", (event) => {
    if (!overflow.contains(event.target)) { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  });
}

for (const fields of document.querySelectorAll("[data-project-fields]")) {
  const modal = fields.querySelector("[data-version-title-modal]");
  if (!modal) continue;
  const input = modal.querySelector("[data-version-title-input]");
  const hidden = fields.querySelector("[data-version-title]");
  const close = () => { modal.hidden = true; input.value = ""; };
  fields.querySelector("[data-open-version-title]")?.addEventListener("click", () => {
    fields.querySelector("[data-save-menu]").hidden = true;
    modal.hidden = false;
    input.focus();
  });
  modal.querySelector("[data-version-title-cancel]").addEventListener("click", close);
  modal.querySelector("[data-version-title-save]").addEventListener("click", () => {
    hidden.value = input.value.trim();
    modal.hidden = true;
    fields.closest("form")?.requestSubmit(fields.querySelector("[data-project-submit]"));
  });
  modal.addEventListener("pointerdown", (event) => { if (event.target === modal) close(); });
}

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
  slides: {
    files: [{ path: "index.html", content: "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>Small presentation</title><style>html,body{margin:0;height:100%;background:#101321;color:#f4f6ff;font:20px system-ui}main{height:100%;display:grid;place-items:center;text-align:center}small{color:#9da8d8}</style></head><body><main><div><h1>Small presentation</h1><p>A portable, single-file starting point.</p><small>Import a Resources project ZIP to replace it.</small></div></main></body></html>" }],
    config: { entry: "index.html", template: "slides", container: "presentation", sandbox: { network: false, storage: "session" } },
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
function attachInstantTooltip(button, label = button.dataset.instantTooltip, shouldShow = () => true) {
  if (!label || button.dataset.instantTooltipAttached === "true") return;
  button.dataset.instantTooltip = label;
  button.dataset.instantTooltipAttached = "true";
  let tooltip = null;
  let showTimer = null;
  const show = () => {
    if (!shouldShow(button)) return;
    if (!tooltip) {
      tooltip = document.createElement("span");
      tooltip.className = "instant-tooltip";
      tooltip.textContent = label;
      document.body.append(tooltip);
    }
    requestAnimationFrame(() => {
      if (!tooltip) return;
      tooltip.dataset.visible = "";
      const anchor = button.getBoundingClientRect();
      const width = tooltip.offsetWidth;
      const left = Math.max(8, Math.min(innerWidth - width - 8, anchor.left + anchor.width / 2 - width / 2));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${anchor.bottom + 4}px`;
    });
  };
  const hide = () => {
    clearTimeout(showTimer);
    showTimer = null;
    tooltip?.remove();
    tooltip = null;
  };
  button.addEventListener("pointerenter", () => {
    if (!shouldShow(button)) return;
    clearTimeout(showTimer);
    showTimer = setTimeout(show, 600);
  });
  button.addEventListener("pointerleave", hide);
  button.addEventListener("focus", show);
  button.addEventListener("blur", hide);
}
for (const button of document.querySelectorAll("button[data-instant-tooltip]")) {
  attachInstantTooltip(button);
}
document.addEventListener("click", (event) => {
  event.target.closest?.("[data-dismiss-draft-flash]")?.closest("[data-draft-flash]")?.remove();
  const open = event.target.closest?.("[data-open-draft-delete], [data-open-project-delete]");
  if (open) open.closest("[data-project-fields]")?.querySelector("[data-destructive-confirm]")?.removeAttribute("hidden");
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
  const then = new Date(Number(timestamp));
  const current = new Date(now);
  const seconds = Math.max(0, Math.floor((current - then) / 1000));
  const spanish = document.documentElement.lang === "es";
  const amount = (value, singular, plural) => `${value} ${value === 1 ? singular : plural}`;
  if (seconds < 60) return `${amount(seconds, spanish ? "segundo" : "second", spanish ? "segundos" : "seconds")} ${spanish ? "atrás" : "ago"}`;
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  if (minutes < 60) {
    const parts = [amount(minutes, spanish ? "minuto" : "minute", spanish ? "minutos" : "minutes")];
    if (remainderSeconds) parts.push(amount(remainderSeconds, spanish ? "segundo" : "second", spanish ? "segundos" : "seconds"));
    return `${parts.join(" ")} ${spanish ? "atrás" : "ago"}`;
  }
  const sameDay = then.getFullYear() === current.getFullYear() && then.getMonth() === current.getMonth() && then.getDate() === current.getDate();
  if (sameDay || seconds < 8 * 3600) {
    const hours = Math.floor(minutes / 60);
    const remainderMinutes = minutes % 60;
    const parts = [amount(hours, spanish ? "hora" : "hour", spanish ? "horas" : "hours")];
    if (remainderMinutes) parts.push(amount(remainderMinutes, spanish ? "minuto" : "minute", spanish ? "minutos" : "minutes"));
    return `${parts.join(" ")} ${spanish ? "atrás" : "ago"}`;
  }
  const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const thenDayStart = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const days = Math.round((dayStart - thenDayStart) / 86_400_000);
  const clock = formatVersionClock(then, spanish);
  if (days === 1) return `${spanish ? "Ayer" : "Yesterday"} ${clock}`;
  const weekdays = spanish
    ? ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (days < 7) return `${weekdays[then.getDay()]} ${clock}`;
  const months = spanish
    ? ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return spanish
    ? `${then.getDate()} ${months[then.getMonth()]} ${then.getFullYear()}, ${clock}`
    : `${months[then.getMonth()]} ${then.getDate()}, ${then.getFullYear()}, ${clock}`;
}

function formatVersionClock(date, spanish = document.documentElement.lang === "es") {
  const englishUS = !spanish && /^en-US\b/i.test(navigator.language || "");
  if (!englishUS) return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const hour = date.getHours();
  return `${hour % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")}${hour < 12 ? "am" : "pm"}`;
}

function formatVersionDateTime(timestamp) {
  const date = new Date(Number(timestamp));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${formatVersionClock(date)}`;
}

function versionChoice(label, timestamp, { current = false, sequence = 0, title = "", latest = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "project-editor__version";
  if (title) {
    const name = document.createElement("span");
    name.className = "project-editor__version-title";
    name.textContent = title;
    button.append(name);
  }
  const time = document.createElement("span");
  time.textContent = label;
  time.dataset.versionTime = String(Number(timestamp));
  button.append(time);
  if (latest) {
    const badge = document.createElement("span");
    badge.className = "project-editor__latest";
    badge.textContent = "LATEST";
    button.append(badge);
  }
  button.title = formatVersionDateTime(timestamp);
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
  const versionButton = root.closest(".project-create__layout")?.querySelector("[data-project-versions-proxy]") || root.querySelector("[data-project-versions]");
  const versionCount = versionButton.querySelector(".project-editor__version-count");
  const currentVersion = versionButton.querySelector("[data-current-version]");
  const historyPanel = root.querySelector("[data-project-history]");
  const versionList = root.querySelector("[data-project-version-list]");
  const projectId = root.dataset.projectId;
  const persistence = root.dataset.persistence || "stored";
  const draft = persistence === "session";
  const memoryOnly = persistence === "memory";
  const readOnly = root.dataset.readOnly === "true";
  const pendingSnapshotKey = projectId ? `resources_project_pending_v1:${projectId}` : "";
  const initialProjectLayout = root.closest(".project-create__layout");
  const initialDetailsButton = root.querySelector('[data-project-view="details"]');
  const initiallyNarrow = globalThis.matchMedia?.("(max-width: 760px)").matches === true;
  if (initialProjectLayout) initialProjectLayout.dataset.detailsVisible = String(!initiallyNarrow);
  initialDetailsButton?.setAttribute("aria-pressed", String(!initiallyNarrow));
  root.dataset.draftState = "clean";
  let restoredDraft = false;
  const snapshotUrl = root.querySelector("[data-project-snapshot-url]")?.dataset.projectSnapshotUrl;
  let workspacePayload = null;
  if (snapshotUrl) {
    try {
      const response = await fetch(snapshotUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Project workspace response: ${response.status}`);
      workspacePayload = await response.json();
      snapshotField.value = JSON.stringify(workspacePayload.snapshot);
      versionCount.textContent = String(workspacePayload.versionCount || 1);
      const draftFlash = root.closest(".project-create__layout")?.querySelector("[data-draft-flash]");
      if (draftFlash && workspacePayload.hasUnpublishedChanges) draftFlash.hidden = false;
      else draftFlash?.remove();
    } catch (error) {
      root.dataset.editorMachineState = "failed";
      status.dataset.state = "error";
      status.hidden = false;
      statusError.hidden = false;
      statusError.textContent = `Project failed to load: ${error.message}`;
      continue;
    }
  }
  let state = normalizeProjectSnapshot(JSON.parse(snapshotField.value));
  let recoveredPendingSnapshot = false;
  if (!readOnly && !draft && !memoryOnly && pendingSnapshotKey) {
    try {
      const pendingValue = sessionStorage.getItem(pendingSnapshotKey);
      if (pendingValue) {
        const recovered = normalizeProjectSnapshot(JSON.parse(pendingValue));
        if (!projectPatchIsEmpty(diffProjectSnapshots(state, recovered))) {
          state = recovered;
          snapshotField.value = JSON.stringify(state);
          recoveredPendingSnapshot = true;
        } else {
          sessionStorage.removeItem(pendingSnapshotKey);
        }
      }
    } catch {
      sessionStorage.removeItem(pendingSnapshotKey);
    }
  }
  if (workspacePayload) {
    const fields = root.closest(".project-create__layout")?.querySelector("[data-project-fields]");
    const containerName = typeof state.config?.container === "string" ? state.config.container : state.config?.container?.name;
    const templateField = fields?.querySelector("[data-project-template]");
    const containerField = fields?.querySelector("[data-project-container]");
    const patternsField = fields?.querySelector("#project-link-patterns");
    if (templateField) templateField.value = state.config?.template || "article";
    if (containerField) containerField.value = containerName || "page";
    if (patternsField) patternsField.value = (state.config?.containerOptions?.allowedLinkPatterns || []).join("\n");
  }
  const requestedTemplate = memoryOnly ? new URL(location.href).searchParams.get("template") : null;
  if (requestedTemplate && STARTING_POINTS[requestedTemplate]) {
    state = normalizeProjectSnapshot(STARTING_POINTS[requestedTemplate]);
    snapshotField.value = JSON.stringify(state);
  }
  let currentSnapshot = state;
  let viewingHistorical = false;
  let selected = state.files.some((file) => file.path === state.config?.entry) ? state.config.entry : state.files[0]?.path || "config";
  const tabSessionKey = `resources_project_tabs_v1:${projectId || persistence}`;
  let openTabs = [];
  try { openTabs = JSON.parse(sessionStorage.getItem(tabSessionKey)) || []; } catch {}
  if (!openTabs.length) openTabs = Array.isArray(state.config?.editorTabs) ? [...state.config.editorTabs] : state.files.map((file) => file.path);
  let ready = false;
  let pending = recoveredPendingSnapshot;
  let saveTimer = 0;
  let pendingDestructive = false;
  let templateOnlyPending = false;
  let changeGeneration = 0;
  let unsavedChangeCount = 0;
  let currentUpdatedAt = recoveredPendingSnapshot ? Date.now() : Number(workspacePayload?.updatedAt || Date.now());
  let saving = false;
  let localHistory = null;
  let editorController = null;
  let editorGeneration = 0;
  let previewController = null;
  let previewTimer = 0;
  let editorPreviewTimer = 0;
  let previewGeneration = 0;
  let outputFrame = null;
  let outputFramePort = null;
  let outputFrameReady = null;
  let outputFrameRequested = true;
  const syncOutputTheme = () => outputFramePort?.postMessage({
    type: "theme",
    colorScheme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
  });
  document.addEventListener("themechange", syncOutputTheme);
  let activeError = "";
  let activeErrorAction = null;
  let activeStatusSurface = "output";
  let activeNotice = false;
  let persistenceState = status.dataset.state || "normal";
  function showCurrentVersion() {
    currentVersion.textContent = relativeVersionTime(currentUpdatedAt);
    currentVersion.dataset.versionTime = String(currentUpdatedAt);
    currentVersion.title = formatVersionDateTime(currentUpdatedAt);
  }

  function refreshSubmitLabel() {
    const button = root.closest("form")?.querySelector("[data-project-submit]");
    if (!button || draft) return;
    button.textContent = unsavedChangeCount
      ? `${unsavedChangeCount} unsaved ${unsavedChangeCount === 1 ? "change" : "changes"}`
      : button.dataset.defaultLabel;
  }

  function showSelectedVersion(label, timestamp) {
    currentVersion.textContent = label;
    currentVersion.dataset.versionTime = String(Number(timestamp));
    currentVersion.title = formatVersionDateTime(timestamp);
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

  function sendContent({ resetHistoryOnEdit = false } = {}) {
    if (!ready || !editorController) return;
    root.dataset.editorLoading = "true";
    const selectedFile = state.files.find((file) => file.path === selected);
    editorMount.parentElement.querySelector(".project-editor__image-view")?.remove();
    editorMount.parentElement.querySelector(".project-editor__asset-view")?.remove();
    const largeFile = selectedFile && new TextEncoder().encode(selectedFile.content).byteLength > 500_000;
    editorMount.hidden = isProjectImage(selectedFile) || largeFile;
    if (isProjectImage(selectedFile)) {
      const image = document.createElement("img");
      image.className = "project-editor__image-view";
      image.src = selectedFile.content;
      image.alt = selectedFile.path;
      editorMount.parentElement.append(image);
      delete root.dataset.editorLoading;
      return;
    }
    if (largeFile) {
      const view = document.createElement("div");
      view.className = "project-editor__asset-view";
      const size = new TextEncoder().encode(selectedFile.content).byteLength;
      view.innerHTML = `<strong>${selectedFile.path}</strong><span>${(size / 1_048_576).toFixed(2)} MB · too large for the constrained code editor</span>`;
      const sourceView = document.createElement("textarea");
      sourceView.className = "project-editor__large-source";
      sourceView.value = selectedFile.content;
      sourceView.readOnly = true;
      sourceView.wrap = "off";
      sourceView.setAttribute("aria-label", `${selectedFile.path} read-only source`);
      const download = document.createElement("button");
      download.type = "button";
      download.textContent = "Download file";
      download.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([selectedFile.content], { type: selectedFile.path.endsWith(".html") ? "text/html" : "text/plain" }));
        link.download = selectedFile.path.split("/").at(-1);
        link.click();
        URL.revokeObjectURL(link.href);
      });
      view.append(download, sourceView);
      editorMount.parentElement.append(view);
      delete root.dataset.editorLoading;
      return;
    }
    editorController.setContent(selectedContent(), language(), { readOnly: readOnly || selected === "config", resetHistoryOnEdit });
    delete root.dataset.editorLoading;
  }

  async function renderPreview() {
    clearTimeout(editorPreviewTimer);
    editorPreviewTimer = 0;
    const generation = ++previewGeneration;
    activeError = "";
    renderStatusState();
    try {
      editorController?.projectStatus.begin(generation);
    } catch (error) {
      setStatus(`Editor status bridge failed: ${error.message}`, "error", null, "editor");
    }
    const entry = state.config?.entry || "index.html";
    const source = state.files.find((file) => file.path === entry)?.content || "";
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(source)?.[1].replace(/\s+/g, " ").trim() || entry;
    root.querySelector("[data-preview-title]").textContent = title;
    const containerName = typeof state.config?.container === "string" ? state.config.container : state.config?.container?.name;
    if (containerName === "presentation" || containerName === "single-file-web-app") {
      previewController?.destroy();
      previewController = null;
      outputFrame?.remove();
      outputFrame = outputFramePort = outputFrameReady = null;
      delete preview.dataset.projectMachineId;
      const containerEntry = state.config?.containerEntry || entry;
      const containerSource = state.files.find((file) => file.path === containerEntry)?.content || source;
      const artifactPath = String(state.config?.artifactPath || "");
      const artifactOrigin = root.querySelector("[data-blog-examples-origin]")?.dataset.blogExamplesOrigin || "";
      const fileUrl = artifactOrigin && /^\/-\/blog-examples\/[A-Za-z0-9._~?&=/%+-]+$/.test(artifactPath) ? `${artifactOrigin}${artifactPath}` : "";
      const stylesheetPaths = state.config?.stylesheets || [];
      // An absent stylesheet list means the single-file runtime owns its
      // inline <style> blocks. Passing an empty string would suppress that
      // extraction and leave the display surface unstyled.
      const css = state.config?.stylesheets
        ? stylesheetPaths.map((path) => state.files.find((file) => file.path === path)?.content || "").join("\n")
        : undefined;
      const scriptPaths = state.config?.scripts || [...source.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1].replace(/^\.\//, ""));
      const modules = Object.fromEntries(Object.entries(state.config?.modules || {}).map(([specifier, path]) => [specifier, state.files.find((file) => file.path === path)?.content || ""]));
      const assets = Object.fromEntries(state.files.filter((file) => /^data:[^,]+,/.test(file.content)).map((file) => [file.path, file.content]));
      const scripts = scriptPaths.map((path) => ({ source: path, code: state.files.find((file) => file.path === path)?.content || "" })).filter((script) => script.code);
      previewController = mountResourcesPresentation({
        root: preview,
        project: {
          title, fileUrl, file: fileUrl ? undefined : containerSource, html: source, css: state.config?.containerEntry ? undefined : css,
          scripts: state.config?.containerEntry ? [] : scripts,
          modules: state.config?.containerEntry ? {} : modules,
          globals: { __PRESENTATION_USE_ASSETS__: assets },
          domSchema: state.config?.domSchema || {},
          cssSchema: state.config?.cssSchema || {},
          capabilities: state.config?.capabilities || { events: ["click", "input", "change", "keydown"], sessionStorage: true },
          limits: state.config?.limits || {},
        },
        onStatus(event) {
          if (generation !== previewGeneration) return;
          const routed = routeProjectStatus(generation, event);
          if (routed && !routed.accepted) return;
          if (event.type === "mounted" && parent !== window) parent.postMessage({ protocol: "resources-project-presentation-v1", type: "ready" }, "*");
          if (event.type === "escape") {
            if (root.dataset.presenting === "true") closePresentation();
            if (parent !== window) parent.postMessage({ protocol: "resources-project-presentation-v1", type: "escape" }, "*");
          }
          if (event.type === "blocked") {
            setStatus(`Blocked: ${routed?.blocking?.message || event.message}`, "error", null, "output");
            if (parent !== window) parent.postMessage({ protocol: "resources-project-presentation-v1", type: "status", status: "blocked", message: event.message }, "*");
          }
        },
      });
      preview.dataset.previewRuntime = "presentation-use";
      return;
    }
    const outputOptions = state.config?.output || {};
    const useOutputFrame = outputOptions.iframe !== false && outputFrameRequested;
    let surfaceHost, surfaceRoot, surfaceBody;
    if (useOutputFrame) {
      if (!outputFrame) {
        outputFrame = document.createElement("iframe");
        outputFrame.className = "project-editor__preview-surface";
        outputFrame.title = `${title} output`;
        outputFrame.src = "/-/resources-site/project-output-frame.html";
        outputFrame.style.cssText = "display:block;width:100%;height:100%;border:0";
        outputFrame.hidden = true;
        outputFrameReady = new Promise((resolve, reject) => {
          outputFrame.addEventListener("load", () => {
            const channel = new MessageChannel();
            channel.port1.addEventListener("message", (event) => {
              if (event.data?.type === "ready") { outputFramePort = channel.port1; resolve(); }
            });
            channel.port1.start();
            outputFrame.contentWindow.postMessage({ protocol: "resources-project-output-frame-v1", type: "connect" }, location.origin, [channel.port2]);
          }, { once: true });
          outputFrame.addEventListener("error", () => reject(new Error("Project output frame failed to load")), { once: true });
        });
        preview.append(outputFrame);
      }
      surfaceHost = outputFrame;
      await outputFrameReady;
      if (generation !== previewGeneration) return;
      preview.dataset.outputSurface = "iframe";
    } else {
      surfaceHost = document.createElement("div");
      surfaceHost.className = "project-editor__preview-surface";
      surfaceRoot = surfaceHost.attachShadow({ mode: "open" });
      surfaceBody = document.createElement("body");
      surfaceRoot.append(surfaceBody);
      preview.replaceChildren(surfaceHost);
      preview.dataset.outputSurface = "direct";
    }
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
    const staging = document.createElement("div");
    staging.append(fragment);
    const serializeOutputNode = (node) => node.nodeType === Node.TEXT_NODE ? [0, node.textContent] : [
      1, node.localName, node.namespaceURI === "http://www.w3.org/2000/svg" ? 1 : 0,
      [...node.attributes].map((attribute) => [attribute.name, attribute.value]),
      [...node.childNodes].map(serializeOutputNode),
    ];
    const outputTree = [...staging.childNodes].map(serializeOutputNode);
    const stylesheetPaths = state.config?.stylesheets || [...parsed.querySelectorAll('link[rel="stylesheet"][href]')]
      .map((link) => link.getAttribute("href").replace(/^\.\//, ""));
    const css = [
      ...parsed.querySelectorAll("style"),
      ...stylesheetPaths.map((path) => state.files.find((file) => file.path === path)).filter(Boolean),
    ].map((item) => item.content ?? item.textContent ?? "").join("\n");
    let renderedCss = "";
    if (css) {
      try {
        new StyleUse(state.config?.cssSchema || { imports: false, urls: false }).validateStylesheet(css);
        renderedCss = css;
        if (!useOutputFrame) {
          const style = document.createElement("style");
          style.textContent = `:host { display: block; min-height: 100%; }\n${css}`;
          surfaceRoot.append(style);
        }
      } catch (error) {
        reject(`Stylesheet was omitted: ${error.message}`);
      }
    }
    let stagedRoot = "";
    if (useOutputFrame) {
      await new Promise((resolve) => {
        const receive = (event) => {
          if (event.data?.type !== "staged" || event.data.generation !== generation) return;
          stagedRoot = event.data.root;
          outputFramePort.removeEventListener("message", receive);
          resolve();
        };
        outputFramePort.addEventListener("message", receive);
        outputFramePort.postMessage({
          type: "stage",
          generation,
          css: renderedCss,
          colorScheme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
        });
      });
      if (generation !== previewGeneration) return;
      surfaceBody = surfaceHost.contentDocument?.getElementById(stagedRoot);
      if (!surfaceBody) throw new Error("Project output frame root is unavailable");
    } else {
      surfaceBody.append(...staging.childNodes);
    }
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
      if (generation !== previewGeneration) return;
      try {
        editorController?.projectOutput.request(generation);
        const controller = await mountResourcesProjectPreview({
          root: surfaceBody, statusRoot: preview, scripts: useOutputFrame ? [] : scripts, violations, tags: [...allowed].filter((tag) => !["html", "head", "body", "meta", "link", "script", "style"].includes(tag)),
          allowedFetchOrigins: state.config?.containerOptions?.allowedFetchOrigins || [],
          environment: { language: document.documentElement.lang || "en" },
          onViolation(error) {
            if (generation !== previewGeneration) return;
            const routed = routeProjectStatus(generation, { type: "blocked", message: error.message });
            if (!routed || routed.accepted) setStatus(`Blocked: ${routed?.blocking?.message || error.message}`, "error", null, "output");
          },
        });
        if (generation !== previewGeneration) controller.destroy();
        else {
          if (useOutputFrame) {
            controller.setContent(outputTree);
            await controller.run(scripts);
            await new Promise((resolve) => {
              const receive = (event) => {
                if (event.data?.type !== "committed" || event.data.generation !== generation) return;
                outputFramePort.removeEventListener("message", receive);
                resolve();
              };
              outputFramePort.addEventListener("message", receive);
              outputFramePort.postMessage({ type: "commit", generation });
            });
            if (generation !== previewGeneration) { controller.destroy(); return; }
            outputFrame.hidden = false;
            for (const child of [...preview.children]) if (child !== outputFrame) child.remove();
          }
          previewController?.destroy();
          previewController = controller;
          delete preview.dataset.previewViolations;
          delete preview.dataset.canvasCommands;
          const inspection = controller.inspect?.();
          const machine = inspection?.machine;
          preview.dataset.projectMachineId = machine?.machineId || "wasm-web-machine";
          preview.dataset.projectPrograms = String(inspection?.programs || 0);
        }
      } catch (error) {
        setStatus(`Blocked: ${error.message}`, true, null, "output");
        queueMicrotask(() => {
          if (generation === previewGeneration) routeProjectStatus(generation, { type: "blocked", message: error.message });
        });
      }
    }, 120);
  }

  function routeProjectStatus(generation, event) {
    try {
      return editorController?.projectStatus.report(generation, event) || null;
    } catch (error) {
      setStatus(`Editor status bridge failed: ${error.message}`, "error", null, "editor");
      return null;
    }
  }

  function disposeProjectMachine() {
    previewGeneration += 1;
    clearTimeout(previewTimer);
    previewController?.destroy();
    previewController = null;
    outputFramePort?.close();
    outputFrame?.remove();
    outputFrame = outputFramePort = outputFrameReady = null;
    outputFrameRequested = true;
    delete preview.dataset.previewRuntime;
    delete preview.dataset.previewViolations;
    delete preview.dataset.projectMachineId;
    delete preview.dataset.canvasCommands;
  }

  async function mountEditorMachine(reason = "project-open") {
    const generation = ++editorGeneration;
    ready = false;
    editorController?.destroy();
    editorController = null;
    delete root.dataset.editorMachineId;
    root.dataset.editorMachineState = "starting";
    root.dataset.editorMachineReason = reason;
    try {
      const controller = await mountResourcesProjectEditor({
        root: editorMount,
        onChange: receiveEditorChange,
        onViolation(error) {
          setStatus(`Editor stopped: ${error.message}`, true, { label: root.dataset.resetLabel || "Reset", run: resetStoppedEditor }, "editor");
        },
      });
      if (generation !== editorGeneration) {
        controller.destroy();
        return;
      }
      editorController = controller;
      root.dataset.editorMachineId = controller.inspect().machine.machineId;
      root.dataset.editorMachineState = "ready";
      if (localHistory) localHistory = editorController.history.initialize(localHistory);
      ready = true;
      sendContent();
      if (!previewController) renderPreview();
    } catch (error) {
      if (generation !== editorGeneration) return;
      root.dataset.editorMachineState = "failed";
      root.dataset.editorMachineError = error.message;
      setStatus(`Editor failed to start: ${error.message}`, true, null, "editor");
    }
  }

  function rotateContainerMachines(reason = "container-change") {
    disposeProjectMachine();
    mountEditorMachine(reason);
  }

  function renderTabs() {
    const menu = root.querySelector("[data-project-file-options]");
    const tabs = root.querySelector("[data-project-tabs]");
    const available = new Set([...state.files.map((file) => file.path), "config"]);
    openTabs = openTabs.filter((path, index) => available.has(path) && openTabs.indexOf(path) === index);
    if (!openTabs.length) openTabs.push(available.has(selected) ? selected : [...available][0]);
    if (!openTabs.includes(selected)) openTabs.push(selected);
    sessionStorage.setItem(tabSessionKey, JSON.stringify(openTabs));
    menu.replaceChildren();
    tabs.replaceChildren();
    const availableChoices = document.createElement("div");
    availableChoices.className = "project-editor__file-choices";
    availableChoices.dataset.projectFileAvailable = "";
    availableChoices.setAttribute("role", "group");
    const openSection = document.createElement("section");
    openSection.className = "project-editor__open-files";
    openSection.dataset.projectOpenFiles = "";
    const openHeading = document.createElement("p");
    openHeading.textContent = menu.dataset.openFilesLabel || "Open files";
    const openChoices = document.createElement("div");
    openChoices.className = "project-editor__open-file-choices";
    openChoices.setAttribute("role", "group");
    openChoices.setAttribute("aria-label", openHeading.textContent);
    openSection.append(openHeading, openChoices);
    menu.append(availableChoices, openSection);
    function addChoice({ path, label, config = false, open = false }) {
      const tabPath = config ? "config" : path;
      const row = document.createElement("div");
      row.className = "project-editor__file-option-row";
      row.dataset.projectFileChoice = open ? "open" : "available";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-editor__tab";
      if (config) button.dataset.projectConfig = "";
      else button.dataset.projectFile = path;
      button.setAttribute("aria-selected", (config ? selected === "config" : path === selected) ? "true" : "false");
      button.textContent = label;
      const option = button;
      option.className = "project-editor__file-option";
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", button.getAttribute("aria-selected"));
      option.removeAttribute("aria-selected");
      row.append(option);
      if (open && openTabs.length > 1) {
        const close = document.createElement("button");
        close.type = "button";
        close.className = "project-editor__file-option-close";
        close.dataset.closeMenuTab = tabPath;
        close.setAttribute("aria-label", `Close ${label}`);
        close.textContent = "×";
        row.append(close);
      }
      (open ? openChoices : availableChoices).append(row);
    }
    for (const file of state.files) {
      if (!openTabs.includes(file.path)) addChoice({ path: file.path, label: file.path });
    }
    if (!openTabs.includes("config")) addChoice({ label: root.dataset.configLabel || "Configuration", config: true });
    for (const path of openTabs) {
      const file = state.files.find((candidate) => candidate.path === path);
      addChoice({ path: file?.path, label: path === "config" ? root.dataset.configLabel || "Configuration" : file?.path || path, config: path === "config", open: true });
    }
    for (const path of openTabs) {
      const tab = document.createElement("div");
      tab.className = "project-editor__open-tab";
      tab.dataset.tabPath = path;
      tab.draggable = true;
      const select = document.createElement("button");
      select.type = "button";
      select.dataset.openTab = path;
      select.setAttribute("role", "tab");
      select.setAttribute("aria-selected", String(path === selected));
      const tabLabel = path === "config" ? root.dataset.configLabel || "Configuration" : path.split("/").at(-1);
      select.textContent = tabLabel;
      const nestedPath = path !== "config" && path.includes("/");
      attachInstantTooltip(select, path === "config" ? tabLabel : path, (button) => nestedPath || button.scrollWidth > button.clientWidth);
      tab.append(select);
      if (openTabs.length > 1 && path === selected) {
        const close = document.createElement("button");
        close.type = "button";
        close.className = "project-editor__tab-close";
        close.dataset.closeTab = path;
        close.setAttribute("aria-label", `Close ${tabLabel}`);
        close.textContent = "×";
        tab.append(close);
      }
      tabs.append(tab);
    }
    root.querySelector("[data-project-file-current]").textContent = selected === "config"
      ? root.dataset.configLabel || "Configuration"
      : selected;
  }

  function renderStatusState() {
    status.dataset.state = activeError ? "error" : activeNotice ? "warning" : persistenceState;
    const persistenceWarning = !activeError && !activeNotice && persistenceState === "warning";
    const workspaceView = root.querySelector(".project-editor__workspace")?.dataset.view;
    const targetSurface = activeStatusSurface === "editor" || workspaceView === "editor"
      ? editorMount.closest(".project-editor__source")
      : preview.closest(".project-editor__preview");
    if (targetSurface && status.parentElement !== targetSurface) targetSurface.append(status);
    status.hidden = !(activeError || activeNotice || persistenceWarning);
    statusNotice.hidden = !activeNotice || Boolean(activeError);
    statusError.hidden = !activeError;
    statusSave.hidden = !persistenceWarning;
    statusError.replaceChildren();
    if (activeError) statusError.append(document.createTextNode(activeError));
    if (activeErrorAction) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "project-editor__status-action";
      action.textContent = activeErrorAction.label;
      action.addEventListener("click", activeErrorAction.run);
      statusError.append(document.createTextNode(" "), action);
    }
  }

  function clearNotice() {
    activeNotice = false;
    statusNotice.replaceChildren();
    renderStatusState();
  }

  function showTemplateNotice(previousSnapshot) {
    activeNotice = true;
    activeStatusSurface = "editor";
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

  function setStatus(text, severity = "normal", action = null, surface = "editor") {
    const nextState = severity === true ? "error" : severity;
    if (nextState === "error") {
      activeError = text;
      activeErrorAction = action;
      activeStatusSurface = surface;
    }
    else {
      persistenceState = nextState;
      statusSave.textContent = text;
    }
    renderStatusState();
  }

  function resetStoppedEditor() {
    activeError = "";
    activeErrorAction = null;
    renderStatusState();
    mountEditorMachine("manual-reset");
  }

  function updateSnapshot(next, { destructive = false } = {}) {
    const normalized = normalizeProjectSnapshot(next);
    if (projectPatchIsEmpty(diffProjectSnapshots(state, normalized))) return false;
    const branchedFromHistory = viewingHistorical;
    showCurrentVersion();
    viewingHistorical = false;
    state = normalized;
    currentUpdatedAt = Date.now();
    currentSnapshot = state;
    snapshotField.value = JSON.stringify(state);
    pending = true;
    if (pendingSnapshotKey && !draft && !memoryOnly) sessionStorage.setItem(pendingSnapshotKey, JSON.stringify(state));
    root.dataset.draftDirty = "true";
    root.dataset.draftState = "dirty";
    unsavedChangeCount += 1;
    refreshSubmitLabel();
    if (draft) root.closest("form")?.querySelector("[data-draft-actions]")?.removeAttribute("hidden");
    changeGeneration += 1;
    pendingDestructive ||= destructive || branchedFromHistory;
    if (draft || memoryOnly) {
      localHistory.snapshot = state;
      if (editorController) localHistory = editorController.history.setCurrent(state);
      if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1_500);
    return true;
  }

  function checkpointDraft({ destructive = false } = {}) {
    const now = Date.now();
    if (editorController) {
      localHistory = editorController.history.checkpoint(state, {
        now,
        destructive,
        checkpointIntervalMs: CHECKPOINT_MS,
      });
    } else {
      if (!destructive && now - localHistory.lastVersionAt < CHECKPOINT_MS) return;
      const patch = diffProjectSnapshots(localHistory.snapshots.at(-1), state);
      if (projectPatchIsEmpty(patch)) return;
      localHistory.patches.push(patch);
      localHistory.snapshots.push(state);
      localHistory.versionTimes.push(now);
      localHistory.checkpoint = state;
      localHistory.lastVersionAt = now;
      localHistory.snapshot = state;
    }
    versionCount.textContent = String(localHistory.patches.length);
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
  }

  async function save() {
    if (!pending || saving) return;
    if (draft || memoryOnly) {
      if (!templateOnlyPending) checkpointDraft({ destructive: pendingDestructive || selected === "config" });
      pending = false;
      pendingDestructive = false;
      templateOnlyPending = false;
      delete root.dataset.draftDirty;
      root.dataset.draftState = "saved";
      setStatus(memoryOnly ? "" : "Draft saved in this session");
      return;
    }
    const savingGeneration = changeGeneration;
    const savingSnapshot = state;
    const savingDestructive = pendingDestructive && !templateOnlyPending;
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
        templateOnlyPending = false;
        delete root.dataset.draftDirty;
        root.dataset.draftState = "saved";
        if (pendingSnapshotKey) sessionStorage.removeItem(pendingSnapshotKey);
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
    const current = versionChoice(relativeVersionTime(currentUpdatedAt), currentUpdatedAt, { current: true });
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
      renderPreview();
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
        sendContent({ resetHistoryOnEdit: true });
        renderPreview();
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
    showCurrentVersion();
    const current = versionChoice(relativeVersionTime(currentUpdatedAt), currentUpdatedAt, { current: true });
    current.addEventListener("click", () => {
      clearNotice();
      if (!viewingHistorical) return;
      state = currentSnapshot;
      viewingHistorical = false;
      snapshotField.value = JSON.stringify(state);
      historyPanel.hidden = true;
      versionButton.setAttribute("aria-expanded", "false");
      renderTabs();
      sendContent({ resetHistoryOnEdit: true });
      renderPreview();
      showCurrentVersion();
      setStatus("Current version");
    });
    versionList.append(current);
    for (const version of versions) {
      const timestamp = version.savedAt || version.createdAt;
      const button = versionChoice(relativeVersionTime(timestamp), timestamp, { sequence: version.sequence, title: version.title, latest: version.latest });
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
        sendContent({ resetHistoryOnEdit: true });
        renderPreview();
        showSelectedVersion(relativeVersionTime(timestamp), timestamp);
        setStatus(`Viewing ${button.textContent}`);
      });
      versionList.append(button);
    }
  }

  function receiveEditorChange(content, { syntaxErrors = false } = {}) {
    if (typeof content !== "string") return;
    if (readOnly || selected === "config" || content === selectedContent()) return;
    try {
      clearNotice();
      if (updateSnapshot({ files: state.files.map((file) => file.path === selected ? { ...file, content } : file), config: state.config })) templateOnlyPending = false;
      clearTimeout(editorPreviewTimer);
      if (syntaxErrors) {
        setStatus("Blocked: Output is waiting for valid syntax.", "error", null, "output");
      } else {
        outputFrameRequested = true;
        // Keep the current output alive while the user is typing. Rebuilding
        // its DOM and QuickJS machine is intentionally a trailing-edge task.
        const debounceMs = Math.min(5_000, Math.max(250, Number(state.config?.output?.debounceMs) || 900));
        editorPreviewTimer = setTimeout(renderPreview, debounceMs);
      }
    } catch {}
  }
  function selectProjectFile(event) {
    const file = event.target.closest("[data-project-file]");
    if (file) selected = file.dataset.projectFile;
    else if (event.target.closest("[data-project-config]")) selected = "config";
    else return;
    if (!openTabs.includes(selected)) openTabs.push(selected);
    renderTabs();
    sendContent();
  }
  const openTabList = root.querySelector("[data-project-tabs]");
  const tabScrollBack = document.createElement("button");
  const tabScrollForward = document.createElement("button");
  for (const [button, label, text] of [[tabScrollBack, "Scroll tabs left", "‹"], [tabScrollForward, "Scroll tabs right", "›"]]) {
    button.type = "button";
    button.className = "project-editor__tab-scroll";
    button.setAttribute("aria-label", label);
    button.textContent = text;
    button.hidden = true;
  }
  openTabList.before(tabScrollBack);
  openTabList.after(tabScrollForward);
  function syncTabOverflow() {
    const overflowed = openTabList.scrollWidth > openTabList.clientWidth + 2;
    tabScrollBack.hidden = !overflowed;
    tabScrollForward.hidden = !overflowed;
    tabScrollBack.disabled = openTabList.scrollLeft <= 1;
    tabScrollForward.disabled = openTabList.scrollLeft + openTabList.clientWidth >= openTabList.scrollWidth - 1;
  }
  tabScrollBack.addEventListener("click", () => openTabList.scrollBy({ left: -Math.max(120, openTabList.clientWidth * .7), behavior: "smooth" }));
  tabScrollForward.addEventListener("click", () => openTabList.scrollBy({ left: Math.max(120, openTabList.clientWidth * .7), behavior: "smooth" }));
  openTabList.addEventListener("scroll", syncTabOverflow);
  new ResizeObserver(syncTabOverflow).observe(openTabList);
  function closeOpenTab(path) {
    if (openTabs.length <= 1) return;
    const index = openTabs.indexOf(path);
    if (index < 0) return;
    openTabs.splice(index, 1);
    if (selected === path) selected = openTabs[Math.min(index, openTabs.length - 1)];
    renderTabs();
    requestAnimationFrame(syncTabOverflow);
    sendContent();
  }
  openTabList.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-tab]");
    if (close && openTabs.length > 1) {
      closeOpenTab(close.dataset.closeTab);
      return;
    }
    const tab = event.target.closest("[data-open-tab]");
    if (!tab) return;
    selected = tab.dataset.openTab;
    renderTabs();
    requestAnimationFrame(syncTabOverflow);
    sendContent();
  });
  let draggedTab = "";
  openTabList.addEventListener("dragstart", (event) => {
    draggedTab = event.target.closest("[data-tab-path]")?.dataset.tabPath || "";
    if (draggedTab) event.dataTransfer.effectAllowed = "move";
  });
  openTabList.addEventListener("dragover", (event) => { if (draggedTab) event.preventDefault(); });
  openTabList.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target.closest("[data-tab-path]")?.dataset.tabPath;
    if (!draggedTab || !target || draggedTab === target) return;
    const sourceIndex = openTabs.indexOf(draggedTab);
    const targetIndex = openTabs.indexOf(target);
    openTabs.splice(sourceIndex, 1);
    openTabs.splice(targetIndex, 0, draggedTab);
    draggedTab = "";
    renderTabs();
    requestAnimationFrame(syncTabOverflow);
  });
  const fileTrigger = root.querySelector("[data-project-file-trigger]");
  fileTrigger.setAttribute("aria-label", "Browse other files");
  const fileTriggerIcon = fileTrigger.querySelector("svg");
  fileTriggerIcon.setAttribute("viewBox", "0 0 24 24");
  fileTriggerIcon.innerHTML = '<path d="M7 4h12v14H7zM4 7v14h12"/><path d="M10 8h6M10 11h6M10 14h4"/>';
  const fileTriggerArrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  fileTriggerArrow.classList.add("project-editor__file-arrow");
  fileTriggerArrow.setAttribute("viewBox", "0 0 12 12");
  fileTriggerArrow.setAttribute("fill", "none");
  fileTriggerArrow.setAttribute("stroke", "currentColor");
  fileTriggerArrow.setAttribute("stroke-width", "1.5");
  fileTriggerArrow.setAttribute("aria-hidden", "true");
  fileTriggerArrow.innerHTML = '<path d="m2 4 4 4 4-4"/>';
  fileTrigger.append(fileTriggerArrow);
  const fileMenu = root.querySelector("[data-project-file-menu]");
  const fileFilter = root.querySelector("[data-project-file-filter]");
  fileFilter.previousElementSibling?.remove();
  fileFilter.setAttribute("aria-label", "Filter files");
  const fileEmpty = root.querySelector("[data-project-file-empty]");
  function filterProjectFiles() {
    const query = fileFilter.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const option of fileMenu.querySelectorAll('[role="menuitemradio"]')) {
      const row = option.closest(".project-editor__file-option-row");
      row.hidden = Boolean(query && !option.textContent.toLocaleLowerCase().includes(query));
      if (!row.hidden) visible += 1;
    }
    for (const group of fileMenu.querySelectorAll("[data-project-file-available], [data-project-open-files]")) {
      group.hidden = !group.querySelector(".project-editor__file-option-row:not([hidden])");
    }
    fileEmpty.hidden = visible !== 0;
  }
  function closeFileMenu({ focus = false } = {}) {
    fileMenu.hidden = true;
    fileTrigger.setAttribute("aria-expanded", "false");
    if (focus) fileTrigger.focus();
  }
  fileTrigger.addEventListener("click", () => {
    const opening = fileMenu.hidden;
    fileMenu.hidden = !opening;
    fileTrigger.setAttribute("aria-expanded", String(opening));
    if (opening) {
      fileFilter.value = "";
      filterProjectFiles();
      fileFilter.focus();
    }
  });
  fileFilter.addEventListener("input", filterProjectFiles);
  fileMenu.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-menu-tab]");
    if (close) {
      closeOpenTab(close.dataset.closeMenuTab);
      filterProjectFiles();
      return;
    }
    selectProjectFile(event);
    closeFileMenu({ focus: true });
  });
  fileMenu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeFileMenu({ focus: true });
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const options = [...fileMenu.querySelectorAll('[role="menuitemradio"]')].filter((option) => !option.closest(".project-editor__file-option-row").hidden);
    const current = Math.max(0, options.indexOf(document.activeElement));
    const next = event.key === "Home" ? 0
      : event.key === "End" ? options.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!root.querySelector("[data-project-file-picker]").contains(event.target)) closeFileMenu();
  });
  const editorOverflow = root.querySelector("[data-editor-overflow]");
  const editorOverflowTrigger = root.querySelector("[data-editor-overflow-trigger]");
  const editorOverflowMenu = root.querySelector("[data-editor-overflow-menu]");
  function closeEditorOverflow({ focus = false } = {}) {
    editorOverflowMenu.hidden = true;
    editorOverflowTrigger.setAttribute("aria-expanded", "false");
    if (focus) editorOverflowTrigger.focus();
  }
  editorOverflowTrigger.addEventListener("click", () => {
    const opening = editorOverflowMenu.hidden;
    editorOverflowMenu.hidden = !opening;
    editorOverflowTrigger.setAttribute("aria-expanded", String(opening));
    if (opening) editorOverflowMenu.querySelector('[role="menuitem"]')?.focus();
  });
  editorOverflowMenu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeEditorOverflow({ focus: true });
  });
  document.addEventListener("pointerdown", (event) => {
    if (!editorOverflow.contains(event.target)) closeEditorOverflow();
  });
  root.querySelector("[data-save-tab-configuration]").addEventListener("click", () => {
    closeEditorOverflow();
    updateSnapshot({ files: state.files, config: { ...state.config, editorTabs: [...openTabs] } });
    setStatus("Tab configuration saved");
  });
  const archiveInput = root.querySelector("[data-project-archive-file]");
  root.querySelector("[data-project-import]").addEventListener("click", () => { closeEditorOverflow(); archiveInput.click(); });
  root.querySelector("[data-project-export]").addEventListener("click", () => {
    closeEditorOverflow();
    try {
      const bytes = encodeProjectArchive(state);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
      link.download = `${state.config?.template || "project"}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) { setStatus(error.message, "error"); }
  });
  archiveInput.addEventListener("change", async () => {
    try {
      const file = archiveInput.files[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) throw new Error("Archive exceeds 50 MB");
      const imported = normalizeProjectSnapshot(await decodeProjectArchive(await file.arrayBuffer()));
      selected = imported.config.entry && imported.files.some((item) => item.path === imported.config.entry) ? imported.config.entry : imported.files[0].path;
      updateSnapshot(imported, { destructive: true });
      if (template) template.value = imported.config.template || "blank";
      if (container) container.value = imported.config.container || "presentation";
      renderContainerElements(container?.value);
      renderTabs();
      sendContent();
      renderPreview();
      if (["presentation", "single-file-web-app"].includes(imported.config.container) && /<script\b/i.test(imported.files.find((item) => item.path === imported.config.entry)?.content || "")) {
        setStatus("Presentation imported · QuickJS execution is not connected yet", "warning");
      } else setStatus("ZIP imported");
    } catch (error) { setStatus(error.message, "error"); }
    finally { archiveInput.value = ""; }
  });
  const workspace = root.querySelector(".project-editor__workspace");
  const presentButton = root.querySelector("[data-project-present]");
  const presentClose = root.querySelector("[data-project-present-close]");
  const previewSection = root.querySelector(".project-editor__preview");
  const projectContentBlock = root.closest(".content-block");
  function closePresentation() {
    delete root.dataset.presenting;
    document.body.classList.remove("project-presenting");
    previewSection.classList.remove("project-editor__preview--presenting");
    projectContentBlock?.style.removeProperty("animation");
    projectContentBlock?.style.removeProperty("backdrop-filter");
    projectContentBlock?.style.removeProperty("transform");
    presentButton.setAttribute("aria-pressed", "false");
  }
  function openPresentation({ keyboard = false } = {}) {
    root.dataset.presenting = "true";
    document.body.classList.add("project-presenting");
    previewSection.classList.add("project-editor__preview--presenting");
    projectContentBlock?.style.setProperty("animation", "none");
    projectContentBlock?.style.setProperty("backdrop-filter", "none");
    projectContentBlock?.style.setProperty("transform", "none");
    presentButton.setAttribute("aria-pressed", "true");
    presentClose.blur();
    requestAnimationFrame(() => previewController?.focus?.());
  }
  presentButton.addEventListener("click", (event) => openPresentation({ keyboard: event.detail === 0 }));
  presentClose.addEventListener("click", (event) => {
    closePresentation();
    if (event.detail === 0) presentButton.focus();
    else presentButton.blur();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.dataset.presenting === "true") {
      event.preventDefault();
      closePresentation();
      presentButton.focus();
    } else if (event.key === "Escape" && parent !== window) {
      parent.postMessage({ protocol: "resources-project-presentation-v1", type: "escape" }, "*");
    }
  });
  addEventListener("message", (event) => {
    if (event.source !== parent || event.data?.protocol !== "resources-project-presentation-v1" || event.data.type !== "focus") return;
    previewController?.focus?.();
  });
  const splitter = root.querySelector(".project-editor__splitter");
  const projectLayout = root.closest(".project-create__layout");
  const projectClose = projectLayout.querySelector(".project-fields__toolbar .project-close");
  const projectCloseHome = projectClose?.parentElement;
  const projectViewControls = root.querySelector(".project-editor__view-controls");
  function placeProjectClose(detailsVisible) {
    if (!projectClose) return;
    (detailsVisible ? projectCloseHome : projectViewControls).append(projectClose);
  }
  function setSplit(clientX) {
    const rect = workspace.getBoundingClientRect();
    const percent = Math.max(20, Math.min(80, ((clientX - rect.left) / rect.width) * 100));
    root.style.setProperty("--source-width", `${percent}%`);
    splitter.setAttribute("aria-valuenow", String(Math.round(percent)));
  }
  splitter.addEventListener("pointerdown", (event) => { splitter.setPointerCapture(event.pointerId); setSplit(event.clientX); });
  splitter.addEventListener("pointermove", (event) => { if (splitter.hasPointerCapture(event.pointerId)) setSplit(event.clientX); });
  splitter.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const next = Math.max(20, Math.min(80, Number(splitter.getAttribute("aria-valuenow")) + (event.key === "ArrowRight" ? 5 : -5)));
    root.style.setProperty("--source-width", `${next}%`);
    splitter.setAttribute("aria-valuenow", String(next));
  });
  for (const button of root.querySelectorAll("[data-project-view]")) button.addEventListener("click", () => {
    const detailsButton = root.querySelector('[data-project-view="details"]');
    if (button.dataset.projectView === "details") {
      if (narrowWorkspace.matches) {
        const showing = projectLayout.dataset.mobileView === "details";
        if (showing) delete projectLayout.dataset.mobileView;
        else projectLayout.dataset.mobileView = "details";
        detailsButton.setAttribute("aria-pressed", String(!showing));
        placeProjectClose(!showing);
      } else {
        const showing = projectLayout.dataset.detailsVisible !== "false";
        projectLayout.dataset.detailsVisible = String(!showing);
        detailsButton.setAttribute("aria-pressed", String(!showing));
        placeProjectClose(!showing);
      }
    } else {
      delete projectLayout.dataset.mobileView;
      workspace.dataset.view = button.dataset.projectView;
      for (const item of root.querySelectorAll('.project-view-segments [data-project-view]')) item.setAttribute("aria-pressed", item === button ? "true" : "false");
      if (narrowWorkspace.matches) detailsButton.setAttribute("aria-pressed", "false");
    }
    renderStatusState();
    if (button.dataset.projectView === "editor") editorController?.focus();
  });
  const narrowWorkspace = matchMedia("(max-width: 760px)");
  function syncResponsiveWorkspace() {
    const view = narrowWorkspace.matches ? "preview" : "split";
    const selectedButton = root.querySelector(`[data-project-view="${view}"]`);
    const detailsButton = root.querySelector('[data-project-view="details"]');
    if (narrowWorkspace.matches) {
      projectLayout.dataset.detailsVisible = "false";
      delete projectLayout.dataset.mobileView;
      detailsButton.setAttribute("aria-pressed", "false");
      placeProjectClose(false);
    } else {
      delete projectLayout.dataset.mobileView;
      projectLayout.dataset.detailsVisible = "true";
      detailsButton.setAttribute("aria-pressed", "true");
      placeProjectClose(true);
    }
    workspace.dataset.view = view;
    for (const item of root.querySelectorAll('.project-view-segments [data-project-view]')) item.setAttribute("aria-pressed", item === selectedButton ? "true" : "false");
    renderStatusState();
  }
  syncResponsiveWorkspace();
  narrowWorkspace.addEventListener?.("change", syncResponsiveWorkspace);
  // Read-only public projects use the same Details fields without wrapping
  // them in a form. Keep their container description synchronized with the
  // asynchronously loaded project snapshot too.
  const form = root.closest("form") || document.querySelector("[data-project-fields]");
  const template = form?.querySelector("[data-project-template]");
  const container = form?.querySelector("[data-project-container]");
  const containerOutline = form?.querySelector("[data-container-outline]");
  const linkPatterns = form?.querySelector("#project-link-patterns");
  if (template && !template.querySelector('option[value="slides"]')) template.add(new Option("Presentation", "slides", false, false));
  if (container && !container.querySelector('option[value="presentation"]')) container.add(new Option("Presentation", "presentation", false, false));
  if (container && !container.querySelector('option[value="single-file-web-app"]')) container.add(new Option("Single-file HTML/CSS/JS", "single-file-web-app", false, false));
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
  if (container && state.config?.container) {
    container.value = state.config.container;
    renderContainerElements(container.value);
  }
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
    templateOnlyPending = false;
    const previousContainer = state.config?.container;
    updateSnapshot({ files: state.files, config: { ...state.config, container: container.value, containerOptions: { ...state.config.containerOptions, allowedLinkPatterns } } }, { destructive: true });
    if (previousContainer !== container.value) rotateContainerMachines();
    else { sendContent(); renderPreview(); }
  }

  function applyTemplateSnapshot(next, { notice = true, previousSnapshot = state } = {}) {
    const previousContainer = state.config?.container;
    if (container) container.value = next.config.container || "page";
    if (linkPatterns) linkPatterns.value = (next.config.containerOptions?.allowedLinkPatterns || []).join("\n");
    if (template) template.value = next.config.template || "blank";
    growTextarea(linkPatterns);
    renderContainerElements(container.value);
    selected = next.files[0].path;
    openTabs = Array.isArray(next.config?.editorTabs) ? [...next.config.editorTabs] : next.files.map((file) => file.path);
    updateSnapshot(next, { destructive: true });
    templateOnlyPending = true;
    renderTabs();
    if (previousContainer !== next.config.container) rotateContainerMachines("template-container-change");
    else { sendContent(); renderPreview(); }
    if (notice) showTemplateNotice(previousSnapshot);
  }

  template?.addEventListener("change", async () => {
    const next = STARTING_POINTS[template.value];
    if (!next) return;
    if (pending) {
      if (templateOnlyPending) {
        clearTimeout(saveTimer);
        pending = false;
        pendingDestructive = false;
      } else if (draft || memoryOnly) checkpointDraft({ destructive: true });
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
  for (const field of form?.querySelectorAll("[data-project-fields] input:not([type=hidden]), [data-project-fields] textarea:not([data-project-snapshot]), [data-project-fields] select") || []) {
    if (field.matches("[data-project-template], [data-project-container], #project-link-patterns, [data-version-title-input]")) continue;
    field.addEventListener("input", () => { unsavedChangeCount += 1; refreshSubmitLabel(); }, { once: true });
    field.addEventListener("change", () => { if (!unsavedChangeCount) { unsavedChangeCount = 1; refreshSubmitLabel(); } });
  }
  versionButton.addEventListener("click", () => {
    if (!historyPanel.hidden) {
      historyPanel.hidden = true;
      versionButton.setAttribute("aria-expanded", "false");
      return;
    }
    historyPanel.hidden = false;
    versionButton.setAttribute("aria-expanded", "true");
    const buttonRect = versionButton.getBoundingClientRect();
    const panelWidth = historyPanel.getBoundingClientRect().width;
    historyPanel.style.left = `${Math.max(8, Math.min(buttonRect.right - panelWidth, innerWidth - panelWidth - 8))}px`;
    historyPanel.style.top = `${buttonRect.bottom + 6}px`;
    if (readOnly) {
      versionList.replaceChildren(versionChoice(relativeVersionTime(currentUpdatedAt), currentUpdatedAt, { current: true }));
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
  setInterval(() => { if (readOnly) return; if (draft || memoryOnly) checkpointDraft(); else if (pending) save(); }, CHECKPOINT_MS);
  setInterval(() => {
    for (const label of root.closest(".project-create__layout")?.querySelectorAll("[data-version-time]") || []) {
      label.textContent = relativeVersionTime(label.dataset.versionTime);
    }
  }, 30_000);
  if (!readOnly && !draft && !memoryOnly) renderStoredVersions();
  renderTabs();
  mountEditorMachine();
  if (recoveredPendingSnapshot) saveTimer = setTimeout(save, 0);
  addEventListener("pagehide", () => {
    document.removeEventListener("themechange", syncOutputTheme);
    editorGeneration += 1;
    editorController?.destroy();
    disposeProjectMachine();
  }, { once: true });
}

for (const figure of document.querySelectorAll(".blog-example-block")) {
  const button = figure.querySelector(".blog-example-fullscreen");
  const frame = figure.querySelector(".blog-example");
  const error = figure.querySelector(".blog-example-error");
  let presentationReady = false;
  function focusBlogPresentation() {
    if (!presentationReady) return;
    frame?.focus({ preventScroll: true });
    frame?.contentWindow?.postMessage({ protocol: "resources-project-presentation-v1", type: "focus" }, "*");
  }
  if (!button) continue;
  const blogContentBlock = figure.closest(".content-block");
  function closeBlogPresentation({ focus = true } = {}) {
    if (!figure.classList.contains("blog-example-block--fullscreen")) return;
    figure.classList.remove("blog-example-block--fullscreen");
    blogContentBlock?.style.removeProperty("animation");
    blogContentBlock?.style.removeProperty("backdrop-filter");
    blogContentBlock?.style.removeProperty("transform");
    document.body.classList.remove("blog-example-presenting");
    button.textContent = "View full screen ↗";
    button.setAttribute("aria-label", "View full screen");
    if (focus) button.focus();
  }
  button.addEventListener("click", (event) => {
    if (figure.classList.contains("blog-example-block--fullscreen")) {
      closeBlogPresentation({ focus: event.detail === 0 });
      return;
    }
    figure.classList.add("blog-example-block--fullscreen");
    blogContentBlock?.style.setProperty("animation", "none");
    blogContentBlock?.style.setProperty("backdrop-filter", "none");
    blogContentBlock?.style.setProperty("transform", "none");
    document.body.classList.add("blog-example-presenting");
    button.textContent = "×";
    button.setAttribute("aria-label", "Close full screen");
    button.blur();
    requestAnimationFrame(focusBlogPresentation);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !figure.classList.contains("blog-example-block--fullscreen")) return;
    event.preventDefault();
    closeBlogPresentation();
  });
  addEventListener("message", (event) => {
    if (event.source !== frame?.contentWindow || event.data?.protocol !== "resources-project-presentation-v1") return;
    if (event.data.type === "ready") {
      presentationReady = true;
      if (figure.classList.contains("blog-example-block--fullscreen")) focusBlogPresentation();
    }
    if (event.data.type === "escape") closeBlogPresentation();
    if (event.data.type === "status") {
      error.hidden = event.data.status !== "blocked";
      error.textContent = event.data.status === "blocked" ? `Blocked: ${event.data.message}` : "";
    }
  });
  addEventListener("pagehide", () => closeBlogPresentation({ focus: false }), { once: true });
}
