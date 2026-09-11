import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

// A native editing control, not a replacement for CodeMirror's input handling.
// Equal-length inputs distinguish line construction from the amount of text.
// Run separately from builds and other browser tests when comparing timings.
test("native bulk insertion controls record editing mode and line-construction costs", { timeout: 180_000 }, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const source = await readFile(process.env.MACCHIATO_TEST_SOURCE_FILE ||
    join(root, "packages/website/content-form-client.js"), "utf8");
  const multiline = `<!--\n${source.replaceAll("-->", "-- >")}\n-->\n<h1>Large input</h1>`;
  const singleLine = multiline.replaceAll("\n", " ");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const results = [];
  // CodeMirror requests plaintext editing through CSS. Compare that with
  // rich contenteditable and the plaintext-only HTML attribute, without
  // installing any editor, observer, or input-canceling handler.
  const cases = ["rich", "plaintext-css", "plaintext-attribute"].flatMap(mode =>
    ["single-line", "multiline"].map(shape => ({ mode, shape })));
  // Reverse the order on the second pass to expose warmup/order effects.
  for (const [run, { mode, shape }] of [...cases, ...cases.toReversed()].entries()) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("http://native-input.test/**", route => route.fulfill({
      contentType: "text/html", body: `<!doctype html><title>Native input control</title>
        <style>
          body { margin: 0; }
          #editor { position: absolute; top: 56px; bottom: 0; width: 585px;
            overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere;
            font: 13px/1.4 monospace; background: #eff5ff; }
          ${mode === "plaintext-css" ? '#editor { -webkit-user-modify: read-write-plaintext-only; }' : ''}
        </style><div id="editor" contenteditable="${mode === "plaintext-attribute" ? "plaintext-only" : "true"}" spellcheck="false">before</div>`,
    }));
    await page.goto("http://native-input.test/");
    const editor = page.locator("#editor");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" warmup");
    await page.keyboard.press("Control+A");
    await page.evaluate(() => {
      window.events = { beforeinput: 0, input: 0 };
      for (const type of Object.keys(events)) document.addEventListener(type, () => events[type]++);
    });
    const text = shape === "multiline" ? multiline : singleLine;
    const started = performance.now();
    await page.keyboard.insertText(text);
    const elapsed = performance.now() - started;
    const actual = await editor.innerText();
    let difference = 0;
    while (difference < text.length && actual[difference] === text[difference]) difference++;
    // Native innerText includes extra paragraph breaks in this source. Record
    // them rather than treating this control as a plain-text editor. The
    // separate CodeMirror benchmark requires exact editor-state equality.
    assert.ok(actual.replaceAll("\n", "") === text.replaceAll("\n", ""), "non-newline text is preserved");
    results.push({ run, mode, shape, characters: text.length, lines: text.split("\n").length,
      returnedCharacters: actual.length, exactText: actual === text,
      firstDifference: actual === text ? null : difference,
      milliseconds: Math.round(elapsed), events: await page.evaluate(() => events) });
    t.diagnostic(JSON.stringify(results.at(-1)));
    await page.keyboard.press("Control+z");
    assert.equal(await editor.innerText(), "before warmup", "native undo restores the preceding text");
    await page.keyboard.press("Control+y");
    assert.equal(await editor.innerText(), actual, "redo reproduces the native result");
    assert.deepEqual(errors, []);
    await context.close();
  }
  if (process.env.MACCHIATO_TEST_ARTIFACTS) {
    await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
    await writeFile(join(process.env.MACCHIATO_TEST_ARTIFACTS, "native-input.json"), JSON.stringify(results, null, 2));
  }
});
