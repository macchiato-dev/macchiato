import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStandardWebAppHandler, defineDeclarativeApp, detectAppConfiguration, renderDeclarativeApp, serveDeclarativeApp } from "../src/index.js";

const declaration = () => defineDeclarativeApp({
  id: "example",
  layout: { title: "Small app", theme: { accent: "#0aa", radius: "0.5rem" } },
  content: { allowedBlocks: ["paragraph"], blocks: [{ type: "paragraph", text: "Safe <text>" }] },
});

test("renders a validated standard layout and escapes content", () => {
  const html = renderDeclarativeApp(declaration());
  assert.match(html, /Safe &lt;text&gt;/);
  assert.match(html, /--app-accent:#0aa/);
});

test("rejects undeclared and unimplemented blocks", () => {
  assert.throws(() => defineDeclarativeApp({ id: "bad", layout: { title: "Bad" }, content: { allowedBlocks: ["paragraph"], blocks: [{ type: "code-editor" }] } }), /not allowed/);
  const app = defineDeclarativeApp({ id: "editor", layout: { title: "Editor" }, content: { allowedBlocks: ["code-editor"], blocks: [{ type: "code-editor" }] } });
  assert.throws(() => renderDeclarativeApp(app), /No renderer was imported/);
});

test("minimal server asks the operating system for a port", async (context) => {
  const running = await serveDeclarativeApp(declaration());
  context.after(() => running.server.close());
  assert.ok(running.port > 0);
  assert.equal((await fetch(running.url)).status, 200);
});

test("standard app preserves validated stylesheets and exposes scripts only as guest source", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "macchiato-standard-app-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const config = { version: 1, format: "standard-web-app", id: "demo", entry: "index.html", schemas: { html: "html.json", css: "css.json" }, runtime: { bootstrap: "runtime.js" } };
  await Promise.all([
    writeFile(join(directory, "macchiato.app.json"), JSON.stringify(config)),
    writeFile(join(directory, "index.html"), '<title>Demo</title><link rel="stylesheet" href="site.css"><main><h1>Hello</h1></main><script src="app.js"></script>'),
    writeFile(join(directory, "site.css"), "h1 { color: teal; }"),
    writeFile(join(directory, "app.js"), "document.body.textContent = 'guest';"),
    writeFile(join(directory, "runtime.js"), "// trusted host bootstrap"),
    writeFile(join(directory, "html.json"), JSON.stringify({ nodes: { main: {}, h1: {} } })),
    writeFile(join(directory, "css.json"), "{}"),
  ]);
  assert.equal((await detectAppConfiguration(directory)).runnable, true);
  const handler = await createStandardWebAppHandler({ directory, config });
  const page = await (await handler(new Request("http://demo.local/"))).text();
  assert.match(page, /href="\/site\.css"/);
  assert.doesNotMatch(page, /src="app\.js"/);
  assert.match(page, /src="\/-\/runtime\.js"/);
  assert.equal(await (await handler(new Request("http://demo.local/site.css"))).text(), "h1 { color: teal; }");
  assert.equal((await (await handler(new Request("http://demo.local/-/app-manifest.json"))).json()).scripts[0].source, "app.js");
});
