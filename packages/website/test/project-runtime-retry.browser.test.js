import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("runtime loading retries failures and shares pending/successful compilations", { timeout: 30_000 }, async t => {
  const code = (await build({ entryPoints: [new URL('../project-machines.js', import.meta.url).pathname],
    bundle: true, write: false, format: 'esm', platform: 'browser' })).outputFiles[0].text;
  const wasm = await readFile(new URL('../generated/project-builder-quickjs-runtime.wasm', import.meta.url));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [], unexpected = [];
  page.on('pageerror', error => errors.push(error.message));
  let calls = 0, arrived, respond;
  const initialRequest = new Promise(resolve => { arrived = resolve; });
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url === 'http://retry.test/') return route.fulfill({
      contentType: 'text/html', body: '<!doctype html><title>Runtime retry</title>',
    });
    if (url === 'http://retry.test/module.js') return route.fulfill({ contentType: 'text/javascript', body: code });
    if (url !== 'http://retry.test/-/resources-site/project-builder-quickjs-runtime.wasm') {
      unexpected.push(url); return route.abort();
    }
    calls++;
    if (calls === 1) {
      await new Promise(resolve => { respond = resolve; arrived(); });
      return route.fulfill({ status: 503, body: 'temporarily unavailable' });
    }
    return route.fulfill({ contentType: 'application/wasm',
      body: calls === 2 ? Buffer.from([0, 1, 2]) : wasm });
  });
  await page.goto('http://retry.test/');
  await page.evaluate(async () => {
    const { createProjectBuildMachine } = await import('/module.js');
    window.createBuilder = createProjectBuildMachine;
    window.failed = Promise.allSettled([createBuilder(), createBuilder()]);
  });
  await initialRequest;
  assert.equal(calls, 1, 'simultaneous consumers share the initial download');
  respond();
  assert.deepEqual(await page.evaluate(async () => (await failed).map(result =>
    [result.status, result.reason?.message])), [
    ['rejected', 'Project runtime response 503'], ['rejected', 'Project runtime response 503'],
  ]);
  assert.equal(await page.evaluate(async () => {
    try { await createBuilder(); return 'unexpected success'; }
    catch (error) { return error.constructor.name; }
  }), 'CompileError');
  assert.equal(calls, 2, 'a failed download is not cached forever');
  const results = await page.evaluate(async () => {
    const machines = await Promise.all([createBuilder(), createBuilder()]);
    try {
      return machines.map(machine => machine.compileFiles([
        { path: 'index.html', content: '<h1>Recovered</h1>' },
      ]));
    } finally { for (const machine of machines) machine.destroy(); }
  });
  assert.ok(results.every(result => JSON.stringify(result.tree).includes('Recovered')));
  assert.equal(calls, 3, 'a failed compilation retries and the replacement is shared');
  await page.evaluate(async () => { const machine = await createBuilder(); machine.destroy(); });
  assert.equal(calls, 3, 'successful compilation is cached across disposed instances');
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
});
