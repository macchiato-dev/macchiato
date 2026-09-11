import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { ResourcesProjectResourceDevice } from "../resources-machine-devices.js";

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
  assert.throws(() => context.Services.writeProjectRecovery("expired", "{}"), /Project recovery resource is unavailable/);
  assert.throws(() => context.Services.writeProjectRecovery("large", "x".repeat(2 * 1024 * 1024)),
    /Editor service request exceeds its text limit/);
  const imported = context.Services.importProjectArchive();
  assert.equal(requests.length, 1);
  const { id } = requests[0];
  context.__resourcesEditorReceive(JSON.stringify({ type: "output-error", id, message: "bad project script" }));
  assert.deepEqual(events, [{ type: "output-error", id, message: "bad project script" }]);
  const snapshot = { files: [{ path: "index.html", content: "<p>Imported</p>" }], config: {} };
  context.__resourcesEditorReceive(JSON.stringify({ id, value: snapshot }));
  assert.deepEqual(JSON.parse(JSON.stringify(await imported)), snapshot);
});

test("editor reads large resources in bounded messages and caches only the selected resource", async () => {
  const bundle = await build({
    entryPoints: [new URL("../project-editor-application-services.js", import.meta.url).pathname],
    bundle: true, write: false, format: "iife", globalName: "Services", platform: "neutral",
  });
  const resources = new ResourcesProjectResourceDevice();
  const text = "quote: \"; slash: \\; emoji: 😀\n".repeat(80000);
  const snapshot = resources.compactSnapshot({ files: [{ path: "big.txt", content: text }] });
  const reference = snapshot.files[0].content;
  let reads = 0;
  const context = { __wwcServiceCall(name, payload) {
    assert.equal(name, "resource.read");
    const { content, offset } = JSON.parse(payload);
    const response = JSON.stringify(resources.readChunk(content, offset));
    assert.ok(response.length < 2 * 1024 * 1024);
    reads++;
    return response;
  } };
  runInNewContext(bundle.outputFiles[0].text, context);
  const editor = await context.Services.mountResourcesProjectEditor({});
  assert.equal(editor.contentInfo(reference).length, text.length);
  assert.equal(reads, 1, "metadata does not transfer the whole resource");
  assert.equal(editor.readContent(reference, 0), text.slice(0, 64 * 1024));
  assert.equal(reads, 1, "first page reuses the metadata chunk");
  assert.equal(editor.readContent(reference), text);
  assert.equal(reads, Math.ceil(text.length / (64 * 1024)));
  editor.readContent(reference);
  assert.equal(reads, Math.ceil(text.length / (64 * 1024)), "unchanged selected content stays cached");
  assert.equal(editor.readContent("small file"), "small file");
  assert.throws(() => editor.readContent("\0resources-project-resource:missing"), /unavailable/);
});
