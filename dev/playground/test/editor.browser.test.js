import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const origin = process.env.PLAYGROUND_ORIGIN || "http://playground.localhost:3030";

test("machine editor renders, isolates CSS, preserves history, and refuses an overlong paste", async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    colorScheme: "light",
    permissions: ["clipboard-read", "clipboard-write"],
    viewport: { width: 1_440, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const response = await page.goto(`${origin}/editor/`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    assert.equal(response.status(), 200);
    await page.locator(".cm-editor").waitFor();
    await page.locator("#output article").waitFor();

    const isolation = await page.evaluate(() => {
      const probe = document.createElement("h1");
      probe.textContent = "Host probe";
      document.body.append(probe);
      return {
        host: getComputedStyle(probe).color,
        output: getComputedStyle(document.querySelector("#output h1")).color,
        scope: document.querySelector("#output").className,
      };
    });
    assert.notEqual(isolation.host, isolation.output);
    assert.match(isolation.scope, /(?:^|\s)wwm-[0-9a-f]{5}(?:\s|$)/);

    const editor = page.locator(".cm-content");
    const original = await editor.innerText();
    await page.evaluate((text) => navigator.clipboard.writeText(text), "p".repeat(257));
    await editor.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Control+v");
    await assert.doesNotReject(() => page.locator("footer", { hasText: "Paste refused" }).waitFor());
    assert.equal(await editor.innerText(), original);

    await page.keyboard.type("X");
    await page.waitForTimeout(500);
    assert.match(await editor.innerText(), /X$/);
    assert.ok(await page.evaluate(() => sessionStorage.getItem("-playground--editor")));
    await page.reload({ timeout: 30_000, waitUntil: "domcontentloaded" });
    await page.locator(".cm-editor").waitFor();
    assert.match(await page.locator(".cm-content").innerText(), /X$/);
    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+z");
    assert.doesNotMatch(await page.locator(".cm-content").innerText(), /X$/);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
