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
  await page.goto(new URL("?tool=10-json-rows-to-table", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const typedInput =
    '```json\n[["name","value"],["a|b",{"x":1,"x":2}],["<b>text</b>","12"]]\n```';
  const typedOutput =
    '| "name" | "value" |\n| --- | --- |\n| "a&#124;b" | {"x":1,"x":2} |\n| "&#60;b&#62;text&#60;/b&#62;" | "12" |\n';
  await page.locator("#transform-input").fill(typedInput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    typedOutput,
  );
  await side("output", "Rendered");
  check(
    JSON.stringify(
      await page.locator("#transform-output-rendered td").allTextContents(),
    ) ===
      JSON.stringify(['"a|b"', '{"x":1,"x":2}', '"<b>text</b>"', '"12"']),
    "Typed JSON cells lost their source spelling or escaping",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "JSON cell markup escaped the table",
  );
  await page.screenshot({
    path: `${artifacts}/json-rows-to-table-mixed.png`,
    fullPage: true,
  });
  await page.locator("#transform-input").fill("```json\n[[1],[2,3]]\n```");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  await side("output", "Code");
  check(
    await page.locator("#transform-output").inputValue() === typedOutput,
    "Ragged rows replaced the previous table",
  );
  await page.locator("#transform-input").fill("```json\n[]\n```");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === "" &&
    document.getElementById("transform-status")?.textContent === "Done."
  );
  await page.goto(new URL("?tool=11-table-to-json-rows", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const typedTable =
    '|"name"|"value"|\n|---|---|\n|"a&#124;b"|{"x":1,"x":2}|\n|"&#60;b&#62;text&#60;/b&#62;"|1.2300E+40|';
  const typedJSON =
    '```json\n[["name","value"],["a|b",{"x":1,"x":2}],["<b>text</b>",1.2300E+40]]\n```\n';
  await page.locator("#transform-input").fill(typedTable);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    typedJSON,
  );
  await side("input", "Rendered");
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre code").textContent() ===
      typedJSON.slice(8, -4),
    "Typed table output lost its exact JSON tokens",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "Typed table JSON became HTML",
  );
  await page.screenshot({
    path: `${artifacts}/table-to-json-rows-rendered.png`,
    fullPage: true,
  });
  await side("input", "Code");
  await page.locator("#transform-input").fill('|"x"|\n|---|\n|1,2|');
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  await side("output", "Code");
  check(
    await page.locator("#transform-output").inputValue() === typedJSON,
    "Invalid multi-value cell replaced successful output",
  );
  await page.locator("#transform-input").fill("");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "```json\n[]\n```\n"
  );
  await page.goto(new URL("?tool=08-json-objects-to-table", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const objects = '```json\n[{"name":"<b>Ben</b>","score":null},' +
    '{"\\u006eame":"Ada","active":true},{}]\n```\n';
  await page.locator("#transform-input").fill(objects);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered th").allTextContents()
      .then((cells) => JSON.stringify(cells)) ===
      JSON.stringify(['"name"', '"score"', '"active"']),
    "Escaped key created an extra column or reordered the union",
  );
  check(
    await page.locator("#transform-output-rendered td").allTextContents()
      .then((cells) => JSON.stringify(cells)) ===
      JSON.stringify([
        '"<b>Ben</b>"',
        "null",
        "",
        '"Ada"',
        "",
        "true",
        "",
        "",
        "",
      ]),
    "Missing and null cells were conflated or literal markup was interpreted",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "JSON string created HTML",
  );
  await page.screenshot({
    path: `${artifacts}/json-object-union-rendered.png`,
    fullPage: true,
  });
  await side("output", "Code");
  const successfulObjects = await page.locator("#transform-output")
    .inputValue();
  await page.locator("#transform-input").fill(
    '```json\n[{"x":1,"\\u0078":2}]\n```',
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  check(
    await page.locator("#transform-output").inputValue() === successfulObjects,
    "Duplicate key failure replaced the successful table",
  );
  await page.locator("#transform-input").fill("```json\n[]\n```");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === ""
  );
  await page.goto(new URL("?tool=09-table-to-json-objects", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const objectTable = '|"&#92;u006eame"|"score"|"active"|\n|---|---|---|\n' +
    '|"&#60;b&#62;Ben&#60;/b&#62;"|null||\n|"Ada"||true|\n||||';
  const objectJSON = '```json\n[{"\\u006eame":"<b>Ben</b>","score":null},' +
    '{"\\u006eame":"Ada","active":true},{}]\n```\n';
  await page.locator("#transform-input").fill(objectTable);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    objectJSON,
  );
  await side("input", "Rendered");
  await side("output", "Rendered");
  check(
    await page.locator("#transform-input-rendered th").first().textContent() ===
      '"\\u006eame"',
    "Encoded header did not render as the original JSON spelling",
  );
  check(
    await page.locator("#transform-output-rendered pre code").textContent() ===
      objectJSON.slice(8, -4),
    "Object output lost the header spelling or missing/null distinction",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "Object value became HTML",
  );
  await page.screenshot({
    path: `${artifacts}/table-to-json-objects-rendered.png`,
    fullPage: true,
  });
  await side("input", "Code");
  for (
    const invalid of [
      '|"x"|"&#92;u0078"|\n|---|---|\n|1|2|',
      '|"x"|\n|---|\n|1,"y":2|',
    ]
  ) {
    await page.locator("#transform-input").fill(invalid);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === objectJSON,
      "Malformed object table replaced the previous output",
    );
  }
  await page.locator("#transform-input").fill('|"x"|\n|---|\n||');
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "```json\n[{}]\n```\n"
  );
  await page.goto(new URL("?tool=16-list-to-yaml", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const yamlInput =
    '- {}\n  - name "<b>Ben</b>"\n  - tags []\n    - false\n    - = false\n' +
    '    - "\\ud83d\\ude00"\n  - note "a\\nb"';
  const yamlOutput =
    '```yaml\n"name": "<b>Ben</b>"\n"tags":\n  - "false"\n  - false\n' +
    '  - "😀"\n"note": "a\\u000ab"\n```\n';
  await page.locator("#transform-input").fill(yamlInput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    yamlOutput,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre code").textContent() ===
      yamlOutput.slice(8, -4),
    "Rendered YAML lost quoting, indentation or Unicode escapes",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "YAML string became HTML",
  );
  await page.screenshot({
    path: `${artifacts}/list-to-yaml-rendered.png`,
    fullPage: true,
  });
  for (const invalid of ['- {}\n  - x one\n  - "\\u0078" two', '- "\\ud800"']) {
    await page.locator("#transform-input").fill(invalid);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === yamlOutput,
      "Invalid YAML data replaced the successful output",
    );
  }
  await page.locator("#transform-input").fill("- []");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "```yaml\n[]\n```\n"
  );
  await page.goto(new URL("?tool=17-yaml-to-list", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const yamlSource =
    "```yaml\nname: '<b>Ben</b>'\nitems:\n  - 'it''s fine'\n  - FALSE\n  -\nnested:\n  key: value\n```\n";
  const yamlList =
    '- {}\n  - "name" "<b>Ben</b>"\n  - "items" []\n    - "it\'s fine"\n    - = false\n    - = null\n  - "nested" {}\n    - "key" "value"\n';
  await page.locator("#transform-input").fill(yamlSource);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    yamlList,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered ul ul ul").count() >= 2,
    "YAML nested data was flattened in rendered output",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "YAML value became executable markup",
  );
  await page.screenshot({
    path: `${artifacts}/yaml-to-list-rendered.png`,
    fullPage: true,
  });
  for (
    const invalid of [
      "name: a\nname: b\n",
      "name:\n   invalid: indent\n",
      "key: *alias\n",
    ]
  ) {
    await page.locator("#transform-input").fill(
      "```yaml\n" + invalid + "```\n",
    );
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === yamlList,
      "Invalid YAML replaced successful list output",
    );
  }
  await page.locator("#transform-input").fill("```yaml\n[]\n```\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "- []\n"
  );
  await page.goto(new URL("?tool=18-list-to-toml", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const tomlInput =
    '- {}\n  - name "<b>Ben</b>"\n  - "a.b" {}\n    - empty []\n  - max = 9223372036854775807\n  - note "a\\nb"';
  const tomlOutput =
    '```toml\n"name" = "<b>Ben</b>"\n"a.b" = {"empty" = []}\n"max" = 9223372036854775807\n"note" = "a\\u000ab"\n```\n';
  await page.locator("#transform-input").fill(tomlInput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    tomlOutput,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre code").textContent() ===
      tomlOutput.slice(8, -4),
    "Rendered TOML changed quoting, numeric spelling or inline tables",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "TOML string became HTML",
  );
  await page.screenshot({
    path: `${artifacts}/list-to-toml-rendered.png`,
    fullPage: true,
  });
  for (
    const invalid of [
      "- {}\n  - x = null",
      "- {}\n  - x = 9223372036854775808",
      '- {}\n  - x one\n  - "\\u0078" two',
      "- []",
    ]
  ) {
    await page.locator("#transform-input").fill(invalid);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === tomlOutput,
      "Invalid TOML input replaced successful output",
    );
  }
  await page.locator("#transform-input").fill("- {}\n  - x = false");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === '```toml\n"x" = false\n```\n'
  );
  await page.goto(new URL("?tool=19-toml-to-list", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const tomlSource =
    "```toml\nname = '<b>Ben</b>'\nports = [\n  +8_080, # development\n  443,\n]\nnested = {empty = [], enabled = true}\n```\n";
  const tomlList =
    '- {}\n  - "name" "<b>Ben</b>"\n  - "ports" []\n    - = 8080\n    - = 443\n  - "nested" {}\n    - "empty" []\n    - "enabled" = true\n';
  await page.locator("#transform-input").fill(tomlSource);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    tomlList,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered ul ul ul").count() >= 2,
    "TOML array/table nesting disappeared in rendered output",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "TOML literal string became HTML",
  );
  await page.screenshot({
    path: `${artifacts}/toml-to-list-rendered.png`,
    fullPage: true,
  });
  for (
    const invalid of ["x=1\nx=2\n", "x={y=1,}\n", 'x="\\uD800"\n', "x=+-1\n"]
  ) {
    await page.locator("#transform-input").fill(
      "```toml\n" + invalid + "```\n",
    );
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === tomlList,
      "Invalid TOML replaced the previous list output",
    );
  }
  await page.locator("#transform-input").fill("```toml\nx=[]\n```\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === '- {}\n  - "x" []\n'
  );
  await page.goto(new URL("?tool=20-ini-to-list", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const iniSource =
    '```ini\nname=<b>Ben</b>\n[server]\nenabled=false\nport:3030\nnote="keep # this"\n[empty]\n```\n';
  const iniList =
    '- {}\n  - "" {}\n    - "name" "<b>Ben</b>"\n  - "server" {}\n    - "enabled" "false"\n    - "port" "3030"\n    - "note" "\\"keep # this\\""\n  - "empty" {}\n';
  await page.locator("#transform-input").fill(iniSource);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    iniList,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered ul ul ul").count() === 2,
    "INI assignments lost their section nesting",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "INI value became HTML",
  );
  await page.screenshot({
    path: `${artifacts}/ini-to-list-rendered.png`,
    fullPage: true,
  });
  for (const invalid of ["[a]\n[a]\n", "x=1\nx=2\n", "[a]\ninvalid\n"]) {
    await page.locator("#transform-input").fill("```ini\n" + invalid + "```\n");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === iniList,
      "Invalid INI replaced the successful output",
    );
  }
  await page.locator("#transform-input").fill("```ini\n[empty]\n```\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === '- {}\n  - "empty" {}\n'
  );
  await page.goto(new URL("?tool=21-list-to-ini", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const iniTree =
    '- {}\n  - "" {}\n    - title "<b>Notes</b>"\n  - server {}\n    - port "3030"\n    - enabled "false"\n    - note "a # b"\n  - empty {}';
  const iniOutput =
    "```ini\ntitle = <b>Notes</b>\n[server]\nport = 3030\nenabled = false\nnote = a # b\n[empty]\n```\n";
  await page.locator("#transform-input").fill(iniTree);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    iniOutput,
  );
  await side("input", "Rendered");
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre").textContent() ===
      iniOutput.slice(7, -4),
    "Rendered INI changed the emitted fence contents",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "INI output created an HTML element",
  );
  await page.screenshot({
    path: `${artifacts}/list-to-ini-rendered.png`,
    fullPage: true,
  });
  await side("input", "Code");
  for (
    const invalid of [
      '- {}\n  - "" {}',
      "- {}\n  - s {}\n    - x = false",
      '- {}\n  - s {}\n    - x "trailing "',
      '- {}\n  - s {}\n    - x "line\\nline"',
    ]
  ) {
    await page.locator("#transform-input").fill(invalid);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === iniOutput,
      "Unrepresentable INI data replaced the last successful output",
    );
  }
  await page.locator("#transform-input").fill("- {}\n  - empty {}");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "```ini\n[empty]\n```\n"
  );
  await page.goto(new URL("?tool=22-dotenv-to-list", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const envSource =
    '```dotenv\nexport TITLE="<b>Notes</b>"\nBODY="first\nsecond"\nLITERAL=\'${TITLE}\'\nPORT=3030 # remains a string\n```\n';
  const envList =
    '- {}\n  - "TITLE" "<b>Notes</b>"\n  - "BODY" "first\\nsecond"\n  - "LITERAL" "${TITLE}"\n  - "PORT" "3030"\n';
  await page.locator("#transform-input").fill(envSource);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    envList,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered ul ul > li").count() === 4,
    "Dotenv multiline text split an assignment into multiple items",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "Dotenv string became HTML",
  );
  check(
    (await page.locator("#transform-output-rendered").textContent())?.includes(
      "${TITLE}",
    ),
    "Dotenv variable reference was expanded",
  );
  await page.screenshot({
    path: `${artifacts}/dotenv-to-list-rendered.png`,
    fullPage: true,
  });
  for (const source of ["A=1\nA=2\n", 'A="unclosed\n', 'A="value" junk\n']) {
    await page.locator("#transform-input").fill(
      "```dotenv\n" + source + "```\n",
    );
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === envList,
      "Malformed dotenv replaced the last successful output",
    );
  }
  await page.locator("#transform-input").fill("```dotenv\nOK=yes\n```\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === '- {}\n  - "OK" "yes"\n'
  );
  await page.goto(new URL("?tool=23-list-to-dotenv", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const dotenvTree =
    '- {}\n  - TITLE "<b>Notes</b>"\n  - GREETING "Hello # friend"\n  - BODY "literal\\\\n\\n```\\nafter"\n  - LITERAL "${TITLE}"';
  const dotenvOutput =
    "````dotenv\nTITLE=<b>Notes</b>\nGREETING=\"Hello # friend\"\nBODY='literal\\n\n```\nafter'\nLITERAL=${TITLE}\n````\n";
  await page.locator("#transform-input").fill(dotenvTree);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    dotenvOutput,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre").count() === 1,
    "Literal backticks closed the dotenv output fence",
  );
  check(
    await page.locator("#transform-output-rendered pre").textContent() ===
      dotenvOutput.slice(11, -5),
    "Dotenv fence lost multiline data",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "Dotenv output became HTML",
  );
  await page.screenshot({
    path: `${artifacts}/list-to-dotenv-rendered.png`,
    fullPage: true,
  });
  for (
    const input of [
      "- {}\n  - A = false",
      '- {}\n  - A "#\\\\"',
      '- {}\n  - "bad key" value',
    ]
  ) {
    await page.locator("#transform-input").fill(input);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === dotenvOutput,
      "Unrepresentable dotenv value replaced successful output",
    );
  }
  await page.locator("#transform-input").fill("- {}\n  - OK yes");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "```dotenv\nOK=yes\n```\n"
  );
  await page.goto(new URL("?tool=22-dotenv-to-list", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  await page.locator("#transform-input").fill(dotenvOutput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes('"BODY" "literal\\\\n\\n```\\nafter"')
  );
  await page.goto(new URL("?tool=24-query-to-list", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const queryInput =
    "```query\n?tag=%3Cb%3ENotes%3C%2Fb%3E&tag=%E2%82A&=empty&flag\n```\n";
  const queryOutput =
    '- []\n  - []\n    - "tag"\n    - "<b>Notes</b>"\n  - []\n    - "tag"\n    - "�A"\n  - []\n    - ""\n    - "empty"\n  - []\n    - "flag"\n    - ""\n';
  await page.locator("#transform-input").fill(queryInput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    queryOutput,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "Decoded query data became HTML",
  );
  check(
    (await page.locator("#transform-output-rendered").textContent())?.includes(
      "�A",
    ),
    "Decoded replacement text was lost",
  );
  await page.screenshot({
    path: `${artifacts}/query-to-list-rendered.png`,
    fullPage: true,
  });
  await page.locator("#transform-input").fill("```query\na=b\nc=d\n```\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  await side("output", "Code");
  check(
    await page.locator("#transform-output").inputValue() === queryOutput,
    "Malformed query framing replaced successful output",
  );
  await page.locator("#transform-input").fill("```query\nx=%2B+y\n```\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value ===
      '- []\n  - []\n    - "x"\n    - "+ y"\n'
  );
  await page.goto(new URL("?tool=25-list-to-query", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const pairInput =
    '- []\n  - []\n    - tag\n    - "<b>Notes</b>"\n  - []\n    - tag\n    - "wasm + Markdown"\n  - []\n    - ""\n    - "😀\\n```"';
  const pairOutput =
    "```query\ntag=%3Cb%3ENotes%3C%2Fb%3E&tag=wasm+%2B+Markdown&=%F0%9F%98%80%0A%60%60%60\n```\n";
  await page.locator("#transform-input").fill(pairInput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    pairOutput,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre").count() === 1,
    "Query fields broke the output fence",
  );
  check(
    await page.locator("#transform-output-rendered pre").textContent() ===
      pairOutput.slice(9, -4),
    "Rendered query text differs from encoded bytes",
  );
  check(
    await page.locator("#transform-output-rendered b").count() === 0,
    "Query output became HTML",
  );
  await page.screenshot({
    path: `${artifacts}/list-to-query-rendered.png`,
    fullPage: true,
  });
  for (
    const invalid of [
      "- {}",
      "- []\n  - []\n    - name",
      "- []\n  - []\n    - name\n    - = false",
    ]
  ) {
    await page.locator("#transform-input").fill(invalid);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    await side("output", "Code");
    check(
      await page.locator("#transform-output").inputValue() === pairOutput,
      "Invalid pair shape replaced successful query output",
    );
  }
  await page.locator("#transform-input").fill("- []");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "```query\n\n```\n"
  );
  await page.goto(new URL("?tool=26-xml-to-list", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const xmlInput =
    '<r label="&lt;b&gt;">Hello <b>猫</b> &amp; 😀<!-- comment --><![CDATA[<script>inert</script>]]><?go yes?><b/></r>';
  // Chromium independently parses the document. Its node types preserve the
  // mixed-content order that a flattened element-to-object conversion loses.
  const xmlOutput = await page.evaluate((xml) => {
    function node(n: Node): unknown {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as Element;
        return {
          element: el.tagName,
          attributes: Object.fromEntries(
            [...el.attributes].map((a) => [a.name, a.value]),
          ),
          children: [...el.childNodes].map(node),
        };
      }
      if (n.nodeType === Node.TEXT_NODE) return { text: n.nodeValue };
      if (n.nodeType === Node.COMMENT_NODE) return { comment: n.nodeValue };
      if (n.nodeType === Node.CDATA_SECTION_NODE) return { cdata: n.nodeValue };
      const pi = n as ProcessingInstruction;
      return { pi: pi.target, data: pi.data };
    }
    function list(value: unknown, depth = 0, key = ""): string {
      const prefix = "  ".repeat(depth) + "- " + key;
      if (typeof value === "string") {
        return prefix + JSON.stringify(value) + "\n";
      }
      if (Array.isArray(value)) {
        return prefix + "[]\n" + value.map((v) => list(v, depth + 1)).join("");
      }
      return prefix + "{}\n" + Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => list(v, depth + 1, JSON.stringify(k) + " ")).join("");
    }
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) {
      throw Error("Invalid XML test fixture");
    }
    return list([...doc.childNodes].map(node));
  }, xmlInput);
  await page.locator("#transform-input").fill(
    "```xml\n" + xmlInput + "\n```\n",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    xmlOutput,
  );
  await side("input", "Rendered");
  await side("output", "Rendered");
  check(
    await page.locator("#transform-input-rendered pre").count() === 1,
    "XML did not render as one code fence",
  );
  check(
    await page.locator(
      "#transform-output-rendered b, #transform-output-rendered script",
    ).count() === 0,
    "XML values became active HTML",
  );
  check(
    (await page.locator("#transform-output-rendered").textContent())?.includes(
      "<script>inert</script>",
    ),
    "CDATA text was dropped from the rendered tree",
  );
  await page.screenshot({
    path: `${artifacts}/xml-to-list-rendered.png`,
    fullPage: true,
  });
  await side("input", "Code");
  await side("output", "Code");
  for (
    const invalid of [
      "<r></wrong>",
      '<r a="1" a="2"/>',
      "<!DOCTYPE r><r/>",
      "<r><?p?data?></r>",
    ]
  ) {
    await page.locator("#transform-input").fill(
      "```xml\n" + invalid + "\n```\n",
    );
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    check(
      await page.locator("#transform-output").inputValue() === xmlOutput,
      "Invalid XML replaced successful output",
    );
  }
  await page.locator("#transform-input").fill("```xml\n<r/>\n```\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value ===
      '- []\n  - {}\n    - "element" "r"\n    - "attributes" {}\n    - "children" []\n'
  );
  await page.goto(new URL("?tool=27-list-to-xml", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const xmlTree =
    '- []\n  - {}\n    - children []\n      - {}\n        - text "A & B\\r\\n"\n      - {}\n        - cdata "\\n```\\n<em>literal</em>"\n      - {}\n        - data yes\n        - pi go\n    - attributes {}\n      - label "<script>inert</script>"\n    - element r';
  const writtenXml =
    '<r label="&lt;script&gt;inert&lt;/script&gt;">A &amp; B&#13;\n<![CDATA[\n```\n<em>literal</em>]]><?go yes?></r>';
  const writtenFence = "````xml\n" + writtenXml + "\n````\n";
  await page.locator("#transform-input").fill(xmlTree);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    writtenFence,
  );
  const decodedXml = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) {
      throw Error("Writer produced malformed XML");
    }
    return {
      label: doc.documentElement.getAttribute("label"),
      text: doc.documentElement.firstChild?.nodeValue,
      cdata: doc.documentElement.childNodes[1]?.nodeValue,
      target: (doc.documentElement.lastChild as ProcessingInstruction).target,
    };
  }, writtenXml);
  check(
    await page.locator("#transform-input").inputValue() === xmlTree,
    "Reclaiming Wasm input memory changed the editable Markdown",
  );
  check(
    JSON.stringify(decodedXml) ===
      JSON.stringify({
        label: "<script>inert</script>",
        text: "A & B\r\n",
        cdata: "\n```\n<em>literal</em>",
        target: "go",
      }),
    "XML writer failed browser data preservation",
  );
  await side("input", "Rendered");
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre").count() === 1,
    "Literal backticks escaped the XML fence",
  );
  check(
    await page.locator("#transform-output-rendered pre").textContent() ===
      writtenXml + "\n",
    "Rendered XML changed source bytes",
  );
  check(
    await page.locator(
      "#transform-output-rendered script, #transform-output-rendered em",
    ).count() === 0,
    "XML writer output became HTML",
  );
  await page.screenshot({
    path: `${artifacts}/list-to-xml-rendered.png`,
    fullPage: true,
  });
  await side("input", "Code");
  await side("output", "Code");
  for (
    const bad of [
      "- []",
      xmlTree.replace("        - pi go", "        - pi XML"),
      xmlTree.replace(
        "    - element r",
        "    - element r\n    - unknown ignored",
      ),
    ]
  ) {
    await page.locator("#transform-input").fill(bad);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    check(
      await page.locator("#transform-output").inputValue() === writtenFence,
      "Invalid XML tree replaced successful output",
    );
  }
  const recoveryTree =
    "- []\n  - {}\n    - element recovered\n    - attributes {}\n    - children []";
  await page.locator("#transform-input").fill(recoveryTree);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value === "```xml\n<recovered/>\n```\n"
  );
  await page.goto(new URL("?tool=28-outline-to-opml", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const outlineInput =
    "# A & B\n- [Tools](https://example.com/?a=1&b=2)\n  - 猫 &#10; notes\n  - ``` <script>inert</script>\n- \\[literal\\]";
  await page.locator("#transform-input").fill(outlineInput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .startsWith("````opml\n")
  );
  const opmlOutput = await page.locator("#transform-output").inputValue();
  const opmlBody = opmlOutput.slice("````opml\n".length, -"\n````\n".length);
  const decodedOutline = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "application/xml");
    if (doc.querySelector("parsererror")) throw Error("Invalid OPML XML");
    return {
      title: doc.querySelector("head > title")?.textContent,
      texts: [...doc.querySelectorAll("outline")].map((n) =>
        n.getAttribute("text")
      ),
      url: doc.querySelector("outline")?.getAttribute("url"),
      roots: doc.querySelectorAll("body > outline").length,
    };
  }, opmlBody);
  check(
    JSON.stringify(decodedOutline) === JSON.stringify({
      title: "A & B",
      texts: [
        "Tools",
        "猫 \n notes",
        "``` <script>inert</script>",
        "[literal]",
      ],
      url: "https://example.com/?a=1&b=2",
      roots: 2,
    }),
    "OPML data differed in the browser XML parser",
  );
  await side("input", "Rendered");
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre code").textContent() ===
      opmlBody + "\n",
    "OPML fence did not retain literal XML",
  );
  check(
    await page.locator("#transform-output-rendered pre").count() === 1,
    "OPML backticks broke the Markdown fence",
  );
  check(
    await page.locator(
      "#transform-output-rendered script, #transform-output-rendered outline, #transform-output-rendered a[href], #transform-input-rendered a[href]",
    ).count() === 0,
    "OPML or input links became active markup",
  );
  await page.screenshot({
    path: `${artifacts}/outline-to-opml-rendered.png`,
    fullPage: true,
  });
  await side("input", "Code");
  await side("output", "Code");
  check(
    await page.locator("#transform-input").inputValue() === outlineInput,
    "OPML conversion modified editable input",
  );
  for (
    const bad of [
      "- parent\n    - skipped",
      "- [bad](javascript:alert(1))",
      "- &#4294967361;",
    ]
  ) {
    await page.locator("#transform-input").fill(bad);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    check(
      await page.locator("#transform-output").inputValue() === opmlOutput,
      "Invalid outline replaced successful output",
    );
  }
  await page.locator("#transform-input").fill("- recovered");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes('text="recovered"')
  );
  await page.goto(new URL("?tool=29-opml-to-outline", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const opmlInput =
    '```opml\n<opml version="2.0"><head><title>A &amp; B</title></head><body><outline text="Tools" type="link" url="https://example.com/?a=1&amp;b=2"><outline text=""/><outline text="&lt;script&gt;inert&lt;/script&gt;"/></outline></body></opml>\n```\n';
  await page.locator("#transform-input").fill(opmlInput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  const outlineExpected =
    "# A&#32;\\&&#32;B\n\n- [Tools](<https://example.com/?a=1\\&b=2>)\n\n  - \n  - \\<script\\>inert\\<\\/script\\>\n";
  await page.waitForFunction(
    (expected) =>
      (document.getElementById("transform-output") as HTMLTextAreaElement)
        ?.value === expected,
    outlineExpected,
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered h1").textContent() ===
      "A & B",
    "OPML title changed when rendered",
  );
  check(
    await page.locator("#transform-output-rendered li").count() === 3,
    "OPML empty item or hierarchy lost",
  );
  check(
    await page.locator("#transform-output-rendered a").textContent() ===
      "Tools",
    "OPML link label differs",
  );
  check(
    await page.locator("#transform-output-rendered a").getAttribute(
      "data-href",
    ) === "https://example.com/?a=1&b=2",
    "OPML destination differs",
  );
  check(
    await page.locator("#transform-output-rendered li li").last()
      .textContent() === "<script>inert</script>",
    "OPML label became markup",
  );
  check(
    await page.locator(
      "#transform-output-rendered a[href], #transform-output-rendered script",
    ).count() === 0,
    "OPML links or labels became active",
  );
  await page.screenshot({
    path: `${artifacts}/opml-to-outline-rendered.png`,
    fullPage: true,
  });
  await side("output", "Code");
  check(
    await page.locator("#transform-input").inputValue() === opmlInput,
    "OPML source was modified",
  );
  for (
    const invalid of [
      opmlInput.replace('type="link"', 'type="rss"'),
      opmlInput.replace('text="Tools"', ""),
      opmlInput.replace("&amp; B", "&unknown;"),
    ]
  ) {
    await page.locator("#transform-input").fill(invalid);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("transform-status")?.textContent?.includes(
        "Previous output kept",
      )
    );
    check(
      await page.locator("#transform-output").inputValue() === outlineExpected,
      "Invalid OPML replaced previous output",
    );
  }
  await page.locator("#transform-input").fill(
    opmlInput.replace('text="Tools"', 'text="Recovered"'),
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes("[Recovered]")
  );
  await page.locator("#transform-output").fill(
    "[\\<label\\>](<x&#34; onmouseover=&#34;bad>)",
  );
  await side("output", "Rendered");
  const decodedLink = await page.locator("#transform-output-rendered a")
    .evaluate((link) => ({
      text: link.textContent,
      data: link.getAttribute("data-href"),
      event: link.getAttribute("onmouseover"),
      href: link.getAttribute("href"),
    }));
  check(
    JSON.stringify(decodedLink) === JSON.stringify({
      text: "<label>",
      data: 'x" onmouseover="bad',
      event: null,
      href: null,
    }),
    "Decoded link data crossed the HTML attribute boundary",
  );
  await page.goto(new URL("?tool=31-outline-to-bookmarks", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const bookmarkInput =
    "# Books & notes\n- Folder\n  - [\\<script\\>inert\\<\\/script\\>](<https://example.com/?x=1&y=2>)\n- Empty";
  await page.locator("#transform-input").fill(bookmarkInput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes("Books &amp; notes")
  );
  const bookmarkOutput = await page.locator("#transform-output").inputValue();
  const bookmarkTree = await page.evaluate((output) => {
    const html = output.slice("```html\n".length, -"\n```\n".length);
    const doc = new DOMParser().parseFromString(html, "text/html");
    return {
      title: doc.title,
      folders: [...doc.querySelectorAll("h3")].map((n) => n.textContent),
      links: [...doc.querySelectorAll("a")].map(
        (n) => [n.textContent, n.getAttribute("href")],
      ),
      lists: doc.querySelectorAll("dl").length,
      active: doc.querySelectorAll("script,iframe,img,link").length,
    };
  }, bookmarkOutput);
  check(
    JSON.stringify(bookmarkTree) === JSON.stringify({
      title: "Books & notes",
      folders: ["Folder", "Empty"],
      links: [["<script>inert</script>", "https://example.com/?x=1&y=2"]],
      lists: 3,
      active: 0,
    }),
    "Bookmark export did not survive browser HTML parsing",
  );
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre code").count() === 1,
    "Bookmark HTML did not remain one code fence",
  );
  check(
    await page.locator(
      "#transform-output-rendered a, #transform-output-rendered script",
    ).count() === 0,
    "Bookmark data became live markup",
  );
  await page.screenshot({
    path: `${artifacts}/outline-to-bookmarks-rendered.png`,
    fullPage: true,
  });
  await side("output", "Code");
  await page.locator("#transform-input").fill(
    "- [Parent](https://example.com/)\n  - Child",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  check(
    await page.locator("#transform-output").inputValue() === bookmarkOutput,
    "A child under a bookmark replaced successful output",
  );
  await page.locator("#transform-input").fill("- Recovered");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes("<H3>Recovered</H3>")
  );
  await page.goto(new URL("?tool=30-bookmarks-to-outline", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  await page.locator("#transform-input").fill(bookmarkOutput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes("Books&#32;")
  );
  const importedBookmarks = await page.locator("#transform-output")
    .inputValue();
  await side("input", "Rendered");
  await side("output", "Rendered");
  check(
    await page.locator("#transform-input-rendered pre code").count() === 1,
    "Imported bookmark HTML did not remain a code fence",
  );
  check(
    await page.locator("#transform-output-rendered h1").textContent() ===
      "Books & notes",
    "Imported bookmark title differs",
  );
  const importedLink = page.locator("#transform-output-rendered a");
  check(
    await importedLink.count() === 1 &&
      await importedLink.textContent() === "<script>inert</script>" &&
      await importedLink.getAttribute("data-href") ===
        "https://example.com/?x=1&y=2" &&
      await importedLink.getAttribute("href") === null,
    "Imported bookmark label or inert destination differs",
  );
  check(
    await page.locator("#transform-output-rendered li").count() === 3 &&
      await page.locator("#transform-output-rendered script").count() === 0,
    "Imported folders or literal markup were lost",
  );
  await page.screenshot({
    path: `${artifacts}/bookmarks-to-outline-rendered.png`,
    fullPage: true,
  });
  await side("input", "Code");
  await side("output", "Code");
  check(
    await page.locator("#transform-input").inputValue() === bookmarkOutput,
    "Rendering mutated the original bookmark export",
  );
  await page.locator("#transform-input").fill(
    "```html\n<DL><H3>Missing child list</H3></DL>\n```\n",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  check(
    await page.locator("#transform-output").inputValue() === importedBookmarks,
    "An incomplete folder replaced successful output",
  );
  await page.locator("#transform-input").fill(
    "```html\n<DL><H3>Recovered</H3><DL></DL></DL>\n```\n",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)
      ?.value ===
      "- Recovered\n"
  );
  await page.goto(new URL("?tool=32-rss-to-entries", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  const rssInput = '```rss\n<rss version="2.0"><channel>' +
    "<title>Books &amp; notes</title><link>https://example.com/</link>" +
    "<description>Updates</description><item><title>One</title>" +
    "<description><![CDATA[<script>inert</script>]]></description>" +
    '<category>A</category><category domain="topics">B</category>' +
    '<enclosure url="https://example.com/a.mp3" length="0012" type="audio/mpeg"/>' +
    "</item><item><description>Two</description></item></channel></rss>\n```\n";
  await page.locator("#transform-input").fill(rssInput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes('"length" "0012"')
  );
  const rssOutput = await page.locator("#transform-output").inputValue();
  check(
    rssOutput.includes('"title" "Books & notes"') &&
      rssOutput.includes('"description" "<script>inert</script>"') &&
      rssOutput.indexOf('"title" "One"') <
        rssOutput.indexOf('"description" "Two"') &&
      rssOutput.indexOf('"value" "A"') < rssOutput.indexOf('"value" "B"'),
    "RSS field data or entry/category order differs",
  );
  await side("input", "Rendered");
  await side("output", "Rendered");
  check(
    await page.locator("#transform-input-rendered pre code").count() === 1 &&
      await page.locator("#transform-output-rendered ul ul ul").count() > 0,
    "RSS input fence or nested output is missing",
  );
  check(
    (await page.locator("#transform-output-rendered").textContent())?.includes(
      '"description" "<script>inert</script>"',
    ) && await page.locator(
          "#transform-output-rendered script, #transform-output-rendered img, #transform-output-rendered a[href]",
        ).count() === 0,
    "RSS content or destinations became active markup",
  );
  await page.screenshot({
    path: `${artifacts}/rss-to-entries-rendered.png`,
    fullPage: true,
  });
  const lastEntry = page.locator("#transform-output-rendered li").filter({
    hasText: '"description" "Two"',
  }).last();
  await lastEntry.scrollIntoViewIfNeeded();
  check(
    await lastEntry.evaluate((node) => {
      const item = node.getBoundingClientRect();
      const pane = node.closest("article")!.getBoundingClientRect();
      return item.top >= pane.top && item.bottom <= pane.bottom;
    }),
    "Last RSS entry cannot be scrolled into its output pane",
  );
  await page.screenshot({
    path: `${artifacts}/rss-to-entries-last-entry.png`,
    fullPage: true,
  });
  await side("input", "Code");
  await side("output", "Code");
  check(
    await page.locator("#transform-input").inputValue() === rssInput,
    "RSS rendering changed the source",
  );
  await page.locator("#transform-input").fill(
    rssInput.replace(
      "<title>One</title>",
      "<title>One</title><title>Duplicate</title>",
    ),
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  check(
    await page.locator("#transform-output").inputValue() === rssOutput,
    "Invalid RSS replaced previous output",
  );
  await page.locator("#transform-input").fill(
    rssInput.replace("<title>One</title>", "<title>Recovered</title>"),
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes('"title" "Recovered"')
  );
  await page.goto(new URL("?tool=33-entries-to-rss", base).href);
  await page.waitForFunction(() =>
    !(document.getElementById("transform-run") as HTMLButtonElement)?.disabled
  );
  await page.locator("#transform-input").fill(rssOutput);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes('<enclosure url="https://example.com/a.mp3" length="0012"')
  );
  const writtenRss = await page.locator("#transform-output").inputValue();
  const browserFeed = await page.evaluate((output) => {
    const xml = output.slice(
      output.indexOf("\n") + 1,
      output.lastIndexOf("```"),
    );
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) {
      throw Error("Browser rejected RSS XML");
    }
    return {
      title: doc.querySelector("channel > title")?.textContent,
      items: Array.from(doc.querySelectorAll("item"), (item) => ({
        description: item.querySelector("description")?.textContent,
        categories: Array.from(
          item.querySelectorAll("category"),
          (el) => el.textContent,
        ),
        length: item.querySelector("enclosure")?.getAttribute("length"),
      })),
    };
  }, writtenRss);
  check(
    browserFeed.title === "Books & notes" && browserFeed.items.length === 2 &&
      browserFeed.items[0].description === "<script>inert</script>" &&
      browserFeed.items[0].categories.join(",") === "A,B" &&
      browserFeed.items[0].length === "0012" &&
      browserFeed.items[1].description === "Two",
    "RSS writer differs from browser XML interpretation",
  );
  await side("input", "Rendered");
  await side("output", "Rendered");
  check(
    await page.locator("#transform-output-rendered pre code").count() === 1 &&
      await page.locator(
          "#transform-output-rendered script, #transform-output-rendered img, #transform-output-rendered a[href]",
        ).count() === 0,
    "RSS output did not remain an inert code fence",
  );
  await page.screenshot({
    path: `${artifacts}/entries-to-rss-rendered.png`,
    fullPage: true,
  });
  await side("input", "Code");
  await side("output", "Code");
  check(
    await page.locator("#transform-input").inputValue() === rssOutput,
    "RSS writer changed its source textarea",
  );
  await page.locator("#transform-input").fill(
    rssOutput + '  - "unknown" "do not discard"\n',
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("transform-status")?.textContent?.includes(
      "Previous output kept",
    )
  );
  check(
    await page.locator("#transform-output").inputValue() === writtenRss,
    "Unknown RSS field replaced successful output",
  );
  await page.locator("#transform-input").fill(
    rssOutput.replace('"title" "One"', '"title" "Recovered"'),
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    (document.getElementById("transform-output") as HTMLTextAreaElement)?.value
      .includes("<title>Recovered</title>")
  );
  check(errors.length === 0, `Browser errors: ${errors.join("\n")}`);
  console.log(
    `${transforms.length} transformation fixtures, editing, rendering, limits and recovery passed`,
  );
} finally {
  await browser.close();
}
