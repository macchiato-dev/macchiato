import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DomUse } from "@macchiato-dev/dom-use";
import { parseHTML, serializeHTML } from "@macchiato-dev/html-use";
import { StyleUse } from "@macchiato-dev/style-use";
import { Sandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";

const __dirname = dirname(fileURLToPath(import.meta.url));

let assetsPromise = null;
let sessionPromise = null;

async function readJson(path) {
  return JSON.parse(await readFile(join(__dirname, path), "utf8"));
}

async function assets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      readFile(join(__dirname, "guest.js"), "utf8"),
      readFile(join(__dirname, "style.css"), "utf8"),
      readJson("dom.schema.json"),
      readJson("css.schema.json"),
    ]).then(([guestCode, css, domSchema, cssSchema]) => ({
      guestCode,
      css,
      domSchema,
      cssSchema,
    }));
  }
  return assetsPromise;
}

function validateFragment(html, domSchema, styleUse) {
  const domUse = new DomUse(domSchema, styleUse);
  const doc = domUse.createDocument();
  const fragment = parseHTML(html, {
    createElement: (tag) => doc.createElement(tag),
    createTextNode: (text) => doc.createTextNode(text),
    schema: domSchema,
    styleUse,
  });
  return serializeHTML(fragment);
}

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const loaded = await assets();
      const styleUse = new StyleUse(loaded.cssSchema);
      styleUse.validateStylesheet(loaded.css);

      const sandbox = new Sandbox();
      await sandbox.init();
      const boot = sandbox.run(loaded.guestCode);
      if (!boot.ok) throw new Error(`Todo guest failed to boot: ${boot.error}`);

      return { ...loaded, sandbox, styleUse };
    })();
  }
  return sessionPromise;
}

async function renderGuest() {
  const session = await getSession();
  const result = session.sandbox.run("__macchiatoRender()");
  if (!result.ok) throw new Error(`Todo guest render failed: ${result.error}`);
  return validateFragment(String(result.value), session.domSchema, session.styleUse);
}

async function dispatchGuest(event) {
  const session = await getSession();
  const result = session.sandbox.run(`__macchiatoDispatch(${JSON.stringify(JSON.stringify(event))})`);
  if (!result.ok) throw new Error(`Todo guest event failed: ${result.error}`);
  return validateFragment(String(result.value), session.domSchema, session.styleUse);
}

function page(html, css) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Todos</title>
<style>
${css}
</style>
</head>
<body>
<div id="app">${html}</div>
<script>
const app = document.getElementById("app");
function sourceValue(target) {
  if (target.matches(".add-btn")) return app.querySelector(".new-todo")?.value || "";
  return target.value || "";
}
async function sendEvent(target, type, payload = {}) {
  const node = target.closest("[data-node-id]");
  if (!node) return;
  const response = await fetch("/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nodeId: node.getAttribute("data-node-id"),
      type,
      payload: {
        value: sourceValue(target),
        checked: Boolean(target.checked),
        key: payload.key || ""
      }
    })
  });
  const data = await response.json();
  app.innerHTML = data.html;
}
app.addEventListener("click", (event) => sendEvent(event.target, "click"));
app.addEventListener("change", (event) => sendEvent(event.target, "change"));
app.addEventListener("dblclick", (event) => sendEvent(event.target, "dblclick"));
app.addEventListener("blur", (event) => sendEvent(event.target, "blur"), true);
app.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === "Escape") sendEvent(event.target, "keydown", { key: event.key });
});
</script>
</body>
</html>`;
}

export async function domUseTodosHandler(request) {
  try {
    const url = new URL(request.url);
    const session = await getSession();

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = await renderGuest();
      return new Response(page(html, session.css), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/event" && request.method === "POST") {
      const event = await request.json();
      const html = await dispatchGuest(event);
      return Response.json({ html });
    }

    return new Response("Not found", { status: 404 });
  } catch (err) {
    return new Response(`Sandbox error: ${err.message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

export async function resetDomUseTodosForTest() {
  if (!sessionPromise) return;
  const session = await sessionPromise;
  session.sandbox.dispose();
  sessionPromise = null;
}
