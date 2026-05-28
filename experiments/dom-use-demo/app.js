import { DomUse } from "@macchiato-dev/dom-use";
import { StyleUse } from "@macchiato-dev/style-use";

const schema = {
  nodes: {
    div: { attrs: ["class", "id", "data-*", "style"], children: ["h2", "div", "p", "strong", "span", "#text"] },
    h2: { attrs: ["class"], children: ["#text"] },
    p: { attrs: ["class"], children: ["strong", "span", "#text"] },
    strong: { attrs: ["class"], children: ["#text"] },
    span: { attrs: ["class"], children: ["#text"] },
  },
  maxDepth: 8,
};

const styleUse = new StyleUse({
  properties: {
    color: /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)$/,
    "border-color": /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)$/,
  },
});

const domUse = new DomUse(schema, styleUse);
const doc = domUse.createDocument();
const state = {
  cards: [
    { text: "Guest nodes are created by dom-use", color: "#2f7d6d" },
    { text: "HTML strings are sanitized before insertion", color: "#8d5a2b" },
  ],
};

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
  const board = doc.createElement("div");
  board.className = "guest-board";

  const title = doc.createElement("h2");
  title.className = "guest-title";
  title.textContent = "Rendered from a schema-bound guest DOM";
  board.appendChild(title);

  const grid = doc.createElement("div");
  grid.className = "guest-grid";

  state.cards.forEach((card, index) => {
    const item = doc.createElement("p");
    item.className = "guest-card";
    item.style.color = card.color;
    item.style.borderColor = card.color;
    domUse.setInnerHTML(
      item,
      `<strong>Card ${index + 1}</strong><span>${escapeHtml(card.text)}</span><script>ignored()</script>`,
    );
    grid.appendChild(item);
  });

  board.appendChild(grid);
  return board;
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

document.getElementById("add-card").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = document.getElementById("card-text").value.trim();
  const color = document.getElementById("card-color").value;
  if (!text) return;
  state.cards.push({ text, color });
  render();
});

document.getElementById("reset").addEventListener("click", () => {
  state.cards.splice(2);
  render();
});

render();
