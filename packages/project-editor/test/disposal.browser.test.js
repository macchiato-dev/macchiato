import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("retaining a destroyed machine does not retain its DOM, memory, or stamp", async t => {
  const code = (await build({
    stdin: { resolveDir: new URL("../../../", import.meta.url).pathname,
      contents: "export { default } from './dev/wasm-web-machine/src/wasm-web-machine.ts';" },
    bundle: true, write: false, format: "esm", platform: "browser",
  })).outputFiles[0].text;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("http://retention.test/**", route => route.fulfill(
    new URL(route.request().url()).pathname === "/machine.js"
      ? { body: code, contentType: "text/javascript" }
      : { body: '<!doctype html><title>Machine retention</title>', contentType: "text/html" }));
  await page.goto("http://retention.test/");
  await page.evaluate(async () => {
    const { default: Machine } = await import("/machine.js");
    window.machines = [];
    window.references = [];
    for (const state of ["active", "disposed", "cleanup throws"]) {
      const root = document.createElement("div");
      root.append(document.createElement("p"));
      document.body.append(root);
      const memory = new WebAssembly.Memory({ initial: 1 });
      const stamp = new Uint8Array(1024 * 1024);
      // The documented trusted-adapter surface isolates the machine lifetime
      // from any one interpreter's finalizers. It has no asynchronous work.
      const machine = new Machine({ instantiate() {
        return { exports: { memory, onmsg() {} }, destroy() {
          if (state === "cleanup throws") throw Error("Fixture cleanup failed");
        } };
      } }, root, { stamp });
      await machine.onmsg(0);
      machines.push(machine);
      references.push({ state, root: new WeakRef(root), memory: new WeakRef(memory), stamp: new WeakRef(stamp) });
      root.remove();
      if (state !== "active") {
        let message;
        try { machine.destroy(); } catch (error) { message = error.message; }
        if (message !== (state === "cleanup throws" ? "Fixture cleanup failed" : undefined))
          throw Error("Unexpected cleanup result: " + message);
        machine.destroy();
        for (const send of [() => machine.msg(0, 0), () => machine.onmsg(0)]) {
          let failure;
          try { send(); } catch (error) { failure = error.message; }
          if (failure !== "wasm-web-machine: machine was destroyed")
            throw Error("Destroyed machine accepted a message: " + failure);
        }
      }
    }
  });
  // A separate task and DevTools GC avoid keeping WeakRef targets alive in
  // the creation job. Keep each machine itself strongly reachable throughout.
  const client = await page.context().newCDPSession(page);
  await client.send("HeapProfiler.collectGarbage");
  const retained = await page.evaluate(() => references.map(record => ({ state: record.state,
    root: !!record.root.deref(), memory: !!record.memory.deref(), stamp: !!record.stamp.deref() })));
  t.diagnostic(JSON.stringify(retained));
  assert.deepEqual(retained, [
    { state: "active", root: true, memory: true, stamp: true },
    { state: "disposed", root: false, memory: false, stamp: false },
    { state: "cleanup throws", root: false, memory: false, stamp: false },
  ]);
  await page.evaluate(() => machines[0].destroy());
  await client.send("HeapProfiler.collectGarbage");
  assert.equal(await page.evaluate(() => references.some(record =>
    record.root.deref() || record.memory.deref() || record.stamp.deref())), false);
  await client.detach();
});

