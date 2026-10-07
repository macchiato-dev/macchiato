import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { renderResourcesDocument } from "../edge/app.js";
import { loadResourcesLocales } from "../i18n.js";
import { buildResourcesSiteRoutesForRuntime } from "../seed.js";

test("editor surface keeps commands, input, themes and languages in its document", {
  timeout: 90_000,
}, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const work = join(root, "../macchiato-work");
  await mkdir(work, { recursive: true });
  const directory = await mkdtemp(join(work, "editor-surface-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const website = join(root, "packages/website");
  // Exercise exactly the shipped runtime and separately loaded programs.
  const wasm = await readFile(join(website, "generated/project-editor-quickjs-runtime.wasm"));
  const controller = (await build({ entryPoints: [join(website, "project-editor-surface.js")],
    bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const devices = (await build({ entryPoints: [join(website, "resources-machine-devices.js")],
    bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const workspace = buildResourcesSiteRoutesForRuntime({ runtime: "document" }).find(route => route.path === "/try");
  assert.ok(workspace.html.includes("<p>__RESOURCES_ACCOUNT_CONTENT__</p>"));
  const workspaceHtml = workspace.html.replace("<p>__RESOURCES_ACCOUNT_CONTENT__</p>",
    () => renderResourcesDocument("try", [loadResourcesLocales().en]));
  const frameController = (await build({ entryPoints: [join(website, "project-editor-frame-controller.js")],
    bundle: true, write: false, format: "esm", platform: "browser",
    plugins: [{ name: "editor-frame-machine", setup(builder) {
      builder.onResolve({ filter: /\/dist\/module\/wasm-web-machine\.js$/ }, () =>
        ({ path: "./machine.js", external: true }));
    } }],
  })).outputFiles[0].text;
  const shell = (await readFile(join(website, "project-editor-frame.html"), "utf8"))
    .replace("/* PROJECT_EDITOR_FRAME_CONTROLLER */", () => frameController);
  const machine = await readFile(join(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const styles = await readFile(join(website, "seed.js"), "utf8");
  const palettes = styles.split("\n").filter(line =>
    /^(?:html\[data-theme="light"\] )?\.project-editor__mount \{ --resources-editor-/.test(line)).join("\n");
  assert.equal(palettes.split("\n").length, 2);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = [], unexpected = [], languageRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === "http://editor-surface.localhost") {
      if (url.pathname === "/surface.js") return route.fulfill({ body: controller, contentType: "text/javascript" });
      if (url.pathname === "/devices.js") return route.fulfill({ body: devices, contentType: "text/javascript" });
      if (url.pathname === "/workspace") return route.fulfill({ contentType: "text/html", body:
        `<!doctype html><html data-theme="light"><meta charset="utf-8"><style>${workspace.css}</style><body>${workspaceHtml}</body></html>` });
      if (url.pathname === "/-/fonts/resourcesco-space-grotesk/space-grotesk-latin.woff2") {
        return route.fulfill({ contentType: "font/woff2", body: await readFile(join(root,
          "examples/resources-website/assets/fonts/space-grotesk-latin.woff2")) });
      }
      if (url.pathname === "/-/fonts/resourcesco-design/instrument-sans-latin.woff2") {
        return route.fulfill({ contentType: "font/woff2", body: await readFile(join(website,
          "assets/fonts/design/instrument-sans-latin.woff2")) });
      }
      if (url.pathname.endsWith("/machine.js")) return route.fulfill({ body: machine, contentType: "text/javascript" });
      if (url.pathname.endsWith("project-editor-frame.html")) return route.fulfill({ body: shell, contentType: "text/html" });
      if (url.pathname.endsWith("project-editor-quickjs-runtime.wasm")) return route.fulfill({ body: wasm, contentType: "application/wasm" });
      if (/\/project-editor-language-[a-z]+\.bin$/.test(url.pathname)) {
        languageRequests.push(url.pathname);
        return route.fulfill({ body: await readFile(join(website, "generated", url.pathname.split("/").at(-1))) });
      }
      if (/\/project-editor-(?:core|surface|workspace)\.bin$/.test(url.pathname)) {
        return route.fulfill({ body: await readFile(join(website, "generated", url.pathname.split("/").at(-1))) });
      }
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<!doctype html>
        <html data-theme="light"><style>${palettes}
        body { margin: 0; background: #e7ecff; }
        .project-editor__mount { width: 585px; height: 700px; font: 14px system-ui; }
        </style><h1>Editor surface</h1><div class="project-editor__mount"></div><p id="outside">Outside grant</p></html>` });
    }
    unexpected.push(url.href);
    return route.abort();
  });
  await page.goto("http://editor-surface.localhost/");
  const editorFrame = process.env.MACCHIATO_TEST_EDITOR_FRAME !== "0";
  const largeSource = process.env.MACCHIATO_TEST_SOURCE_FILE
    ? await readFile(process.env.MACCHIATO_TEST_SOURCE_FILE, "utf8") : null;
  await page.evaluate(async () => {
    const { ProjectEditorSurface } = await import("/surface.js");
    window.changes = [];
    window.failures = [];
    window.surface = new ProjectEditorSurface(document.querySelector(".project-editor__mount"),
      message => changes.push(message), error => failures.push(error.message));
    await surface.start();
    surface.call("SetTheme", { theme: "light" });
    surface.call("SetContent", { content: "function hello() {\n  return 42;\n}\n", language: "javascript" });
  });
  const frame = page.frameLocator("iframe");
  const content = frame.locator(".cm-content");
  await content.waitFor();
  await page.waitForFunction(() => surface.call("Inspect").languageLoaded);
  assert.equal(languageRequests.length, 1, "only the requested JavaScript parser loads");
  assert.equal(await page.locator(".cm-content").count(), 0, "CodeMirror DOM stays out of the project document");
  await content.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("// hellp");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("o");
  await page.keyboard.press("Escape");
  const edited = await page.evaluate(() => surface.call("Inspect").document);
  if (edited !== "function hello() {\n  return 42;\n}\n// hello") t.diagnostic(JSON.stringify({ errors,
    state: await page.evaluate(() => ({ failures, changes, inspected: surface.call("Inspect") })),
    content: await content.textContent() }));
  assert.equal(edited, "function hello() {\n  return 42;\n}\n// hello");
  await page.keyboard.press("Control+z");
  assert.notEqual(await page.evaluate(() => surface.call("Inspect").document), edited);
  await page.keyboard.press("Control+Shift+z");
  assert.equal(await page.evaluate(() => surface.call("Inspect").document), edited);
  await page.keyboard.press("Control+f");
  await frame.locator('.cm-search input[name="search"]').fill("return");
  await page.keyboard.press("Enter");
  assert.equal(await frame.locator('.cm-search input[name="search"]').evaluate(node =>
    getComputedStyle(node).backgroundColor), "rgb(250, 250, 248)");
  await page.screenshot({ path: join(work, "editor-surface-search.png") });
  await page.keyboard.press("Escape");
  for (const theme of ["dark", "light", "dark", "light"]) {
    await page.evaluate(theme => {
      document.documentElement.dataset.theme = theme;
      surface.call("SetTheme", { theme });
    }, theme);
    assert.equal(await content.evaluate(node => getComputedStyle(node.closest(".cm-editor")).backgroundColor),
      theme === "dark" ? "rgb(30, 29, 27)" : "rgb(250, 250, 248)");
    assert.equal(await page.evaluate(() => surface.call("Inspect").document), edited);
  }
  await page.evaluate(() => surface.call("SetContent", {
    content: 'body { color: rebeccapurple; }', language: "css"
  }));
  await page.waitForFunction(() => surface.call("Inspect").languageLoaded);
  assert.equal(languageRequests.length, 2);
  await page.evaluate(() => surface.call("SetContent", { content: "const again = true;", language: "javascript" }));
  assert.equal(languageRequests.length, 2, "returning to a language reuses its bytecode");
  for (const language of ["vue", "svelte"]) {
    await page.evaluate(language => surface.call("SetContent", { content: "<h1>Answer</h1>\n", language }), language);
    await page.waitForFunction(() => failures.length || surface.call("Inspect").languageLoaded);
    assert.deepEqual(await page.evaluate(() => failures), [], `${language} parser loads`);
    await content.locator(".cm-line span").first().waitFor();
  }
  // These bytes belong to the document being edited, never the trusted shell.
  // Cover initial content, native insertion, and a rich clipboard paste.
  const hostileSource = '<script>globalThis.editorEscaped = true; top.location = "https://escape.invalid/";</script>\n' +
    '<img src="https://escape.invalid/image" onerror="globalThis.editorEscaped=true">\n' +
    '<iframe src="https://escape.invalid/frame"></iframe>\n' +
    '<style>@import "https://escape.invalid/style"; body { background: url(https://escape.invalid/bg) }</style>\n' +
    '<meta http-equiv="refresh" content="0;url=https://escape.invalid/refresh">';
  for (const input of ["initial", "typing", "paste"]) {
    await page.evaluate(({ input, source }) => surface.call("SetContent", {
      content: input === "initial" ? source : "", language: "html",
    }), { input, source: hostileSource });
    await page.waitForFunction(() => surface.call("Inspect").languageLoaded);
    await content.click();
    if (input === "typing") await page.keyboard.insertText(hostileSource);
    if (input === "paste") await content.evaluate((node, source) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", source);
      clipboardData.setData("text/html", source);
      node.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
    }, hostileSource);
    assert.equal(await page.evaluate(() => surface.call("Inspect").document), hostileSource);
    await content.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await content.evaluate(() => globalThis.editorEscaped), undefined);
    assert.equal(await frame.locator("#editor script, #editor img, #editor iframe, #editor meta").count(), 0);
    assert.equal(page.url(), "http://editor-surface.localhost/");
    assert.deepEqual(unexpected, [], `${input} cannot load resources from editor source`);
  }
  await assert.rejects(page.evaluate(() => surface.call("Eval", { source: "alert(1)" })), /not granted/);
  assert.equal(await page.locator("#outside").textContent(), "Outside grant");
  assert.deepEqual(await page.evaluate(() => failures), []);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  await assert.rejects(page.evaluate(() => surface.start()), /already been started/);
  assert.equal(await page.locator("iframe").count(), 1, "starting twice cannot orphan an editor");
  await page.evaluate(() => { surface.destroy(); surface.destroy(); });
  assert.equal(await page.locator("iframe").count(), 0);
  await assert.rejects(page.evaluate(() => surface.call("Inspect")), /unavailable/);
  await assert.rejects(page.evaluate(() => surface.start()), /closed/);
  assert.equal(await page.evaluate(async () => {
    const { ProjectEditorSurface } = await import("/surface.js");
    const pending = new ProjectEditorSurface(document.querySelector(".project-editor__mount"),
      () => { throw new Error("Closed editor sent a notification"); }, () => {});
    const starting = pending.start();
    pending.destroy();
    try { await starting; return "unexpected success"; }
    catch (error) { return error.message; }
  }), "Editor frame was closed");
  assert.equal(await page.locator("iframe").count(), 0);
  const shellUrl = "**/project-editor-frame.html";
  const brokenShell = route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Unavailable</title>" });
  await page.route(shellUrl, brokenShell);
  await assert.rejects(page.evaluate(async () => {
    const { ProjectEditorSurface } = await import("/surface.js");
    const failed = new ProjectEditorSurface(document.querySelector(".project-editor__mount"), () => {}, () => {});
    await failed.start();
  }), /shell is unavailable/);
  assert.equal(await page.locator("iframe").count(), 0, "failed startup removes the frame");
  await page.unroute(shellUrl, brokenShell);

  // Exercise the actual project UI/history guest against the new surface,
  // not merely a standalone editor. Output services are stubs in this case;
  // whole-application output lifetimes have their separate integration tests.
  await page.goto("http://editor-surface.localhost/workspace");
  await page.evaluate(async ({ editorFrame, largeSource }) => {
    const { ResourcesEditorDevice, ResourcesStorageDevice, ResourcesProjectResourceDevice } = await import("/devices.js");
    const resources = new ResourcesProjectResourceDevice();
    const storage = new ResourcesStorageDevice(window, resources);
    const snapshot = { files: [
      { path: "index.html", content: "<h1>Surface fixture</h1>" },
      { path: "style.css", content: "h1 { color: rebeccapurple; }" }
    ], config: { entry: "index.html", editorTabs: ["index.html", "style.css"] } };
    if (largeSource !== null) {
      snapshot.files.push({ path: "large.js", content: largeSource });
      snapshot.config.editorTabs.push("large.js");
    }
    document.querySelector("[data-project-snapshot]").value = JSON.stringify(snapshot);
    window.failures = [];
    const request = async name => {
      if (name === "build.compile") return { tree: [], scripts: [], stylesheets: [] };
      if (name === "output.mount") return "fixture-output";
      if (name === "output.load") return null;
      throw new Error("Unexpected test service: " + name);
    };
    const call = (name, payload) => {
      if (name === "editor.workspace.initial") return device.getInitialSnapshot();
      if (name === "appearance.theme") return document.documentElement.dataset.theme;
      if (name === "navigation.type") return "navigate";
      if (name === "storage.request") return storage.request(payload);
      if (name === "session.recovery") return { value: null };
      if (name === "session.writeRecovery") return {};
      if (name === "resource.read") return resources.readChunk(payload.content, payload.offset);
      if (name === "route.replace") return null;
      throw new Error("Unexpected test call: " + name);
    };
    window.device = new ResourcesEditorDevice(document, message => {
      if (message.type === "editor-error") failures.push(message.message);
    }, { destroyOutput() {} }, {}, storage, resources, request, call);
    await device.mount({ editorFrame, deferOutput: true });
  }, { editorFrame, largeSource });
  const workspaceContent = editorFrame
    ? page.frameLocator("iframe.project-editor__code-frame").locator(".cm-content")
    : page.locator(".cm-content");
  await workspaceContent.waitFor();
  assert.equal(await workspaceContent.evaluate(node => getComputedStyle(node).fontSize), "13px",
    "the frame retains the direct editor's default monospace size");
  assert.equal(await page.evaluate(() => device.editor.inspect().document), "<h1>Surface fixture</h1>");
  try { await workspaceContent.click({ timeout: 3000 }); }
  catch (error) {
    await page.screenshot({ path: join(work, "editor-surface-final.png") });
    t.diagnostic(JSON.stringify(await workspaceContent.evaluate(node => ({
      rect: node.getBoundingClientRect().toJSON(),
      frameRect: window.frameElement.getBoundingClientRect().toJSON(),
      parent: window.frameElement.parentElement.getBoundingClientRect().toJSON()
    }))));
    throw error;
  }
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n<p>Edited");
  await page.keyboard.press("End");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => JSON.parse(document.querySelector("[data-project-snapshot]").value)
    .files[0].content.includes("Edited"));
  await page.getByRole("tab", { name: "style.css", exact: true }).click();
  await page.waitForFunction(() => device.editor.inspect().document === "h1 { color: rebeccapurple; }");
  await page.getByRole("tab", { name: "index.html", exact: true }).click();
  await page.waitForFunction(() => device.editor.inspect().document.includes("Edited"));
  await page.waitForFunction(() => device.editor.inspect().languageLoaded);
  await workspaceContent.locator(".cm-line span").first().waitFor();
  await page.screenshot({ path: join(work, `editor-surface-workspace-${editorFrame ? "frame" : "direct"}.png`) });
  if (largeSource !== null) {
    await page.getByRole("tab", { name: "large.js", exact: true }).click();
    await page.waitForFunction(() => device.editor.inspect().languageLoaded);
    await workspaceContent.click();
    await page.keyboard.press("Control+Home");
    await page.keyboard.press("ArrowRight");
    let inserted = "";
    const milliseconds = [];
    for (const key of [..." hellp", "Backspace", "o"]) {
      const started = performance.now();
      await page.keyboard.press(key === " " ? "Space" : key);
      milliseconds.push(Math.round(performance.now() - started));
      inserted = key === "Backspace" ? inserted.slice(0, -1) : inserted + key;
      assert.equal(await page.evaluate(() => device.editor.inspect().document),
        largeSource.slice(0, 1) + inserted + largeSource.slice(1));
      await page.waitForTimeout(100);
    }
    t.diagnostic(JSON.stringify({ editorFrame, characters: largeSource.length, keyMilliseconds: milliseconds }));
  }
  assert.deepEqual(await page.evaluate(() => failures), []);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  await page.evaluate(() => device.destroy());
  assert.equal(await page.locator("iframe").count(), 0);
});
