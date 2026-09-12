import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

// Isolate the browser-history problem from Wasm: a failed navigation must not
// invalidate the long-lived layout/lifetime experiment's later assertions.
test("reusing rendering frames preserves fragment history across a live update", {
  todo: "Blob document replacement does not preserve the active app's earlier history",
  timeout: 10_000,
}, async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("http://history.test/", route => route.fulfill({
    contentType: "text/html", body: "<!doctype html><main></main>",
  }));
  await page.goto("http://history.test/");
  await page.evaluate(async () => {
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
    const first = frames[0].contentWindow;
    for (const hash of ['#/chapter.html#details', '#details']) await new Promise(resolve => {
      first.addEventListener('hashchange', resolve, { once: true });
      first.location.hash = hash;
    });
    // Prepare the other existing frame, carrying the active route into its
    // fresh document. Replacing an entry avoids appending one per edit.
    const url = URL.createObjectURL(new Blob([shell], { type: 'text/html' }));
    URL.revokeObjectURL(urls[1]); urls.push(url);
    await new Promise(resolve => {
      frames[1].onload = resolve;
      frames[1].contentWindow.location.replace(url + first.location.hash);
    });
    URL.revokeObjectURL(urls[0]);
    window.activeDocument = frames[1].contentDocument;
  });
  const event = page.waitForEvent('framenavigated', { predicate: frame => frame !== page.mainFrame(), timeout: 3000 });
  await page.evaluate(() => history.back());
  await event;
  const result = await page.evaluate(() => {
    const frame = framesUnderTest[1];
    const doc = frame.contentDocument;
    return { sameDocument: doc === activeDocument, appPresent: !!doc?.querySelector('#app'),
      activeRoute: doc?.location.hash.slice(1) ?? null, outerURL: location.href };
  });
  t.diagnostic(JSON.stringify(result));
  assert.deepEqual(result, { sameDocument: true, appPresent: true,
    activeRoute: '/chapter.html#details', outerURL: 'http://history.test/' });
});
