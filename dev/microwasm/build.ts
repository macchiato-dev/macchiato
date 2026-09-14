/** Build documents, never synthesize their instructions. No network access. */
import { assemble, fromHex, toHex } from "./microwasm.ts";
import { assembleRenderer } from "./renderer.ts";

const root = new URL("./", import.meta.url);
const pages = new URL("dist/pages/", root);
await Deno.mkdir(new URL("examples/", pages), { recursive: true });
const names: string[] = [];
for await (const entry of Deno.readDir(new URL("examples/", root))) {
  if (entry.isFile && /^\d\d-[a-z0-9-]+\.md$/.test(entry.name)) {
    names.push(entry.name);
  }
}
names.sort();
if (names.length !== 20) {
  throw new Error(`Expected twenty examples, found ${names.length}`);
}
const manifest = [];
for (const name of names) {
  const source = await Deno.readTextFile(new URL(`examples/${name}`, root));
  const built = assemble(source);
  const id = name.slice(0, -3);
  const prefix = new URL(`examples/${id}`, pages).href;
  await Deno.writeTextFile(new URL(prefix + ".md"), source);
  await Deno.writeTextFile(new URL(prefix + ".resolved.md"), built.resolved);
  await Deno.writeTextFile(new URL(prefix + ".hex"), toHex(built.bytes));
  // The intermediate hex file is an actual input to the final build step.
  const bytes = fromHex(await Deno.readTextFile(new URL(prefix + ".hex")));
  await WebAssembly.compile(bytes);
  await Deno.writeFile(new URL(prefix + ".wasm"), bytes);
  await Deno.writeTextFile(
    new URL(prefix + ".map.json"),
    JSON.stringify(built.map, null, 2) + "\n",
  );
  manifest.push({
    id,
    title: source.split("\n")[0].replace(/^# /, ""),
    bytes: bytes.length,
  });
  console.log(`${id}: ${bytes.length} bytes`);
}
const renderer = await assembleRenderer();
await Deno.mkdir(new URL("renderer/", pages), { recursive: true });
await Deno.writeTextFile(
  new URL("markdown-renderer.hex", pages),
  toHex(renderer.bytes),
);
const rendererBytes = fromHex(
  await Deno.readTextFile(new URL("markdown-renderer.hex", pages)),
);
await WebAssembly.compile(rendererBytes);
await Deno.writeFile(new URL("markdown-renderer.wasm", pages), rendererBytes);
await Deno.writeTextFile(
  new URL("markdown-renderer.resolved.md", pages),
  renderer.resolved,
);
await Deno.writeTextFile(
  new URL("markdown-renderer.map.json", pages),
  JSON.stringify(renderer.map, null, 2) + "\n",
);
const documents = manifest.map((entry) => ({
  path: `examples/${entry.id}.md`,
  title: entry.title,
  example: entry.id,
}));
const resolvedLines = renderer.resolved.split("\n");
let line = 0;
for (const page of renderer.pages) {
  const count = page.source.split("\n").length;
  await Deno.writeTextFile(
    new URL(`renderer/${page.name}`, pages),
    page.source,
  );
  await Deno.writeTextFile(
    new URL(`renderer/${page.name.replace(/\.md$/, ".resolved.md")}`, pages),
    resolvedLines.slice(line, line + count).join("\n"),
  );
  line += count + 1; // The pages were joined with two newlines.
}
await Deno.writeTextFile(
  new URL("documents.json", pages),
  JSON.stringify(
    [
      ...documents,
      ...renderer.pages.map((page) => ({
        path: `renderer/${page.name}`,
        title: page.source.split("\n")[0].replace(/^# /, ""),
      })),
    ],
    null,
    2,
  ) + "\n",
);
console.log(
  `Markdown renderer: ${rendererBytes.length} bytes, ${renderer.pages.length} linked source pages`,
);

for (const name of ["index.html", "style.css", "demo.js", "reader.js"]) {
  await Deno.copyFile(new URL(`web/${name}`, root), new URL(name, pages));
}
await Deno.writeTextFile(
  new URL("examples.json", pages),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Built dist/pages: original and resolved Markdown, maps, hex, Wasm, and browser demos.",
);
