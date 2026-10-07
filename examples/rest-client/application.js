// The collection, editor and network UI all run inside QuickJS. Only the
// controller can grant a network origin; a project's base URL cannot do that.
import { readProjects, writeProjects } from "./markdown.js";
const field = id => document.getElementById(id);
const pair = (name = "", value = "") => ({ name, value, enabled: true });
const blank = () => ({ name: "New request", method: "GET", url: "/get", headers: [pair("Accept", "application/json")], parameters: [], body: "" });
let nextId = 1;
const id = () => `item-${nextId++}`;
let projects = [{ id: id(), name: "HTTP playground", baseUrl: "https://httpbingo.org", selected: "get", requests: [
  { id: "get", ...blank(), name: "Inspect a request", parameters: [pair("hello", "Resources")] },
  { id: "post", ...blank(), name: "Send JSON", method: "POST", url: "/post", headers: [pair("Content-Type", "application/json"), pair("Accept", "application/json")], body: '{\n  "message": "Hello from QuickJS",\n  "count": 3\n}' },
  { id: "error", ...blank(), name: "Validation error", url: "/status/422" },
] }];
let selectedProject = projects[0].id;
const project = () => projects.find(value => value.id === selectedProject);
const current = () => project().requests.find(value => value.id === project().selected);
const mobile = () => matchMedia("(max-width: 760px)").matches;
// Keep results out of session storage. A slow response always belongs to the
// request that sent it, even if another request/project is now selected.
const results = new Map();

function persist() {
  try { sessionStorage.setItem("desk", JSON.stringify({ projects, selectedProject, nextId })); }
  catch { /* Full/unavailable storage must not prevent editing or sending. */ }
}

function requestUrl(request, baseUrl) {
  const path = request.url.trim();
  const url = /^[a-z][a-z0-9+.-]*:/i.test(path) ? path : `${baseUrl.trim().replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  const parameters = request.parameters.filter(item => item.enabled && item.name)
    .map(item => `${encodeURIComponent(item.name)}=${encodeURIComponent(item.value)}`).join("&");
  return url + (parameters ? (url.includes("?") ? "&" : "?") + parameters : "");
}

function showUrl() {
  field("resolved-url").textContent = requestUrl(current(), project().baseUrl);
}

function save() {
  for (const name of ["name", "method", "url", "body"]) current()[name] = field(name).value;
  persist();
  showUrl();
}

function collection(open, restoreFocus = false) {
  field("desk").className = open ? "collection-open" : "";
  field("open-requests").setAttribute("aria-expanded", String(open));
  if (open) field("close-requests").focus();
  else if (restoreFocus && mobile()) field("open-requests").focus();
}

function renderProjects() {
  field("project").replaceChildren();
  for (const value of projects) {
    const option = document.createElement("option");
    option.setAttribute("value", value.id);
    option.textContent = value.name || "Untitled project";
    field("project").append(option);
  }
  field("project").value = selectedProject;
}

function renderList() {
  field("request-list").replaceChildren();
  for (const request of project().requests) {
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.className = "request-item";
    button.setAttribute("aria-pressed", String(request.id === project().selected));
    button.setAttribute("data-request-id", request.id);
    const method = document.createElement("span");
    method.className = "method-badge";
    method.textContent = request.method;
    const name = document.createElement("span");
    name.className = "request-label";
    name.textContent = request.name || "Untitled request";
    button.append(method, name);
    button.addEventListener("click", () => {
      save();
      project().selected = request.id;
      render();
      persist();
      collection(false, true);
    });
    field("request-list").append(button);
  }
}

function renderPairs(kind) {
  const items = current()[kind], root = field(kind);
  const label = kind === "headers" ? "Header" : "Parameter";
  root.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "pair-row";
    const enabled = document.createElement("input");
    enabled.setAttribute("type", "checkbox");
    enabled.checked = item.enabled;
    enabled.setAttribute("aria-label", `${label} ${index + 1} enabled`);
    enabled.addEventListener("change", () => { item.enabled = enabled.checked; persist(); showUrl(); });
    row.append(enabled);
    for (const key of ["name", "value"]) {
      const input = document.createElement("input");
      input.setAttribute("type", "text");
      input.value = item[key];
      input.setAttribute("placeholder", key === "name" ? "Name" : "Value");
      input.setAttribute("aria-label", `${label} ${index + 1} ${key}`);
      input.setAttribute("spellcheck", "false");
      input.addEventListener("input", () => { item[key] = input.value; persist(); showUrl(); });
      row.append(input);
    }
    const remove = document.createElement("button");
    remove.setAttribute("type", "button");
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${label.toLowerCase()} ${index + 1}`);
    remove.addEventListener("click", () => { items.splice(index, 1); renderPairs(kind); persist(); showUrl(); });
    row.append(remove);
    root.append(row);
  });
}

