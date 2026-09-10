import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Prototype-level tests. The live WIT/guest integration still has separate,
// explicitly unresolved probes in css-scope.browser.test.js.
const tag = name => ['tag', name];
const attr = (name, value) => ['attribute', name, '=', value];
const part = (...terms) => ['', terms];
const joined = (join, ...terms) => [join, terms];
const privateAncestor = [[part(tag('body'), attr('data-private', 'yes')), joined(' ', tag('p'))]];
const privateSibling = [[joined('+', attr('data-private', 'yes'))]];

test('semantic selector rendering confines native matching context', async t => {
  const bundle = await build({ entryPoints: [new URL('../../../dev/wasm-web-machine/src/devices/selector-renderer.ts', import.meta.url).pathname],
    bundle: true, write: false, format: 'esm', platform: 'browser' });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const cases = [
    { name: 'document grants retain native selector context', method: 'querySelector', scope: null, selector: privateAncestor, samples: [true, false] },
    { name: 'query cannot test a host ancestor', method: 'querySelector', selector: privateAncestor, match: false },
    { name: 'matches cannot test a host ancestor', method: 'matches', selector: privateAncestor, match: false },
    { name: 'closest cannot test a host ancestor', method: 'closest', selector: privateAncestor, match: false },
    { name: 'CSS cannot test a root sibling', selector: [[part(tag('body'), ['has', privateSibling]), joined(' ', tag('p'))]], match: false },
    { name: 'root sibling predicate is false inside not', selector: [[part(tag('body'), ['not', [[part(['has', privateSibling])]]]), joined(' ', tag('p'))]], match: true },
    { name: 'internal sibling selectors remain native', selector: [[part(tag('body')), joined('>', tag('p')), joined('+', tag('p'))]], match: true },
    { name: 'internal sibling has remains native', selector: [[part(tag('body'), ['has', [[joined('>', tag('p')), joined('+', tag('p'))]]]), joined(' ', tag('p'))]], match: true },
    { name: 'mixed has alternatives preserve descendants', selector: [[part(tag('body'), ['has', [...privateSibling, [joined('>', tag('p'))]]]), joined(' ', tag('p'))]], match: true },
    { name: 'nested is cannot inspect a host ancestor', method: 'matches', selector: [[part(['is', privateAncestor])]], match: false },
    { name: 'nested not keeps an owned alternative', method: 'matches', selector: [[part(tag('p'), ['not', privateAncestor])]], match: true },
    { name: 'virtual root is first child', selector: [[part(tag('body'), ['pseudo', 'first-child']), joined(' ', tag('p'))]], match: true },
    { name: 'virtual root does not expose second-child position', selector: [[part(tag('body'), ['nth', 'nth-child', 0, 2]), joined(' ', tag('p'))]], match: false },
    { name: 'negative nth coefficient works at virtual root', selector: [[part(tag('body'), ['nth', 'nth-last-of-type', -2, 3]), joined(' ', tag('p'))]], match: true },
    { name: 'descendant nth-child uses its real position', selector: [[part(tag('p'), ['nth', 'nth-child', 0, 2])]], match: true },
    { name: 'descendant first-child does not match the second', selector: [[part(tag('p'), ['pseudo', 'first-child'])]], match: false },
    { name: 'attribute punctuation is quoted, not selector syntax', selector: [[part(attr('data-probe', '"] ~ #after, [data-probe="'))]], match: true },
    { name: 'pseudo-element remains outside functional wrapper', selector: [[part(tag('p'), ['element', 'before'])]], pseudo: '::before', match: true },
  ];
  for (const probe of cases) await t.test(probe.name, async () => {
    const page = await browser.newPage();
    try {
      await page.route('http://selector-renderer.test/**', route => route.fulfill(
        new URL(route.request().url()).pathname === '/renderer.js'
          ? { body: bundle.outputFiles[0].text, contentType: 'text/javascript' }
          : { body: '<body data-private="yes"><div id="before">Host</div><main id="own" class="wwm-12345"><p>First</p><p>Second</p></main><div id="after" data-private="yes">Host</div>', contentType: 'text/html' }));
      await page.goto('http://selector-renderer.test/');
      const result = await page.evaluate(async probe => {
        const { renderSelector } = await import('/renderer.js');
        const rendered = renderSelector(probe.selector, probe.scope === null ? null : 'wwm-12345', !probe.method);
        const own = document.querySelector('#own'), child = own.querySelector('p:last-child');
        child.setAttribute('data-probe', '"] ~ #after, [data-probe="');
        if (!probe.method) {
          const style = document.createElement('style');
          style.textContent = rendered + ' { color: #ff0001; }';
          document.head.append(style);
          if (style.sheet.cssRules.length !== 1) throw Error('Rendered selector was rejected: ' + rendered);
        }
        const samples = [];
        for (const value of ['yes', 'no']) {
          document.body.setAttribute('data-private', value);
          document.querySelector('#after').setAttribute('data-private', value);
          if (value === 'no') document.querySelector('#before').remove();
          samples.push(probe.method
            ? Boolean((probe.method === 'querySelector' ? own : child)[probe.method](rendered))
            : getComputedStyle(child, probe.pseudo || null).color === 'rgb(255, 0, 1)');
        }
        return { samples, rendered, outside: getComputedStyle(document.querySelector('#after')).color };
      }, probe);
      assert.deepEqual(result.samples, probe.samples || [probe.match, probe.match], result.rendered);
      assert.equal(result.outside, 'rgb(0, 0, 0)');
    } finally { await page.close(); }
  });
  await t.test('malformed semantic pieces are rejected', async () => {
    const page = await browser.newPage();
    try {
      await page.route('http://selector-renderer.test/**', route => route.fulfill(
        new URL(route.request().url()).pathname === '/renderer.js'
          ? { body: bundle.outputFiles[0].text, contentType: 'text/javascript' }
          : { body: '<main></main>', contentType: 'text/html' }));
      await page.goto('http://selector-renderer.test/');
      const rejected = await page.evaluate(async () => {
        const { renderSelector } = await import('/renderer.js');
        const list = (...terms) => [[['', terms]]];
        let nested = list(['tag', 'p']);
        for (let at = 0; at < 10; at++) nested = list(['is', nested]);
        const relative = list(['tag', 'p']); relative[0][0][0] = '+';
        const invalid = [[], list(), relative,
          list(['class', 'a'], ['tag', 'p']),
          list(['element', 'before'], ['class', 'a']),
          list(['is', list(['element', 'before'])]),
          list(['pseudo', 'has(#outside)']),
          list(['nth', 'nth-child', 1.5, 0]),
          list(['attribute', 'x', '=', 'line\nbreak']),
          list(...Array.from({ length: 513 }, () => ['class', 'a'])), nested];
        return invalid.map(selector => {
          try { renderSelector(selector, 'wwm-12345'); return false; }
          catch { return true; }
        });
      });
      assert.ok(rejected.every(Boolean), JSON.stringify(rejected));
    } finally { await page.close(); }
  });
});
