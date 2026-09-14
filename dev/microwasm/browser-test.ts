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
async function checkDocumentViews(prefix: string, hexPath = `${prefix}.hex`) {
  // Check all six combinations. Content selection never selects a display.
  for (
    const [label, extension] of [["Original", "md"], [
      "Filled counts",
      "resolved.md",
    ], ["Hex", "hex"]]
  ) {
    const response = await context.request.get(
      new URL(extension === "hex" ? hexPath : `${prefix}.${extension}`, base)
        .href,
    );
    check(response.ok(), `Missing source ${prefix}.${extension}`);
    const original = await response.text();
    const expected = extension === "hex"
      ? "```hex\n" + original.trimEnd() + "\n```\n"
      : original;
    await page.getByRole("button", { name: label, exact: true }).click();
    check(
      await page.locator('[data-view="rendered"]').getAttribute(
        "aria-pressed",
      ) === "true",
      "Content changed display mode",
    );
    await page.getByRole("button", { name: "Markdown source", exact: true })
      .click();
    await page.waitForFunction((expected) => {
      const source = document.getElementById("source");
      return !source?.hidden && source?.textContent === expected;
    }, expected);
    await page.getByRole("button", { name: "Rendered", exact: true }).click();
    await page.waitForSelector("#rendered:visible");
    check(
      await page.locator(`[data-extension="${extension}"]`).getAttribute(
        "aria-pressed",
      ) === "true",
      "Display changed content selection",
    );
    if (extension === "hex") {
      check(
        await page.locator("#rendered pre code").textContent() ===
          original.trimEnd() + "\n",
        "Hex fence rendered differently",
      );
      const valid = await page.locator("#rendered pre code").evaluate((node) =>
        WebAssembly.validate(
          Uint8Array.from(
            node.textContent!.trim().split(/\s+/),
            (part) => parseInt(part, 16),
          ),
        )
      );
      check(valid, "Rendered hex is not valid Wasm");
    } else {
      check(
        await page.locator("#rendered h1").count() === 1,
        "Missing heading",
      );
      if (extension === "resolved.md") {
        check(
          !(await page.locator("#rendered li code").allTextContents()).some(
            (text) => text.includes("{{"),
          ),
          "Rendered counts unresolved",
        );
      }
    }
  }
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
  const rendererLinks = await page.locator("#renderer-pages a").evaluateAll((
    nodes,
  ) => nodes.map((node) => (node as HTMLAnchorElement).href));
  check(rendererLinks.length === 6, "Expected six renderer pages");
  const libraryLinks = await page.locator("#library-pages a").evaluateAll((
    nodes,
  ) => nodes.map((node) => (node as HTMLAnchorElement).href));
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
    check(
      await page.locator("#rendered h1").count() === 1,
      "Missing rendered heading",
    );
    check(
      (await page.locator("#rendered pre").allTextContents()).some((text) =>
        text.startsWith("flowchart")
      ),
      "Mermaid must remain readable source",
    );
    check(
      await page.locator("#rendered ul ul").count() > 0,
      "Missing nested byte lists",
    );
    await checkDocumentViews(
      `./examples/${new URL(links[i]).searchParams.get("example")}`,
    );
    check(
      await page.evaluate(() =>
        document.documentElement.scrollWidth <= innerWidth
      ),
      `Example ${i + 1}: horizontal overflow`,
    );
    console.log(`${i + 1}/20 browser example passed`);
  }
  for (const link of rendererLinks) {
    await page.goto(link);
    await page.waitForSelector("#rendered h1");
    check(
      await page.locator("#rendered a[href]").count() > 0,
      "Page needs local navigation",
    );
    await checkDocumentViews(
      `./${new URL(link).searchParams.get("doc")!.slice(0, -3)}`,
      "./markdown-renderer.hex",
    );
  }
  for (const link of libraryLinks) {
    await page.goto(link);
    await page.waitForSelector("#rendered h1");
    await checkDocumentViews(
      `./${new URL(link).searchParams.get("doc")!.slice(0, -3)}`,
    );
  }
  const shortestPage = libraryLinks.find((link) =>
    link.includes("06-shortest-decimal")
  );
  check(shortestPage, "Missing shortest-decimal documentation link");
  await page.goto(shortestPage!);
  await page.waitForSelector("#rendered h1");
  await screenshot("shortest-decimal-light");
  // Execute the shipped dependency graph in Chromium, with no host numeric
  // callbacks. Native expected strings below are assertions, not imports.
  const conversions = await page.evaluate(async () => {
    async function load(name: string, imports: WebAssembly.Imports = {}) {
      const response = await fetch(`./numbers/${name}.wasm`);
      if (!response.ok) throw new Error(`Missing ${name}`);
      return (await WebAssembly.instantiateStreaming(response, imports))
        .instance.exports;
    }
    const n = await load("02-json-number");
    const b = await load("03-multiword", { n });
    const f = await load("04-json-binary64", { n, b });
    const d = await load("05-exact-decimal", { b });
    const s = await load("06-shortest-decimal", { f, d });
    const memory = new Uint8Array((s.memory as WebAssembly.Memory).buffer);
    return ["0.1", "-0", "1e-7", "1e21", "5e-324", "1.7976931348623157e308"]
      .map((text) => {
        const input = new TextEncoder().encode(text);
        memory.set(input);
        const number = (f.parse as (start: number, end: number) => number)(
          0,
          input.length,
        );
        const length = (s.format as (number: number) => number)(number);
        return new TextDecoder().decode(memory.subarray(65536, 65536 + length));
      });
  });
  check(
    JSON.stringify(conversions) === JSON.stringify([
      "0.1",
      "0",
      "1e-7",
      "1e+21",
      "5e-324",
      "1.7976931348623157e+308",
    ]),
    `Browser numeric conversions differ: ${conversions}`,
  );
  await page.goto(rendererLinks[0]);
  await page.waitForSelector("#rendered h1");
  await screenshot("renderer-module-light");
  await page.getByRole("link", { name: "Scanning patterns", exact: true })
    .click();
  await page.waitForSelector("#rendered h1");
  check(
    new URL(page.url()).searchParams.get("doc") === "renderer/02-scanning.md",
    "Local page navigation failed",
  );
  await screenshot("renderer-patterns-light");
  await page.goto(rendererLinks[3]);
  await page.waitForSelector("#rendered h1");
  check(
    await page.locator('#rendered a[data-href="https://example.com/"]')
      .getAttribute("href") === null,
    "External link became active",
  );
  check(
    await page.locator('#rendered a[data-href="javascript:evil"]').getAttribute(
      "href",
    ) === null,
    "Script link became active",
  );
  // Exercise policy and escaping in the real browser DOM, including a
  // GitHub-Pages-style prefix. No mock HTML parser or URL implementation.
  const linkPolicy = await page.evaluate(async () => {
    const { enableLocalLinks, createReader } = await import(
      new URL("./reader.js", location.href).href
    );
    const documents = [{ path: "renderer/02-scanning.md" }];
    const root = document.createElement("div");
    const targets = [
      "02-scanning.md",
      "../renderer/02-scanning.md",
      "https://evil.test/renderer/02-scanning.md",
      "//evil.test/a",
      "javascript:evil",
      "data:text/html,evil",
      "missing.md",
      "../../renderer/02-scanning.md",
      "02-scanning.md?track=1",
      "02-scanning.md#section",
      '02-scanning.md" onclick="evil',
    ];
    for (const target of targets) {
      const a = document.createElement("a");
      a.dataset.href = target;
      root.append(a);
    }
    enableLocalLinks(
      root,
      "renderer/00-module.md",
      documents,
      "https://site.test/project/?doc=x",
    );
    const actual = Array.from(root.children, (a) => a.getAttribute("href"));
    await createReader([]).render(
      '<img src="https://evil.test/x"> [<img>](x" onmouseover="evil&foo)',
      root,
      "renderer/00-module.md",
    );
    return {
      actual,
      tags: [...root.querySelectorAll("*")].map((el) => el.tagName),
      attrs: [...root.querySelectorAll("a")].flatMap((el) =>
        el.getAttributeNames()
      ),
    };
  });
  check(
    JSON.stringify(linkPolicy.actual.map(Boolean)) ===
      JSON.stringify([
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        false,
      ]),
    "Local-link allowlist differs",
  );
  check(
    linkPolicy.actual[0] ===
      "https://site.test/project/?doc=renderer%2F02-scanning.md",
    "Prefix not preserved",
  );
  check(
    JSON.stringify(linkPolicy.tags) === '["P","A"]',
    "Raw HTML created elements",
  );
  check(
    JSON.stringify(linkPolicy.attrs) === '["data-href"]',
    "Injected link attribute survived",
  );
  console.log(
    "Six renderer pages, local navigation, escaping and link policy passed",
  );
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
  check(
    await page.locator("#output").textContent() === JSON.stringify(converted),
    "CSV should use readable short JSON escapes, including \\n",
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
  await page.locator("#rendered").scrollIntoViewIfNeeded();
  check(
    (await page.locator("#rendered").textContent())!.includes("neighbors"),
    "Mobile source missing",
  );
  await page.locator("#rendered").screenshot({
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
