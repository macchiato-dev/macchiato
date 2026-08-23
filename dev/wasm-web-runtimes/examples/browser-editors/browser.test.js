import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

const origin = process.env.MACHINES_DEV_ORIGIN || "http://machines-dev.localhost:3030";
const dataDir = process.env.MACHINES_DEV_DATA_DIR ||
  join(process.env.HOME || "/root", ".macchiato", "default");
const apiKey = process.env.MACHINES_DEV_API_KEY ||
  JSON.parse(readFileSync(join(dataDir, ".machines-dev-auth.json"), "utf8")).apiKey;
const origins = {
  prosemirror: `${origin}/prosemirror/`,
  wordgard: `${origin}/wordgard/`,
  xterm: `${origin}/xterm/pong/`,
  "xterm-terminal": `${origin}/xterm/terminal/`,
};

async function pageFor(browser, name) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/#${encodeURIComponent(apiKey)}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(url => url.hash === "");
  await page.getByText("Macchiato machine examples").waitFor();
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
      assert.match(await editor.textContent(), / edited/);
      await page.keyboard.press("Control+z");
      await page.waitForTimeout(100);
      assert.equal(await editor.textContent(), initial);
      await page.keyboard.press("Control+Shift+z");
      await page.waitForTimeout(100);
      assert.match(await editor.textContent(), / edited/);
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

test("ProseMirror preserves macOS Emacs keys", async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
  });
  try {
    const { page, errors } = await pageFor(context, "prosemirror");
    const editor = page.locator("[contenteditable=true]").first();
    await editor.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("X");
    await page.waitForTimeout(100);
    assert.match(await editor.locator("p").nth(1).textContent(), /^XSelect text/);

    await page.keyboard.press("Control+End");
    await page.keyboard.press("Control+b");
    await page.keyboard.type("Y");
    await page.waitForTimeout(100);
    assert.match(await editor.textContent(), /\.Y$/);
    assert.equal(await editor.locator("strong").count(), 0);

    const word = await editor.evaluate(root => {
      const text = root.querySelector("p").firstChild;
      const start = text.data.indexOf("executing");
      const range = document.createRange();
      range.setStart(text, start);
      range.setEnd(text, start + "executing".length);
      const rect = range.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.dblclick(word.x, word.y);
    await page.keyboard.press("Meta+i");
    await page.waitForTimeout(100);
    assert.equal(await editor.locator("em").textContent(), "executing");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
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
    for (let sample = 0; sample < 12; sample += 1) {
      assert.equal((await rows()).join("").split("#").length - 1, 6,
        "both Pong paddles remain three cells tall");
      await page.waitForTimeout(60);
    }
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

test("the ordinary xterm accepts typing and text selection", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await pageFor(browser, "xterm-terminal");
    const input = page.locator(".xterm-helper-textarea");
    await input.pressSequentially("echo hello terminal");
    await input.press("Enter");
    await page.waitForTimeout(100);
    const row = page.locator(".xterm-rows > div").filter({ hasText: "hello terminal" }).last();
    assert.match(await row.textContent(), /hello terminal/);
    const rect = await row.boundingBox();
    const cell = rect.width / 72;
    await page.mouse.move(rect.x + cell * 2.5, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + cell * 7.5, rect.y + rect.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    const selection = page.locator(".xterm-selection div");
    assert.ok(await selection.count() > 0);
    const selectedRect = await selection.first().boundingBox();
    assert.ok(selectedRect.width > cell * 3 && selectedRect.width < cell * 8);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
