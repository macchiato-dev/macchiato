import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { compileSingleFileProject } from "../../../packages/project-editor/src/single-file-compiler.js";
import { representativeProjectSource } from "./fixtures.js";

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

test("the supervised controller serves every example route without browser failures", async () => {
  const browser = await chromium.launch({ headless: true });
  const examples = new Map([
    ["cat-memory/", "Cat Memory Match"],
    ["mahjong/", "Classic Mahjong Solitaire"],
    ["sqlite-book/", "SQLite Documentation Reader"],
    ["codemirror/", "CodeMirror in QuickJS"],
    ["microquickjs/", "CodeMirror in MicroQuickJS"],
    ["prosemirror/", "ProseMirror"],
    ["quickjs/", "CodeMirror in QuickJS"],
    ["wordgard/", "Wordgard"],
    ["xterm/", "xterm.js in QuickJS"],
    ["container/", "Wasm Web Container"],
  ]);
  try {
    for (const [path, expected] of examples) {
      const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
      const failures = [];
      page.on("pageerror", (error) => failures.push(error.message));
      page.on("requestfailed", (request) => failures.push(`${request.failure()?.errorText} ${request.url()}`));
      const response = await page.goto(`${origin}/${path}`, {
        timeout: 30_000,
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(1_000);
      assert.equal(response.status(), 200, path);
      assert.match(await page.locator("body").innerText(), new RegExp(expected, "i"), path);
      assert.deepEqual(failures, [], path);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("server and browser compilation use the same project contract", async () => {
  const expected = compileSingleFileProject(representativeProjectSource);
  const response = await fetch(`${origin}/editor/compile`, {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: representativeProjectSource,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), expected);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  try {
    const navigation = await page.goto(`${origin}/editor/?compile=client`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    assert.equal(navigation.status(), 200);
    await page.locator("#output article").waitFor();
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }
});
