const activityList = document.querySelector("#activity");
const activityCount = document.querySelector("#activity-count");
const agentActivity = document.querySelector("#agent-activity");
const inputs = [document.querySelector("#chat-input"), document.querySelector("#agent-chat-input")];
let agentWasRunning = false;
let latestAgentMessageId;
let agentAutoScroll = true;
let agentUnseenOutput = false;
let latestTranscriptEntryId;
const savedSidebarWidth = Number(localStorage.getItem("workspace.activityRailWidth"));
if (savedSidebarWidth) document.body.style.setProperty("--activity-rail", `${Math.max(240, Math.min(savedSidebarWidth, 520))}px`);

function time(value) {
  return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function renderActivity(entries) {
  function item(entry) {
    const item = document.createElement("li");
    item.dataset.kind = entry.kind;
    const meta = document.createElement("div");
    const kind = document.createElement("span");
    kind.textContent = entry.kind === "agent-working" ? "agent" : entry.kind;
    const stamp = document.createElement("time");
    stamp.dateTime = entry.time;
    stamp.textContent = time(entry.time);
    meta.append(kind, stamp);
    const text = document.createElement("p");
    text.textContent = entry.text;
    item.append(meta, text);
    return item;
  }
  activityList.replaceChildren(...entries.map(item));
  const transcriptEntries = entries.filter((entry) => ["you", "agent", "agent-working", "tool", "error"].includes(entry.kind));
  const previousScrollTop = agentActivity.scrollTop;
  const newestTranscriptId = transcriptEntries.at(-1)?.id || 0;
  if (latestTranscriptEntryId !== undefined && newestTranscriptId > latestTranscriptEntryId && !agentAutoScroll) agentUnseenOutput = true;
  latestTranscriptEntryId = Math.max(latestTranscriptEntryId || 0, newestTranscriptId);
  agentActivity.replaceChildren(...transcriptEntries.map(item));
  activityCount.textContent = String(entries.length);
  activityList.scrollTop = activityList.scrollHeight;
  if (agentAutoScroll) agentActivity.scrollTop = agentActivity.scrollHeight;
  else agentActivity.scrollTop = previousScrollTop;
  document.querySelector("#agent-jump-latest").hidden = !agentUnseenOutput || agentAutoScroll;
  const completionId = entries.filter((entry) => entry.kind === "agent").at(-1)?.id || 0;
  if (latestAgentMessageId !== undefined && completionId > latestAgentMessageId) reloadPreview();
  latestAgentMessageId = Math.max(latestAgentMessageId || 0, completionId);
}

function reloadPreview() {
  document.querySelector("#app-preview").src = `/agent-app/index.html?at=${Date.now()}`;
}

async function loadActivity() {
  const response = await fetch("/api/activity");
  renderActivity((await response.json()).activity);
}

async function pollActivity() {
  let fallbackTicks = 0;
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (document.visibilityState === "visible") {
      await loadAgent().catch(() => {});
      if (++fallbackTicks % 5 === 0) await loadActivity().catch(() => {});
    }
  }
}

async function watchActivity() {
  let after = 0;
  while (true) {
    try {
      const result = await (await fetch(`/api/activity/wait?after=${after}`)).json();
      renderActivity(result.activity);
      after = result.activity.at(-1)?.id || after;
    } catch { await new Promise((resolve) => setTimeout(resolve, 1000)); }
  }
}

async function loadChanges() {
  const response = await fetch("/api/changes");
  const result = await response.json();
  const list = document.querySelector("#change-list");
  const entries = result.files.length
    ? result.files.map((file) => ({ marker: file.state.trim() || "·", text: file.path }))
    : result.commits.map((commit) => ({ marker: commit.hash, text: commit.message }));
  list.replaceChildren(...entries.map((entry) => {
    const item = document.createElement("li");
    const marker = document.createElement("b");
    marker.textContent = entry.marker;
    const text = document.createElement("span");
    text.textContent = entry.text;
    text.title = entry.text;
    item.append(marker, text);
    return item;
  }));
}

