import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import {
  compileProjectFiles,
  PROJECT_SOURCE_LIMITS,
} from "../../project-editor/src/single-file-compiler.js";

test("border declarations and guest mutations agree with native CSS", async (t) => {
  const root = resolve(new URL("../../..", import.meta.url).pathname);
  const code = (await build({
    stdin: {
      contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { ProjectOutput } from './packages/website/project-output-session.js';
  `,
      resolveDir: root,
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
  })).outputFiles[0].text;
  const wasm = await readFile(
    resolve(root, "packages/website/generated/project-quickjs-runtime.wasm"),
  );
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://borders.test/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(
      path === "/module.js"
        ? { body: code, contentType: "text/javascript" }
        : path === "/runtime.wasm"
        ? { body: wasm, contentType: "application/wasm" }
        : { body: '<div id="mount"></div>', contentType: "text/html" },
    );
  });
  await page.goto("http://borders.test/");
  const base =
    "border:9px double rgb(20,30,40);border-image-source:linear-gradient(red,blue);" +
    "border-image-slice:23;border-image-width:4;border-image-outset:2;border-image-repeat:round;";
  const cases = [
    ["border", "2px solid"],
    ["border", "none"],
    ["border", "0"],
    ["border", "solid red"],
    ["border", "red dotted thin"],
    ["border", "3px red"],
    ["border", "inherit"],
    ["border", "initial"],
    ["border", "var(--edge)"],
    ["border", "var(--missing, 1px solid blue)"],
    ["border", "calc(1px + 1px) solid"],
    ["border-top", "none"],
    ["border-right", "2px red"],
    ["border-left", "var(--edge)"],
    ["border-bottom", "calc(6px / 2) dashed"],
    ["border", "4px dashed", "border:7px solid orange!important;"],
  ];
  const fixtures = [];
  for (const [property, value, extra = ""] of cases) {
    for (const mode of ["inline", "stylesheet", "cssText", "setProperty"]) {
      const initial = base + extra, declaration = `${property}:${value};`;
      const css =
        `.parent { color:#234; border:3px dotted purple; --edge:2px dashed rgb(1,2,3); }
        .sample { width:80px;height:30px;${
          mode === "stylesheet" ? initial + declaration : ""
        } }`;
      const inline = mode === "stylesheet"
        ? ""
        : initial + (mode === "inline" ? declaration : "");
      const source =
        `<style>${css}</style><div class="parent"><div class="sample" id="sample" style="${inline}">Border</div></div>`;
      const program = compileProjectFiles(
        [{ path: "index.html", content: source }],
        {},
        { limits: PROJECT_SOURCE_LIMITS },
      );
      fixtures.push({
        property,
        value,
        mode,
        source,
        initial,
        declaration,
        program,
      });
    }
  }
  const results = await page.evaluate(async (fixtures) => {
    const { Machine, ProjectOutput } = await import("/module.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    const output = new ProjectOutput(
      Machine,
      module,
      document.querySelector("#mount"),
      () => ({}),
      (error) => {
        throw error;
      },
    );
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const native = frame.contentDocument;
    const properties = [
      "border-image-source",
      "border-image-slice",
      "border-image-width",
      "border-image-outset",
      "border-image-repeat",
    ];
    for (const side of ["top", "right", "bottom", "left"]) {
      for (const part of ["color", "style", "width"]) {
        properties.push(`border-${side}-${part}`);
      }
    }
    const read = (node) =>
      Object.fromEntries(
        properties.map(
          (property) => [
            property,
            node.ownerDocument.defaultView.getComputedStyle(node)
              .getPropertyValue(property),
          ],
        ),
      );
    const results = [];
    try {
      for (const fixture of fixtures) {
        try {
          native.open();
          native.write(fixture.source);
          native.close();
          await output.load(fixture.program);
          const target = native.querySelector("#sample");
          if (fixture.mode === "cssText") {
            target.style.cssText = fixture.initial + fixture.declaration;
            await output.run([{
              code: `document.getElementById('sample').style.cssText = ${
                JSON.stringify(fixture.initial + fixture.declaration)
              };`,
            }]);
          } else if (fixture.mode === "setProperty") {
            target.style.setProperty(fixture.property, fixture.value);
            await output.run([{
              code: `document.getElementById('sample').style.setProperty(${
                JSON.stringify(fixture.property)
              }, ${JSON.stringify(fixture.value)});`,
            }]);
          }
          results.push({
            label: `${fixture.mode}: ${fixture.property}: ${fixture.value}`,
            actual: read(document.querySelector("#mount #sample")),
            expected: read(target),
          });
        } catch (error) {
          throw new Error(
            `${fixture.mode}: ${fixture.property}: ${fixture.value}: ${error.message}`,
          );
        }
      }
    } finally {
      output.destroy();
      frame.remove();
    }
    return results;
  }, fixtures);
  for (const result of results) {
    assert.deepEqual(result.actual, result.expected, result.label);
  }
  assert.deepEqual(errors, []);
  t.diagnostic(
    `${results.length} native/guest comparisons across compilation, cssText, and setProperty`,
  );
});
