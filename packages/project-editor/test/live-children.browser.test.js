import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("fresh child-list reads agree with native DOM before observer delivery", async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "live-children-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const compiler = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs");
  const fixture = new URL("fixtures/live-children.js", import.meta.url).pathname;
  const application = resolve(directory, "application.bin"), environment = resolve(directory, "runtime.bin");
  execFileSync(compiler, ["-m32", "-o", application, fixture]);
  execFileSync(compiler, ["-m32", "-o", environment,
    resolve(examples, "codemirror/generated/microquickjs-runtime.js")]);
  const output = resolve(directory, "probe.wasm");
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(root, "packages/website/generated/project-editor-quickjs-runtime.wasm"), output,
    `runtime.bin=${environment}`, `application.bin=${application}`]);
  const wasm = await readFile(output), source = await readFile(fixture, "utf8");
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const mode of ["native", "microquickjs"]) await t.test(mode, async () => {
    const page = await browser.newPage(), errors = [];
    try {
      page.on("pageerror", error => errors.push(error.message));
      await page.route("http://children.test/**", route => {
        const path = new URL(route.request().url()).pathname;
        return route.fulfill(path === "/machine.js" ? { body: machine, contentType: "text/javascript" }
          : path === "/probe.wasm" ? { body: wasm, contentType: "application/wasm" }
          : { body: '<div id="own"><div id="child-probe"><b>inherited</b>text</div></div>', contentType: "text/html" });
      });
      await page.goto("http://children.test/");
      await page.evaluate(async ({ mode, source }) => {
        window.reports = [];
        if (mode === "native") {
          window.__wwcPostMessage = text => reports.push(JSON.parse(text));
          window.flush = () => {};
          (0, eval)(source);
          window.callGuest = name => window[name]();
        } else {
          const { default: Machine } = await import("/machine.js");
          const module = await WebAssembly.compileStreaming(fetch("/probe.wasm"));
          const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
          window.machine = new Machine(module, document.querySelector("#own"), {
            stamp, onMessage: text => reports.push(JSON.parse(text)),
          });
          await machine.onmsg(0);
          window.callGuest = name => machine.onmsg(new TextEncoder().encode("\u0002" + name + "\0{}"));
        }
      }, { mode, source });
      const reports = await page.evaluate(() => {
        const element = document.getElementById("child-probe");
        callGuest("readChildren");
        // Same task: fresh reads cannot rely on an observer repair. Keep the
        // first node to check that returning references preserves identity.
        element.lastChild.remove();
        const italic = document.createElement("i");
        italic.textContent = "native";
        element.append(italic);
        callGuest("readChildren");
        element.replaceChildren();
        callGuest("readChildren");
        callGuest("writeChildren");
        element.normalize();
        callGuest("readChildren");
        return window.reports;
      });
      assert.deepEqual(reports, [
        { nodes: ["B:inherited", "#text:text"], elements: ["B"], count: 1, first: true, last: true, same: true },
        { nodes: ["B:inherited", "I:native"], elements: ["B", "I"], count: 2, first: true, last: true, same: true },
        { nodes: [], elements: [], count: 0, first: true, last: true, same: false },
        { nodes: ["#text:guest", "#text: text", "SPAN:added"], elements: ["SPAN"], count: 1, first: true, last: true, same: true },
        { nodes: ["#text:guest text", "SPAN:added"], elements: ["SPAN"], count: 1, first: true, last: true, same: true },
      ]);
      assert.deepEqual(errors, []);
      if (mode !== "native") await page.evaluate(() => machine.destroy());
    } finally { await page.close(); }
  });
});