function renderResponse() {
  const result = results.get(current().id) || {};
  for (const tab of ["body", "headers"])
    field(`response-${tab}`).setAttribute("aria-pressed", String(tab === (result.tab || "body")));
  field("send").disabled = !!result.busy;
  field("send").textContent = result.busy ? "Sending…" : "Send request";
  field("status").textContent = result.busy ? "Waiting for response…" : result.status || "Ready";
  field("status").className = result.tone || "";
  field("error").textContent = result.error || "";
  field("error").hidden = !result.error;
  field("pretty").checked = result.pretty !== false;
  if (!result.response) { field("response").textContent = "Send this request to see its response."; return; }
  let text = result.response.body;
  if (result.tab === "headers") text = result.response.headers.map(([name, value]) => `${name}: ${value}`).join("\n");
  else if (result.pretty !== false && text) {
    try { text = JSON.stringify(JSON.parse(text), null, 2); }
    catch { /* Responses are text, never active HTML. */ }
  }
  field("response").textContent = text || "(empty response)";
}

function render() {
  for (const name of ["name", "method", "url", "body"]) field(name).value = current()[name];
  field("project-name").value = project().name;
  field("base-url").value = project().baseUrl;
  renderProjects();
  renderList();
  renderPairs("headers");
  renderPairs("parameters");
  renderResponse();
  showUrl();
}

function addRequest(duplicate) {
  save();
  const value = duplicate ? { ...current(), name: `${current().name} copy`,
    headers: current().headers.map(item => ({ ...item })), parameters: current().parameters.map(item => ({ ...item })) } : blank();
  const request = { ...value, id: id() };
  project().requests.push(request);
  project().selected = request.id;
  render();
  persist();
  collection(false);
  field("name").focus();
}

async function send(event) {
  event.preventDefault();
  save();
  const request = current(), requestId = request.id;
  const result = results.get(requestId) || {};
  if (result.busy) return;
  Object.assign(result, { busy: true, error: "" });
  results.set(requestId, result);
  renderResponse();
  const started = performance.now();
  try {
    const options = { method: request.method,
      headers: request.headers.filter(item => item.enabled && item.name).map(item => [item.name, item.value]) };
    if (request.body && request.method !== "GET" && request.method !== "HEAD") options.body = request.body;
    const reply = await fetch(requestUrl(request, project().baseUrl), options);
    result.response = { body: await reply.text(), headers: [...reply.headers] };
    result.status = `${reply.status} · ${Math.round(performance.now() - started)} ms`;
    result.tone = reply.ok ? "success" : "failure";
  } catch (error) {
    result.status = "Request failed";
    result.tone = "failure";
    result.error = error.message;
  } finally {
    result.busy = false;
    if (current().id === requestId) renderResponse();
  }
}

