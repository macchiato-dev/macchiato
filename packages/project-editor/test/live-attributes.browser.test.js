import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("attribute reads and classList see native changes before observer delivery", async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "live-attributes-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const compiler = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs");
  const fixture = new URL("fixtures/live-attributes.js", import.meta.url).pathname;
  const application = resolve(directory, "application.bin"), environment = resolve(directory, "runtime.bin");
  execFileSync(compiler, ["-m32", "-o", application, fixture]);
  execFileSync(compiler, ["-m32", "-o", environment,
    resolve(examples, "codemirror/generated/microquickjs-runtime.js")]);
  const output = resolve(directory, "probe.wasm");
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(root, "packages/project-editor/generated/project-editor-quickjs-runtime.wasm"), output,
    `runtime.bin=${environment}`, `application.bin=${application}`]);
  const wasm = await readFile(output), source = await readFile(fixture, "utf8");
  const quickjs = await readFile(resolve(root, "packages/website/generated/project-quickjs-runtime.wasm"));
  const runtimeSource = await readFile(resolve(root, "dev/wasm-web-runtimes/quickjs/context-runtime.js"));
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const mode of ["native", "microquickjs", "quickjs"]) await t.test(mode, async () => {
    const page = await browser.newPage(), errors = [];
    try {
      page.on("pageerror", error => errors.push(error.message));
      await page.route("http://attributes.test/**", route => {
        const path = new URL(route.request().url()).pathname;
        return route.fulfill(path === "/machine.js" ? { body: machine, contentType: "text/javascript" }
          : path === "/context-runtime.js" ? { body: runtimeSource, contentType: "text/javascript" }
          : path === "/quickjs.wasm" ? { body: quickjs, contentType: "application/wasm" }
          : path === "/probe.wasm" ? { body: wasm, contentType: "application/wasm" }
          : { body: '<div id="own"><div id="attribute-probe" class="initial" contenteditable="false"></div></div>', contentType: "text/html" });
      });
      await page.goto("http://attributes.test/");
      await page.evaluate(async ({ mode, source }) => {
        window.reports = [];
        if (mode === "native") {
          window.__wwcPostMessage = text => reports.push(JSON.parse(text));
          window.flush = () => {};
          (0, eval)(source);
          window.callGuest = name => window[name]();
        } else {
          const { default: Machine } = await import("/machine.js");
          if (mode === "quickjs") {
            const { QuickJSRuntime } = await import("/context-runtime.js");
            window.engine = new QuickJSRuntime(await WebAssembly.compileStreaming(fetch("/quickjs.wasm")));
            window.machine = new Machine(engine.createSession(), document.querySelector("#own"), {
              onMessage: text => reports.push(JSON.parse(text)),
            });
            await machine.onmsg(0);
            window.run = source => {
              const text = new TextEncoder().encode(source), bytes = new Uint8Array(text.length + 1);
              bytes[0] = 1; bytes.set(text, 1);
              return machine.onmsg(bytes);
            };
            await run(source);
            window.callGuest = name => run(name + "()");
            return;
          }
          const module = await WebAssembly.compileStreaming(fetch("/probe.wasm"));
          const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
          window.machine = new Machine(module, document.querySelector("#own"), {
            stamp, onMessage: text => reports.push(JSON.parse(text)),
          });
          await machine.onmsg(0);
          window.callGuest = name => machine.onmsg(new TextEncoder().encode("\u0002" + name + "\0{}"));
        }
      }, { mode, source });
      const readings = await page.evaluate(() => {
        const element = document.getElementById("attribute-probe");
        // All calls remain in this task: no observer delivery can repair stale
        // reads between the browser mutation and the guest reading it back.
        callGuest("readAttributes");
        element.setAttribute("data-value", "native");
        element.className = "native-class";
        element.contentEditable = "true";
        callGuest("readAttributes");
        element.removeAttribute("data-value");
        element.className = "native-next";
        element.contentEditable = "false";
        callGuest("readAttributes");
        callGuest("writeAttributes");
        element.className = "host-added";
        callGuest("addGuestClass");
        return { reports, finalClass: element.className };
      });
      assert.deepEqual(readings, { reports: [
        { value: null, present: false, className: "initial", editable: "false" },
        { value: "native", present: true, className: "native-class", editable: "true" },
        { value: null, present: false, className: "native-next", editable: "false" },
        { value: "guest", present: true, className: "guest-class", editable: "true" },
        { value: "guest", present: true, className: "host-added guest-added", editable: "true" },
      ], finalClass: "host-added guest-added" });
      assert.deepEqual(errors, []);
      if (mode !== "native") await page.evaluate(() => { machine.destroy(); window.engine?.destroy(); });
    } finally { await page.close(); }
  });
});
