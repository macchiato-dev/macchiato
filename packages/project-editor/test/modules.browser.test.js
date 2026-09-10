import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../src/single-file-compiler.js";

const website = new URL("../../website/", import.meta.url);
for (const iframe of [false, true]) test(`project modules stay in QuickJS (${iframe ? "iframe" : "direct"})`, { timeout: 60_000 }, async t => {
  const runtime = await readFile(new URL("generated/project-quickjs-runtime.wasm", website));
  const machine = await build({ entryPoints: [new URL("../../../dev/wasm-web-machine/src/wasm-web-machine.ts", import.meta.url).pathname],
    bundle: true, write: false, format: "esm", platform: "browser" });
  const direct = await build({ entryPoints: [new URL("project-machines.js", website).pathname],
    bundle: true, write: false, format: "esm", platform: "browser" });
  const frameController = await readFile(new URL("generated/project-output-frame-controller.js", website), "utf8");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.outputInstances = 0;
    WebAssembly.Instance = new Proxy(WebAssembly.Instance, {
      construct(target, args) { outputInstances++; return Reflect.construct(target, args); },
    });
  });
  const errors = [], network = [];
  const heldFetches = [];
  let fetchArrived;
  const nextFetch = () => new Promise(resolve => { fetchArrived = resolve; });
  await page.route("https://resource.test/**", route => { heldFetches.push(route); fetchArrived(); });
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => network.push(request.url()));
  await page.route("http://modules.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(".wasm")) return route.fulfill({ contentType: "application/wasm", body: runtime });
    if (path === "/machine.js") return route.fulfill({ contentType: "text/javascript", body: machine.outputFiles[0].text });
    if (path === "/direct.js") return route.fulfill({ contentType: "text/javascript", body: direct.outputFiles[0].text });
    if (path === "/frame.html") return route.fulfill({ contentType: "text/html",
      body: `<div id="project-output-a"></div><script type="module">${frameController}</script>` });
    return route.fulfill({ contentType: "text/html", body: '<div id="guest"></div>' });
  });
  await page.goto("http://modules.test/");
  await page.evaluate(async iframe => {
    window.outputErrors = [];
    if (!iframe) {
      const { createProjectOutputMachine } = await import("/direct.js");
      window.output = await createProjectOutputMachine({ root: document.getElementById("guest"), scripts: [],
        onError: error => outputErrors.push(error.message),
        options: { fetchResource: async url => {
          if (!url.startsWith("https://resource.test/")) throw new Error("Fetch blocked");
          const reply = await fetch(url);
          return { status: reply.status, body: await reply.text() };
        } } });
      return;
    }
    const frame = document.createElement("iframe");
    frame.sandbox = "allow-scripts allow-same-origin allow-forms";
    frame.src = "/frame.html";
    await new Promise(resolve => { frame.onload = resolve; document.body.append(frame); });
    const channel = new MessageChannel(), pending = new Map();
    const protocol = "resources-project-output-machine-v1";
    let nextId = 1;
    await new Promise((resolve, reject) => {
      channel.port1.onmessage = ({ data }) => {
        if (data.type === "error") { outputErrors.push(data.error); return; }
        if (data.type === "ready") return resolve();
        if (data.type === "failed") return reject(new Error(data.error));
        const operation = pending.get(data.id);
        if (operation) {
          pending.delete(data.id);
          if (data.error) operation.reject(new Error(data.error)); else operation.resolve(data.value);
        }
      };
      frame.contentWindow.postMessage({ protocol, type: "connect", payload: { scripts: [], files: [], storageScope: "module-test" } },
        location.origin, [channel.port2]);
    });
    const request = (name, payload) => new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      channel.port1.postMessage({ protocol, type: "request", id, name, payload });
    });
    window.output = { load: project => request("load", { project }), destroy: () => request("destroy", {}) };
  }, iframe);
  const files = [
    { path: "index.html", content: '<main></main><script type="module" src="./app.js"></script>' },
    { path: "app.js", content: 'import { value, increment } from "./lib/value.js"; increment(); await Promise.resolve(); globalThis.onlyInGuest = true; document.querySelector("main").textContent = String(value);' },
    { path: "lib/value.js", content: "export let value = 41; export function increment() { value++; }" },
  ];
  const load = files => page.evaluate(project => window.output.load(project), { ...compileProjectFiles(files), files });
  await load(files);
  const surface = iframe ? page.frameLocator("iframe").locator("main") : page.locator("#guest main");
  assert.equal(await surface.innerText(), "42");
  assert.equal(await page.evaluate(() => window.onlyInGuest), undefined);
  files[2].content = "export let value = 70; export function increment() { value++; }";
  await load(files);
  assert.equal(await surface.innerText(), "71");
  for (const specifier of ["https://outside.test/leak.js", "../escape.js", "./missing.js"]) {
    files[1].content = `import ${JSON.stringify(specifier)};`;
    await assert.rejects(load(files), /outside the active project|unavailable/);
  }
  files.push({ path: "lib/a.js", content: 'import { b } from "./b.js"; export function a() { return "A"; } export const result = b();' },
    { path: "lib/b.js", content: 'import { a } from "./a.js"; export function b() { return a() + "B"; }' });
  files[1].content = 'import { result } from "./lib/a.js"; const loaded = await import("./lib/value.js"); await new Promise(resolve => setTimeout(resolve, 5)); document.querySelector("main").textContent = result + loaded.value;';
  await load(files);
  assert.equal(await surface.innerText(), "AB70");
  // Classic-script declarations, timers, and CSS belong to one load too.
  const classic = [
    { path: "index.html", content: '<style>main { color: rebeccapurple; }</style><main></main><script src="app.js"></script>' },
    { path: "app.js", content: 'const privateValue = "Fresh"; document.querySelector("main").textContent = privateValue; setTimeout(() => { throw Error("Old timer survived replacement"); }, 60000);' },
  ];
  for (let index = 0; index < 6; index++) await load(classic);
  assert.equal(await surface.innerText(), "Fresh");
  const documentFrame = iframe ? page.frames().find(frame => frame !== page.mainFrame()) : page;
  assert.equal(await documentFrame.evaluate(() => outputInstances), 1, "loads reuse the actual Wasm instance");
  assert.equal(await documentFrame.locator('style').count(), 1, "old application styles are removed");
  classic[1].content = 'document.querySelector("main").textContent = "Failed replacement"; throw Error("New code failed");';
  await assert.rejects(load(classic), /New code failed/);
  assert.equal(await surface.innerText(), "Fresh", "failed preparation keeps the visible application");
  assert.equal(await documentFrame.locator('style').count(), 1);
  const slowFiles = [
    { path: "index.html", content: '<main>Preparing</main><script type="module" src="slow.js"></script>' },
    { path: "slow.js", content: 'await new Promise(resolve => setTimeout(resolve, 60000));' },
  ];
  await page.evaluate(project => {
    window.supersededLoad = window.output.load(project).then(() => "unexpected success", error => error.message);
  }, { ...compileProjectFiles(slowFiles), files: slowFiles });
  await documentFrame.locator('main').filter({ hasText: 'Preparing' }).waitFor({ state: 'attached' });
  assert.equal(await documentFrame.locator('main').filter({ hasText: 'Preparing' }).isVisible(), false);
  assert.equal(await documentFrame.locator('main').filter({ hasText: 'Fresh' }).isVisible(), true);
  classic[1].content = 'const privateValue = "Replaced slow load"; document.querySelector("main").textContent = privateValue;';
  await load(classic);
  assert.match(await page.evaluate(() => supersededLoad), /replaced or destroyed/);
  assert.equal(await surface.innerText(), 'Replaced slow load');
  // A stale fetch must not resume application code against a newer output.
  files[1].content = 'fetch("https://resource.test/old").then(r => r.text()).then(text => document.querySelector("main").textContent = text);';
  const startFetch = () => page.evaluate(project => window.output.load(project), {
    ...compileProjectFiles(files), files, allowedFetchOrigins: ["https://resource.test"],
  });
  const firstFetch = nextFetch();
  await startFetch();
  await firstFetch;
  assert.equal(heldFetches.length, 1);
  files[1].content = 'document.querySelector("main").textContent = "New output";';
  await load(files);
  await heldFetches[0].fulfill({ status: 200, body: "Stale output", contentType: "text/plain" });
  await page.waitForTimeout(100);
  assert.equal(await surface.innerText(), "New output");
  if (iframe) {
    files[1].content = 'sessionStorage.setItem("notes", "kept"); document.querySelector("main").textContent = sessionStorage.getItem("notes");';
    await load(files);
    assert.equal(await surface.innerText(), "kept");
    files[1].content = 'document.querySelector("main").textContent = sessionStorage.getItem("notes");';
    await load(files);
    assert.equal(await surface.innerText(), "kept");
    files[0].content = '<dialog><form method="dialog"><button>Cancel</button></form></dialog><script type="module" src="app.js"></script>';
    files[1].content = 'document.querySelector("dialog").showModal();';
    await load(files);
    await page.frameLocator("iframe").getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(await page.frameLocator("iframe").locator("dialog").evaluate(node => node.open), false);
  }
  // A callback runs after load() has resolved. Its error must cross back to
  // the owning editor even though there is no pending load request to reject.
  for (const [expression, expected] of [
    ['new Error("late output failure")', /late output failure/],
    ['"plain timer failure"', /plain timer failure/],
    ['new Error("Unicode failure " + "😀".repeat(100))', /Unicode failure/],
  ]) {
    const previous = await page.evaluate(() => outputErrors.length);
    files[1].content = `setTimeout(() => { throw ${expression}; }, 10);`;
    await load(files);
    await page.waitForFunction(count => outputErrors.length > count, previous);
    assert.match((await page.evaluate(() => outputErrors))[previous], expected);
  }
  files[0].content = '<main></main><script type="module" src="./app.js"></script>';
  files[1].content = 'fetch("https://resource.test/destroyed").then(r => r.text()).then(() => { throw Error("Destroyed output resumed"); });';
  const lastFetch = nextFetch();
  await startFetch();
  await lastFetch;
  assert.equal(heldFetches.length, 2);
  assert.ok(network.every(url => url.startsWith("http://modules.test/") || url.startsWith("https://resource.test/")));
  await page.evaluate(() => window.output.destroy());
  await heldFetches[1].fulfill({ status: 200, body: "Late response", contentType: "text/plain" });
  await page.waitForTimeout(100);
  assert.equal(errors.length, 3);
  assert.match(errors[0], /late output failure/);
  assert.match(errors[1], /plain timer failure/);
  assert.match(errors[2], /Unicode failure/);
});
