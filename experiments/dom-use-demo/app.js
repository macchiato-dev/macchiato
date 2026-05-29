import { DomUse } from "@macchiato-dev/dom-use";
import { StyleUse } from "@macchiato-dev/style-use";

// HTML/DOM schema: host-owned policy for which guest nodes, attributes, and
// parent-child relationships are allowed before rendering.
const domSchema = {
  nodes: {
    div: { attrs: ["class", "id", "data-*", "style"], children: ["h2", "p", "ul", "li", "strong", "span", "#text"] },
    h2: { attrs: ["class"], children: ["#text"] },
    p: { attrs: ["class", "style"], children: ["strong", "span", "#text"] },
    ul: { attrs: ["class"], children: ["li"] },
    li: { attrs: ["class", "data-*", "style"], children: ["strong", "span", "#text"] },
    strong: { attrs: ["class"], children: ["#text"] },
    span: { attrs: ["class"], children: ["#text"] },
  },
  maxDepth: 8,
};

// CSS schema: host-owned policy for inline style properties and accepted value
// shapes. style-use rejects anything outside this allowlist.
const cssSchema = {
  properties: {
    color: /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)$/,
    "border-color": /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)$/,
  },
};

const styleUse = new StyleUse(cssSchema);

const domUse = new DomUse(domSchema, styleUse);
const doc = domUse.createDocument();
const notes = [
  { text: "The guest can create article-shaped content without touching the host DOM directly.", color: "#2f7d6d" },
  { text: "Unsupported nodes and attributes are rejected by the capability before rendering.", color: "#8d5a2b" },
  { text: "Allowed inline styles pass through style-use and are copied by the host renderer.", color: "#4f6f9f" },
];

function renderGuestToHost(guest, realDocument) {
  if (guest.tagName === "#text") return realDocument.createTextNode(guest.textContent);
  const element = realDocument.createElement(guest.tagName);
  for (const [name, value] of Object.entries(guest.attributes || {})) {
    element.setAttribute(name, value);
  }
  for (const [name, value] of Object.entries(guest._style || {})) {
    element.style[name] = value;
  }
  for (const child of guest.children || []) {
    element.appendChild(renderGuestToHost(child, realDocument));
  }
  if (!guest.children?.length && guest.textContent) element.textContent = guest.textContent;
  return element;
}

function buildGuestTree() {
  const article = doc.createElement("div");
  article.className = "guest-article";

  const title = doc.createElement("h2");
  title.className = "guest-title";
  title.textContent = "A schema-bound article";
  article.appendChild(title);

  const intro = doc.createElement("p");
  intro.className = "guest-lede";
  domUse.setInnerHTML(
    intro,
    "This content is not written directly to the page. Guest code builds a <strong>constrained tree</strong>, then the host renders that tree into real DOM.",
  );
  article.appendChild(intro);

  const list = doc.createElement("ul");
  list.className = "guest-list";

  notes.forEach((note, index) => {
    const item = doc.createElement("li");
    item.className = "guest-list-item";
    item.setAttribute("data-index", String(index + 1));
    item.style.color = note.color;
    item.style.borderColor = note.color;
    domUse.setInnerHTML(
      item,
      `<strong>${index + 1}.</strong><span>${escapeHtml(note.text)}</span><script>ignored()</script>`,
    );
    list.appendChild(item);
  });

  article.appendChild(list);

  const outro = doc.createElement("p");
  outro.className = "guest-copy";
  outro.textContent = "This demo is intentionally non-interactive. Event handling belongs in the next QuickJS bridge layer.";
  article.appendChild(outro);

  return article;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runCapabilityChecks() {
  const checks = [];
  const probe = doc.createElement("div");

  try {
    probe.appendChild(doc.createElement("script"));
  } catch (err) {
    checks.push(`blocked element: ${err.message}`);
  }

  try {
    probe.setAttribute("onclick", "alert(1)");
  } catch (err) {
    checks.push(`blocked attribute: ${err.message}`);
  }

  try {
    probe.style.color = "url(javascript:alert(1))";
  } catch (err) {
    checks.push(`blocked style: ${err.message}`);
  }

  return checks;
}

function render() {
  const guestTree = buildGuestTree();
  const host = document.getElementById("host-render");
  host.replaceChildren(renderGuestToHost(guestTree, document));

  document.getElementById("serialized").textContent = domUse.getOuterHTML(guestTree);
  document.getElementById("checks").innerHTML = runCapabilityChecks()
    .map((check) => `<li>${escapeHtml(check)}</li>`)
    .join("");
}

function setRuntimeStatus(message) {
  const status = document.getElementById("runtime-status");
  if (status) {
    status.textContent = message;
    return;
  }
  const next = document.createElement("p");
  next.className = "runtime-status";
  next.id = "runtime-status";
  next.textContent = message;
  document.querySelector(".workspace").insertBefore(next, document.getElementById("host-render"));
}

try {
  render();
} catch (err) {
  setRuntimeStatus(`Runtime error: ${err.message}`);
  throw err;
}
