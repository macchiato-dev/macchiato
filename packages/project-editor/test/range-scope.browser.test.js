import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

test('range access checks the subtree between its endpoints', async t => {
  const root = new URL('../../../', import.meta.url).pathname;
  const working = resolve(root, '../macchiato-work');
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, 'range-scope-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, 'dev/wasm-web-runtimes/examples');
  const application = resolve(directory, 'application.bin'), output = resolve(directory, 'probe.wasm');
  execFileSync(resolve(examples, 'microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs'),
    ['-m32', '-o', application, new URL('fixtures/range-scope.js', import.meta.url).pathname]);
  execFileSync(process.execPath, [resolve(examples, 'microquickjs-suite/scripts/stamp-wasm.js'),
    resolve(root, 'packages/website/generated/project-editor-quickjs-runtime.wasm'), output,
    `runtime.bin=${resolve(root, 'packages/website/generated/project-editor-runtime.bin')}`,
    `application.bin=${application}`]);
  const wasm = await readFile(output);
  const host = await build({ entryPoints: [resolve(root, 'dev/wasm-web-machine/src/wasm-web-machine.ts')],
    bundle: true, write: false, format: 'esm', platform: 'browser' });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const grant of ['separate-roots', 'portal', 'single-root', 'document']) {
    for (const operation of ['getClientRects', 'getBoundingClientRect', 'measureRect', 'measureClientRects', 'addRange', 'extend', 'extendBackwards']) {
      await t.test(grant + ': ' + operation, async () => {
        const page = await browser.newPage();
        try {
          await page.route('http://range-scope.test/**', route => {
            const path = new URL(route.request().url()).pathname;
            return route.fulfill(path === '/machine.js' ? { body: host.outputFiles[0].text, contentType: 'text/javascript' }
              : path === '/probe.wasm' ? { body: wasm, contentType: 'application/wasm' }
              : { body: '<main><p id="first">One</p><p id="private">PRIVATE CONTENT</p><p id="last">Two</p></main>',
                contentType: 'text/html' });
          });
          await page.goto('http://range-scope.test/');
          const result = await page.evaluate(async ({ grant, operation }) => {
            const { default: Machine } = await import('/machine.js');
            const module = await WebAssembly.compileStreaming(fetch('/probe.wasm'));
            const stamp = new Uint8Array(WebAssembly.Module.customSections(module, 'wasm-web-machine')[0]);
            const target = grant === 'document' ? document : grant === 'single-root' ? document.querySelector('main')
              : grant === 'portal' ? document.querySelector('#first') : [document.querySelector('#first'), document.querySelector('#last')];
            const reports = [], machine = new Machine(module, target, { stamp,
              portals: grant === 'portal' ? [document.querySelector('#last')] : [], onMessage: value => reports.push(value) });
            let error = null;
            try {
              await machine.onmsg(0);
              try { machine.onmsg(new TextEncoder().encode('\u0002probeRange\0' + JSON.stringify({ operation }))); }
              catch (caught) { error = String(caught); }
              return { error, reports, selected: String(document.getSelection()) };
            } finally { machine.destroy(); }
          }, { grant, operation });
          if (grant === 'separate-roots' || grant === 'portal') {
            assert.match(result.error || '', /outside the granted roots/);
            assert.deepEqual(result.reports, [], 'no geometry returned for private content between endpoints');
            assert.equal(result.selected, operation === 'extend' ? 'One' : operation === 'extendBackwards' ? 'Two' : '',
              'a rejected extension preserves the previous selection without private content');
          } else {
            assert.equal(result.error, null);
            assert.deepEqual(result.reports, ['accepted']);
            if (['addRange', 'extend', 'extendBackwards'].includes(operation)) assert.match(result.selected, /PRIVATE CONTENT/);
          }
        } finally { await page.close(); }
      });
    }
  }
});
