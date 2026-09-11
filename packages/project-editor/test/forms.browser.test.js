import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../src/single-file-compiler.js";

for (const documentMode of [false, true]) test(`dialog forms work without network submission (${documentMode ? "document" : "element"})`, async t => {
  const runtime = await readFile(new URL("../../website/generated/project-quickjs-runtime.wasm", import.meta.url));
  const machine = await build({
    stdin: { resolveDir: new URL(".", import.meta.url).pathname, contents: `
      export { default } from ${JSON.stringify(new URL("../../../dev/wasm-web-machine/src/wasm-web-machine.ts", import.meta.url).pathname)};
      export { QuickJSRuntime } from ${JSON.stringify(new URL("../../../dev/wasm-web-runtimes/quickjs/context-runtime.js", import.meta.url).pathname)};
    ` },
    bundle: true, write: false, format: "esm", platform: "browser",
  });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const requests = [], errors = [];
  page.on("request", request => requests.push(request.url()));
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://forms.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/machine.js"
      ? { contentType: "text/javascript", body: machine.outputFiles[0].text }
      : path === "/runtime.wasm"
      ? { contentType: "application/wasm", body: runtime }
      : { contentType: "text/html", body: '<div id="guest"></div><form id="outside"></form>' });
  });
  await page.goto("http://forms.test/");
  await page.evaluate(async documentMode => {
    const { default: Machine, QuickJSRuntime } = await import("/machine.js");
    window.engine = new QuickJSRuntime(await WebAssembly.compileStreaming(fetch("/runtime.wasm")));
    window.machine = new Machine(engine.createSession(),
      documentMode ? document : document.querySelector("#guest"), {});
    await machine.onmsg(0);
    window.run = async source => {
      const text = new TextEncoder().encode(source), bytes = new Uint8Array(text.length + 1);
      bytes[0] = 1; bytes.set(text, 1);
      await machine.onmsg(bytes);
    };
  }, documentMode);
  // Boolean reflection must reach native controls, not become an expando on
  // the guest wrapper. Disabled controls must not activate when clicked.
  await page.evaluate(() => run(`
    var disabledProbe = document.createElement('button');
    disabledProbe.setAttribute('id', 'disabled-probe');
    disabledProbe.textContent = 'Disabled probe';
    disabledProbe.addEventListener('click', function () { disabledProbe.textContent = 'Activated'; });
    document.body.appendChild(disabledProbe);
    disabledProbe.disabled = true;
  `));
  const disabledProbe = page.locator('#disabled-probe');
  assert.equal(await disabledProbe.isDisabled(), true, 'guest disabled reaches the native button');
  await disabledProbe.click({ force: true });
  assert.equal(await disabledProbe.textContent(), 'Disabled probe');
  await page.evaluate(() => run(`disabledProbe.disabled = false;`));
  assert.equal(await disabledProbe.isDisabled(), false);
  await disabledProbe.click();
  assert.equal(await disabledProbe.textContent(), 'Activated');
  // Reading the property after an attribute/native mutation must not depend
  // on an observer refreshing the guest's attribute bookkeeping.
  await page.evaluate(async () => {
    document.querySelector('#disabled-probe').setAttribute('disabled', 'false');
    await run(`disabledProbe.setAttribute('data-observed', String(disabledProbe.disabled));`);
  });
  assert.equal(await disabledProbe.getAttribute('data-observed'), 'true');
  await page.evaluate(async () => {
    document.querySelector('#disabled-probe').removeAttribute('disabled');
    await run(`disabledProbe.setAttribute('data-observed', String(disabledProbe.disabled));`);
  });
  assert.equal(await disabledProbe.getAttribute('data-observed'), 'false');
  await page.evaluate(async () => {
    // Native changes must be visible synchronously, without an observer.
    const probe = document.getElementById('disabled-probe');
    probe.append(document.createTextNode('text'), document.createElement('span'));
    await run(`disabledProbe.setAttribute('data-count', String(disabledProbe.childElementCount));`);
  });
  assert.equal(await disabledProbe.getAttribute('data-count'), '1');
  await page.evaluate(async () => {
    document.querySelector('#disabled-probe span').remove();
    await run(`disabledProbe.setAttribute('data-count', String(disabledProbe.childElementCount));`);
  });
  assert.equal(await disabledProbe.getAttribute('data-count'), '0');
  await page.evaluate(() => run(`disabledProbe.remove();`));
  const html = '<dialog id="modal"><form method="dialog"><button value="cancel">Cancel</button></form></dialog>';
  const project = compileProjectFiles([{ path: "index.html", content: html }]);
  assert.deepEqual(project.tree[0][4][0][3], [["method", "dialog"]]);
  await page.evaluate(tree => run(`
    function node(tree) {
      if (tree[0] === 0) return document.createTextNode(tree[1]);
      var element = document.createElement(tree[1]);
      tree[3].forEach(function (attribute) { element.setAttribute(attribute[0], attribute[1]); });
      tree[4].forEach(function (child) { element.appendChild(node(child)); });
      return element;
    }
    document.body.appendChild(node(${JSON.stringify(tree[0])}));
    document.getElementById('modal').showModal();
    document.getElementById('modal').setAttribute('data-open-state', String(document.getElementById('modal').open));
  `), project.tree);
  assert.equal(await page.locator('#modal').getAttribute('data-open-state'), 'true');
  await page.getByRole("button", { name: "Cancel" }).click();
  assert.equal(await page.locator("dialog").evaluate(node => node.open), false);
  await page.evaluate(() => run("document.getElementById('modal').setAttribute('data-open-state', String(document.getElementById('modal').open));"));
  assert.equal(await page.locator('#modal').getAttribute('data-open-state'), 'false');
  const before = requests.length;
  await page.evaluate(() => run(`
    var form = document.createElement('form');
    var button = document.createElement('button');
    var input = document.createElement('input');
    input.setAttribute('name', 'secret'); input.value = 'must-not-leave';
    button.textContent = 'Submit'; form.appendChild(input); form.appendChild(button);
    form.addEventListener('submit', function (event) {
      button.textContent = event.defaultPrevented ? 'Cancelled too early' : 'Guest received submit';
    });
    document.body.appendChild(form);
  `));
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Guest received submit" }).waitFor();
  await page.locator('input[name="secret"]').press("Enter");
  // Neither stopping propagation nor stopping other listeners grants native
  // navigation; a delegated document handler must see the original event too.
  await page.evaluate(() => run(`
    document.addEventListener('submit', function (event) {
      button.textContent = event.defaultPrevented ? 'Cancelled too early' : 'Document received submit';
    });
  `));
  await page.getByRole("button", { name: "Guest received submit" }).click();
  await page.getByRole("button", { name: "Document received submit" }).waitFor();
  for (const method of ["stopPropagation", "stopImmediatePropagation"]) {
    await page.evaluate(method => run(`
      form.addEventListener('submit', function (event) {
        event.${method}(); button.textContent = 'Stopped safely';
      });
    `), method);
    await page.locator('input[name="secret"]').press("Enter");
    await page.getByRole("button", { name: "Stopped safely" }).waitFor();
  }
  for (const code of ["form.setAttribute('method', 'post')", "button.setAttribute('formmethod', 'get')",
    "form.setAttribute('action', 'https://outside.test/')", "form.submit()"] ) {
    await assert.rejects(page.evaluate(code => run(code), code));
  }
  // Programmatic submission has exactly the same event and network guard as
  // native activation, even after listeners stop propagation above.
  await page.evaluate(() => run("form.requestSubmit(); form.requestSubmit(button);"));
  // A granted control can be associated with a form outside its subtree by
  // inherited markup. Native activation must not acquire a navigation grant.
  await page.evaluate(() => {
    const outside = document.getElementById("outside");
    outside.action = "/unexpected-associated-submit";
    const associated = document.createElement("button");
    associated.setAttribute("form", "outside");
    associated.textContent = "Associated control";
    document.getElementById("guest").append(associated);
  });
  await page.getByRole("button", { name: "Associated control", exact: true }).click();
  await page.waitForTimeout(100);
  assert.deepEqual(requests.slice(before), [], "native form actions must not issue requests");
  assert.equal(page.url(), "http://forms.test/");
  assert.equal(await page.locator("#outside").evaluate(form =>
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))), !documentMode);
  await page.evaluate(() => { machine.destroy(); engine.destroy(); });
  assert.deepEqual(errors, []);
  // Server-rendered website forms use an explicit same-origin grant, unlike
  // a project output's link-pattern callback.
  await page.evaluate(async () => {
    const { default: Machine, QuickJSRuntime } = await import("/machine.js");
    window.engine = new QuickJSRuntime(await WebAssembly.compileStreaming(fetch("/runtime.wasm")));
    window.machine = new Machine(engine.createSession(), document, { allowNavigate: "self" });
    await machine.onmsg(0);
    document.body.innerHTML = '<form id="save" method="post" action="/accepted"><input id="title" name="title" required><button id="save-button" name="intent" value="publish">Create project</button></form>';
  });
  const beforeValidation = requests.length;
  await page.evaluate(() => run("document.getElementById('save').requestSubmit();"));
  assert.equal(requests.length, beforeValidation, "native required-field validation still prevents submission");
  const submission = page.waitForRequest(request => request.url() === "http://forms.test/accepted");
  await page.evaluate(() => run(`
    document.getElementById('title').value = 'Saved';
    document.getElementById('save').requestSubmit(document.getElementById('save-button'));
  `));
  const request = await submission;
  assert.equal(request.method(), "POST");
  assert.equal(request.postData(), "title=Saved&intent=publish");
  await page.waitForURL("http://forms.test/accepted");
});
