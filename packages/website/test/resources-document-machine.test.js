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
