// No client library and no privileged browser JavaScript: this module runs
// inside the project's QuickJS guest. Its fetch requests go through the
// controller's explicit origin policy. Drafts remain in session storage.
const field = id => document.getElementById(id);
const examples = {
  get: { method: "GET", url: "https://httpbingo.org/get?hello=Resources", headers: "Accept: application/json", body: "" },
  post: { method: "POST", url: "https://httpbingo.org/post", headers: "Content-Type: application/json\nAccept: application/json", body: '{\n  "message": "Hello from QuickJS",\n  "count": 3\n}' },
  error: { method: "GET", url: "https://httpbingo.org/status/422", headers: "Accept: application/json", body: "" },
};
const names = ["method", "url", "headers", "body"];
let response = null;
let activeTab = "body";
let busy = false;

function draft() {
  return Object.fromEntries(names.map(name => [name, field(name).value]));
}

function save() {
  try { sessionStorage.setItem("request", JSON.stringify(draft())); }
  catch { /* A full or unavailable session store must not prevent a request. */ }
}

function populate(value) {
  for (const name of names) field(name).value = value[name] || "";
  save();
}

function parseHeaders(source) {
  return source.split(/\r?\n/).filter(line => line.trim()).map(line => {
    const colon = line.indexOf(":");
    if (colon < 1) throw new Error(`Expected a header name and colon: ${line}`);
    return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
  });
}

function renderResponse() {
  for (const tab of ["body", "headers"])
    field(`response-${tab}`).setAttribute("aria-pressed", String(activeTab === tab));
  if (!response) return;
  let text = response.body;
  if (activeTab === "headers") text = response.headers.map(([name, value]) => `${name}: ${value}`).join("\n");
  else if (field("pretty").checked && text) {
    try { text = JSON.stringify(JSON.parse(text), null, 2); }
    catch { /* HTML, plain text and malformed JSON remain readable as received. */ }
  }
  field("response").textContent = text || "(empty response)";
}

async function send(event) {
  event.preventDefault();
  if (busy) return;
  busy = true;
  field("send").disabled = true;
  field("send").textContent = "Sending…";
  field("status").textContent = "Waiting for response…";
  field("error").hidden = true;
  const started = performance.now();
  save();
  try {
    const request = draft();
    const options = { method: request.method, headers: parseHeaders(request.headers) };
    if (request.body && request.method !== "GET" && request.method !== "HEAD") options.body = request.body;
    const reply = await fetch(request.url.trim(), options);
    response = { body: await reply.text(), headers: [...reply.headers] };
    const elapsed = Math.round(performance.now() - started);
    field("status").textContent = `${reply.status} · ${elapsed} ms`;
    field("status").className = reply.ok ? "success" : "failure";
    renderResponse();
  } catch (error) {
    field("status").textContent = "Request failed";
    field("status").className = "failure";
    field("error").textContent = error.message;
    field("error").hidden = false;
  } finally {
    busy = false;
    field("send").disabled = false;
    field("send").textContent = "Send request";
  }
}

field("request").addEventListener("submit", send);
field("example").addEventListener("change", () => populate(examples[field("example").value]));
for (const name of names) field(name).addEventListener("input", save);
for (const tab of ["body", "headers"]) field(`response-${tab}`).addEventListener("click", () => {
  activeTab = tab;
  renderResponse();
});
field("pretty").addEventListener("change", renderResponse);
let initial = examples.get;
try {
  const stored = JSON.parse(sessionStorage.getItem("request") || "null");
  if (stored && names.every(name => typeof stored[name] === "string")) initial = stored;
} catch { /* Ignore an obsolete or incomplete draft. */ }
populate(initial);