field("request").addEventListener("submit", send);
for (const name of ["name", "method", "url", "body"]) field(name).addEventListener("input", () => {
  save();
  if (name === "name" || name === "method") renderList();
});
for (const [element, key] of [["project-name", "name"], ["base-url", "baseUrl"]]) field(element).addEventListener("input", () => {
  project()[key] = field(element).value; persist(); showUrl();
  if (key === "name") renderProjects();
});
field("project").addEventListener("change", () => {
  save(); selectedProject = field("project").value; render(); persist();
});
field("new-project").addEventListener("click", () => {
  save();
  const request = { ...blank(), id: id() };
  const value = { id: id(), name: `Project ${projects.length + 1}`, baseUrl: "https://httpbingo.org", selected: request.id, requests: [request] };
  projects.push(value); selectedProject = value.id; render(); persist(); collection(false); field("project-name").focus();
});
for (const [button, kind] of [["add-header", "headers"], ["add-parameter", "parameters"]]) field(button).addEventListener("click", () => {
  current()[kind].push(pair()); renderPairs(kind); persist();
});
for (const tab of ["body", "headers"]) field(`response-${tab}`).addEventListener("click", () => {
  const result = results.get(current().id) || {};
  result.tab = tab; results.set(current().id, result); renderResponse();
});
field("pretty").addEventListener("change", () => {
  const result = results.get(current().id) || {};
  result.pretty = field("pretty").checked; results.set(current().id, result); renderResponse();
});
field("new-request").addEventListener("click", () => addRequest(false));
field("duplicate-request").addEventListener("click", () => addRequest(true));
field("delete-request").addEventListener("click", () => {
  const requests = project().requests, index = requests.findIndex(value => value.id === current().id);
  results.delete(current().id); requests.splice(index, 1);
  if (!requests.length) requests.push({ ...blank(), id: id() });
  project().selected = requests[Math.min(index, requests.length - 1)].id;
  render(); persist();
});
field("open-requests").addEventListener("click", () => collection(true));
field("close-requests").addEventListener("click", () => collection(false, true));
field("collection-backdrop").addEventListener("click", () => collection(false, true));
let exchangeFocus;
function closeExchange(restore = true) {
  field("exchange").hidden = true;
  if (restore) exchangeFocus?.focus();
  exchangeFocus = null;
}
function exchange(mode) {
  exchangeFocus = document.activeElement;
  field("exchange").hidden = false;
  field("exchange-title").textContent = mode === "import" ? "Import Markdown" : "Export Markdown";
  field("markdown").value = mode === "import" ? "" : writeProjects(mode === "all" ? projects : [project()]);
  field("import-markdown").hidden = mode !== "import";
  field("exchange-error").textContent = "";
  field("markdown").focus();
}
field("export-collection").addEventListener("click", () => { save(); exchange("collection"); });
field("export-projects").addEventListener("click", () => { save(); exchange("all"); });
field("open-import").addEventListener("click", () => exchange("import"));
field("close-exchange").addEventListener("click", () => closeExchange());
field("select-markdown").addEventListener("click", () => { field("markdown").focus(); field("markdown").select(); });
field("import-markdown").addEventListener("click", () => {
  try {
    const imported = readProjects(field("markdown").value);
    // Parse completely before changing the collection. Imports append; they
    // never silently replace an existing project with the same name.
    for (const value of imported) {
      value.id = id();
      for (const request of value.requests) request.id = id();
      value.selected = value.requests[0].id;
    }
    projects.push(...imported); selectedProject = imported[0].id;
    render(); persist(); closeExchange(false); collection(false); field("name").focus();
  } catch (error) { field("exchange-error").textContent = error.message; }
});
document.addEventListener("keydown", event => {
  if (!field("exchange").hidden) {
    if (event.key === "Escape") { event.preventDefault(); closeExchange(); }
    if (event.key === "Tab") {
      const items = [...field("exchange").querySelectorAll("button, textarea")].filter(item => !item.hidden);
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    }
    return;
  }
  if (!mobile() || field("desk").className !== "collection-open") return;
  if (event.key === "Escape") { event.preventDefault(); collection(false, true); }
  if (event.key === "Tab") {
    const items = [...field("collection").querySelectorAll("button, select")];
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

// Validate session data before adopting it. No response bodies or pending
// operations are persisted; only the editable collection survives reloads.
try {
  const stored = JSON.parse(sessionStorage.getItem("desk") || "null");
  const pairs = value => Array.isArray(value) && value.every(item => typeof item.name === "string" && typeof item.value === "string" && typeof item.enabled === "boolean");
  if (stored?.projects?.length && Number.isSafeInteger(stored.nextId) && stored.nextId > 0 &&
      stored.projects.every(value => typeof value.id === "string" && typeof value.name === "string" && typeof value.baseUrl === "string" &&
        value.requests?.length && value.requests.some(request => request.id === value.selected) &&
        value.requests.every(request => ["id", "name", "method", "url", "body"].every(key => typeof request[key] === "string") && pairs(request.headers) && pairs(request.parameters)))) {
    projects = stored.projects; nextId = stored.nextId;
    selectedProject = projects.some(value => value.id === stored.selectedProject) ? stored.selectedProject : projects[0].id;
  }
} catch { /* An incomplete session falls back to the starter collection. */ }
render();
persist();
