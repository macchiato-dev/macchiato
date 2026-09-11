import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

test("output errors do not resolve an unrelated pending editor service request", async () => {
  const bundle = await build({
    entryPoints: [new URL("../project-editor-application-services.js", import.meta.url).pathname],
    bundle: true, write: false, format: "iife", globalName: "Services", platform: "neutral",
  });
  const requests = [], events = [];
  const context = {
    __wwcPostMessage: text => requests.push(JSON.parse(text)),
    __resourcesEditorReceive: text => { events.push(JSON.parse(text)); return "null"; },
    __wwcServiceCall: name => JSON.stringify(name === "navigation.type" ? "reload" :
      { value: null, error: "Project recovery resource is unavailable" }),
  };
  runInNewContext(bundle.outputFiles[0].text, context);
  assert.equal(context.Services.navigationType(), "reload");
  assert.throws(() => context.Services.readProjectRecovery("expired"), /Project recovery resource is unavailable/);
  const imported = context.Services.importProjectArchive();
  assert.equal(requests.length, 1);
  const { id } = requests[0];
  context.__resourcesEditorReceive(JSON.stringify({ type: "output-error", id, message: "bad project script" }));
  assert.deepEqual(events, [{ type: "output-error", id, message: "bad project script" }]);
  const snapshot = { files: [{ path: "index.html", content: "<p>Imported</p>" }], config: {} };
  context.__resourcesEditorReceive(JSON.stringify({ id, value: snapshot }));
  assert.deepEqual(JSON.parse(JSON.stringify(await imported)), snapshot);
});
