/// <reference lib="dom" />
// Optional browser verification. Playwright is tooling, not a demo dependency.
import { chromium } from "npm:playwright@1.60.0";

const base = Deno.args[0] ?? "http://127.0.0.1:8766/";
const artifacts = "dist/browser";
await Deno.mkdir(artifacts, { recursive: true });
Deno.env.set("TMPDIR", await Deno.realPath(artifacts));
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "light",
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
function check(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}
async function screenshot(name: string) {
  await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true });
}
try {
  await page.goto(base);
  await page.waitForSelector("#examples li:nth-child(20)");
  check(
    await page.locator("#examples li").count() === 20,
    "Expected twenty example links",
  );
  const links = await page.locator("#examples a").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLAnchorElement).href)
  );
  await screenshot("index-light");
  for (let i = 0; i < links.length; i++) {
    await page.goto(links[i]);
    await page.waitForFunction(() =>
      !!document.getElementById("output")?.textContent
    );
    check(
      await page.locator("#error").isHidden(),
      `Example ${i + 1}: load error`,
    );
    check(
      !await page.locator("#output").evaluate((node) =>
        node.classList.contains("failure")
      ),
      `Example ${i + 1}: default input failed`,
    );
    await page.getByRole("button", { name: "Filled counts", exact: true })
      .click();
    await page.waitForFunction(() => {
      const text = document.getElementById("source")?.textContent ?? "";
      return text.includes("microwasm:start") && !text.includes("{{");
    });
    await page.getByRole("button", { name: "Hex", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("source")?.textContent?.startsWith("00 61 73 6d")
    );
    const valid = await page.locator("#source").evaluate((node) => {
      const bytes = Uint8Array.from(
        node.textContent!.trim().split(/\s+/),
        (part) => parseInt(part, 16),
      );
      return WebAssembly.validate(bytes);
    });
    check(valid, `Example ${i + 1}: displayed hex not valid Wasm`);
    check(
      await page.evaluate(() =>
        document.documentElement.scrollWidth <= innerWidth
      ),
      `Example ${i + 1}: horizontal overflow`,
    );
    console.log(`${i + 1}/20 browser example passed`);
  }
  await page.goto(links[0]);
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent === "120"
  );
  await page.locator("#input").fill("6");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent === "720"
  );
  await page.locator("#input").fill("13");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForSelector("#output.failure");
  await page.locator("#input").fill("5");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent === "120"
  );
  await screenshot("factorial-light");

  await page.goto(links[18]);
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent?.startsWith("[[")
  );
  await page.locator("#input").fill(
    'name,note\r\nAda,"comma, and ""quote"""\r\n猫,"two\nlines"',
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent?.includes("猫")
  );
  const converted = JSON.parse((await page.locator("#output").textContent())!);
  check(
    JSON.stringify(converted) ===
      JSON.stringify([["name", "note"], ["Ada", 'comma, and "quote"'], [
        "猫",
        "two\nlines",
      ]]),
    "CSV browser result differs",
  );
  await screenshot("csv-light");
  await page.emulateMedia({ colorScheme: "dark" });
  await screenshot("csv-dark");

  await page.goto(links[19]);
  await page.waitForSelector("#board button:nth-child(256)");
  await page.getByRole("button", { name: "Blinker", exact: true }).click();
  const before = await page.locator("#board button").evaluateAll((nodes) =>
    nodes.map((node) => node.classList.contains("alive"))
  );
  await page.getByRole("button", { name: "Step", exact: true }).click();
  const after = await page.locator("#board button").evaluateAll((nodes) =>
    nodes.map((node) => node.classList.contains("alive"))
  );
  check(
    JSON.stringify(before) !== JSON.stringify(after),
    "Blinker did not change",
  );
  await page.getByRole("button", { name: "Step", exact: true }).click();
  const restored = await page.locator("#board button").evaluateAll((nodes) =>
    nodes.map((node) => node.classList.contains("alive"))
  );
  check(
    JSON.stringify(before) === JSON.stringify(restored),
    "Blinker did not return after two steps",
  );
  await page.getByRole("button", { name: "Glider", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("output")?.textContent?.startsWith("Generation 4")
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await screenshot("life-dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth
    ),
    "Mobile horizontal overflow",
  );
  // Visit the lower panel too: a full-page capture alone can leave an
  // offscreen overflow scroller unrasterized in Chromium.
  await page.locator("#source").scrollIntoViewIfNeeded();
  check(
    (await page.locator("#source").textContent())!.includes("neighbors"),
    "Mobile source missing",
  );
  await page.locator("#source").screenshot({
    path: `${artifacts}/life-mobile-source.png`,
  });
  await page.evaluate(() => scrollTo(0, 0));
  await screenshot("life-mobile");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("button", { name: "Cell 1, 1", exact: true }).click();
  check(
    await page.getByRole("button", { name: "Cell 1, 1", exact: true })
      .getAttribute("aria-pressed") === "true",
    "Cell edit did not work",
  );
  await page.getByRole("button", { name: "Step", exact: true }).click();
  check(
    await page.locator("#board .alive").count() === 0,
    "Isolated cell did not die",
  );
  check(errors.length === 0, `Browser errors: ${errors.join("\n")}`);
  console.log(`Browser checks passed. Screenshots: ${artifacts}/`);
} finally {
  await browser.close();
}
