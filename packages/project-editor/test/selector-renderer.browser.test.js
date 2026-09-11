import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { parseConstrainedSelector, writeConstrainedSelector } from '../src/constrained-selector.js';

function selectorBytes(source) {
  const bytes = [];
  const writer = {
    byte(value) { bytes.push(value); },
    uint(value) {
      do { const byte = value % 128; value = Math.floor(value / 128); bytes.push(byte | (value ? 128 : 0)); } while (value);
    },
    text(value) { const text = new TextEncoder().encode(value); writer.uint(text.length); bytes.push(...text); },
  };
  writeConstrainedSelector(writer, parseConstrainedSelector(source));
  return bytes;
}

// Prototype-level tests. The live WIT/guest integration still has separate,
// explicitly unresolved probes in css-scope.browser.test.js.
const tag = name => ['tag', name];
const attr = (name, value) => ['attribute', name, '=', value];
const part = (...terms) => ['', terms];
const joined = (join, ...terms) => [join, terms];
const privateAncestor = [[part(tag('body'), attr('data-private', 'yes')), joined(' ', tag('p'))]];
const privateSibling = [[joined('+', attr('data-private', 'yes'))]];

test('semantic selector rendering confines native matching context', async t => {
  const bundle = await build({ stdin: { contents:
    'export { renderSelector, readSelector } from ' + JSON.stringify(new URL('../../../dev/wasm-web-machine/src/devices/selector-renderer.ts', import.meta.url).pathname) + ';\n' +
    'export { parseConstrainedSelector } from ' + JSON.stringify(new URL('../src/constrained-selector.js', import.meta.url).pathname) + ';', resolveDir: process.cwd() },
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
  await t.test('scoping preserves native cascade precedence in both source orders', async () => {
    const page = await browser.newPage();
    try {
      await page.route('http://selector-renderer.test/**', route => route.fulfill(
        new URL(route.request().url()).pathname === '/renderer.js'
          ? { body: bundle.outputFiles[0].text, contentType: 'text/javascript' }
          : { body: '<body class="game"><p class="text">Text</p>', contentType: 'text/html' }));
      await page.goto('http://selector-renderer.test/');
      const pairs = [
        [['.game', [[part(['class', 'game'])]]], ['body', [[part(tag('body'))]]]],
        [['.game', [[part(['class', 'game'])]]], ['body:where(.game)', [[part(tag('body'), ['where', [[part(['class', 'game'])]]])]]]],
        [['body.game', [[part(tag('body'), ['class', 'game'])]]], ['.game', [[part(['class', 'game'])]]]],
        [['.game', [[part(['class', 'game'])]]], ['body:first-child', [[part(tag('body'), ['pseudo', 'first-child'])]]]],
        [['.text', [[part(['class', 'text'])]]], ['body p', [[part(tag('body')), joined(' ', tag('p'))]]]],
        [['.game:has(> .text, + #outside)', [[part(['class', 'game'], ['has', [[joined('>', ['class', 'text'])], [joined('+', ['id', 'outside'])]]])]]], ['.game.text', [[part(['class', 'game'], ['class', 'text'])]]]],
      ];
      // Matching and specificity are independent. Compare actual computed
      // styles against a native document, not against another renderer.
      const samples = await page.evaluate(async pairs => {
        const { renderSelector } = await import('/renderer.js');
        const style = document.createElement('style'); document.head.append(style);
        const samples = [];
        for (const pair of pairs) for (const reverse of [false, true]) {
          const rules = pair.map(([source, ast], index) => ({ source, ast, color: index ? '#ff0001' : '#0001ff' }));
          if (reverse) rules.reverse();
          const colors = () => ['#own', '#own p'].map(selector => getComputedStyle(document.querySelector(selector)).color);
          // Use a headless native document body (head is outside the body),
          // so body:first-child has the same logical position as a root.
          document.head.remove();
          document.body.id = 'own'; document.body.className = 'game text';
          document.body.innerHTML = '<p class="text">Text</p>';
          document.body.append(style);
          style.textContent = rules.map(rule => rule.source + '{color:' + rule.color + '}').join('\n');
          const native = colors();
          document.body.id = ''; document.body.className = '';
          document.body.innerHTML = '<div>Host sibling</div><main id="own" class="wwm-12345 game text"><p class="text">Text</p></main>';
          document.body.append(style);
          style.textContent = rules.map(rule => renderSelector(rule.ast, 'wwm-12345', true) + '{color:' + rule.color + '}').join('\n');
          samples.push({ rules: rules.map(rule => rule.source), native, scoped: colors() });
          const head = document.createElement('head'); document.documentElement.prepend(head);
        }
        return samples;
      }, pairs);
      for (const sample of samples) assert.deepEqual(sample.scoped, sample.native, sample.rules.join(' then '));
    } finally { await page.close(); }
  });
  await t.test('guest parsing agrees with native selector matching', async () => {
    const page = await browser.newPage();
    try {
      await page.route('http://selector-renderer.test/**', route => route.fulfill(
        new URL(route.request().url()).pathname === '/renderer.js'
          ? { body: bundle.outputFiles[0].text, contentType: 'text/javascript' }
          : { body: '<body><main id="root"><p id="first" class="a 123:item" data-x="a,b">First</p><p id="second" class="a b" data-x="quoted&quot;value">Second</p><p id="third" class="c">Third</p></main>', contentType: 'text/html' }));
      await page.goto('http://selector-renderer.test/');
      const selectors = ['body > main > p', '.a.b', '.a/**/.b', '.a/**//**/.b',
        '.a + .b', '.a ~ .c', '#root:has(> .b)', 'p:is(.b, .c)', 'p:where(.b, .c)',
        'p:not(:has(+ .c))', '.\\31 23\\:item', '[data-x="a,b"]', '[data-x="quoted\\22 value"]',
        'p:nth-child(odd)', 'p:nth-child(-n + 2)', 'p:nth-last-child(2)',
        'p:first-of-type', 'p:last-child', 'p:only-child', '*', '#first, #third'];
      const samples = await page.evaluate(async selectors => {
        const { parseConstrainedSelector, renderSelector, readSelector } = await import('/renderer.js');
        const ids = selector => Array.from(document.querySelectorAll(selector), element => element.id || element.tagName);
        function decode(bytes) {
          let at = 0;
          const reader = {
            byte() { if (at === bytes.length) throw Error('truncated wire'); return bytes[at++]; },
            uint() { let value = 0, scale = 1, byte; do { byte = reader.byte(); value += (byte & 127) * scale; scale *= 128; } while (byte & 128); return value; },
            text() { const length = reader.uint(); if (length > bytes.length - at) throw Error('truncated text'); const text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes.slice(at, at + length))); at += length; return text; },
          };
          const result = readSelector(reader);
          if (at !== bytes.length) throw Error('trailing bytes');
          return result;
        }
        return selectors.map(({ source, bytes }) => {
          const data = decode(bytes), rendered = renderSelector(data, null);
          // Every proper prefix of a message must fail, not silently create a
          // shorter selector. Also exercise the bounded reader before rendering.
          for (let at = 0; at < bytes.length; at++) {
            let rejected = false;
            try { decode(bytes.slice(0, at)); } catch { rejected = true; }
            if (!rejected) throw Error('Accepted truncated selector: ' + source + ' at ' + at);
          }
          for (const invalid of [[2], [1, 0], [1, 129, 4], [...bytes, 0]]) {
            let rejected = false;
            try { decode(invalid); } catch { rejected = true; }
            if (!rejected) throw Error('Accepted malformed selector wire data');
          }
          return { source, rendered, data, parsed: parseConstrainedSelector(source), native: ids(source), semantic: ids(rendered) };
        });
      }, selectors.map(source => ({ source, bytes: selectorBytes(source) })));
      for (const sample of samples) {
        assert.deepEqual(sample.data, sample.parsed, sample.source);
        assert.deepEqual(sample.semantic, sample.native, sample.source + ' -> ' + sample.rendered);
      }
    } finally { await page.close(); }
  });
  await t.test('game, book, and native editor styles fit the semantic representation', async () => {
    const editor = await build({
      entryPoints: [new URL('../src/guest.js', import.meta.url).pathname],
      banner: { js: 'globalThis.__CODE_EDITOR_DEFER_START__=true;globalThis.__browserUseNotify=()=>{};' },
      footer: { js: '__codeEditorSetContent(JSON.stringify({language:"text",content:"function example() {\\n  return 42;\\n}\\n"}));' },
      bundle: true, write: false, format: 'esm', platform: 'browser',
    });
    const sources = await Promise.all(['microquickjs-suite/cat-memory/style.css',
      'microquickjs-suite/mahjong/style.css', 'sqlite-book/style.css'].map(async name => ({ name,
        css: await readFile(new URL('../../../dev/wasm-web-runtimes/examples/' + name, import.meta.url), 'utf8') })));
    sources.push({ name: 'presentation dialog', minimum: 1,
      css: '.reset-dialog::backdrop { background: #020806c9; backdrop-filter: blur(5px); }' });
    const page = await browser.newPage();
    try {
      await page.route('http://selector-renderer.test/**', route => {
        const path = new URL(route.request().url()).pathname;
        return route.fulfill(path === '/renderer.js' || path === '/editor.js'
          ? { body: path === '/renderer.js' ? bundle.outputFiles[0].text : editor.outputFiles[0].text, contentType: 'text/javascript' }
          : { body: '<div id="editor"></div>', contentType: 'text/html' });
      });
      await page.goto('http://selector-renderer.test/');
      const result = await page.evaluate(async sources => {
        const { parseConstrainedSelector, renderSelector } = await import('/renderer.js');
        await import('/editor.js');
        const failures = [], counts = {};
        const probe = new CSSStyleSheet();
        function inspect(name, rules) {
          for (const rule of rules) {
            if (rule.selectorText) {
              counts[name] = (counts[name] || 0) + 1;
              try {
                const ast = parseConstrainedSelector(rule.selectorText);
                for (const scope of [null, 'wwm-12345']) {
                  const selector = renderSelector(ast, scope, true);
                  probe.insertRule(selector + '{}', 0); probe.deleteRule(0);
                }
              } catch (error) { failures.push({ name, selector: rule.selectorText, error: String(error) }); }
            } else if (rule.cssRules) inspect(name, rule.cssRules);
          }
        }
        for (const { name, css } of sources) {
          const sheet = new CSSStyleSheet(); sheet.replaceSync(css); inspect(name, sheet.cssRules);
        }
        for (const sheet of document.styleSheets) inspect('CodeMirror', sheet.cssRules);
        return { failures, counts };
      }, sources);
      assert.ok(result.counts.CodeMirror > 30, JSON.stringify(result.counts));
      for (const source of sources) assert.ok(result.counts[source.name] >= (source.minimum || 10), JSON.stringify(result.counts));
      assert.deepEqual(result.failures, []);
      t.diagnostic(JSON.stringify(result.counts));
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
