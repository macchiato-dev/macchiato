import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const bootstrap = await readFile(new URL("../project-editor-bootstrap.js", import.meta.url), "utf8");

for (const path of ["config", "data.json"]) test(`project owner validates ${path} at the appropriate boundary`, async () => {
  const attributes = new Map(), timers = new Map(), requests = [];
  let nextTimer = 0;
  const snapshot = { files: [{ path: "index.html", content: "<h1>App</h1>" },
    { path: "data.json", content: "{}" }], config: { example: "original" } };
  const mount = { replaceChildren() {} }, field = {};
  const root = {
    querySelector: selector => selector === "[data-project-editor-mount]" ? mount
      : selector === "[data-project-snapshot]" ? field : {},
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
  };
  const context = {
    document: { querySelector: () => root, createElement: () => ({}) },
    __resourcesStartProjectUi() {},
    __codeEditorCreateLanguageLoader: () => () => {},
    __codeEditorConfigureLimits() {},
    __wwcServiceCall: name => JSON.stringify(name === "editor.workspace.initial"
      ? { snapshot, outputId: "existing", deferOutput: true, editorSurface: true }
      : { value: null }),
    __wwcPostMessage: text => requests.push(JSON.parse(text)),
    __wwcReportError: message => { throw new Error(message); },
    setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  runInNewContext(bootstrap, context);
  context.__resourcesProjectSelectFile(JSON.stringify({ path }));
  const invalid = '{"value": }';
  context.__resourcesEditorLocalReceive({ type: "change", content: invalid, syntaxErrors: false });
  assert.equal(timers.size, 1);
  const [id, timer] = [...timers][0];
  timers.delete(id);
  assert.equal(timer.delay, path === "config" ? 5000 : 500);
  timer.callback();
  await new Promise(setImmediate);
  if (path === "config") {
    assert.equal(attributes.get("data-output-machine-state"), "blocked");
    assert.deepEqual(requests, [], "invalid configuration is not sent to compilation");
    // A valid subsequent edit recovers without replacing the editor runtime.
    context.__resourcesEditorLocalReceive({ type: "change", content: '{"example":"updated"}', syntaxErrors: false });
    const [retryId, retry] = [...timers][0];
    timers.delete(retryId);
    assert.equal(retry.delay, 500);
    retry.callback();
    await new Promise(setImmediate);
  }
  assert.equal(requests.length, 1);
  assert.equal(requests[0].name, "build.compile");
  assert.equal(attributes.get("data-output-machine-state"), "updating",
    "preparing an edit must not cover existing output with the initial loader");
  assert.deepEqual(requests[0].payload.config, { example: path === "config" ? "updated" : "original" });
  assert.equal(requests[0].payload.files.find(file => file.path === "data.json").content,
    path === "config" ? "{}" : invalid, "data resources reach the real builder unchanged");
});
