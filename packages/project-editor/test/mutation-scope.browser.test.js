import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("document observers and delegated input respect the machine's granted roots", async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "mutation-scope-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const runtime = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime");
  const application = resolve(directory, "application.bin");
  execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", application,
    new URL("fixtures/mutation-scope.js", import.meta.url).pathname]);
  const output = resolve(directory, "scope.wasm");
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(root, "packages/project-editor/generated/project-editor-quickjs-runtime.wasm"), output,
    `runtime.bin=${resolve(root, "packages/project-editor/generated/project-editor-runtime.bin")}`,
    `application.bin=${application}`]);
  const wasm = await readFile(output);
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const mode of ["element", "collection", "portal", "document"]) await t.test(mode, async () => {
    const page = await browser.newPage(), errors = [];
    try {
      page.on("pageerror", error => errors.push(error.message));
      await page.route("http://scope.test/**", route => {
        const path = new URL(route.request().url()).pathname;
        return route.fulfill(path === "/machine.js"
          ? { body: machine, contentType: "text/javascript" }
          : path === "/scope.wasm" ? { body: wasm, contentType: "application/wasm" }
          : { body: '<div id="own" data-case="own-old"></div><div id="portal" data-case="portal-old"></div><div id="outside" data-case="outside-old"></div>', contentType: "text/html" });
      });
      await page.goto("http://scope.test/");
      await page.evaluate(async mode => {
        const { default: Machine } = await import("/machine.js");
        const module = await WebAssembly.compileStreaming(fetch("/scope.wasm"));
        const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
        const own = document.querySelector("#own"), portal = document.querySelector("#portal");
        window.reports = [];
        window.machine = new Machine(module, mode === "document" ? document
          : mode === "collection" ? [own, portal] : own, {
          stamp, portals: mode === "portal" ? [portal] : [],
          onMessage: text => window.reports.push(JSON.parse(text)),
        });
        await window.machine.onmsg(0);
      }, mode);
      assert.deepEqual(await page.evaluate(() => window.reports), [{ ready: true }]);
      await page.evaluate(() => {
        for (const id of ["own", "portal", "outside"])
          document.getElementById(id).setAttribute("data-case", id + "-new");
      });
      await page.waitForFunction(() => window.reports.length > 1);
      assert.deepEqual(await page.evaluate(() => window.reports.slice(1)), [{ values:
        mode === "document" ? ["own-old", "portal-old", "outside-old"]
          : mode === "element" ? ["own-old"] : ["own-old", "portal-old"] }]);
      await page.evaluate(() => {
        // Drain before the native observer callback: synchronous takeRecords
        // must have the same scope as asynchronous record delivery.
        for (const id of ["own", "portal", "outside"])
          document.getElementById(id).setAttribute("data-case", id + "-last");
        const call = new TextEncoder().encode("\u0002takeScopeRecords\0{}");
        window.machine.onmsg(call);
      });
      assert.deepEqual(await page.evaluate(() => window.reports.slice(2)), [{ values:
        mode === "document" ? ["own-new", "portal-new", "outside-new"]
          : mode === "element" ? ["own-new"] : ["own-new", "portal-new"] }]);
      await page.evaluate(() => {
        window.machine.onmsg(new TextEncoder().encode("\u0002startScopeEvents\0{}"));
        window.reports = [];
      });
      for (const id of ["own", "portal", "outside"]) {
        const allowed = mode === "document" || id === "own" ||
          (id === "portal" && mode !== "element");
        const result = await page.evaluate(id => {
          window.reports = [];
          const target = document.getElementById(id);
          const events = [
            new KeyboardEvent("keydown", { key: "secret-" + id, bubbles: true, cancelable: true }),
            new InputEvent("beforeinput", { data: "private-" + id, bubbles: true, cancelable: true }),
            new Event("change", { bubbles: true, cancelable: true }),
            new ClipboardEvent("copy", { bubbles: true, cancelable: true }),
          ];
          return { accepted: events.map(event => target.dispatchEvent(event)), reports: window.reports };
        }, id);
        assert.deepEqual(result, allowed ? {
          accepted: [false, false, false, false], reports: [
            { type: "keydown", value: "secret-" + id },
            { type: "keydown", value: "secret-" + id },
            { type: "beforeinput", value: "private-" + id },
            { type: "change", value: null }, { type: "copy", value: null },
          ],
        } : { accepted: [true, true, true, true], reports: [] },
        id + ": document/window listeners must not read or cancel another subtree's input");
        for (const type of ["dragstart", "dragend", "dragenter", "dragleave", "dragover", "drop"]) {
          const drag = await page.evaluate(({ id, type }) => {
            window.reports = [];
            const data = new DataTransfer();
            data.setData("text/plain", "private-drag-" + id);
            const accepted = document.getElementById(id).dispatchEvent(new DragEvent(type, {
              dataTransfer: data, bubbles: true, cancelable: true,
            }));
            return { accepted, value: data.getData("text/plain"), reports: window.reports };
          }, { id, type });
          assert.deepEqual(drag, allowed ? {
            accepted: false, value: "changed-by-guest",
            reports: [{ type, value: "private-drag-" + id }],
          } : { accepted: true, value: "private-drag-" + id, reports: [] },
          id + ": delegated " + type + " must not expose or modify unrelated transfer data");
        }
      }
      // Outside pointer events still support dismissal and completing drags.
      assert.deepEqual(await page.evaluate(() => {
        window.reports = [];
        for (const type of ["mousedown", "mouseup"])
          document.getElementById("outside").dispatchEvent(new MouseEvent(type, { bubbles: true }));
        return window.reports;
      }), [{ type: "mousedown", value: null }, { type: "mouseup", value: null }]);
      assert.deepEqual(await page.evaluate(() => {
        window.reports = [];
        const root = document.getElementById("own"), input = document.createElement("input");
        root.append(input);
        // Native listeners can detach a browser-created target before document
        // delegation runs. The dispatch path still proves the original grant.
        root.addEventListener("keydown", () => input.remove(), { capture: true, once: true });
        input.dispatchEvent(new KeyboardEvent("keydown", {
          key: "detached-during-dispatch", bubbles: true, cancelable: true,
        }));
        return window.reports;
      }), [
        { type: "keydown", value: "detached-during-dispatch" },
        { type: "keydown", value: "detached-during-dispatch" },
      ]);
      assert.deepEqual(await page.evaluate(() => {
        window.reports = [];
        const root = document.getElementById("own"), target = document.createElement("div");
        root.append(target);
        const data = new DataTransfer();
        data.setData("text/plain", "dropped-into-grant");
        root.addEventListener("drop", () => target.remove(), { capture: true, once: true });
        target.dispatchEvent(new DragEvent("drop", { dataTransfer: data, bubbles: true }));
        return window.reports;
      }), [{ type: "drop", value: "dropped-into-grant" }],
      "a drop retains its grant when a native listener detaches the target");
      assert.deepEqual(errors, []);
      await page.evaluate(() => window.machine.destroy());
    } finally { await page.close(); }
  });
});
