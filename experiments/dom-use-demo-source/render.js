import { DomUse } from "@macchiato-dev/dom-use";
import { StyleUse } from "@macchiato-dev/style-use";

// HTML/DOM schema: host-owned policy for which guest nodes, attributes, and
// parent-child relationships are allowed before rendering.
const domSchema = {
  nodes: {
    main: { attrs: ["class"], children: ["h1", "h2", "p", "ul"] },
    h1: { attrs: [], children: ["#text"] },
    h2: { attrs: [], children: ["#text"] },
    p: { attrs: [], children: ["strong", "#text"] },
    ul: { attrs: ["class"], children: ["li"] },
    li: { attrs: [], children: ["strong", "#text"] },
    strong: { attrs: [], children: ["#text"] },
  },
  maxDepth: 8,
};

// CSS schema: host-owned policy for inline style properties and accepted value
// shapes. style-use rejects anything outside this allowlist.
const cssSchema = {
  properties: {
    color: /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)$/,
    background: /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)$/,
    margin: /^\d+(\.\d+)?(rem|px)$/,
  },
};

const styleUse = new StyleUse(cssSchema);
const domUse = new DomUse(domSchema, styleUse);
const doc = domUse.createDocument();

const notes = [
  ["Monday-Friday:", "9:00 AM to 7:00 PM"],
  ["Saturday:", "10:00 AM to 5:00 PM"],
  ["Sunday:", "12:00 PM to 4:00 PM"],
];

function buildGuestTree() {
  const article = doc.createElement("main");
  article.className = "page";

  const title = doc.createElement("h1");
  title.textContent = "Neighborhood Library";
  article.appendChild(title);

  const intro = doc.createElement("p");
  intro.textContent = "A quiet place for reading, research, community classes, and after-school study.";
  article.appendChild(intro);

  const hours = doc.createElement("h2");
  hours.textContent = "Hours";
  article.appendChild(hours);

  const list = doc.createElement("ul");

  notes.forEach(([label, text]) => {
    const item = doc.createElement("li");
    domUse.setInnerHTML(
      item,
      `<strong>${escapeHtml(label)}</strong> ${escapeHtml(text)}<script>ignored()</script>`,
    );
    list.appendChild(item);
  });

  article.appendChild(list);

  const services = doc.createElement("h2");
  services.textContent = "Services";
  article.appendChild(services);

  const serviceList = doc.createElement("ul");
  [
    ["Computers:", "public workstations and printing"],
    ["Events:", "story time, workshops, and book groups"],
    ["Help desk:", "research support and account questions"],
  ].forEach(([label, text]) => {
    const item = doc.createElement("li");
    domUse.setInnerHTML(item, `<strong>${escapeHtml(label)}</strong> ${escapeHtml(text)}`);
    serviceList.appendChild(item);
  });
  article.appendChild(serviceList);

  return article;
}

function runCapabilityChecks() {
  const checks = [];
  const probe = doc.createElement("main");

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const serialized = domUse.getOuterHTML(buildGuestTree());
console.log(serialized);
for (const check of runCapabilityChecks()) console.log(check);
