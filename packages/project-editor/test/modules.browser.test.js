import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../src/single-file-compiler.js";

const website = new URL("../../website/", import.meta.url);
for (const iframe of [false, true]) test(`project modules stay in QuickJS (${iframe ? "iframe" : "direct"})`, async t => {
  const runtime = await readFile(new URL("generated/project-quickjs-runtime.wasm", website));
  const machine = await build({ entryPoints: [new URL("../../../dev/wasm-web-machine/src/wasm-web-machine.ts", import.meta.url).pathname],
    bundle: true, write: false, format: "esm", platform: "browser" });
  const direct = await build({ entryPoints: [new URL("project-machines.js", website).pathname],
    bundle: true, write: false, format: "esm", platform: "browser" });
  const frameController = await readFile(new URL("generated/project-output-frame-controller.js", website), "utf8");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [], network = [];
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
    if (!iframe) {
      const { createProjectOutputMachine } = await import("/direct.js");
      window.output = await createProjectOutputMachine({ root: document.getElementById("guest"), scripts: [] });
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
  assert.ok(network.every(url => url.startsWith("http://modules.test/")));
  await page.evaluate(() => window.output.destroy());
  assert.deepEqual(errors, []);
});
