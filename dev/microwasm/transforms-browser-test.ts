/// <reference lib="dom" />
import { chromium } from "npm:playwright@1.60.0";
import { transforms } from "./transforms.ts";

const base = Deno.args[0] ?? "http://microwasm.localhost:3030/";
const artifacts = "dist/browser";
await Deno.mkdir(artifacts, { recursive: true });
Deno.env.set("TMPDIR", await Deno.realPath(artifacts));
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
function check(ok: unknown, message: string) {
  if (!ok) throw new Error(message);
}
async function side(name: "input" | "output", mode: "Code" | "Rendered") {
  await page.getByRole("navigation", {
    name: `${name === "input" ? "Input" : "Output"} display`,
  }).getByRole("button", { name: mode, exact: true }).click();
  await page.locator(
    mode === "Code" ? `#transform-${name}` : `#transform-${name}-rendered`,
  ).waitFor({ state: "visible" });
}
try {
  for (const tool of transforms) {
    await page.goto(new URL(`?tool=${tool.id}`, base).href);
    const run = page.getByRole("button", { name: "Run", exact: true });
    await page.waitForFunction(() =>
      !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
    );
    check(
      await page.locator("#transform-input").inputValue() === tool.input,
      "Default input differs",
    );
    await run.click();
    await page.waitForFunction(
      (expected) =>
        (document.getElementById("transform-output") as HTMLTextAreaElement)
          ?.value === expected,
      tool.expected,
    );
    for (const name of ["input", "output"] as const) {
      await side(name, "Rendered");
      check(
        await page.locator(`#transform-${name}-rendered`).textContent(),
        "Rendered document empty",
      );
      await side(name, "Code");
    }
    await page.screenshot({
      path: `${artifacts}/${tool.id}-code.png`,
      fullPage: true,
    });
  }
  // Edit both panes, then render them independently. Output edits survive view
  // switches; only another successful Run replaces them.
  await page.locator("#transform-input").fill(
    "# [name]\n\n[unknown]\n\n- name: **猫**",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered h1 strong").textContent() ===
      "猫",
    "Output was not rendered as Markdown",
  );
  check(
    await page.locator("#transform-input").isVisible(),
    "Output mode changed input mode",
  );
  await side("output", "Code");
  await page.locator("#transform-output").fill(
    "# Manually edited\n\n[External](https://example.com/)",
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered h1").textContent() ===
      "Manually edited",
    "Output edit lost",
  );
  check(
    await page.locator("#transform-output-rendered a").getAttribute("href") ===
      null,
    "User link was enabled",
  );
  await side("input", "Rendered");
  await page.screenshot({
    path: `${artifacts}/mad-libs-rendered-light.png`,
    fullPage: true,
  });
  await side("input", "Code");
  await page.locator("#transform-input").fill("[x]\n- x: 1\ninvalid");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  check(
    await page.locator("#transform-output-rendered h1").textContent() ===
      "Manually edited",
    "Failed run replaced output",
  );
  await side("output", "Code");
  check(
    (await page.locator("#transform-output").inputValue()).startsWith(
      "# Manually edited",
    ),
    "Failed run replaced textarea",
  );
  await page.locator("#transform-input").fill("[x]\n- x: recovered");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "recovered"
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: `${artifacts}/mad-libs-dark.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth
    ),
    "Mobile overflow",
  );
  await page.screenshot({
    path: `${artifacts}/mad-libs-mobile.png`,
    fullPage: true,
  });
  check(errors.length === 0, `Browser errors: ${errors.join("\n")}`);
  console.log(
    `${transforms.length} transformation fixtures, editing, rendering, limits and recovery passed`,
  );
} finally {
  await browser.close();
}
