import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import syntax from "../../dev/wasm-web-runtimes/examples/codemirror/babel-microquickjs.js";
import { atomCatalogSource } from "../../dev/wasm-web-runtimes/examples/microquickjs-suite/scripts/bytecode-atoms.js";
import { editorLanguages } from "./src/languages.js";

// These compatibility fixtures belong to the runtime regression tests, not
// the website. Build the website's modern editor sources first, then run:
// deno run -A packages/project-editor/build-microquickjs-fixtures.js
const root = new URL("../../", import.meta.url);
const path = value => new URL(value, root).pathname;
const generated = path("packages/project-editor/generated/");
const website = path("packages/website/generated/");
const examples = path("dev/wasm-web-runtimes/examples/");
const suite = examples + "microquickjs-suite/";
const compiler = suite + "microquickjs-guest-runtime/microquickjs/mqjs";
await Deno.mkdir(generated, { recursive: true });
async function run(command, args, options = {}) {
  const result = await new Deno.Command(command, { args, stdout: "inherit", stderr: "inherit", ...options }).output();
  if (!result.success) throw new Error(`${command} failed (${result.code})`);
}
await run(Deno.env.get("CARGO") || `${Deno.env.get("HOME")}/.cargo/bin/cargo`,
  ["build", "--release", "--target", "wasm32-unknown-unknown"], {
    cwd: suite + "microquickjs-guest-runtime", env: { WWC_REBUILD_EXAMPLES: "1" },
  });
async function compile(name, source) {
  await Deno.writeTextFile(generated + name + ".js", source);
  await run(compiler, ["-m32", "-o", generated + name + ".bin", generated + name + ".js"]);
}
const lower = async source => (await transformAsync(source, {
  comments: false, compact: false, assumptions: { iterableIsArray: false },
  plugins: [syntax], presets: [[presetEnv, { bugfixes: true, loose: true,
    modules: false, targets: { ie: "11" }, useBuiltIns: false }]],
})).code;
await compile("project-editor-runtime", await Deno.readTextFile(examples + "codemirror/generated/microquickjs-runtime.js"));
const core = await lower(await Deno.readTextFile(website + "project-editor-core.js"));
await Deno.writeTextFile(generated + "project-editor-microquickjs.js", core);
await compile("project-editor-core", core);
const languages = [...new Set(editorLanguages.map(language => language.package))];
for (const name of languages) {
  const file = `project-editor-language-${name}`;
  await compile(file, await lower(await Deno.readTextFile(website + file + ".js")));
}
await compile("project-editor-language-atoms", atomCatalogSource(await Promise.all(
  languages.map(name => Deno.readFile(generated + `project-editor-language-${name}.bin`)))));
// Keep the old fixture filename for existing restamping tests, but its home
// and build are now explicitly MicroQuickJS-only. Each test replaces the app.
await run("deno", ["run", "-A", suite + "scripts/stamp-wasm.js",
  suite + "microquickjs-guest-runtime/target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm",
  generated + "project-editor-quickjs-runtime.wasm",
  "runtime.bin=" + generated + "project-editor-runtime.bin",
  "editor.bin=" + generated + "project-editor-core.bin",
]);
