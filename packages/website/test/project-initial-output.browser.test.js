import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

test("initial project output mounts its compiled application without an empty guest", async t => {
  const bundle = async options => (await build({ ...options, bundle: true,
    write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const devices = await bundle({ entryPoints: [new URL("../resources-machine-devices.js", import.meta.url).pathname] });
  const controller = await bundle({ entryPoints: [new URL("../project-output-frame-controller.js", import.meta.url).pathname],
    external: ["./machine.js"] });
  const machine = await bundle({ entryPoints: [new URL("../../../dev/wasm-web-machine/src/wasm-web-machine.ts", import.meta.url).pathname] });
  const shell = (await readFile(new URL("../project-output-frame.html", import.meta.url), "utf8"))
    .replace("/* PROJECT_OUTPUT_FRAME_CONTROLLER */", () => controller.replace(/<\/script/gi, "<\\/script"));
  const wasm = await readFile(new URL("../generated/project-quickjs-runtime.wasm", import.meta.url));
  const files = [{ path: "index.html", content: `<html lang="es"><style>
    body { margin: 0; min-height: 100vh; background: #c6dcf5; }
    @media (prefers-color-scheme: dark) { body { background: #172c48; } }
    </style><body><button id="count">0</button><p id="state">Starting</p>
    <script>var count = 0;
      document.getElementById('count').addEventListener('click', function () {
        document.getElementById('count').textContent = String(++count);
      });
      fetch('./message.txt').then(function (reply) { return reply.text(); }).then(function (text) {
        document.getElementById('state').textContent = text;
      });
    </script></body></html>` }, { path: "message.txt", content: "Ready from project files" }];
  const compiled = compileProjectFiles(files);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const iframe of [true, false]) for (const theme of ["light", "dark"]) {
    await t.test(`${iframe ? "Document in frame" : "Element"}, ${theme}`, async () => {
      // Forced Playwright media overrides propagate into frames too, bypassing
      // native color-scheme inheritance. Use inheritance for the iframe case.
      const page = await browser.newPage({ colorScheme: iframe ? null : theme });
      const errors = [], unexpected = [];
      let releaseRuntime, runtimeRequested;
      const runtimeGate = new Promise(resolve => { releaseRuntime = resolve; });
      const runtimeArrived = new Promise(resolve => { runtimeRequested = resolve; });
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(() => {
        window.documentReplacements = 0;
        const replaceChild = Node.prototype.replaceChild;
        Node.prototype.replaceChild = function (next, old) {
          if (this.nodeType === 9) documentReplacements++;
          return replaceChild.call(this, next, old);
        };
        window.elementSurfaces = 0;
        new MutationObserver(records => {
          for (const record of records) for (const node of record.addedNodes) {
            if (node.nodeType === 1 && node.classList.contains('project-output-root')) elementSurfaces++;
          }
        }).observe(document, { childList: true, subtree: true });
      });
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === "http://initial-output.test") {
          if (url.pathname.endsWith("runtime.wasm")) {
            runtimeRequested();
            await runtimeGate;
            return route.fulfill({ body: wasm, contentType: "application/wasm" });
          }
          if (url.pathname.endsWith("project-output-frame.html")) return route.fulfill({ body: shell, contentType: "text/html" });
          if (url.pathname.endsWith("machine.js")) return route.fulfill({ body: machine, contentType: "text/javascript" });
          if (url.pathname === "/devices.js") return route.fulfill({ body: devices, contentType: "text/javascript" });
          if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<!doctype html>
            <html style="color-scheme:${theme}"><style>
            body { margin:0; background:${theme === "light" ? "#d8e6f7" : "#192451"}; }
            [data-project-preview], .project-editor__preview-surface, [data-project-output-mount] { height:500px; }
            </style><div class="project-workspace"><section data-project-editor>
            <div data-project-preview></div></section></div></html>` });
        }
        unexpected.push(url.href);
        return route.abort();
      });
      try {
        await page.goto("http://initial-output.test/");
        await page.evaluate(async ({ compiled, files, iframe }) => {
          const { ResourcesEditorDevice, ResourcesOutputDevice, ResourcesProjectResourceDevice } = await import('/devices.js');
          const resources = new ResourcesProjectResourceDevice();
          window.failures = [];
          const deliver = message => failures.push(message);
          const output = new ResourcesOutputDevice(document, deliver, resources);
          window.editor = new ResourcesEditorDevice(document, deliver, output, { compile: async () => compiled });
          editor.initialSnapshot = resources.compactSnapshot({ files, config: { output: { iframe } } });
          window.mountPending = editor.mountInitialOutput(document.querySelector('.project-workspace'));
        }, { compiled, files, iframe });
        await runtimeArrived;
        const target = iframe ? page.frames().find(frame => frame !== page.mainFrame()) : page;
        assert.equal(await target.evaluate(iframe => iframe ? documentReplacements : elementSurfaces, iframe), 0,
          'the loading surface remains intact while the runtime downloads');
        const png = await page.screenshot({ clip: { x: 200, y: 200, width: 1, height: 1 } });
        const pixel = await page.evaluate(async bytes => {
          const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0); image.close();
          return [...context.getImageData(0, 0, 1, 1).data];
        }, [...png]);
        assert.deepEqual(pixel, theme === 'light' ? [216, 230, 247, 255] : [25, 36, 81, 255],
          'the loading canvas paints the selected backdrop, not white or the opposite scheme');
        releaseRuntime();
        await page.evaluate(() => Promise.race([mountPending,
          new Promise((_, reject) => setTimeout(() => reject(Error('Initial mount timed out')), 10000))]));
        assert.deepEqual(await page.evaluate(() => failures), []);
        await target.getByText("Ready from project files", { exact: true }).waitFor();
        assert.equal(await page.locator('[data-project-editor]').getAttribute('data-output-machine-state'), 'ready');
        assert.equal(await target.evaluate(iframe => iframe ? documentReplacements : elementSurfaces, iframe), 1,
          'one initial guest surface, not an empty session followed by the application');
        const body = target.locator(iframe ? 'body' : '.project-output-root > html > body');
        assert.equal(await body.evaluate(node => getComputedStyle(node).backgroundColor),
          theme === 'light' ? 'rgb(198, 220, 245)' : 'rgb(23, 44, 72)');
        assert.equal(await body.evaluate(node => node.parentElement.lang), 'es');
        await target.locator('#count').click();
        assert.equal(await target.locator('#count').textContent(), '1');
        assert.deepEqual(await page.evaluate(() => failures), []);
        for (const next of [theme === 'light' ? 'dark' : 'light', theme]) {
          if (iframe) await page.locator('html').evaluate((node, scheme) => { node.style.colorScheme = scheme; }, next);
          else await page.emulateMedia({ colorScheme: next });
          await target.waitForFunction(({ iframe, color }) => {
            const body = document.querySelector(iframe ? 'body' : '.project-output-root > html > body');
            return getComputedStyle(body).backgroundColor === color;
          }, { iframe, color: next === 'light' ? 'rgb(198, 220, 245)' : 'rgb(23, 44, 72)' });
          assert.equal(await target.locator('#count').textContent(), '1', 'appearance updates preserve the running guest');
        }
        // Initial startup now runs real project code. A failure must dispose
        // the unregistered frame/session so the next edit can mount cleanly.
        await page.evaluate(async ({ compiled, files, iframe }) => {
          editor.destroy();
          editor.initialSnapshot = { files, config: { output: { iframe } } };
          editor.buildDevice.compile = async () => ({ ...compiled, scripts: [{ code: "throw Error('Failed initial startup');" }] });
          await editor.mountInitialOutput(document.querySelector('.project-workspace'));
        }, { compiled, files, iframe });
        assert.equal(await page.locator('[data-project-editor]').getAttribute('data-output-machine-state'), 'failed');
        assert.match(await page.locator('[data-project-editor]').getAttribute('data-output-machine-error'), /Failed initial startup/);
        assert.equal(await page.locator('iframe, .project-output-root').count(), 0, 'failed mounts leave no guest surface');
        assert.equal(await page.evaluate(() => editor.outputDevice.outputs.size), 0);
        await page.evaluate(async compiled => {
          editor.buildDevice.compile = async () => compiled;
          await editor.mountInitialOutput(document.querySelector('.project-workspace'));
        }, compiled);
        const recovered = iframe ? page.frameLocator('iframe') : page;
        await recovered.getByText('Ready from project files', { exact: true }).waitFor();
        await recovered.locator('#count').click();
        assert.equal(await recovered.locator('#count').textContent(), '1');
        assert.deepEqual(errors, []);
        assert.deepEqual(unexpected, []);
      } finally {
        releaseRuntime();
        if (errors.length || unexpected.length) t.diagnostic(JSON.stringify({ errors, unexpected }));
        await page.evaluate(() => editor?.destroy()).catch(() => {});
        await page.close();
      }
    });
  }
});
