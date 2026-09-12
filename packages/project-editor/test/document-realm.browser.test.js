import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("DOM services belong to the granted document, not the controller realm", async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "document-realm-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const runtime = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime");
  const application = resolve(directory, "application.bin"), output = resolve(directory, "realm.wasm");
  execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", application,
    new URL("fixtures/document-realm.js", import.meta.url).pathname]);
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(root, "packages/website/generated/project-editor-quickjs-runtime.wasm"), output,
    `runtime.bin=${resolve(root, "packages/website/generated/project-editor-runtime.bin")}`,
    `application.bin=${application}`]);
  const wasm = await readFile(output);
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const font = await readFile(resolve(examples,
    "microquickjs-suite/mahjong/assets/fonts/libre-baskerville-latin-wght-normal.woff2"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const grant of ["element", "document"]) for (const navigate of [false, "self"])
    await t.test(`${grant}, navigation ${navigate}`, async () => {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    try {
      const errors = [], unexpected = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/*", route => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/machine.js") return route.fulfill({ body: machine, contentType: "text/javascript" });
        if (path === "/realm.wasm") return route.fulfill({ body: wasm, contentType: "application/wasm" });
        if (path !== "/") { unexpected.push(route.request().url()); return route.abort(); }
        return route.fulfill({ contentType: "text/html", body: '<!doctype html><p id="controller-private">Private controller text</p><div style="height:2000px"></div>' });
      });
      await page.goto("http://realm.test/");
      const result = await page.evaluate(async ({ grant, font, navigate }) => {
        const { default: Machine } = await import("/machine.js");
        // Distinct time origins make accidentally reading the controller's
        // performance clock visible even on fast machines.
        await new Promise(resolve => setTimeout(resolve, 200));
        const frame = document.createElement("iframe");
        frame.style.cssText = "position:absolute;left:0;top:50px;width:420px;height:260px;border:0";
        // A script-free document; the host module and Wasm stay in this realm.
        frame.srcdoc = '<!doctype html><html><head><style>html{font-size:24px}body{margin:0}#sample{font-size:1rem}#own{height:1600px}</style></head><body><div id="own"><p id="sample">Child document text</p></div></body></html>';
        await new Promise(resolve => { frame.onload = resolve; document.body.append(frame); });
        const child = frame.contentWindow, doc = child.document;
        let customRuns = 0;
        child.customElements.define("realm-widget", class extends child.HTMLElement {
          constructor() { super(); customRuns++; }
        });
        const selected = doc.getElementById("sample").firstChild;
        const range = doc.createRange(); range.setStart(selected, 3); range.setEnd(selected, 8);
        doc.getSelection().removeAllRanges(); doc.getSelection().addRange(range);
        const parentRange = document.createRange(); parentRange.selectNodeContents(document.querySelector("p"));
        document.getSelection().removeAllRanges(); document.getSelection().addRange(parentRange);
        const module = await WebAssembly.compileStreaming(fetch("/realm.wasm"));
        const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
        const reports = [], traces = [];
        const vm = new Machine(module, grant === "document" ? doc : doc.getElementById("own"), {
          stamp, onMessage: message => reports.push(message), allowFont: () => true, allowNavigate: navigate,
          instrument: event => traces.push(event),
        });
        const call = value => vm.onmsg(new TextEncoder().encode("\u0002documentRealmProbe\0" + JSON.stringify(value)));
        try {
          await vm.onmsg(0);
          await call({ font });
          await vm.onmsg(0); // Wait for approved font installation.
          await call({ scroll: true });
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const before = child.performance.now();
          await call({});
          const after = child.performance.now();
          selected.parentElement.dispatchEvent(new child.MouseEvent("mousedown", { bubbles: true }));
          const links = [];
          for (const href of ["/allowed", "https://outside.test/blocked"]) {
            try { await call({ href }); links.push(true); } catch { links.push(false); }
          }
          const forms = [];
          for (const action of ["/allowed", "https://outside.test/blocked"]) {
            const form = doc.createElement("form"); form.action = action;
            doc.getElementById("own").append(form);
            const event = new child.Event("submit", { bubbles: true, cancelable: true });
            form.dispatchEvent(event); forms.push(!event.defaultPrevented); form.remove();
          }
          let customError = null;
          try { await call({ custom: true }); } catch (error) { customError = String(error); }
          return { reports, traces, customRuns, customError, links, forms, before, after,
            parentScroll: scrollY, childScroll: child.scrollY,
            parentFonts: [...document.fonts].map(face => face.family),
            childFonts: [...doc.fonts].map(face => face.family) };
        } finally { vm.destroy(); }
      }, { grant, font: font.toString("base64"), navigate });
      const snapshot = JSON.parse(result.reports.at(-2));
      const now = snapshot.now; delete snapshot.now;
      assert.ok(now >= Math.floor(result.before) && now <= Math.ceil(result.after),
        `guest clock ${now} must use child time origin (${result.before}–${result.after})`);
      assert.deepEqual(snapshot, { width: 420, height: 260, scroll: 120,
        fontSize: "24px", selectionOffset: 3, privateVisible: false });
      assert.equal(result.reports.at(-1), "pointer");
      const pointer = result.traces.find(event => event.type === "event-deliver" && event.eventType === "mousedown");
      assert.equal(pointer.selection.text, "ld do", "instrumentation must inspect the guest's selection too");
      assert.equal(result.parentScroll, 0);
      assert.equal(result.childScroll, 120);
      assert.deepEqual(result.parentFonts, []);
      assert.deepEqual(result.childFonts, ["RealmFont"]);
      assert.equal(result.customRuns, 0, "the child custom-element registry must not bypass the allowlist");
      assert.match(result.customError, /not allowed/);
      assert.deepEqual(result.links, [navigate === "self", false], "srcdoc inherits its origin, not its about: URL's origin");
      assert.deepEqual(result.forms, [navigate === "self", false], "forms require the same explicit navigation grant");
      assert.deepEqual(errors, []);
      assert.deepEqual(unexpected, []);
    } finally { await page.close(); }
  });
});
