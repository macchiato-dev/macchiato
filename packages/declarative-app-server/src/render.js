function escape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

const defaultBlocks = {
  heading: (block) => `<h2>${escape(block.text)}</h2>`,
  paragraph: (block) => `<p>${escape(block.text)}</p>`,
  callout: (block) => `<aside class="app-callout">${escape(block.text)}</aside>`,
};

export function renderDeclarativeApp(app, { blocks = {} } = {}) {
  const renderers = { ...defaultBlocks, ...blocks };
  const body = app.content.blocks.map((block) => {
    const render = renderers[block.type];
    if (!render) throw new TypeError(`No renderer was imported for block: ${block.type}`);
    return render(block, app);
  }).join("\n");
  const theme = {
    background: "#101217", surface: "#181b22", text: "#f1f3f7", muted: "#9aa3b2",
    accent: "#64d8cb", border: "#303642", radius: "0.8rem", contentWidth: "72rem", ...app.layout.theme,
  };
  const variables = Object.entries(theme).map(([name, value]) => `--app-${name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${value}`).join(";");
  return `<!doctype html>
<html lang="en" style="${variables}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(app.layout.title)}</title><link rel="stylesheet" href="/-/app.css"></head>
<body><main class="app-layout"><header>${app.layout.eyebrow ? `<p class="app-eyebrow">${escape(app.layout.eyebrow)}</p>` : ""}<h1>${escape(app.layout.title)}</h1>${app.layout.description ? `<p class="app-description">${escape(app.layout.description)}</p>` : ""}</header><section class="app-content">${body}</section></main></body></html>`;
}

export const standardLayoutCss = `*{box-sizing:border-box}body{margin:0;background:var(--app-background);color:var(--app-text);font:16px/1.55 system-ui,sans-serif}.app-layout{width:min(calc(100% - 2rem),var(--app-content-width));margin:auto;padding:clamp(2rem,6vw,5rem) 0}.app-layout>header{margin-bottom:1.5rem}.app-eyebrow{color:var(--app-accent);font-size:.76rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.app-layout h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.05;margin:.35rem 0}.app-description{color:var(--app-muted);max-width:70ch}.app-content{display:grid;gap:1rem}.app-callout{padding:1rem;border:1px solid var(--app-border);border-radius:var(--app-radius);background:var(--app-surface)}`;
