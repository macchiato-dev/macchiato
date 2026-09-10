import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("inherited active markup cannot become raw guest CSS or executable content", async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "inherited-markup-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const runtime = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime");
  const application = resolve(directory, "application.bin"), output = resolve(directory, "probe.wasm");
  execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", application,
    new URL("fixtures/inherited-markup.js", import.meta.url).pathname]);
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(root, "packages/website/generated/project-editor-quickjs-runtime.wasm"), output,
    `runtime.bin=${resolve(root, "packages/website/generated/project-editor-runtime.bin")}`,
    `application.bin=${application}`]);
  const wasm = await readFile(output);
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const cases = ["text", "childText", "childRemove", "moveChild", "innerHTML",
    "appendText", "replaceText", "clone", "move", "read", "remove"]
    .map(operation => ({ operation, tag: "style" }));
  for (const operation of ["type", "clone", "move"]) cases.push({ operation, tag: "script" });
  for (const operation of ["clone", "move"]) cases.push({ operation, tag: "wrapper" });
  cases.push({ operation: "clone", tag: "inert" });
  cases.push({ operation: "nestedImage", tag: "inert" }, { operation: "nestedScript", tag: "inert" });
  cases.push({ operation: "resolvedImage", tag: "template" });
  const attributes = [
    ["button", "form", "outside", false], ["button", "form", "", true],
    ["form", "method", "post", false], ["form", "method", "dialog", true],
    ["div", "name", "field", false], ["input", "name", "bad field", false],
    ["input", "name", "field", true], ["div", "content", "data", false],
    ["div", "tabindex", "99", false], ["div", "tabindex", "-1", true],
    ["input", "placeholder", "x".repeat(513), false],
    ["input", "value", "x".repeat(2049), false],
    ["li", "value", "131", true], ["li", "value", "-1", true],
    ["li", "value", "2147483648", false], ["li", "value", "invalid", false],
    ["div", "data-note", "x".repeat(2049), false],
    ["div", "contenteditable", "invalid", false],
    ["div", "draggable", "true", true], ["div", "draggable", "invalid", false],
  ];
  for (const path of ["dom", "html", "nested"]) {
    for (const [element, name, value, allowed] of attributes) cases.push({
      operation: "attribute", tag: "inert", path, element, name, value, allowed,
    });
  }
  for (const mode of ["container", "document"]) {
    for (const probe of cases) {
      const { operation, tag } = probe;
      const label = operation === "attribute" ? `${probe.path} ${probe.element}.${probe.name} ${probe.allowed ? "allowed" : "denied"}` : tag + " " + operation;
      await t.test(mode + " " + label, async () => {
        const page = await browser.newPage(), requests = [];
        try {
          await page.route("http://markup.test/**", route => {
            const path = new URL(route.request().url()).pathname;
            if (path.startsWith("/unexpected")) {
              requests.push(path);
              return route.abort();
            }
            return route.fulfill(path === "/machine.js" ? { body: machine, contentType: "text/javascript" }
              : path === "/probe.wasm" ? { body: wasm, contentType: "application/wasm" }
              : { body: '<div id="own"><style id="inherited">body { color: black; }</style></div>', contentType: "text/html" });
          });
          await page.goto("http://markup.test/");
          const result = await page.evaluate(async ({ mode, operation, tag, probe }) => {
            const initial = document.getElementById("inherited");
            if (tag === "script") {
              const script = document.createElement("script");
              script.type = "application/json";
              script.id = "inherited";
              script.textContent = "window.__escapedMarkup = true";
              initial.replaceWith(script);
              if (operation !== "type") script.type = "text/javascript";
            } else if (tag === "template") {
              const template = document.createElement("template");
              template.id = "inherited";
              initial.replaceWith(template);
            } else if (tag === "wrapper" || tag === "inert") {
              initial.id = "";
              const wrapper = document.createElement("div");
              wrapper.id = "inherited";
              initial.replaceWith(wrapper);
              if (tag === "wrapper") wrapper.append(initial);
              else wrapper.innerHTML = "<figure><figcaption>Plain inherited content</figcaption></figure>" +
                "<kbd>Ctrl</kbd><output>Result</output>";
            }
            const escapedBefore = window.__escapedMarkup === true;
            const { default: Machine } = await import("/machine.js");
            const module = await WebAssembly.compileStreaming(fetch("/probe.wasm"));
            const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
            const reports = [];
            const machine = new Machine(module, mode === "document" ? document : document.getElementById("own"), {
              stamp, onMessage: message => reports.push(message),
              resolveImage: value => value === "/unexpected-resolved.png"
                ? "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" : value,
            });
            let error = null;
            try {
              await machine.onmsg(0);
              machine.onmsg(new TextEncoder().encode("\u0002probeMarkup\0" + JSON.stringify({
                ...probe, operation, tag: probe.element || tag,
              })));
            } catch (caught) { error = String(caught); }
            finally { machine.destroy(); }
            return { reports, error, styles: document.querySelectorAll("style").length,
              escaped: window.__escapedMarkup === true, escapedBefore,
              image: document.querySelector("img")?.getAttribute("src") };
          }, { mode, operation, tag, probe });
          await page.waitForTimeout(50);
          assert.deepEqual(requests, [], "no unexpected resource request may leave the page");
          assert.equal(result.escapedBefore, false, "host setup leaves scripts inert");
          assert.equal(result.escaped, false, "guest cannot activate inherited scripts");
          if (probe.allowed || ["read", "remove", "resolvedImage"].includes(operation) || (tag === "inert" && operation === "clone")) {
            assert.equal(result.error, null);
            assert.deepEqual(result.reports, ["ready", operation === "read" ? "body { color: black; }" : "finished"]);
          } else {
            assert.match(result.error || "", /not allowed|only|must|too long/);
            assert.deepEqual(result.reports, ["ready"]);
          }
          if (operation === "resolvedImage") assert.match(result.image || "", /^data:image\/gif;base64,/);
          assert.equal(result.styles, operation === "remove" || ["inert", "script", "template"].includes(tag) ? 0 : 1,
            "inherited styles are not duplicated");
        } finally { await page.close(); }
      });
    }
  }
});
