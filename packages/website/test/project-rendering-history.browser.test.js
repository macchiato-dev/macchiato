import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

// Isolate the browser-history problem from Wasm: a failed navigation must not
// invalidate the long-lived layout/lifetime experiment's later assertions.
for (const stableDocuments of [false, true]) test(`fragment history across a live update (${stableDocuments ? 'stable documents and controller route' : 'replaced documents'})`, {
  todo: stableDocuments ? false : "Blob document replacement does not preserve the active app's earlier history",
  timeout: 10_000,
}, async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("http://history.test/", route => route.fulfill({
    contentType: "text/html", body: "<!doctype html><main></main>",
  }));
  await page.goto("http://history.test/");
  await page.evaluate(async stableDocuments => {
    const frames = [], urls = [];
    window.framesUnderTest = frames;
    window.urlsUnderTest = urls;
    const shell = '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'"><p id="app">Application</p>';
    for (let index = 0; index < 2; index++) {
      const frame = document.createElement('iframe');
      frame.sandbox = 'allow-same-origin';
      const url = URL.createObjectURL(new Blob([shell], { type: 'text/html' }));
      urls.push(url); frame.src = url;
      await new Promise(resolve => { frame.onload = resolve; document.querySelector('main').append(frame); });
      frames.push(frame);
    }
    const first = stableDocuments ? window : frames[0].contentWindow;
    for (const hash of ['#/chapter.html#details', '#details']) await new Promise(resolve => {
      first.addEventListener('hashchange', resolve, { once: true });
      first.location.hash = hash;
    });
    // Compare resetting an existing DOM with replacing its entire Document.
    if (stableDocuments) {
      const doc = frames[1].contentDocument;
      const content = doc.createElement('p');
      content.id = 'app'; content.textContent = 'Application revision 2';
      doc.body.replaceChildren(content);
    } else {
      const url = URL.createObjectURL(new Blob([shell], { type: 'text/html' }));
      URL.revokeObjectURL(urls[1]); urls.push(url);
      await new Promise(resolve => {
        frames[1].onload = resolve;
        frames[1].contentWindow.location.replace(url + first.location.hash);
      });
      URL.revokeObjectURL(urls[0]);
    }
    window.activeDocument = frames[1].contentDocument;
  }, stableDocuments);
  const event = page.waitForEvent('framenavigated', {
    predicate: frame => stableDocuments ? frame === page.mainFrame() : frame !== page.mainFrame(), timeout: 3000 });
  await page.evaluate(() => history.back());
  await event;
  const result = await page.evaluate(stableDocuments => {
    const frame = framesUnderTest[1];
    const doc = frame.contentDocument;
    return { sameDocument: doc === activeDocument, appPresent: !!doc?.querySelector('#app'),
      activeRoute: (stableDocuments ? location : doc?.location)?.hash.slice(1) ?? null,
      outerURL: location.origin + location.pathname };
  }, stableDocuments);
  t.diagnostic(JSON.stringify(result));
  assert.deepEqual(result, { sameDocument: true, appPresent: true,
    activeRoute: '/chapter.html#details', outerURL: 'http://history.test/' });
  if (stableDocuments) assert.equal(await page.evaluate(() => activeDocument.body.textContent), 'Application revision 2');
});

test('a reused rendering Document retains its CSP after replacing the root', async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const requests = [];
  await page.route('**/*', route => {
    if (route.request().url() === 'http://policy.test/') return route.fulfill({
      contentType: 'text/html', body: '<!doctype html><main></main>',
    });
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto('http://policy.test/');
  const result = await page.evaluate(async () => {
    const frame = document.createElement('iframe');
    frame.sandbox = 'allow-same-origin';
    const url = URL.createObjectURL(new Blob([
      '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; img-src data:"><body></body>',
    ], { type: 'text/html' }));
    frame.src = url;
    await new Promise(resolve => { frame.onload = resolve; document.body.append(frame); });
    const doc = frame.contentDocument;
    const violations = [];
    doc.addEventListener('securitypolicyviolation', event => violations.push(event.effectiveDirective));
    for (let index = 0; index < 3; index++) {
      const root = doc.createElement('html');
      root.append(doc.createElement('head'), doc.createElement('body'));
      doc.replaceChild(root, doc.documentElement);
      // The policy's original meta no longer exists. The browser must still
      // reject external images, independently of the machine's allowlisting.
      const image = doc.createElement('img');
      await new Promise(resolve => {
        image.onerror = resolve;
        image.src = 'https://untrusted.invalid/leak-' + index;
        doc.body.append(image);
      });
      const script = doc.createElement('script');
      script.textContent = 'globalThis.unexpectedExecution = true';
      doc.body.append(script);
    }
    const result = { sameDocument: frame.contentDocument === doc,
      executed: frame.contentWindow.unexpectedExecution === true,
      imageViolations: violations.filter(name => name === 'img-src').length };
    frame.remove(); URL.revokeObjectURL(url);
    return result;
  });
  assert.deepEqual(result, { sameDocument: true, executed: false, imageViolations: 3 });
  assert.deepEqual(requests, [], 'blocked resources never reach the network');
});
