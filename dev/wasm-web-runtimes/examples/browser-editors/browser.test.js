import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const origins = {
  prosemirror: "http://prosemirror-quickjs.localhost:3030/",
  wordgard: "http://wordgard-quickjs.localhost:3030/",
  xterm: "http://xterm-quickjs.localhost:3030/",
};

async function pageFor(browser, name) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(origins[name]);
  await page.waitForFunction(() => document.body.dataset.ready === "true");
  return { page, errors };
}

test("the editors run in QuickJS and preserve ordinary edit history", async () => {
  const browser = await chromium.launch();
  try {
    for (const name of ["prosemirror", "wordgard"]) {
      const { page, errors } = await pageFor(browser, name);
      const editor = page.locator("[contenteditable=true]").first();
      const initial = await editor.textContent();
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.type(" edited");
      await page.waitForTimeout(100);
      assert.match(await editor.textContent(), / edited$/);
      await page.keyboard.press("Control+z");
      await page.waitForTimeout(100);
      assert.equal(await editor.textContent(), initial);
      await page.keyboard.press("Control+Shift+z");
      await page.waitForTimeout(100);
      assert.match(await editor.textContent(), / edited$/);
      assert.deepEqual(errors, []);
      assert.deepEqual(await page.evaluate(() => globalThis.__quickjsExample.diagnostics), []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("formatting commands are handled by each guest editor", async () => {
  const browser = await chromium.launch();
  try {
    for (const name of ["prosemirror", "wordgard"]) {
      const { page, errors } = await pageFor(browser, name);
      const editor = page.locator("[contenteditable=true]").first();
      const word = await editor.evaluate(root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const start = walker.currentNode.data.indexOf("executing");
          if (start < 0) continue;
          const range = document.createRange();
          range.setStart(walker.currentNode, start);
          range.setEnd(walker.currentNode, start + "executing".length);
          const rect = range.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
        throw new Error("formatting test word was not found");
      });
      if (name === "prosemirror") {
        await page.mouse.dblclick(word.x, word.y);
        assert.equal(await page.evaluate(() => getSelection().toString()), "executing");
      } else {
        await editor.click();
        await page.keyboard.press("Control+a");
      }
      await page.getByRole("button", { name: "Bold" }).click();
      await page.waitForTimeout(100);
      if (name === "prosemirror") {
        assert.equal(await editor.locator("strong").textContent(), "executing");
      } else {
        assert.ok(await editor.locator("strong").count() > 0);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("xterm Pong renders, moves, pauses, and resets", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await pageFor(browser, "xterm");
    const input = page.locator(".xterm-helper-textarea");
    const rows = () => page.evaluate(() =>
      [...document.querySelectorAll(".xterm-rows > div")].map(row => row.textContent));
    await page.waitForTimeout(500);
    const before = await rows();
    const paddleRow = values => values.findIndex(value => value.includes("#"));
    await input.press("ArrowUp");
    await page.waitForTimeout(150);
    assert.ok(paddleRow(await rows()) < paddleRow(before));
    await input.press("Space");
    await page.waitForTimeout(150);
    const paused = await rows();
    assert.ok(paused.some(value => value.includes("PAUSED")));
    await page.waitForTimeout(350);
    assert.deepEqual(await rows(), paused);
    await page.getByRole("button", { name: "New game" }).click();
    await page.waitForTimeout(150);
    assert.ok(!(await rows()).some(value => value.includes("PAUSED")));
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => globalThis.__quickjsExample.diagnostics), []);
  } finally {
    await browser.close();
  }
});
