import assert from "node:assert/strict";
import test from "node:test";
import { defineDeclarativeApp, renderDeclarativeApp, serveDeclarativeApp } from "../src/index.js";

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
