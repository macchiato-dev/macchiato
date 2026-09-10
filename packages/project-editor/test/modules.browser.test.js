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
  // Explicit media emulation bypasses iframe color-scheme inheritance.
  const page = await browser.newPage({ colorScheme: iframe ? null : "light" });
  await page.addInitScript(() => {
    window.outputInstances = 0;
    WebAssembly.Instance = new Proxy(WebAssembly.Instance, {
      construct(target, args) { outputInstances++; return Reflect.construct(target, args); },
    });
    window.outputFetchSignals = [];
    const nativeFetch = window.fetch;
    window.fetch = (url, options) => {
      if (String(url).startsWith('https://resource.test/')) outputFetchSignals.push(options?.signal);
      return nativeFetch(url, options);
    };
  });
  const errors = [], network = [];
  const heldFetches = [];
  let fetchArrived;
  const nextFetch = () => new Promise(resolve => { fetchArrived = resolve; });
  await page.route("https://resource.test/**", route => { heldFetches.push(route); fetchArrived(); });
  // Record attempted exfiltration, but never send test traffic to an external server.
  await page.route("https://outside.test/**", route => route.abort());
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
        options: { fetchResource: async (url, options) => {
          if (!url.startsWith("https://resource.test/")) throw new Error("Fetch blocked");
          const reply = await fetch(url, options);
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
  const load = (files, permissions = {}) => page.evaluate(project => window.output.load(project), {
    ...compileProjectFiles(files), files, ...permissions,
  });
  // The output runtime must have the same bounded native UTF-8 path as the
  // editor. Reuse byte-level golden cases, including the JS fallback, rather
  // than allowing an encoder/decoder pair to conceal matching mistakes.
  const wireCases = await readFile(new URL("fixtures/wire-text.js", import.meta.url), "utf8");
  const wireIntegers = await readFile(new URL("fixtures/wire-uint.js", import.meta.url), "utf8");
  const wireBytes = await readFile(new URL("fixtures/wire-bytes.js", import.meta.url), "utf8");
  await load([
    { path: "index.html", content: '<main></main><script src="wire.js"></script>' },
    { path: "wire.js", content: wireCases + wireIntegers + wireBytes + `
      // A board's worth of embedded tile-sized strings must not fall back to
      // per-character interpreted loops. This is a generous regression guard,
      // not a cross-engine benchmark.
      var tileText = new Array(50001).join("x"), tileBytes = new Uint8Array(50016);
      var began = performance.now();
      for (var tile = 0; tile < 144; tile++) new Writer(tileBytes).text(tileText);
      if (performance.now() - began > 3000) throw Error("Tile text encoding stalled");
      document.querySelector("main").textContent = "UTF-8 checked";` },
  ]);
  const surface = iframe ? page.frameLocator("iframe").locator("main") : page.locator("#guest main");
  assert.equal(await surface.innerText(), "UTF-8 checked");
  await load([
    { path: "index.html", content: '<main>Click this text</main><script src="keys.js"></script>' },
    { path: "keys.js", content: `
      document.addEventListener("keydown", function (event) {
        document.querySelector("main").textContent = "Key: " + event.key;
      });` },
  ]);
  await surface.click();
  await page.keyboard.press("ArrowRight");
  assert.equal(await surface.innerText(), "Key: ArrowRight", "plain output content receives keyboard input after clicking");
  assert.equal(await surface.evaluate(node => node.ownerDocument.activeElement === node.closest(".project-output-root")), true);
  assert.equal(await surface.evaluate(node => node.closest(".project-output-root").tabIndex), -1,
    "the output surface does not add a tab stop");
  await load([
    { path: "index.html", content: `<style>
        main { background: #112233; }
        @media (prefers-color-scheme: light) { main { background: #ddeeff; } }
      </style><main></main><script src="appearance.js"></script>` },
    { path: "appearance.js", content: `
      var media = matchMedia("(prefers-color-scheme: light)"), changes = 0;
      function showAppearance() {
        document.querySelector("main").textContent = (media.matches ? "light" : "dark") + ":" + changes;
      }
      media.addEventListener("change", function () { changes++; showAppearance(); });
      showAppearance();` },
  ]);
  const appearanceInstances = await page.evaluate(() => outputInstances);
  const initialTheme = (await surface.innerText()).split(":")[0];
  const oppositeTheme = initialTheme === "light" ? "dark" : "light";
  let changes = 0;
  for (const theme of [oppositeTheme, initialTheme, oppositeTheme, initialTheme]) {
    if (iframe) await page.locator("iframe").evaluate((frame, theme) => { frame.style.colorScheme = theme; }, theme);
    else await page.emulateMedia({ colorScheme: theme });
    changes++;
    await surface.filter({ hasText: `${theme}:${changes}` }).waitFor();
    assert.equal(await surface.evaluate(node => getComputedStyle(node).backgroundColor),
      theme === "light" ? "rgb(221, 238, 255)" : "rgb(17, 34, 51)");
    assert.equal(await page.evaluate(() => outputInstances), appearanceInstances,
      "appearance changes notify the existing guest instead of restarting the game");
  }
  await load(files);
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
  // Exercise the shipped guest's DOM calls, not just the HTML compiler. These
  // attempts must fail inside both integrations and leave the active output intact.
  const boundaryFiles = [
    { path: "index.html", content: '<main></main><script src="boundary.js"></script>' },
    { path: "boundary.js", content: "" },
  ];
  for (const source of [
    ...["script", "link", "iframe", "object", "embed", "base"].map(tag =>
      `document.body.appendChild(document.createElement(${JSON.stringify(tag)}));`),
    'var image = document.createElement("img"); image.src = "https://outside.test/image.png"; document.body.appendChild(image);',
    'var link = document.createElement("a"); link.setAttribute("href", "https://outside.test/page"); document.body.appendChild(link);',
    'var meta = document.createElement("meta"); meta.setAttribute("http-equiv", "refresh"); document.body.appendChild(meta);',
    'document.querySelector("main").style.setProperty("background-image", "url(https://outside.test/background.png)");',
    'document.querySelector("main").innerHTML = \'<img src="https://outside.test/inner.png">\';',
    'document.querySelector("main").innerHTML = \'<svg><image href="https://outside.test/svg.png" /></svg>\';',
  ]) {
    boundaryFiles[1].content = source;
    await assert.rejects(load(boundaryFiles), undefined, source);
    assert.equal(await surface.innerText(), "AB70", "denied replacements preserve the active application");
  }
  const outputDocument = iframe ? page.frames().find(frame => frame !== page.mainFrame()) : page;
  await outputDocument.evaluate(() => {
    document.body.id = "outside-ancestor";
    const sibling = document.createElement("div");
    sibling.id = "outside-secret";
    sibling.textContent = "Private host content";
    document.body.appendChild(sibling);
  });
  boundaryFiles[1].content = `
    var root = document.body;
    document.querySelector("main").textContent = JSON.stringify([
      document.querySelector("#outside-secret") === null,
      root.parentElement === null,
      root.closest("#outside-ancestor") === null
    ]);
  `;
  await load(boundaryFiles);
  assert.equal(await surface.innerText(), "[true,true,true]", "queries and traversal stay within the output root");
  assert.equal(await outputDocument.locator("#outside-secret").innerText(), "Private host content");
  boundaryFiles[1].content = `
    var main = document.querySelector("main");
    main.style.setProperty("color", "rebeccapurple");
    var link = document.createElement("a");
    link.setAttribute("href", "#local-section");
    link.textContent = "Local section";
    main.appendChild(link);
  `;
  await load(boundaryFiles);
  assert.equal(await surface.locator("a").getAttribute("href"), "#local-section");
  assert.equal(await surface.evaluate(node => getComputedStyle(node).color), "rgb(102, 51, 153)");
  boundaryFiles[1].content = boundaryFiles[1].content.replace("#local-section", "https://outside.test/permitted");
  await load(boundaryFiles, { allowedLinkPatterns: ["outside.test/permitted"] });
  assert.equal(await surface.locator("a").getAttribute("href"), "https://outside.test/permitted");
  await assert.rejects(load(boundaryFiles), /navigation policy/, "a previous session's link grant must not survive replacement");
  assert.equal(network.some(url => url.startsWith("https://outside.test/")), false);
  assert.equal(page.url(), "http://modules.test/");
  boundaryFiles[1].content = `
    var main = document.querySelector("main");
    main.style.setProperty("width", "80px");
    main.style.setProperty("height", "40px");
    main.textContent = "Ready";
    main.addEventListener("pointerdown", function (event) {
      main.setPointerCapture(event.pointerId);
      main.textContent = main.hasPointerCapture(event.pointerId) ? "Captured" : "Missing capture";
    });
    main.addEventListener("pointermove", function (event) {
      if (main.hasPointerCapture(event.pointerId)) main.textContent = "Dragging " + event.clientX + "," + event.clientY;
    });
    main.addEventListener("pointerup", function (event) {
      main.releasePointerCapture(event.pointerId);
      main.textContent = main.hasPointerCapture(event.pointerId) ? "Still captured" : "Released";
    });
  `;
  await load(boundaryFiles);
  await outputDocument.evaluate(() => {
    document.addEventListener("pointermove", event => {
      window.nativePointer = [event.clientX, event.clientY];
    }, true);
  });
  const dragBox = await surface.boundingBox();
  for (let repeat = 0; repeat < 3; repeat++) {
    await page.mouse.move(dragBox.x + 10, dragBox.y + 10);
    await page.mouse.down();
    assert.equal(await surface.innerText(), "Captured");
    await page.mouse.move(dragBox.x + 160.5, dragBox.y + 10.25, { steps: 5 });
    const coordinates = await outputDocument.evaluate(() => window.nativePointer);
    assert.equal(coordinates[0] % 1, 0.5);
    assert.equal(await surface.innerText(), "Dragging " + coordinates.join(","), "capture preserves fractional coordinates beyond the element");
    await page.mouse.up();
    assert.equal(await surface.innerText(), "Released");
  }
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
  classic[1].content = 'const broken = ;';
  await assert.rejects(load(classic), /SyntaxError/);
  assert.equal(await surface.innerText(), "Fresh", "the output runtime rejects malformed JavaScript without replacing the current application");
  classic[1].content = 'const greet = (name = "World") => `Hello ${name}`; document.querySelector("main").textContent = greet();';
  await load(classic);
  assert.equal(await surface.innerText(), "Hello World", "modern JavaScript is validated by the project runtime");
  classic[1].content = 'document.querySelector("main").textContent = "Fresh";';
  await load(classic);
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
  slowFiles[1].content = 'setTimeout(() => { throw Error("Startup callback failed"); }, 5); await new Promise(() => {});';
  await assert.rejects(load(slowFiles), /Startup callback failed/);
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
  assert.equal(await documentFrame.evaluate(() => outputFetchSignals[0].aborted), true);
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
  assert.equal(await documentFrame.evaluate(() => outputFetchSignals.at(-1).aborted), true);
  await heldFetches[1].fulfill({ status: 200, body: "Late response", contentType: "text/plain" });
  await page.waitForTimeout(100);
  assert.equal(errors.length, 4);
  assert.match(errors[0], /Startup callback failed/);
  assert.match(errors[1], /late output failure/);
  assert.match(errors[2], /plain timer failure/);
  assert.match(errors[3], /Unicode failure/);
});
