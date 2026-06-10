import { visibleBuiltinApps } from "./builtin-apps.js";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appHref(app, requestUrl) {
  const url = new URL(requestUrl);
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${app.subdomain}.localhost${port}/`;
}

function renderAppDirectory(request) {
  const rows = visibleBuiltinApps().map((app) => {
    const href = appHref(app, request.url);
    return `<article class="app-row">
      <div>
        <h2><a href="${escapeHtml(href)}">${escapeHtml(app.name)}</a></h2>
        <p>${escapeHtml(app.description)}</p>
      </div>
      <div class="meta">
        <span>${escapeHtml(app.kind)}</span>
        <code>${escapeHtml(app.subdomain)}.localhost</code>
      </div>
    </article>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Macchiato Apps</title>
<style>
  body {
    margin: 0;
    color: #1b1e24;
    background: #f5f7fb;
    font-family: system-ui, sans-serif;
  }
  main {
    width: min(980px, calc(100vw - 40px));
    margin: 48px auto;
  }
  h1 {
    margin: 0 0 24px;
    font-size: 32px;
    line-height: 1.1;
  }
  .app-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 24px;
    align-items: center;
    padding: 18px 0;
    border-top: 1px solid #dce2ec;
  }
  .app-row:last-child {
    border-bottom: 1px solid #dce2ec;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 18px;
  }
  a {
    color: #1638d9;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  p {
    margin: 0;
    color: #586173;
    line-height: 1.5;
  }
  .meta {
    display: grid;
    gap: 6px;
    justify-items: end;
    color: #586173;
    font-size: 13px;
  }
  code {
    color: #2d3442;
    background: #e9edf5;
    border-radius: 6px;
    padding: 4px 7px;
  }
  @media (max-width: 680px) {
    main {
      margin: 28px auto;
    }
    .app-row {
      grid-template-columns: 1fr;
    }
    .meta {
      justify-items: start;
    }
  }
</style>
</head>
<body>
<main>
  <h1>Macchiato Apps</h1>
  ${rows}
</main>
</body>
</html>`;
}

export async function appDirectoryHandler(request) {
  const url = new URL(request.url);
  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    return new Response("Not found", { status: 404 });
  }
  return new Response(renderAppDirectory(request), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
