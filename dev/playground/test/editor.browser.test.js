import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { compileSingleFileProject } from "../../../packages/project-editor/src/single-file-compiler.js";
import { decodeResourceBundle } from "../../../packages/wasm-web-container/src/resource-bundle.js";
import { representativeProjectSource } from "./fixtures.js";

const origin = process.env.PLAYGROUND_ORIGIN || "http://machines-dev.localhost:3030";
const dataDir = process.env.PLAYGROUND_DATA_DIR || join(process.env.HOME || "/root", ".macchiato", "default");

function apiKey() {
  return process.env.PLAYGROUND_API_KEY || JSON.parse(readFileSync(join(dataDir, ".machines-dev-auth.json"), "utf8")).apiKey;
}

async function authenticate(page) {
  await page.goto(`${origin}/#${encodeURIComponent(apiKey())}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.hash === "");
  await page.getByText("Macchiato machine examples").waitFor();
}

async function authenticatedCookie() {
  const response = await fetch(`${origin}/-/development-auth`, { method: "POST", body: apiKey() });
  assert.equal(response.status, 204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

async function exportProject(page) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("[data-export-bin]").click(),
  ]);
  assert.equal(download.suggestedFilename(), "untitled-project.bin.gz");
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const compressed = new Uint8Array(Buffer.concat(chunks));
  assert.deepEqual([...compressed.slice(0, 2)], [0x1f, 0x8b]);
  const uncompressed = await new Response(new Blob([compressed]).stream()
    .pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  return decodeResourceBundle(new Uint8Array(uncompressed));
}

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
    await authenticate(page);
    const response = await page.goto(`${origin}/editor/`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    assert.equal(response.status(), 200);
    await page.locator(".cm-editor").waitFor();
    await page.locator("#output article").waitFor();

    const roots = await page.evaluate(() => {
      const frontend = document.querySelector("[data-resources-frontend-root]");
      const editor = document.querySelector('section[aria-label="Editor"]');
      const output = document.querySelector("#output");
      return {
        distinct: frontend !== editor && frontend !== output && editor !== output,
        frontendContainsEditor: frontend?.contains(editor) || false,
        scopes: [frontend, editor, output].map((node) =>
          [...node.classList].find((name) => /^wwm-[0-9a-f]{5}$/.test(name))),
      };
    });
    assert.equal(roots.distinct, true);
    assert.equal(roots.frontendContainsEditor, false);
    assert.equal(new Set(roots.scopes).size, 3);

    const exported = await exportProject(page);
    assert.equal(new TextDecoder().decode(exported.get("index.html")), await editorSource(page));

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

async function editorSource(page) {
  return page.locator(".cm-content").innerText();
}

test("the supervised controller serves every example route without browser failures", async () => {
  const browser = await chromium.launch({ headless: true });
  const examples = new Map([
    ["cat-memory/", "Cat Memory Match"],
    ["mahjong/", "Classic Mahjong Solitaire"],
    ["sqlite-book/", "SQLite Documentation Reader"],
    ["codemirror/", "CodeMirror in QuickJS"],
    ["microquickjs/", "CodeMirror in MicroQuickJS"],
    ["codemirror/microquickjs/full/", "projectSummary"],
    ["prosemirror/", "ProseMirror"],
    ["quickjs/", "CodeMirror in QuickJS"],
    ["wordgard/", "Wordgard"],
    ["xterm/", "xterm.js in QuickJS"],
    ["container/", "Wasm Web Container"],
  ]);
  try {
    for (const [path, expected] of examples) {
      const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
      await authenticate(page);
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

test("example documents use clean route-local asset paths", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await authenticate(page);
    const response = await page.goto(`${origin}/codemirror/full`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    assert.equal(response.status(), 200);
    await page.locator(".cm-editor").waitFor();
    assert.equal(page.url(), `${origin}/codemirror/full`);
    assert.equal(await page.locator("base").getAttribute("href"), "/codemirror/full/");
    assert.equal((await page.content()).includes("/@/"), false);
    const sourceMap = await page.request.get(`${origin}/sqlite-book/wasm-web-machine.js.map`);
    assert.equal(sourceMap.status(), 200);
    assert.match(sourceMap.headers()["content-type"], /^application\/json/);
    assert.equal((await sourceMap.json()).version, 3);
  } finally {
    await browser.close();
  }
});

test("server and client-Wasm builds produce projects while the page only renders artifacts", async () => {
  const expected = compileSingleFileProject(representativeProjectSource);
  const response = await fetch(`${origin}/editor/compile`, {
    method: "POST",
    headers: {
      "content-type": "text/plain; charset=utf-8",
      cookie: await authenticatedCookie(),
    },
    body: representativeProjectSource,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), expected);
  const blocked = await fetch(`${origin}/editor/compile`, {
    method: "POST",
    headers: {
      "content-type": "text/plain; charset=utf-8",
      cookie: await authenticatedCookie(),
    },
    body: '<style>body{background:url("https://tracker.example/pixel")}</style>',
  });
  assert.equal(blocked.status, 422);
  assert.match((await blocked.json()).error, /CSS function url is not allowed/);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  try {
    await authenticate(page);
    const navigation = await page.goto(`${origin}/editor/`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    assert.equal(navigation.status(), 200);
    await page.locator("#output article").waitFor();
    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText('<style>body{background:url("https://tracker.example/pixel")}</style>');
    await page.locator("footer", { hasText: "CSS function url is not allowed" }).waitFor();
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }

  const clientBrowser = await chromium.launch({ headless: true });
  const clientPage = await clientBrowser.newPage();
  const clientFailures = [];
  clientPage.on("pageerror", (error) => clientFailures.push(error.message));
  try {
    await authenticate(clientPage);
    const navigation = await clientPage.goto(`${origin}/editor/?build=client`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    assert.equal(navigation.status(), 200);
    await clientPage.locator("#output article").waitFor();
    assert.equal(await clientPage.locator("#output h1").evaluate((node) =>
      getComputedStyle(node).color), "rgb(159, 176, 255)");
    const exported = await exportProject(clientPage);
    assert.equal(new TextDecoder().decode(exported.get("index.html")), await editorSource(clientPage));
    assert.deepEqual(clientFailures, []);
  } finally {
    await clientBrowser.close();
  }
});
