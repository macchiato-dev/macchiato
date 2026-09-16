// Browser validation only; none of Playwright is part of the generated output.
import { chromium } from "npm:playwright@1.60.0";
import { documents, extract, render } from "./workflow.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const bytes = await Deno.readFile("dist/workflow.wasm");
const { instance } = await WebAssembly.instantiate(bytes, {});
// Repeated transforms reuse the arena. Also recover cleanly after a bad input
// traps; no persistent allocator or renderer state may contaminate the next call.
for (let i = 0; i < 300; i++) {
  assert(
    render(instance.exports, new TextEncoder().encode("# Repeat"), 0, 0) ===
      "<h1>Repeat</h1>\n",
    "Repeat render",
  );
}
const pages = (instance.exports.memory as WebAssembly.Memory).buffer.byteLength;
for (let i = 0; i < 300; i++) {
  render(instance.exports, new TextEncoder().encode("# Repeat"), 0, 0);
}
assert(
  (instance.exports.memory as WebAssembly.Memory).buffer.byteLength === pages,
  "Arena must reuse memory",
);
let trapped = false;
try {
  render(instance.exports, new Uint8Array([255]), 0, 0);
} catch (error) {
  trapped = error instanceof WebAssembly.RuntimeError;
}
assert(trapped, "Invalid UTF-8 must trap");
assert(
  render(instance.exports, new TextEncoder().encode("Recovered"), 0, 0) ===
    "<p>Recovered</p>\n",
  "Recovery after trap",
);
const brackets = "[".repeat(100_000);
assert(
  render(instance.exports, new TextEncoder().encode(brackets), 0, 0) ===
    `<p>${brackets}</p>\n`,
  "Unclosed brackets remain text",
);
await Deno.mkdir("dist/browser-temporary", { recursive: true });
Deno.env.set(
  "TMPDIR",
  new URL("./dist/browser-temporary", import.meta.url).pathname,
);
const browser = await chromium.launch({
  headless: true,
  args: [
    "--host-resolver-rules=MAP *.localhost 127.0.0.1",
    "--no-proxy-server",
  ],
});
try {
  const demoUrl = Deno.env.get("WORKFLOW_URL");
  if (demoUrl) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.on(
      "requestfailed",
      (request) =>
        console.error("Live request failed", request.url(), request.failure()),
    );
    const response = await page.goto(demoUrl, {
      waitUntil: "domcontentloaded",
      timeout: 10_000,
    });
    assert(response?.status() === 200, "Live demo must respond");
    assert(
      await page.locator(".keyword").count() > 100,
      "Live demo source highlighting",
    );
    await page.screenshot({ path: "dist/live-demo.png" });
    await page.close();
  }
  const expectedSources: string[] = [];
  for (const name of documents) {
    expectedSources.push(
      ...extract(await Deno.readTextFile(name)).files.values(),
    );
  }
  for (const dark of [false, true]) {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const requests: string[] = [];
      const errors: string[] = [];
      await page.route("**/*", (route) => {
        requests.push(route.request().url());
        return route.abort();
      });
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.setContent(
        await Deno.readTextFile(`dist/${dark ? "dark" : "index"}.html`),
      );
      assert(
        await page.locator("h1").count() >= 7,
        "All documents must appear",
      );
      assert(
        await page.locator(".keyword").count() > 100,
        "Source code must be highlighted",
      );
      const visibleSources = await page.locator("pre code").allTextContents();
      for (const source of expectedSources) {
        assert(
          visibleSources.includes(source),
          "Every extracted source must render intact, including the Deno server",
        );
      }
      assert(
        await page.locator("body").evaluate((body) =>
          body.scrollWidth <= body.ownerDocument.documentElement.clientWidth
        ),
        "Page must not overflow",
      );
      await page.screenshot({
        path: `dist/${dark ? "dark" : "light"}-${width}.png`,
      });
      // Capture the server source near the bottom as well as the first viewport.
      await page.getByRole("heading", {
        name: "Serving the complete demo with Deno",
      }).scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `dist/server-${dark ? "dark" : "light"}-${width}.png`,
      });
      assert(
        requests.length === 0 && errors.length === 0,
        "Document must load no resources or scripts",
      );
      await page.close();
    }
  }
  const attacks = [
    '<img src="https://exfil.invalid/pixel">',
    '<svg><image href="//exfil.invalid/pixel"/></svg>',
    "<style>body{background:url(https://exfil.invalid)}</style>",
    '<meta http-equiv="refresh" content="0;url=https://exfil.invalid">',
    '[click](javascript:location="https://exfil.invalid")',
    "![image](//exfil.invalid/image)",
    "~~~rust\n\"</code><script>location='https://exfil.invalid'</script>\"\n~~~",
    '~~~js\nconst x = "</style><img src=//exfil.invalid>";\n~~~',
  ];
  for (const csp of [true, false]) {
    const page = await browser.newPage();
    const requests: string[] = [];
    await page.route("**/*", (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    let html = render(
      instance.exports,
      new TextEncoder().encode(attacks.join("\n\n")),
      3,
      0,
    );
    if (!csp) {
      html = html.replace(
        /<meta http-equiv="Content-Security-Policy"[^>]*>\n/,
        "",
      );
    }
    await page.setContent(html);
    assert(
      await page.locator(
        "script,img,svg,iframe,object,embed,link,base,form,[href],[src],[srcset],[onclick]",
      ).count() === 0,
      "Active markup escaped",
    );
    await page.getByText("click", { exact: true }).click();
    await page.waitForTimeout(150);
    assert(
      requests.length === 0 && page.url() === "about:blank",
      "No requests or navigation without relying on CSP",
    );
    await page.close();
  }
  // The Rust renderer must preserve source bytes as visible code, including
  // Unicode, whitespace, lifetimes, escapes and malformed input.
  for (
    const source of [
      "fn café<'a>(x: &'a str) {\n\t/* 🌱 */\n}\n",
      'r##"<x>"##',
      "'λ' '\\n' 'life",
      "/* unfinished",
      '"&amp;"',
    ]
  ) {
    const page = await browser.newPage();
    await page.setContent(
      render(instance.exports, new TextEncoder().encode(source), 1, 0),
    );
    assert(
      await page.locator("code").textContent() === source,
      "Highlighting must preserve exact source",
    );
    await page.close();
  }
  console.log(
    "Browser checks passed: complete documents, desktop/mobile, both themes, source fidelity, inert output with and without CSP.",
  );
} finally {
  await browser.close();
}
