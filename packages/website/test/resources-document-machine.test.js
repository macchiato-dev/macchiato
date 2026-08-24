import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { ServerMachineController } from "../../server-use/src/machine-controller.js";

const generated = new URL("../generated/", import.meta.url);
const module = await WebAssembly.compile(await readFile(new URL(
  "microquickjs-server.wasm", generated)));
const bytecodeDirectory = new URL("resources-document-bytecode/", generated);
const bytecodes = await Promise.all((await readdir(bytecodeDirectory))
  .filter(name => name.endsWith(".bin")).sort()
  .map(name => readFile(new URL(name, bytecodeDirectory))));

test("the document machine renders the session shell", async () => {
  const machine = new ServerMachineController(module, { bytecodes });
  const html = "<!doctype html><body><aside class=\"box userbar edge-status\">old</aside></body>";
  const rendered = await machine.request(["session", JSON.stringify([html,
    { sub: "u1", login: "unsafe<name", name: "Example & Co" }, {},
    { locale: "en", pathname: "/", focused: false, signupsEnabled: true,
      notifications: [], notificationCsrf: "" }, "abc123"])]);

  assert.match(rendered, /@unsafe&lt;name/);
  assert.match(rendered, /Example &amp; Co/);
  assert.match(rendered, /controller\.js\?v=abc123/);
  assert.doesNotMatch(rendered, />old</);
});

test("the document machine renders data-driven page regions", async () => {
  const machine = new ServerMachineController(module, { bytecodes });
  const dashboard = await machine.request(["dashboard", JSON.stringify([{
    projects: [{ name: "Unsafe < title", namespace: "owner", slug: "demo",
      description: "", template: "article", visibility: "public" }],
    organizations: [],
  }, {}])]);
  const publicProjects = await machine.request(["public-projects", JSON.stringify([[
    { name: "Public & safe", namespace: "owner", slug: "demo",
      description: "Example", template: "article" },
  ], {}])]);

  assert.match(dashboard, /Unsafe &lt; title/);
  assert.match(dashboard, /owner\/demo/);
  assert.match(publicProjects, /Public &amp; safe/);
  assert.doesNotMatch(publicProjects, /Public & safe/);
});

test("the document machine applies an application-owned page plan", async () => {
  const machine = new ServerMachineController(module, { bytecodes });
  const html = `<!doctype html><body><aside class="box userbar edge-status">old</aside>
    <p>__RESOURCES_ACCOUNT_CONTENT__</p></body>`;
  const plan = {
    kind: "dashboard", focused: false, notifications: [], publicProjects: null,
    accountContent: { organizations: [], projects: [{ name: "Machine page",
      namespace: "latte", slug: "machine-page", description: "",
      template: "article", visibility: "public" }] },
  };
  const rendered = await machine.request(["page", JSON.stringify([html, plan,
    { sub: "u1", login: "latte", name: "Latte" }, {}, {}, {
      locale: "en", pathname: "/", formErrorCode: "", signupsEnabled: true,
      controllerVersion: "page123", blogExamplesOrigin: "https://examples.test",
    }])]);
  assert.match(rendered, /Machine page/);
  assert.match(rendered, /latte\/machine-page/);
  assert.match(rendered, /controller\.js\?v=page123/);
});
