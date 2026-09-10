import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("QuickJS sessions share a Wasm instance but not globals, callbacks, or leases", {
  timeout: 120_000,
}, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const target = join(root, "../macchiato-work/quickjs-sessions-target");
  execFileSync("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown"], {
    cwd: join(root, "dev/wasm-web-runtimes/quickjs"),
    env: { ...process.env, CARGO_TARGET_DIR: target, WWC_CANONICAL_HOST: "1", WWC_MULTICONTEXT: "1",
      WWC_GUEST_ENVIRONMENT: join(root, "dev/wasm-web-runtimes/examples/codemirror/generated/canonical-dom.js"),
      WWC_APPLICATION_SOURCE: join(root, "packages/website/project-output-bootstrap.js") },
    stdio: "pipe",
  });
  const wasm = await readFile(join(target, "wasm32-unknown-unknown/release/wasm_web_container_quickjs_runtime.wasm"));
  const code = (await build({
    stdin: { contents: `
      export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
      export { QuickJSRuntime } from './dev/wasm-web-runtimes/quickjs/context-runtime.js';
    `, resolveDir: root }, bundle: true, write: false, format: "esm", platform: "browser",
  })).outputFiles[0].text;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://sessions.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/module.js" ? { contentType: "text/javascript", body: code }
      : path === "/runtime.wasm" ? { contentType: "application/wasm", body: wasm }
      : { contentType: "text/html", body: '<div id="first"></div><div id="second"></div>' });
  });
  await page.goto("http://sessions.test/");
  const result = await page.evaluate(async () => {
    const { Machine, QuickJSRuntime } = await import("/module.js");
    let instances = 0, memory;
    WebAssembly.Instance = new Proxy(WebAssembly.Instance, {
      construct(target, args) {
        instances++;
        const instance = Reflect.construct(target, args);
        memory = instance.exports.memory;
        return instance;
      },
    });
    const engine = new QuickJSRuntime(await WebAssembly.compileStreaming(fetch("/runtime.wasm")));
    const calls = [], leases = new Map();
    const first = new Machine(engine.createSession(), document.querySelector("#first"), {
      onMessage: value => calls.push(["first", value]),
      onReferenceLease: (id, count) => { if (count) leases.set(id, count); else leases.delete(id); },
    });
    const second = new Machine(engine.createSession(), document.querySelector("#second"), {
      onMessage: value => calls.push(["second", value]),
    });
    await first.onmsg(0);
    await second.onmsg(0);
    function evaluate(machine, source) {
      const bytes = new TextEncoder().encode(source), message = new Uint8Array(bytes.length + 1);
      message[0] = 1; message.set(bytes, 1); machine.onmsg(message);
    }
    evaluate(first, `const privateValue = 'first';
      document.body.innerHTML = '<button>First</button>';
      document.querySelector('button').addEventListener('click', () => __wwcPostMessage(privateValue));
      setTimeout(() => { throw Error('Disposed timer executed'); }, 150);`);
    evaluate(second, `const privateValue = 'second';
      document.body.innerHTML = '<button>Second</button>';
      document.querySelector('button').addEventListener('click', () => __wwcPostMessage(privateValue));`);
    document.querySelector("#first button").click();
    document.querySelector("#second button").click();
    const leasesBefore = leases.size;
    first.destroy();
    const leasesAfter = leases.size;
    document.querySelector("#first button").click();
    document.querySelector("#second button").click();
    const sizes = [];
    for (let index = 0; index < 24; index++) {
      const next = new Machine(engine.createSession(), document.querySelector("#first"));
      await next.onmsg(0);
      evaluate(next, "const privateValue = 'replacement'; document.body.innerHTML = '<p>New session</p>';");
      next.destroy();
      sizes.push(memory.buffer.byteLength);
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    document.querySelector("#second button").click();
    second.destroy();
    engine.destroy();
    return { instances, calls, leasesBefore, leasesAfter, sizes };
  });
  t.diagnostic(JSON.stringify(result));
  assert.equal(result.instances, 1);
  assert.deepEqual(result.calls, [["first", "first"], ["second", "second"], ["second", "second"], ["second", "second"]]);
  assert.ok(result.leasesBefore > 0);
  assert.equal(result.leasesAfter, 0);
  assert.ok(Math.max(...result.sizes.slice(12)) <= Math.max(...result.sizes.slice(0, 12)) + 65536,
    "linear memory settles after repeated session disposal");
  assert.deepEqual(errors, []);
});
