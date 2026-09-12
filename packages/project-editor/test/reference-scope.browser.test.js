import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("raw node references retain identity without granting unrelated host content", async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "reference-scope-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const runtime = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime");
  const application = resolve(directory, "application.bin"), output = resolve(directory, "scope.wasm");
  execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", application,
    new URL("fixtures/reference-scope.js", import.meta.url).pathname]);
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(root, "packages/website/generated/project-editor-quickjs-runtime.wasm"), output,
    `runtime.bin=${resolve(root, "packages/website/generated/project-editor-runtime.bin")}`,
    `application.bin=${application}`]);
  const wasm = await readFile(output);
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const probes = ["value", "setValue", "attribute", "style", "append", "resizeObserve", "mutationObserve",
    "intersectionRoot", "intersectionObserve",
    "documentChildren", "selectionText", "selectionGeometry", "removeDocumentRoot",
    "parent", "firstChild", "lastChild", "closest", "type", "documentIdentity"].map(operation => ({ operation }));
  probes.push({ operation: "value", grant: "retained" },
    { operation: "value", grant: "during-dispatch" }, { operation: "detachedChild", grant: "retained" });
  for (const probe of probes) {
    const { operation, grant } = probe;
    await t.test(operation + (grant ? " " + grant : ""), async () => {
      const page = await browser.newPage();
      try {
        await page.route("http://references.test/**", route => {
          const path = new URL(route.request().url()).pathname;
          return route.fulfill(path === "/machine.js" ? { body: machine, contentType: "text/javascript" }
            : path === "/scope.wasm" ? { body: wasm, contentType: "application/wasm" }
            : { body: '<div id="own"></div><input id="outside" value="secret-value" data-secret="private-attribute"><p id="private-text">Private text</p>', contentType: "text/html" });
        });
        await page.goto("http://references.test/");
        const result = await page.evaluate(async ({ operation, grant }) => {
          const { default: Machine } = await import("/machine.js");
          const module = await WebAssembly.compileStreaming(fetch("/scope.wasm"));
          const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
          const reports = [], outside = document.getElementById("outside");
          const machine = new Machine(module, operation === "documentIdentity" ? document : document.getElementById("own"), {
            stamp, onMessage: message => reports.push(message),
          });
          let error = null;
          try {
            await machine.onmsg(0);
            const own = document.getElementById("own");
            let target = operation === "removeDocumentRoot" ? document.documentElement : outside;
            if (grant) {
              if (operation === "detachedChild") {
                target = document.createElement("div"); target.append(outside);
              }
              own.append(target);
              if (grant === "during-dispatch") own.addEventListener("mousedown", () => target.remove(),
                { capture: true, once: true });
            }
            target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            if (grant) target.remove();
            const range = document.createRange();
            range.selectNodeContents(document.querySelector("#private-text").firstChild);
            const selection = document.getSelection();
            selection.removeAllRanges(); selection.addRange(range);
            machine.onmsg(new TextEncoder().encode("\u0002probeReference\0" + JSON.stringify({ operation })));
          } catch (caught) { error = String(caught); }
          finally { machine.destroy(); }
          return { reports, error, value: outside.value, moved: outside.parentElement?.id === "own",
            documentIntact: document.documentElement !== null };
        }, probe);
        assert.deepEqual(result.reports.slice(0, 2), ["ready", "captured"], "outside reference is still delivered");
        if (grant) {
          assert.equal(result.error, null);
          assert.deepEqual(JSON.parse(result.reports[2]), { result: "secret-value" });
        } else if (operation === "documentIdentity") {
          assert.equal(result.error, null);
          assert.deepEqual(JSON.parse(result.reports[2]), { result: true },
            "the root's native parent reuses the guest document, not a second wrapper");
        } else if (["parent", "closest", "type"].includes(operation)) {
          assert.equal(result.error, null);
          assert.deepEqual(JSON.parse(result.reports[2]), { result: operation === "type" ? 1 : null });
        } else {
          assert.match(result.error || "", /outside the granted roots|not allowed/);
          assert.equal(result.reports.length, 2, "no private content crossed the boundary");
        }
        assert.equal(result.value, "secret-value");
        assert.equal(result.moved, false, "a reference cannot be moved into the grant to obtain access");
        assert.equal(result.documentIntact, true);
      } finally { await page.close(); }
    });
  }
});
