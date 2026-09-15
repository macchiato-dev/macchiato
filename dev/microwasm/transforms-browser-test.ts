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
  await page.goto(new URL("?tool=03-mad-libs", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
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
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(new URL("?tool=01-list-to-json", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  await page.locator("#transform-input").fill(
    "- {}\n  - name Ben\n  - tags []\n    - wasm\n    - = 12.50e+2\n  - enabled = true",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes("12.50e+2")
  );
  const good = await page.locator("#transform-output").inputValue();
  check(
    JSON.stringify(JSON.parse(good.slice(8, -5))) ===
      JSON.stringify({ name: "Ben", tags: ["wasm", 1250], enabled: true }),
    "Edited JSON tree differs",
  );
  await side("output", "Rendered");
  check(
    (await page.locator("#transform-output-rendered pre code").textContent())
      ?.includes("12.50e+2"),
    "JSON decimal spelling changed",
  );
  await page.screenshot({
    path: `${artifacts}/list-to-json-mixed.png`,
    fullPage: true,
  });
  await page.locator("#transform-input").fill("- {}\n  - broken = 01");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  await side("output", "Code");
  check(
    await page.locator("#transform-output").inputValue() === good,
    "Invalid JSON number replaced output",
  );
  await page.getByRole("link", { name: "Read the Microwasm implementation" })
    .click();
  await page.waitForSelector("#rendered h1");
  await page.getByRole("link", { name: "JSON number scanner", exact: true })
    .click();
  await page.waitForSelector("#rendered h1");
  check(
    new URL(page.url()).searchParams.get("doc") === "numbers/02-json-number.md",
    "Numeric dependency documentation link failed",
  );
  await page.goto(new URL("?tool=02-json-to-list", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  await page.locator("#transform-input").fill(
    '```json\n{"x":-0,"x":1.2300e+40,"nested":[true,"猫"]}\n```',
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  const converted =
    '- {}\n  - "x" = -0\n  - "x" = 1.2300e+40\n  - "nested" []\n    - = true\n    - "猫"\n';
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    converted,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered ul ul").count() > 0,
    "JSON output did not render as nested lists",
  );
  await page.screenshot({
    path: `${artifacts}/json-to-list-mixed.png`,
    fullPage: true,
  });
  await page.locator("#transform-input").fill('```json\n{"x":[1,]}\n```');
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  await side("output", "Code");
  check(
    await page.locator("#transform-output").inputValue() === converted,
    "Invalid fenced JSON replaced output",
  );
  await page.locator("#transform-input").fill("```json\n[]\n```");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "- []\n"
  );
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth
    ),
    "JSON to list mobile overflow",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(new URL("?tool=04-csv-to-table", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered th").allTextContents()
      .then((values) =>
        JSON.stringify(values) === JSON.stringify(["name", "city", "note"])
      ),
    "CSV headers differ",
  );
  check(
    await page.locator("#transform-output-rendered td").allTextContents()
      .then((values) =>
        JSON.stringify(values) ===
          JSON.stringify([
            "Ben",
            "Phoenix",
            "hello, world",
            "Ada",
            "London",
            'said "hi"',
          ])
      ),
    "CSV cell rendering differs",
  );
  await page.screenshot({
    path: `${artifacts}/csv-to-table-light.png`,
    fullPage: true,
  });
  await page.locator("#transform-input").fill(
    '```csv\nname,note\n"<img src=https://evil.invalid/x>","[link](https://evil.invalid/) **plain** &amp; |"\n" multiline ","first\nsecond"\n```',
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector("#transform-output-rendered td")?.textContent
      ?.startsWith("<img")
  );
  const csvCells = await page.locator("#transform-output-rendered td")
    .allTextContents();
  check(
    JSON.stringify(csvCells) === JSON.stringify([
      "<img src=https://evil.invalid/x>",
      "[link](https://evil.invalid/) **plain** &amp; |",
      " multiline ",
      "first\nsecond",
    ]),
    "Escaped CSV cell data changed",
  );
  check(
    await page.locator(
      "#transform-output-rendered img, #transform-output-rendered a, #transform-output-rendered strong, #transform-output-rendered script",
    ).count() === 0,
    "CSV cells introduced markup",
  );
  check(
    await page.locator("#transform-output-rendered td").last().evaluate((
      node,
    ) => getComputedStyle(node).whiteSpace) === "pre-wrap",
    "CSV embedded line breaks do not display",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: `${artifacts}/csv-to-table-dark.png`,
    fullPage: true,
  });
  await side("output", "Code");
  const csvGood = await page.locator("#transform-output").inputValue();
  await page.locator("#transform-input").fill("```csv\na,b\nx\n```");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  check(
    await page.locator("#transform-output").inputValue() === csvGood,
    "Invalid CSV width replaced successful output",
  );
  await page.locator("#transform-input").fill("```csv\na,b\nx,y\n```");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "| a | b |\n| --- | --- |\n| x | y |\n"
  );
  await side("output", "Rendered");
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth
    ),
    "CSV mobile overflow",
  );
  await page.screenshot({
    path: `${artifacts}/csv-to-table-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(new URL("?tool=05-table-to-csv", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  await page.locator("#transform-input").fill(
    "| note | text |\n| --- | --- |\n| &#32;edge&#32; | before&#10;&#96;&#96;&#96;&#10;after |",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  const csvBody = '"note","text"\n" edge ","before\n```\nafter"\n';
  const csvExport = "````csv\n" + csvBody + "````\n";
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    csvExport,
  );
  await side("input", "Rendered");
  check(
    await page.locator("#transform-input-rendered td").last().textContent() ===
      "before\n```\nafter",
    "Table input's decoded data differs",
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre code").count() === 1,
    "Embedded fence split the CSV output",
  );
  check(
    await page.locator("#transform-output-rendered pre code").textContent() ===
      csvBody,
    "Rendered CSV lost data",
  );
  await page.screenshot({
    path: `${artifacts}/table-to-csv-rendered.png`,
    fullPage: true,
  });
  await side("input", "Code");
  await page.locator("#transform-input").fill("| a | b |\n|---|\n|x|y|");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  check(
    await page.locator("#transform-output-rendered pre code").textContent() ===
      csvBody,
    "Invalid separator replaced successful CSV",
  );
  await page.locator("#transform-input").fill("|x|\n|---|");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector("#transform-output-rendered pre code")
      ?.textContent === '"x"\n'
  );
  for (
    const [id, input, expected, invalid] of [
      [
        "06-tsv-to-table",
        '```tsv\nname\tnote\nBen\t"quoted", literal\n```',
        '| name | note |\n| --- | --- |\n| Ben | "quoted",&#32;literal |\n',
        "```tsv\na\tb\nx\n```",
      ],
      [
        "07-table-to-tsv",
        '|name|note|\n|---|---|\n|Ben|"quoted", literal|',
        '```tsv\nname\tnote\nBen\t"quoted", literal\n```\n',
        "|name|note|\n|---|---|\n|Ben|line&#10;break|",
      ],
    ]
  ) {
    await page.goto(new URL(`?tool=${id}`, base).href);
    await page.waitForFunction(() =>
      !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
    );
    await page.locator("#transform-input").fill(input);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(
      (value) =>
        (document.getElementById("transform-output") as HTMLTextAreaElement)
          ?.value === value,
      expected,
    );
    await side("output", "Rendered");
    const content = id === "06-tsv-to-table"
      ? await page.locator("#transform-output-rendered td").last().textContent()
      : await page.locator("#transform-output-rendered pre code").textContent();
    check(
      content?.includes('"quoted", literal'),
      "TSV quote handling changed in the rendered view",
    );
    await page.screenshot({
      path: `${artifacts}/${id}-mixed.png`,
      fullPage: true,
    });
    await page.locator("#transform-input").fill(invalid);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === expected,
      "Invalid TSV input replaced output",
    );
    await page.locator("#transform-input").fill(input);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent === "Done."
    );
  }
  for (const id of ["12-json-pretty", "13-json-compact"]) {
    await page.goto(new URL(`?tool=${id}`, base).href);
    await page.waitForFunction(() =>
      !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
    );
    const input =
      '```json\n{ "x" : -0, "x": 1.2300E+40, "tags": [ "猫", "<b>```</b>" ] }\n```';
    const body = id === "12-json-pretty"
      ? '{\n  "x": -0,\n  "x": 1.2300E+40,\n  "tags": [\n    "猫",\n    "<b>```</b>"\n  ]\n}'
      : '{"x":-0,"x":1.2300E+40,"tags":["猫","<b>```</b>"]}';
    const expected = "```json\n" + body + "\n```\n";
    await page.locator("#transform-input").fill(input);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(
      (value) =>
        (document.getElementById("transform-output") as HTMLTextAreaElement)
          ?.value === value,
      expected,
    );
    await side("output", "Rendered");
    check(
      await page.locator("#transform-output-rendered pre code")
        .textContent() === body + "\n",
      "JSON tokens changed in the rendered output",
    );
    check(
      await page.locator("#transform-output-rendered b").count() === 0,
      "JSON string became HTML",
    );
    await page.screenshot({
      path: `${artifacts}/${id}-mixed.png`,
      fullPage: true,
    });
    await page.locator("#transform-input").fill('```json\n{"x":1,}\n```');
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === expected,
      "Invalid JSON replaced successful output",
    );
    await page.locator("#transform-input").fill("```json\n[]\n```");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === "```json\n[]\n```\n"
    );
  }
  for (
    const [id, input, output, invalid, recovered] of [
      [
        "14-json-lines-to-array",
        '```jsonl\n{ "x":-0, "x":1.2300E+40 }\n"a,b \\n <b>text</b>"\n[1,2]\n```',
        '```json\n[{"x":-0,"x":1.2300E+40},"a,b \\n <b>text</b>",[1,2]]\n```\n',
        "```jsonl\n1\n\n2\n```",
        "```json\n[]\n```\n",
      ],
      [
        "15-array-to-json-lines",
        '```json\n[{ "x":-0, "x":1.2300E+40 },"a,b \\n <b>text</b>",[1,2]]\n```',
        '```jsonl\n{"x":-0,"x":1.2300E+40}\n"a,b \\n <b>text</b>"\n[1,2]\n```\n',
        '```json\n{"not":"an array"}\n```',
        "```jsonl\n```\n",
      ],
    ]
  ) {
    await page.goto(new URL(`?tool=${id}`, base).href);
    await page.waitForFunction(() =>
      !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
    );
    await page.locator("#transform-input").fill(input);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(
      (expected) =>
        (document.getElementById("transform-output") as HTMLTextAreaElement)
          ?.value === expected,
      output,
    );
    await side("output", "Rendered");
    const body = output.slice(output.indexOf("\n") + 1, -4);
    check(
      await page.locator("#transform-output-rendered pre code")
        .textContent() === body,
      "JSON Lines rendered output differs from its literal records",
    );
    check(
      await page.locator("#transform-output-rendered b").count() === 0,
      "JSON Lines data was interpreted as HTML",
    );
    await page.screenshot({
      path: `${artifacts}/${id}-mixed.png`,
      fullPage: true,
    });
    await page.locator("#transform-input").fill(invalid);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === output,
      "Invalid record stream replaced the previous result",
    );
    await page.locator("#transform-input").fill(
      id === "14-json-lines-to-array" ? "```jsonl\n```" : "```json\n[]\n```",
    );
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(
      (expected) =>
        (document.getElementById("transform-output") as HTMLTextAreaElement)
          ?.value === expected,
      recovered,
    );
  }
  check(errors.length === 0, `Browser errors: ${errors.join("\n")}`);
  console.log(
    `${transforms.length} transformation fixtures, editing, rendering, limits and recovery passed`,
  );
} finally {
  await browser.close();
}
