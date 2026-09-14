/** Build documents, never synthesize their instructions. No network access. */
import { assemble, fromHex, toHex } from "./microwasm.ts";

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
for (const name of ["index.html", "style.css", "demo.js"]) {
  await Deno.copyFile(new URL(`web/${name}`, root), new URL(name, pages));
}
await Deno.writeTextFile(
  new URL("examples.json", pages),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Built dist/pages: original and resolved Markdown, maps, hex, Wasm, and browser demos.",
);