async function loadAgent() {
  const status = await (await fetch("/api/agent/status")).json();
  const state = document.querySelector("#agent-state");
  state.dataset.state = status.error ? "error" : status.running ? "running" : status.authenticated ? "ready" : "login";
  state.textContent = status.error ? "Sign in required" : status.running ? "Working…" : status.authenticated ? "Ready" : "Sign in required";
  document.body.classList.toggle("agent-running", status.running);
  if (agentWasRunning && !status.running) reloadPreview();
  agentWasRunning = status.running;
}

async function submitInstruction(event) {
  event.preventDefault();
  const input = event.currentTarget.querySelector("textarea");
  if (!input.value.trim()) return;
  document.body.classList.add("agent-running");
  const response = await fetch("/api/agent/prompt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: input.value }) });
  if (!response.ok) document.body.classList.remove("agent-running");
  if (response.ok) for (const mirrored of inputs) { mirrored.value = ""; mirrored.style.height = ""; }
  await loadActivity();
  await loadAgent();
}
document.querySelector("#chat-form").addEventListener("submit", submitInstruction);
document.querySelector("#agent-chat-form").addEventListener("submit", submitInstruction);

for (const input of inputs) input.addEventListener("input", (event) => {
  for (const mirrored of inputs) if (mirrored !== event.currentTarget) mirrored.value = event.currentTarget.value;
  event.currentTarget.style.height = "auto";
  event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 280)}px`;
});

function transcriptAtBottom() {
  return agentActivity.scrollHeight - agentActivity.scrollTop - agentActivity.clientHeight < 24;
}
agentActivity.addEventListener("scroll", () => {
  if (transcriptAtBottom()) { agentAutoScroll = true; agentUnseenOutput = false; }
  document.querySelector("#agent-jump-latest").hidden = !agentUnseenOutput || agentAutoScroll;
});
for (const eventName of ["wheel", "pointerdown", "touchstart"]) agentActivity.addEventListener(eventName, () => {
  agentAutoScroll = false;
}, { passive: true });
document.querySelector("#agent-jump-latest").addEventListener("click", () => {
  agentAutoScroll = true;
  agentUnseenOutput = false;
  agentActivity.scrollTo({ top: agentActivity.scrollHeight, behavior: "smooth" });
  document.querySelector("#agent-jump-latest").hidden = true;
});

let sidebarDrag;
document.querySelector("#sidebar-resizer").addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0 || !(event.buttons & 1)) return;
  event.preventDefault();
  const handle = event.currentTarget;
  sidebarDrag?.abort();
  const drag = new AbortController();
  sidebarDrag = drag;
  document.body.classList.add("resizing-sidebar");
  const finish = (finishEvent) => {
    if (finishEvent?.pointerId !== undefined && finishEvent.pointerId !== event.pointerId) return;
    if (sidebarDrag === drag) sidebarDrag = undefined;
    drag.abort();
    document.body.classList.remove("resizing-sidebar");
  };
  const move = (moveEvent) => {
    if (moveEvent.pointerId !== event.pointerId) return;
    if (!(moveEvent.buttons & 1)) return finish(moveEvent);
    const width = Math.max(240, Math.min(moveEvent.clientX, Math.min(520, window.innerWidth * .45)));
    document.body.style.setProperty("--activity-rail", `${width}px`);
    localStorage.setItem("workspace.activityRailWidth", String(Math.round(width)));
  };
  window.addEventListener("pointermove", move, { signal: drag.signal });
  window.addEventListener("pointerup", finish, { signal: drag.signal });
  window.addEventListener("pointercancel", finish, { signal: drag.signal });
  window.addEventListener("blur", finish, { signal: drag.signal });
  move(event);
});

for (const tab of document.querySelectorAll('.topbar [role="tab"]')) {
  tab.addEventListener("click", () => {
    for (const item of document.querySelectorAll('.topbar [role="tab"]')) item.setAttribute("aria-selected", String(item === tab));
    document.querySelector("#content-panel").hidden = tab.dataset.view !== "content";
    document.querySelector("#agent-panel").hidden = tab.dataset.view !== "agent";
    document.querySelector(".tab-cluster").classList.toggle("active", tab.dataset.view === "content");
  });
}

document.querySelector("#refresh").addEventListener("click", () => Promise.all([loadActivity(), loadChanges(), loadAgent()]));
document.querySelector("#reload-preview").addEventListener("click", reloadPreview);
await Promise.all([loadActivity(), loadChanges(), loadAgent()]);
watchActivity();
pollActivity();
