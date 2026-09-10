import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

test('container styles cannot select siblings of the granted root', async t => {
  const root = new URL('../../../', import.meta.url).pathname;
  const working = resolve(root, '../macchiato-work');
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, 'css-scope-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, 'dev/wasm-web-runtimes/examples');
  const application = resolve(directory, 'application.bin'), output = resolve(directory, 'probe.wasm');
  execFileSync(resolve(examples, 'microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs'),
    ['-m32', '-o', application, new URL('fixtures/css-scope.js', import.meta.url).pathname]);
  execFileSync(process.execPath, [resolve(examples, 'microquickjs-suite/scripts/stamp-wasm.js'),
    resolve(root, 'packages/website/generated/project-editor-quickjs-runtime.wasm'), output,
    `runtime.bin=${resolve(root, 'packages/website/generated/project-editor-runtime.bin')}`,
    `application.bin=${application}`]);
  const wasm = await readFile(output);
  const host = await build({ entryPoints: [resolve(root, 'dev/wasm-web-machine/src/wasm-web-machine.ts')],
    bundle: true, write: false, format: 'esm', platform: 'browser' });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const [selector, denied] of [
    ['body + #outside', true], ['body~#outside', true],
    ['html:not(.missing) ~ #outside', true], [':root:is(div, main) + #outside', true],
    ['body[data-label="plus + comma, tilde ~"] ~ #outside', true],
    ['body', false], ['body > p + p', false], ['p + p', false],
    ['body:not(.missing) > p ~ p', false], ['body:is(div, main) p + p::before', false],
  ]) await t.test(selector, async () => {
    const page = await browser.newPage();
    try {
      await page.route('http://css-scope.test/**', route => {
        const path = new URL(route.request().url()).pathname;
        return route.fulfill(path === '/machine.js' ? { body: host.outputFiles[0].text, contentType: 'text/javascript' }
          : path === '/probe.wasm' ? { body: wasm, contentType: 'application/wasm' }
          : { body: '<div id="own" data-label="plus + comma, tilde ~"><p>One</p><p>Two</p></div><div id="outside">Private</div>',
            contentType: 'text/html' });
      });
      await page.goto('http://css-scope.test/');
      const result = await page.evaluate(async selector => {
        const { default: Machine } = await import('/machine.js');
        const module = await WebAssembly.compileStreaming(fetch('/probe.wasm'));
        const stamp = new Uint8Array(WebAssembly.Module.customSections(module, 'wasm-web-machine')[0]);
        const machine = new Machine(module, document.querySelector('#own'), { stamp });
        try {
          await machine.onmsg(0);
          let error = null;
          try { machine.onmsg(new TextEncoder().encode('\u0002probeStylesheet\0' + JSON.stringify({
            source: selector + ' { color: #ff0001; }',
          }))); } catch (caught) { error = String(caught); }
          const color = (node, pseudo = null) => getComputedStyle(node, pseudo).color;
          return { error, outside: color(document.querySelector('#outside')),
            inside: color(document.querySelector('#own p:nth-of-type(2)'), selector.endsWith('::before') ? '::before' : null) };
        } finally { machine.destroy(); }
      }, selector);
      assert.equal(result.outside, 'rgb(0, 0, 0)', 'neighboring host content must not receive guest CSS');
      if (denied) assert.match(result.error || '', /root.*sibling|outside.*scope/i);
      else {
        assert.equal(result.error, null);
        assert.equal(result.inside, 'rgb(255, 0, 1)', 'ordinary internal selectors keep working');
      }
    } finally { await page.close(); }
  });

  // These are unresolved confidentiality probes, not passing containment
  // coverage. Native selector matching can inspect beyond its result subtree.
  for (const method of ['stylesheet', 'querySelector', 'matches', 'closest']) {
    await t.test(method + ' cannot inspect host selector context', {
      todo: 'Constrain selector predicate context without a second host CSS parser',
    }, async () => {
      const page = await browser.newPage();
      try {
        await page.route('http://css-scope.test/**', route => {
          const path = new URL(route.request().url()).pathname;
          return route.fulfill(path === '/machine.js' ? { body: host.outputFiles[0].text, contentType: 'text/javascript' }
            : path === '/probe.wasm' ? { body: wasm, contentType: 'application/wasm' }
            : { body: '<body data-private="yes"><div id="own"><p>Owned</p></div><div id="outside" data-private="yes">Private</div>',
              contentType: 'text/html' });
        });
        await page.goto('http://css-scope.test/');
        const result = await page.evaluate(async method => {
          const { default: Machine } = await import('/machine.js');
          const module = await WebAssembly.compileStreaming(fetch('/probe.wasm'));
          const stamp = new Uint8Array(WebAssembly.Module.customSections(module, 'wasm-web-machine')[0]);
          const reports = [], own = document.querySelector('#own');
          const machine = new Machine(module, own, { stamp, onMessage: value => reports.push(value) });
          try {
            await machine.onmsg(0);
            const stylesheet = method === 'stylesheet';
            const command = stylesheet ? 'probeStylesheet' : 'probeSelector';
            const request = stylesheet
              ? { source: 'body:has(+ [data-private="yes"]) p { color: #ff0001; }' }
              : { method, selector: 'body[data-private="yes"] p' };
            let error = null;
            try { machine.onmsg(new TextEncoder().encode('\u0002' + command + '\0' + JSON.stringify(request))); }
            catch (caught) { error = String(caught); }
            return { error, reports, color: getComputedStyle(own.querySelector('p')).color };
          } finally { machine.destroy(); }
        }, method);
        t.diagnostic(method + ' context result: ' + JSON.stringify(result));
        if (result.error) assert.match(result.error, /selector.*scope|outside.*scope/);
        else if (method === 'stylesheet') assert.equal(result.color, 'rgb(0, 0, 0)');
        else assert.deepEqual(result.reports, ['false']);
      } finally { await page.close(); }
    });
  }
});