test("disposing a machine cancels pending work and ambient listeners", async t => {
  const runtime = await readFile(new URL("../../website/generated/project-quickjs-runtime.wasm", import.meta.url));
  const machine = await build({
    stdin: { resolveDir: new URL(".", import.meta.url).pathname, contents: `
      export { default } from ${JSON.stringify(new URL("../../../dev/wasm-web-machine/src/wasm-web-machine.ts", import.meta.url).pathname)};
      export { QuickJSRuntime } from ${JSON.stringify(new URL("../../../dev/wasm-web-runtimes/quickjs/context-runtime.js", import.meta.url).pathname)};
    ` },
    bundle: true, write: false, format: "esm", platform: "browser",
  });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://dispose.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/machine.js"
      ? { contentType: "text/javascript", body: machine.outputFiles[0].text }
      : path === "/runtime.wasm"
      ? { contentType: "application/wasm", body: runtime }
      : { contentType: "text/html", body: '<div id="guest"></div>' });
  });
  await page.goto("http://dispose.test/");
  await page.evaluate(async () => {
    const { default: Machine, QuickJSRuntime } = await import("/machine.js");
    const engine = window.engine = new QuickJSRuntime(await WebAssembly.compileStreaming(fetch("/runtime.wasm")));
    window.messages = [];
    const pendingTimers = new Set(), pendingFrames = new Set(), listeners = new Map();
    const subscriptions = new Set();
    const subscribe = callback => {
      subscriptions.add(callback);
      return () => subscriptions.delete(callback);
    };
    const timeout = window.setTimeout, clear = window.clearTimeout;
    const frame = window.requestAnimationFrame, cancel = window.cancelAnimationFrame;
    const add = window.addEventListener, remove = window.removeEventListener;
    window.setTimeout = (callback, delay, ...args) => {
      const id = timeout(() => { pendingTimers.delete(id); callback(...args); }, delay);
      pendingTimers.add(id); return id;
    };
    window.clearTimeout = id => { pendingTimers.delete(id); clear(id); };
    window.requestAnimationFrame = callback => {
      const id = frame(time => { pendingFrames.delete(id); callback(time); });
      pendingFrames.add(id); return id;
    };
    window.cancelAnimationFrame = id => { pendingFrames.delete(id); cancel(id); };
    window.addEventListener = function (type, callback, options) {
      listeners.set(callback, type); add.call(this, type, callback, options);
    };
    window.removeEventListener = function (type, callback, options) {
      listeners.delete(callback); remove.call(this, type, callback, options);
    };
    try {
      new Machine({ instantiate() { throw Error('Unavailable runtime'); } }, document.getElementById('guest'));
    } catch (error) {
      if (error.message !== 'Unavailable runtime') throw error;
    }
    if (listeners.size) throw Error('Failed construction retained its submission guard');
    for (let index = 0; index < 10; index++) {
      const machine = new Machine(engine.createSession(), document.getElementById("guest"), {
        frameInterval: index % 2 ? 30 : 0,
        onMessage: message => messages.push(message),
        services: {
          route: { get: () => '/', listen: subscribe },
          storage: { listen: (_kind, _key, callback) => subscribe(callback) },
        },
      });
      await machine.onmsg(0);
      const code = new TextEncoder().encode(`
        function unexpected() { __wwcPostMessage('stale callback'); }
        setTimeout(unexpected, 30);
        setInterval(unexpected, 30);
        setImmediate(unexpected);
        requestAnimationFrame(unexpected);
        requestCleanupOpportunity(unexpected);
        addEventListener('resize', unexpected);
        addEventListener('keydown', unexpected);
        document.addEventListener('click', unexpected);
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', unexpected);
        addEventListener('hashchange', unexpected);
        localStorage.listen('configuration', unexpected);
        // Exercise the routing service directly; this guest's window events
        // otherwise use native windowListen rather than a controller route.
        immediate([3, document.reference, stringIndex('routeListen'), [
          encode(allocateCallback(unexpected, false))
        ]]);
      `);
      const message = new Uint8Array(code.length + 1);
      message[0] = 1; message.set(code, 1);
      machine.onmsg(message);
      machine.destroy();
      machine.destroy();
      if (pendingTimers.size || pendingFrames.size || listeners.size || subscriptions.size) {
        throw new Error('Native work retained after disposal: ' + JSON.stringify({
          timers: pendingTimers.size, frames: pendingFrames.size, listeners: listeners.size,
          subscriptions: subscriptions.size,
        }));
      }
    }
    dispatchEvent(new Event('resize'));
    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new MouseEvent('click'));
    const live = new Machine(engine.createSession(), document.getElementById('guest'), {
      onMessage: message => messages.push(message),
    });
    await live.onmsg(0);
    const code = new TextEncoder().encode(`
      function removed() { __wwcPostMessage('removed callback'); }
      for (var index = 0; index < 4200; index++) {
        addEventListener('resize', removed);
        removeEventListener('resize', removed);
        clearInterval(setTimeout(removed, 60000));
        clearTimeout(setInterval(removed, 60000));
        clearImmediate(setImmediate(removed));
      }
      function active() { __wwcPostMessage(this === globalThis ? 'live callback' : 'wrong receiver'); }
      addEventListener('resize', active);
      addEventListener('resize', active);
    `);
    const message = new Uint8Array(code.length + 1);
    message[0] = 1; message.set(code, 1);
    live.onmsg(message);
    if (pendingTimers.size) throw new Error('Cancelled timers retained in browser');
    if (listeners.size !== 2) throw new Error('Expected only submission guard and one resize listener');
    dispatchEvent(new Event('resize'));
    // Disposal also invalidates the event checkpoint already queued by this
    // synchronous dispatch, before its microtask has a chance to run.
    live.destroy();
    if (listeners.size) throw new Error('Window listeners retained');
    Object.assign(window, { setTimeout: timeout, clearTimeout: clear,
      requestAnimationFrame: frame, cancelAnimationFrame: cancel,
      addEventListener: add, removeEventListener: remove });
    window.timerMachine = new Machine(engine.createSession(), document.getElementById('guest'), {
      onMessage: message => messages.push(message),
    });
    await timerMachine.onmsg(0);
    const timers = new TextEncoder().encode(`
      var cancelled = setTimeout(function () { __wwcPostMessage('cancelled'); }, 40);
      clearTimeout(String(cancelled));
      setTimeout(function () {
        __wwcPostMessage(this === globalThis ? 'no arguments OK' : 'wrong receiver');
      }, 1);
      setTimeout(function (value) {
        __wwcPostMessage(this === globalThis && value === 7 ? 'timeout OK' : 'timeout failed');
      }, 1, 7);
      var repeating = setInterval(function (value) {
        clearTimeout(repeating);
        __wwcPostMessage(this === globalThis && value === 9 ? 'interval OK' : 'interval failed');
      }, 1, 9);
    `);
    const timerMessage = new Uint8Array(timers.length + 1);
    timerMessage[0] = 1; timerMessage.set(timers, 1);
    timerMachine.onmsg(timerMessage);
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(120);
  assert.deepEqual((await page.evaluate(() => messages)).sort(),
    ['interval OK', 'live callback', 'no arguments OK', 'timeout OK']);
  await page.evaluate(() => { timerMachine.destroy(); engine.destroy(); });
  assert.deepEqual(errors, []);
});
